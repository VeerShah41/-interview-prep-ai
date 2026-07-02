'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useInterview } from '@/lib/hooks/useInterview';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/lib/hooks/useSpeechSynthesis';
import {
  Target,
  Clock,
  Mic,
  MicOff,
  Square,
  Brain,
  Volume2,
  AlertTriangle,
  CircleDot,
  HelpCircle,
  X,
  RotateCcw,
  Lightbulb,
  SkipForward,
  Pause,
  MessageSquare,
} from 'lucide-react';

type OrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

const HELP_SUGGESTIONS = [
  {
    icon: <RotateCcw size={16} />,
    label: 'Repeat the question',
    desc: 'Ask the AI to say the last question again',
    action: 'Could you please repeat the question?',
  },
  {
    icon: <Lightbulb size={16} />,
    label: 'Give me a hint',
    desc: 'Get a nudge on what the AI is looking for',
    action: "I'm not sure I understand what you're looking for. Could you give me a hint?",
  },
  {
    icon: <SkipForward size={16} />,
    label: 'Skip this question',
    desc: 'Move on to the next topic',
    action: "I don't have a good example for this one. Can we move to the next topic?",
  },
  {
    icon: <Pause size={16} />,
    label: 'Take a moment',
    desc: 'Let the AI know you need time to think',
    action: 'Give me a moment to think about that.',
  },
];

