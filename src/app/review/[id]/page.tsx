'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Target,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  FileText,
  Mic,
  ArrowRight,
  ChevronRight,
  Zap,
  Award,
} from 'lucide-react';

interface TopicScore {
  topic: string;
  situationScore: number;
  taskScore: number;
  actionScore: number;
  resultScore: number;
  overallScore: number;
  feedback: string;
}

interface FeedbackData {
  summary: string;
  strengths: string[];
  improvements: string[];
  overallRating: string;
  detailedReport: {
    overallScore: number;
    tips?: string[];
    techProficiency?: Record<string, number>;
  };
  techProficiency?: Record<string, number>;
}

interface Message {
  role: string;
  content: string;
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [topicScores, setTopicScores] = useState<TopicScore[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (token && id) {
      setLoading(true);
      fetch(`/api/feedback/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load feedback');
          return res.json();
        })
        .then((data) => {
          const fb = data.feedback;
          // techProficiency can be at the top level OR inside detailedReport
          if (fb && !fb.techProficiency && fb.detailedReport?.techProficiency) {
            fb.techProficiency = fb.detailedReport.techProficiency;
          }
          setFeedback(fb);
          setTopicScores(data.topicScores || []);
          setMessages(data.messages || []);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [token, id]);

  if (authLoading || loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">
          {loading ? 'Generating your feedback...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="loading-screen">
        <p className="error-text">{error || 'Failed to load feedback'}</p>
        <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const overallScore = feedback.detailedReport?.overallScore ?? 0;
  const tips = feedback.detailedReport?.tips || [];

  function getScoreClass(score: number): string {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'average';
    return 'poor';
  }

  function getScoreColor(score: number): string {
    if (score >= 8) return 'var(--accent-green)';
    if (score >= 6) return 'var(--accent-blue)';
    if (score >= 4) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  }

  return (
    <div className="page-wrapper">
      <nav className="navbar">
        <Link href="/dashboard" className="navbar-brand">
          <div className="navbar-brand-icon"><Target size={18} /></div>
          MentorQ
        </Link>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </nav>

      <div className="review-container">
        <div className="review-header">
          <h1>Interview Feedback</h1>
          <p>Here&apos;s how you did — with specific tips to improve.</p>
        </div>

        {/* Overall Score */}
        <div className="overall-score-card">
          <div className={`score-circle ${getScoreClass(overallScore)}`}>
            <span className="score-number" style={{ color: getScoreColor(overallScore) }}>
              {overallScore.toFixed(1)}
            </span>
            <span className="score-label">out of 10</span>
          </div>
          <div className={`rating-badge ${feedback.overallRating}`}>
            <Award size={14} /> {feedback.overallRating.replace('_', ' ')}
          </div>
          <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
            {feedback.summary}
          </p>
        </div>

        {/* Tech Proficiency */}
        {feedback.techProficiency && Object.keys(feedback.techProficiency).length > 0 && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, marginTop: 40 }}>
              <Target size={20} /> Tech Proficiency
            </h2>
            <div className="settings-card" style={{ marginBottom: 40 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                {Object.entries(feedback.techProficiency).map(([tech, score]) => (
                  <div key={tech}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{tech}</span>
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{score}%</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${score}%`, 
                        background: score >= 80 ? 'var(--accent-green)' : score >= 60 ? 'var(--accent-blue)' : 'var(--accent-orange)',
                        borderRadius: 'var(--radius-full)'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Topic Scores */}
        {topicScores.length > 0 && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={20} /> Topic Breakdown
            </h2>
            <div className="topic-scores-grid">
              {topicScores.map((ts, i) => (
                <div key={i} className="topic-score-card">
                  <div className="topic-score-header">
                    <span className="topic-score-name">{ts.topic}</span>
                    <span
                      className="topic-score-value"
                      style={{ color: getScoreColor(ts.overallScore) }}
                    >
                      {Number(ts.overallScore).toFixed(1)}
                    </span>
                  </div>
                  <div className="star-scores">
                    <div className="star-score-item">
                      <span className="star-score-label">Situation</span>
                      <span className="star-score-value" style={{ color: getScoreColor(ts.situationScore) }}>
                        {Number(ts.situationScore).toFixed(1)}
                      </span>
                    </div>
                    <div className="star-score-item">
                      <span className="star-score-label">Task</span>
                      <span className="star-score-value" style={{ color: getScoreColor(ts.taskScore) }}>
                        {Number(ts.taskScore).toFixed(1)}
                      </span>
                    </div>
                    <div className="star-score-item">
                      <span className="star-score-label">Action</span>
                      <span className="star-score-value" style={{ color: getScoreColor(ts.actionScore) }}>
                        {Number(ts.actionScore).toFixed(1)}
                      </span>
                    </div>
                    <div className="star-score-item">
                      <span className="star-score-label">Result</span>
                      <span className="star-score-value" style={{ color: getScoreColor(ts.resultScore) }}>
                        {Number(ts.resultScore).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  {ts.feedback && (
                    <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {ts.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Strengths */}
        <div className="feedback-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} /> Strengths
          </h3>
          <div className="feedback-list">
            {feedback.strengths.map((s, i) => (
              <div key={i} className="feedback-item">
                <span className="feedback-item-icon" style={{ color: 'var(--accent-green)' }}>
                  <ChevronRight size={14} />
                </span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="feedback-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-orange)' }} /> Areas for Improvement
          </h3>
          <div className="feedback-list">
            {feedback.improvements.map((s, i) => (
              <div key={i} className="feedback-item">
                <span className="feedback-item-icon" style={{ color: 'var(--accent-orange)' }}>
                  <ArrowRight size={14} />
                </span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        {tips.length > 0 && (
          <div className="feedback-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={18} style={{ color: 'var(--accent-yellow)' }} /> Pro Tips
            </h3>
            <div className="feedback-list">
              {tips.map((tip, i) => (
                <div key={i} className="feedback-item">
                  <span className="feedback-item-icon" style={{ color: 'var(--accent-blue)' }}>
                    <Lightbulb size={14} />
                  </span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Transcript */}
        {messages.length > 0 && (
          <div className="feedback-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} /> Full Transcript
            </h3>
            <div className="transcript-review">
              {messages.map((msg, i) => (
                <div key={i} className="transcript-review-message">
                  <div className={`transcript-review-role ${msg.role}`}>
                    {msg.role === 'ai' ? 'Interviewer' : 'Candidate'}
                  </div>
                  <div className="transcript-review-content">{msg.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '32px 0' }}>
          <Link href="/interview/setup" className="btn btn-primary btn-lg">
            <Mic size={18} /> Practice Again
          </Link>
          <Link href="/dashboard" className="btn btn-secondary btn-lg">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
