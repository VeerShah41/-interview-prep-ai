'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Target,
  Mic,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  MonitorCheck,
  MicVocal,
} from 'lucide-react';

export default function InterviewSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [targetRole, setTargetRole] = useState('');
  const [micStatus, setMicStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [micError, setMicError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const testMicrophone = async () => {
    setMicStatus('testing');
    setMicError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus('success');
    } catch (err) {
      setMicStatus('error');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setMicError('Microphone access denied. Please allow microphone access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setMicError('No microphone found. Please connect a microphone and try again.');
        } else {
          setMicError(`Microphone error: ${err.message}`);
        }
      }
    }
  };

  const handleStart = () => {
    if (!targetRole.trim()) return;
    sessionStorage.setItem('mentorq_target_role', targetRole.trim());
    router.push('/interview/live');
  };

  const isSpeechSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (authLoading || !user) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <nav className="navbar">
        <Link href="/dashboard" className="navbar-brand">
          <div className="navbar-brand-icon"><Target size={18} /></div>
          MentorQ
        </Link>
      </nav>

      <div className="setup-container">
        <div className="setup-header">
          <h1>Prepare for Your Interview</h1>
          <p>Let&apos;s make sure everything is set up before we begin.</p>
        </div>

        <div className="setup-card">
          {/* Step 1: Role */}
          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label" htmlFor="targetRole">
              What role are you interviewing for?
            </label>
            <input
              id="targetRole"
              type="text"
              className="input"
              placeholder="e.g., Senior Frontend Engineer, Product Manager"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>

          {/* Step 2: Browser compatibility */}
          <div style={{ marginBottom: 24 }}>
            <p className="input-label" style={{ marginBottom: 8 }}>Browser Compatibility</p>
            <div className="card" style={{ padding: 16 }}>
              {isSpeechSupported ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-green)' }}>
                  <MonitorCheck size={18} />
                  <span style={{ fontSize: 14 }}>Voice recognition is supported in your browser</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-red)' }}>
                  <XCircle size={18} />
                  <span style={{ fontSize: 14 }}>
                    Voice recognition is not supported. Please use Chrome or Edge.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Microphone test */}
          <div style={{ marginBottom: 24 }}>
            <p className="input-label" style={{ marginBottom: 8 }}>Microphone Check</p>
            <div className="mic-test">
              <button
                className={`btn ${micStatus === 'success' ? 'btn-secondary' : 'btn-primary'}`}
                onClick={testMicrophone}
              >
                {micStatus === 'idle' && <><MicVocal size={16} /> Test Microphone</>}
                {micStatus === 'testing' && <><Search size={16} /> Testing...</>}
                {micStatus === 'success' && <><CheckCircle2 size={16} /> Microphone Works!</>}
                {micStatus === 'error' && <><RotateCcw size={16} /> Retry Test</>}
              </button>
              {micStatus === 'success' && (
                <p className="mic-test-status success">
                  Microphone is ready to go!
                </p>
              )}
              {micStatus === 'error' && (
                <p className="mic-test-status error">{micError}</p>
              )}
            </div>
          </div>

          {/* Start Button */}
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleStart}
            disabled={!targetRole.trim() || !isSpeechSupported || micStatus === 'error'}
          >
            <Mic size={18} /> Begin Interview <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
