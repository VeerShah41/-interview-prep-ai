'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTheme } from '@/lib/hooks/useTheme';
import {
  Mic,
  Brain,
  BarChart3,
  Sun,
  Moon,
  ArrowRight,
  Play,
  Target,
  Sparkles,
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-brand-icon">
            <Target size={18} />
          </div>
          MentorQ
        </div>
        <div className="navbar-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-badge">
          <Sparkles size={14} /> AI-Powered Voice Interviews
        </div>
        <h1 className="landing-title">
          Practice interviews with an AI that{' '}
          <span className="gradient-text">actually listens</span>
        </h1>
        <p className="landing-subtitle">
          No scripts. No chat boxes. Just a real conversation with an AI interviewer
          that adapts to your answers, pushes back on vague responses, and helps you
          nail your next behavioral interview.
        </p>
        <div className="landing-cta">
          <Link href={user ? '/dashboard' : '/signup'} className="btn btn-primary btn-lg">
            Start Practicing Free <ArrowRight size={18} />
          </Link>
          <Link href={user ? '/dashboard' : '/login'} className="btn btn-secondary btn-lg">
            <Play size={16} /> Watch Demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="feature-card">
          <div className="feature-icon blue">
            <Mic size={24} />
          </div>
          <h3>Voice-Only Experience</h3>
          <p>
            Speak naturally, just like a real interview. No typing, no chat boxes.
            The AI listens to what you actually say and responds in real-time.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon purple">
            <Brain size={24} />
          </div>
          <h3>Adaptive Follow-Ups</h3>
          <p>
            Gave a vague answer? The AI probes deeper. Missing key details? It asks
            specifically. Strong response? It acknowledges and moves on.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon green">
            <BarChart3 size={24} />
          </div>
          <h3>STAR Framework Scoring</h3>
          <p>
            Get detailed feedback on every answer: Situation, Task, Action, Result.
            Know exactly where to improve with topic-by-topic breakdowns.
          </p>
        </div>
      </section>
    </div>
  );
}