export default function LiveInterviewPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const interview = useInterview();
  const speech = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [currentAiText, setCurrentAiText] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interview.messages]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Timer
  useEffect(() => {
    if (interview.status === 'active' || interview.status === 'processing') {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interview.status]);

  // Initialize interview
  useEffect(() => {
    if (!initialized && user && token) {
      const targetRole = sessionStorage.getItem('mentorq_target_role');
      if (!targetRole) {
        router.push('/interview/setup');
        return;
      }
      setInitialized(true);
      startInterviewFlow(targetRole);
    }
  }, [user, token, initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  const startInterviewFlow = async (targetRole: string) => {
    try {
      setOrbState('processing');
      const greeting = await interview.startInterview(targetRole);
      setCurrentAiText(greeting);
      setOrbState('speaking');
      await tts.speak(greeting);
      setOrbState('idle');
    } catch (err) {
      console.error('Failed to start interview:', err);
      setOrbState('error');
    }
  };

  const processTranscript = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        setOrbState('processing');
        setCurrentAiText('');
        const { response: aiResponse, isComplete } = await interview.sendResponse(text);

        if (isComplete) {
          setCurrentAiText(aiResponse);
          setOrbState('speaking');
          // Wait for TTS to finish so the user hears the full closing
          try {
            await tts.speak(aiResponse);
          } catch { /* TTS failed, still redirect */ }
          setOrbState('idle');
          router.push(`/review/${interview.state.sessionId}`);
        } else {
          setCurrentAiText(aiResponse);
          setOrbState('speaking');
          await tts.speak(aiResponse);
          setOrbState('idle');
        }
      } catch (err) {
        console.error('Failed to process response:', err);
        setOrbState('error');
        setTimeout(() => setOrbState('idle'), 3000);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [interview, tts, router]
  );

  const toggleMic = useCallback(() => {
    if (orbState === 'speaking') {
      tts.stop();
      setOrbState('idle');
      return;
    }
    if (orbState === 'processing') return;

    if (speech.isListening) {
      speech.stopListening();
      setOrbState('idle');
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      const text = speech.transcript;
      if (text.trim()) {
        speech.resetTranscript();
        processTranscript(text);
      }
    } else {
      speech.resetTranscript();
      speech.startListening();
      setOrbState('listening');
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, [orbState, speech, tts, processTranscript]);

  // Track when speech was last detected (final or interim) via timestamp
  const lastSpeechActivityRef = useRef<number>(0);

  // Keep refs in sync with latest speech state for the interval to read
  const speechStateRef = useRef({ transcript: '', interimTranscript: '', isListening: false });
  useEffect(() => {
    speechStateRef.current = {
      transcript: speech.transcript,
      interimTranscript: speech.interimTranscript,
      isListening: speech.isListening,
    };
    // Update activity timestamp whenever speech changes
    if (speech.isListening && (speech.transcript || speech.interimTranscript)) {
      lastSpeechActivityRef.current = Date.now();
    }
  }, [speech.transcript, speech.interimTranscript, speech.isListening]);

  // Interval-based silence detection — polls every 1s, sends after 6s of TRUE silence
  useEffect(() => {
    const interval = setInterval(() => {
      const { transcript, interimTranscript, isListening } = speechStateRef.current;
      if (!isListening || !transcript.trim() || isProcessingRef.current) return;

      const silenceDuration = Date.now() - lastSpeechActivityRef.current;
      // Only send if: 6+ seconds of silence, has final text, AND no interim text in progress
      if (silenceDuration >= 6000 && !interimTranscript) {
        speech.stopListening();
        const text = transcript;
        speech.resetTranscript();
        setOrbState('idle');
        processTranscript(text);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHelpSuggestion = (action: string) => {
    setShowHelp(false);
    if (speech.isListening) speech.stopListening();
    tts.stop();
    processTranscript(action);
  };

  const handleEndInterview = async () => {
    setShowEndModal(false);
    if (speech.isListening) speech.stopListening();
    tts.stop();

    try {
      setOrbState('processing');
      const { response: aiResponse } = await interview.sendResponse("I'd like to end the interview now, thank you.");
      setCurrentAiText(aiResponse);
      setOrbState('speaking');
      try {
        await tts.speak(aiResponse);
      } catch { /* TTS failed, still redirect */ }
      setOrbState('idle');
      router.push(`/review/${interview.state.sessionId}`);
    } catch {
      router.push('/dashboard');
    }
  };

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const getOrbIcon = () => {
    switch (orbState) {
      case 'listening': return <Mic size={32} />;
      case 'processing': return <Brain size={32} />;
      case 'speaking': return <Volume2 size={32} />;
      case 'error': return <AlertTriangle size={32} />;
      default: return <CircleDot size={32} />;
    }
  };

  const getStatusText = () => {
    switch (orbState) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      case 'error': return 'Connection issue';
      default: return 'Tap to speak';
    }
  };

  const totalTopics = (interview.state.topicsRemaining || 0) + (interview.state.topicsCovered || 0);
  const coveredTopics = interview.state.topicsCovered || 0;

  if (authLoading || !user) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Preparing your interview...</p>
      </div>
    );
  }

  return (
    <div className="interview-room">
      {/* ─── Header ─── */}
      <header className="interview-room-header">
        <div className="interview-room-header-left">
          <div className="interview-room-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} /> MentorQ
          </div>
        </div>

        <div className="interview-room-header-center">
          <div className="interview-timer">
            <Clock size={14} /> {formatTime(elapsedTime)}
          </div>
          {interview.state.currentTopic && (
            <div className="interview-progress">
              <span style={{ fontWeight: 500 }}>
                {interview.state.currentTopic}
              </span>
            </div>
          )}
        </div>

        <div className="interview-room-header-right">
          <button className="btn btn-danger btn-sm" onClick={() => setShowEndModal(true)}>
            <Square size={12} /> End Interview
          </button>
        </div>
      </header>

      {/* ─── Split Body ─── */}
      <div className="interview-room-body">
        {/* Left: Voice Area */}
        <div className={`interview-voice-area ${orbState}`}>

          <div className="voice-orb-container">
            <div
              className={`voice-orb ${orbState}`}
              onClick={toggleMic}
              role="button"
              tabIndex={0}
              aria-label={getStatusText()}
              onKeyDown={(e) => e.key === 'Enter' && toggleMic()}
            >
              <div className="voice-orb-ring" />
              <div className="voice-orb-ring" />
              <div className="voice-orb-ring" />
              <div className="voice-orb-inner">
                {getOrbIcon()}
              </div>
            </div>
            <p className={`voice-status ${orbState}`}>
              {getStatusText()}
            </p>
          </div>
        </div>

        {/* Right: Transcript Sidebar */}
        <div className="transcript-sidebar">
          <div className="transcript-sidebar-header">
            <span className="transcript-sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={12} /> Interview Transcript
            </span>
            <span className="transcript-sidebar-badge">
              {interview.messages.length}
            </span>
          </div>

          <div className="transcript-sidebar-notice">
            <span className="dot" />
            <span>
              This transcript may contain minor inaccuracies. These do not affect your AI evaluation.
            </span>
          </div>

          <div className="transcript-messages">
            {interview.messages.map((msg, i) => (
              <div
                key={i}
                className={`transcript-msg ${msg.role} ${i === interview.messages.length - 1 ? 'latest' : ''}`}
              >
                <div className="transcript-msg-role">
                  {msg.role === 'ai' ? 'Interviewer' : 'You'}
                </div>
                <div className="transcript-msg-content">{msg.content}</div>
              </div>
            ))}

            {speech.isListening && (speech.transcript || speech.interimTranscript) && (
              <div className="transcript-msg candidate latest">
                <div className="transcript-msg-role">You</div>
                <div className="transcript-msg-content">
                  {speech.transcript}
                  {speech.interimTranscript && (
                    <span style={{ opacity: 0.5, marginLeft: speech.transcript ? '4px' : '0' }}>
                      {speech.interimTranscript}
                    </span>
                  )}
                </div>
              </div>
            )}

            {orbState === 'processing' && (
              <div className="transcript-typing">
                <div className="transcript-typing-dot" />
                <div className="transcript-typing-dot" />
                <div className="transcript-typing-dot" />
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>

      {/* ─── Bottom Controls ─── */}
      <div className="interview-controls">
        <div className="controls-left">
          {interview.state.currentTopic && (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Topic: <span style={{ color: 'var(--text-secondary)' }}>{interview.state.currentTopic}</span>
            </span>
          )}
        </div>

        <div className="controls-center">
          <button
            className={`mic-button ${speech.isListening ? 'active' : 'inactive'}`}
            onClick={toggleMic}
            disabled={orbState === 'processing'}
            aria-label={speech.isListening ? 'Stop recording' : 'Start recording'}
          >
            {speech.isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
        </div>

        <div className="controls-right">
          <button
            className="control-btn help"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle size={14} /> Need help
          </button>
        </div>
      </div>

      {/* ─── Help Panel ─── */}
      {showHelp && (
        <div className="help-panel">
          <div className="help-panel-header">
            <h4><Lightbulb size={14} /> Quick Actions</h4>
            <button className="help-panel-close" onClick={() => setShowHelp(false)}>
              <X size={12} />
            </button>
          </div>
          <div className="help-panel-body">
            {HELP_SUGGESTIONS.map((suggestion, i) => (
              <button
                key={i}
                className="help-suggestion"
                onClick={() => handleHelpSuggestion(suggestion.action)}
              >
                <span className="help-suggestion-icon">{suggestion.icon}</span>
                <div className="help-suggestion-text">
                  <div className="help-suggestion-label">{suggestion.label}</div>
                  <div className="help-suggestion-desc">{suggestion.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── End Interview Modal ─── */}
      {showEndModal && (
        <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>End Interview?</h2>
            <p>
              Are you sure you want to end this interview? The AI will wrap up
              and you&apos;ll receive your detailed STAR-framework feedback.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowEndModal(false)}>
                Continue
              </button>
              <button className="btn btn-danger" onClick={handleEndInterview}>
                End & Get Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
