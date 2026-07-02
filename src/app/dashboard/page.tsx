'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSettings } from '@/lib/hooks/useSettings';
import { 
  Target, 
  Mic, 
  Clock, 
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  LogOut,
  Trophy,
  ClipboardList,
  Timer,
  LayoutDashboard,
  History,
  Code2,
  Settings,
  Sun,
  Moon,
  Plus,
  X,
  Key
} from 'lucide-react';

interface Interview {
  id: string;
  targetRole: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  overallScore?: number | null;
  feedback?: {
    overallScore: number;
    overallRating?: string;
    summary?: string;
    techProficiency?: Record<string, number> | null;
  } | null;
}

type Tab = 'overview' | 'history' | 'tech' | 'settings';

const POPULAR_TECH = [
  { name: 'JavaScript', icon: 'devicon-javascript-plain colored' },
  { name: 'TypeScript', icon: 'devicon-typescript-plain colored' },
  { name: 'Python', icon: 'devicon-python-plain colored' },
  { name: 'Java', icon: 'devicon-java-plain colored' },
  { name: 'C++', icon: 'devicon-cplusplus-plain colored' },
  { name: 'C#', icon: 'devicon-csharp-plain colored' },
  { name: 'Rust', icon: 'devicon-rust-original' },
  { name: 'Go', icon: 'devicon-go-original-wordmark colored' },
  { name: 'React', icon: 'devicon-react-original colored' },
  { name: 'Next.js', icon: 'devicon-nextjs-original' },
  { name: 'Vue.js', icon: 'devicon-vuejs-plain colored' },
  { name: 'Angular', icon: 'devicon-angularjs-plain colored' },
  { name: 'Node.js', icon: 'devicon-nodejs-plain colored' },
  { name: 'Django', icon: 'devicon-django-plain' },
  { name: 'Spring Boot', icon: 'devicon-spring-original colored' },
  { name: 'PostgreSQL', icon: 'devicon-postgresql-plain colored' },
  { name: 'MongoDB', icon: 'devicon-mongodb-plain colored' },
  { name: 'Redis', icon: 'devicon-redis-plain colored' },
  { name: 'Docker', icon: 'devicon-docker-plain colored' },
  { name: 'Kubernetes', icon: 'devicon-kubernetes-plain colored' },
  { name: 'AWS', icon: 'devicon-amazonwebservices-plain-wordmark colored' },
];

