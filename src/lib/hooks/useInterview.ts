'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export type InterviewStatus = 'idle' | 'starting' | 'active' | 'processing' | 'completed' | 'error';

interface InterviewState {
  sessionId: string | null;
  currentNode: string | null;
  isComplete: boolean;
  topicsRemaining: number;
  topicsCovered: number;
  currentTopic: string | null;
  lastAnswerQuality: string | null;
}

interface Message {
  role: 'ai' | 'candidate';
  content: string;
  timestamp: string;
}

interface UseInterviewReturn {
  status: InterviewStatus;
  state: InterviewState;
  messages: Message[];
  latestAiResponse: string;
  error: string | null;
  startInterview: (targetRole: string) => Promise<string>;
  sendResponse: (transcript: string) => Promise<{ response: string; isComplete: boolean }>;
  endInterview: () => void;
}

export function useInterview(): UseInterviewReturn {
  const { token } = useAuth();
  const [status, setStatus] = useState<InterviewStatus>('idle');
  const [state, setState] = useState<InterviewState>({
    sessionId: null,
    currentNode: null,
    isComplete: false,
    topicsRemaining: 0,
    topicsCovered: 0,
    currentTopic: null,
    lastAnswerQuality: null,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [latestAiResponse, setLatestAiResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const startInterview = useCallback(
    async (targetRole: string): Promise<string> => {
      setStatus('starting');
      setError(null);

      try {
        let customApiKey = '';
        let difficultyLevel = 'intermediate';
        try {
          const settings = JSON.parse(localStorage.getItem('mentorq_settings') || '{}');
          customApiKey = settings.customApiKey || '';
          difficultyLevel = settings.difficultyLevel || 'intermediate';
        } catch { /* ignore */ }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-difficulty-level': difficultyLevel,
        };
        if (customApiKey) headers['x-custom-api-key'] = customApiKey;

        const res = await fetch('/api/interview/start', {
          method: 'POST',
          headers,
          body: JSON.stringify({ targetRole }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to start interview');

        sessionIdRef.current = data.sessionId;
        setState({
          sessionId: data.sessionId,
          currentNode: data.state.currentNode,
          isComplete: data.state.isComplete,
          topicsRemaining: data.state.topicsRemaining,
          topicsCovered: 0,
          currentTopic: null,
          lastAnswerQuality: null,
        });

        const aiMessage: Message = {
          role: 'ai',
          content: data.greeting,
          timestamp: new Date().toISOString(),
        };
        setMessages([aiMessage]);
        setLatestAiResponse(data.greeting);
        setStatus('active');

        return data.greeting;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setStatus('error');
        throw err;
      }
    },
    [token]
  );

  const sendResponse = useCallback(
    async (transcript: string): Promise<{ response: string; isComplete: boolean }> => {
      if (!sessionIdRef.current) throw new Error('No active session');

      setStatus('processing');
      setError(null);

      // Add candidate message immediately
      const candidateMessage: Message = {
        role: 'candidate',
        content: transcript,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, candidateMessage]);

      try {
        let customApiKey = '';
        let difficultyLevel = 'intermediate';
        try {
          const settings = JSON.parse(localStorage.getItem('mentorq_settings') || '{}');
          customApiKey = settings.customApiKey || '';
          difficultyLevel = settings.difficultyLevel || 'intermediate';
        } catch { /* ignore */ }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-difficulty-level': difficultyLevel,
        };
        if (customApiKey) headers['x-custom-api-key'] = customApiKey;

        const res = await fetch('/api/interview/respond', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            transcript,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to process response');

        setState((prev) => ({
          ...prev,
          currentNode: data.state.currentNode,
          isComplete: data.state.isComplete,
          topicsRemaining: data.state.topicsRemaining,
          topicsCovered: data.state.topicsCovered,
          currentTopic: data.state.currentTopic,
          lastAnswerQuality: data.state.lastAnswerQuality,
        }));

        const aiMessage: Message = {
          role: 'ai',
          content: data.aiResponse,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setLatestAiResponse(data.aiResponse);

        if (data.state.isComplete) {
          setStatus('completed');
        } else {
          setStatus('active');
        }

        return { response: data.aiResponse, isComplete: data.state.isComplete };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setStatus('active'); // Keep active so user can retry
        throw err;
      }
    },
    [token]
  );

  const endInterview = useCallback(() => {
    setStatus('completed');
    setState((prev) => ({ ...prev, isComplete: true }));
  }, []);

  return {
    status,
    state,
    messages,
    latestAiResponse,
    error,
    startInterview,
    sendResponse,
    endInterview,
  };
}