export default function DashboardPage() {
  const { user, token, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSettings, loaded: settingsLoaded } = useSettings();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Tech Stack state
  const [techStack, setTechStack] = useState<string[]>([]);
  const [newTech, setNewTech] = useState('');
  const [savingTech, setSavingTech] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (token) {
      // Fetch History
      fetch('/api/interview/history', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        },
        cache: 'no-store',
      })
        .then((res) => res.json())
        .then((data) => {
          setInterviews(data.interviews || []);
          setLoadingData(false);
        })
        .catch(() => setLoadingData(false));

      // Fetch Tech Stack
      fetch('/api/user/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.techStack) setTechStack(data.techStack);
        });
    }
  }, [token]);

  const saveTechStack = useCallback(async (newStack: string[]) => {
    setSavingTech(true);
    setTechStack(newStack);
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ techStack: newStack })
      });
    } finally {
      setSavingTech(false);
    }
  }, [token]);

  const addTech = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newTech.trim() && !techStack.includes(newTech.trim())) {
      saveTechStack([...techStack, newTech.trim()]);
      setNewTech('');
    }
  }, [newTech, techStack, saveTechStack]);

  const removeTech = useCallback((tech: string) => {
    saveTechStack(techStack.filter(t => t !== tech));
  }, [techStack, saveTechStack]);

  const completedInterviews = useMemo(() => interviews.filter((i) => i.status.toLowerCase() === 'completed'), [interviews]);
  const totalInterviews = interviews.length;
  
  const avgScore = useMemo(() => {
    if (completedInterviews.length === 0) return 0;
    const raw = completedInterviews.reduce((sum, i) => sum + (i.feedback?.overallScore || 0), 0) / completedInterviews.length;
    // Scores from AI are 0-10, display as 0-100
    return Math.round(raw <= 10 ? raw * 10 : raw);
  }, [completedInterviews]);

  const bestScore = useMemo(() => {
    if (completedInterviews.length === 0) return 0;
    const raw = Math.max(...completedInterviews.map((i) => i.feedback?.overallScore || 0));
    // Scores from AI are 0-10, display as 0-100
    return Math.round(raw <= 10 ? raw * 10 : raw);
  }, [completedInterviews]);

  const aggregatedProficiency = useMemo(() => {
    const proficiencies: Record<string, { total: number; count: number }> = {};
    completedInterviews.forEach(interview => {
      const tp = (interview.feedback as any)?.techProficiency;
      if (tp && typeof tp === 'object') {
        Object.entries(tp).forEach(([tech, score]) => {
          if (typeof score === 'number') {
            if (!proficiencies[tech]) proficiencies[tech] = { total: 0, count: 0 };
            proficiencies[tech].total += score;
            proficiencies[tech].count += 1;
          }
        });
      }
    });
    const result: Record<string, number> = {};
    Object.entries(proficiencies).forEach(([tech, data]) => {
      result[tech] = Math.round(data.total / data.count);
    });
    return result;
  }, [completedInterviews]);

  const getInitials = useCallback((name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2), []);
  const formatDate = useCallback((dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }), []);
  const formatDuration = useCallback((start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    return mins > 0 ? `${mins} min` : '< 1 min';
  }, []);

  if (loading || !user || !settingsLoaded) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Loading dashboard...</p>
      </div>
    );
  }



  return (
    <div className="dashboard-layout">
      {/* ─── Sidebar ─── */}
      <div className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <div className="navbar-brand">
            <div className="navbar-brand-icon"><Target size={18} /></div>
            MentorQ
          </div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className={`sidebar-nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            <History size={18} /> Past Interviews
          </button>
          <button className={`sidebar-nav-item ${activeTab === 'tech' ? 'active' : ''}`} onClick={() => setActiveTab('tech')}>
            <Code2 size={18} /> Tech Stack
          </button>
          <button className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={18} /> Settings
          </button>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
          <button className="sidebar-nav-item" onClick={logout} style={{ color: 'var(--text-tertiary)' }}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="dashboard-main">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="fade-in">
            <h1 style={{ marginBottom: 24, fontSize: 24 }}>Welcome back, {user.name.split(' ')[0]}</h1>
            
            <div className="profile-card" style={{ marginBottom: 32 }}>
              <div className="profile-avatar">{getInitials(user.name)}</div>
              <div className="profile-info">
                <div className="profile-name">{user.name}</div>
                <div className="profile-email">{user.email}</div>
              </div>
              <div className="profile-score-area">
                <div className="score-gauge">
                  <span className="score-gauge-number">{avgScore}</span>
                  <span className="score-gauge-max">/100</span>
                </div>
                <div className="score-gauge-label">Avg Score</div>
              </div>
            </div>

            <div className="detail-row" style={{ marginBottom: 32 }}>
              <div className="detail-item">
                <div className="detail-item-icon blue"><ClipboardList size={18} /></div>
                <div className="detail-item-text">
                  <div className="detail-item-label">Total Sessions</div>
                  <div className="detail-item-value">{totalInterviews}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-icon green"><CheckCircle2 size={18} /></div>
                <div className="detail-item-text">
                  <div className="detail-item-label">Completed</div>
                  <div className="detail-item-value">{completedInterviews.length}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-icon purple"><Trophy size={18} /></div>
                <div className="detail-item-text">
                  <div className="detail-item-label">Best Score</div>
                  <div className="detail-item-value">{bestScore > 0 ? `${bestScore}/100` : '—'}</div>
                </div>
              </div>
            </div>

            {Object.keys(aggregatedProficiency).length > 0 && (
              <div className="settings-card" style={{ marginBottom: 32 }}>
                <h3><Code2 size={20} /> Average Tech Proficiency</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                  Your average evaluation scores across all completed practice interviews.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                  {Object.entries(aggregatedProficiency).map(([tech, score]) => (
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
            )}

            <div className="start-interview-card">
              <h3>Ready for your next practice session?</h3>
              <p>Our AI interviewer adapts to your tech stack and target role.</p>
              <button className="btn btn-primary btn-lg" onClick={() => router.push('/interview/setup')}>
                <Mic size={18} /> Start Practice Interview <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="fade-in">
            <h2 style={{ marginBottom: 24 }}>Past Interviews</h2>
            {loadingData ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : interviews.length === 0 ? (
              <div className="empty-state">
                <Mic size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <h3>No interviews yet</h3>
                <p>Start your first practice interview to see your history.</p>
              </div>
            ) : (
              <div className="interview-list">
                {interviews.map((interview) => (
                  <div key={interview.id} className="interview-card" onClick={() => router.push(`/review/${interview.id}`)}>
                    <div className={`interview-card-icon ${interview.status.toLowerCase() === 'completed' ? 'completed' : 'in-progress'}`}>
                      {interview.status.toLowerCase() === 'completed' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>
                    <div className="interview-card-info">
                      <div className="interview-card-role">{interview.targetRole}</div>
                      <div className="interview-card-meta">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} /> {formatDate(interview.createdAt)}
                        </span>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Timer size={12} /> {formatDuration(interview.createdAt, interview.endedAt || interview.createdAt)}
                        </span>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Zap size={12} /> {interview.status.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    {interview.feedback?.overallScore != null && (
                      <div className="interview-card-score">
                        {interview.feedback.overallScore}
                        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>/100</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TECH STACK TAB */}
        {activeTab === 'tech' && (
          <div className="fade-in">
            <h2 style={{ marginBottom: 24 }}>Your Tech Stack</h2>
            <div className="settings-card">
              <h3><Code2 size={20} /> Skills & Technologies</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                Add the programming languages, frameworks, and tools you know. The AI will use these to ask you context-aware questions during your interviews.
              </p>
              
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Selected Technologies:</h4>
                {techStack.map(tech => {
                  const preset = POPULAR_TECH.find(p => p.name === tech);
                  return (
                    <span key={tech} className="tech-tag">
                      {preset && <i className={preset.icon} style={{ fontSize: 16 }}></i>}
                      {tech}
                      <button onClick={() => removeTech(tech)}><X size={14} /></button>
                    </span>
                  );
                })}
                {techStack.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>No technologies selected yet.</p>}
              </div>

              <h4 style={{ fontSize: 14, marginBottom: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Popular Technologies</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                {POPULAR_TECH.map(tech => {
                  const isSelected = techStack.includes(tech.name);
                  return (
                    <button
                      key={tech.name}
                      onClick={() => isSelected ? removeTech(tech.name) : saveTechStack([...techStack, tech.name])}
                      disabled={savingTech}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: isSelected ? 'var(--bg-primary)' : 'var(--bg-main)',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                        opacity: savingTech ? 0.7 : 1
                      }}
                    >
                      <i className={tech.icon} style={{ fontSize: 20 }}></i>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{tech.name}</span>
                    </button>
                  );
                })}
              </div>

              <h4 style={{ fontSize: 14, marginBottom: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Or add custom:</h4>
              <form onSubmit={addTech} style={{ display: 'flex', gap: 12 }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. GraphQL, Tailwind..." 
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  disabled={savingTech}
                />
                <button type="submit" className="btn btn-secondary" disabled={!newTech.trim() || savingTech}>
                  <Plus size={16} /> Add
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="fade-in">
            <h2 style={{ marginBottom: 24 }}>Settings</h2>
            
            <div className="settings-card" style={{ marginBottom: 24 }}>
              <h3><Key size={20} /> Custom API Key</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                Provide your own Groq API key to bypass server rate limits. Your key is securely stored only in your local browser.
              </p>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Groq API Key</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="gsk_..." 
                    value={settings.customApiKey}
                    onChange={(e) => updateSettings({ customApiKey: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (document.activeElement as HTMLElement)?.blur();
                      }
                    }}
                  />
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => { (document.activeElement as HTMLElement)?.blur(); }}
                  >
                    Enter
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <h3><Trophy size={20} /> Interview Difficulty</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                Select how rigorous you want the AI to be during the interview.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { id: 'easy', label: 'Easy', desc: 'Relaxed tone, basic questions, lenient grading.' },
                  { id: 'intermediate', label: 'Intermediate', desc: 'Standard interview rigor. Good for general practice.' },
                  { id: 'master', label: 'Master', desc: 'Strict edge-cases, deep architectural probes, and tough follow-ups.' }
                ].map((level) => (
                  <label 
                    key={level.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: 12, 
                      padding: 16, 
                      border: `1px solid ${settings.difficultyLevel === level.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-lg)',
                      background: settings.difficultyLevel === level.id ? 'var(--bg-primary)' : 'var(--bg-main)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value={level.id} 
                      checked={settings.difficultyLevel === level.id}
                      onChange={() => updateSettings({ difficultyLevel: level.id as any })}
                      style={{ marginTop: 4 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: settings.difficultyLevel === level.id ? 'var(--primary)' : 'var(--text-primary)' }}>
                        {level.label}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {level.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
