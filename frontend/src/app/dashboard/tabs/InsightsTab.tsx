'use client';
import { useEffect, useState } from 'react';

const PERSONAS = [
  { id: 'consistent', label: 'Consistent Learner', icon: '🎯', color: '#10b981', desc: 'Your study habits are stable and disciplined.', advice: 'Keep the routine steady and use weekly review sessions to protect long-term retention.' },
  { id: 'deep', label: 'Deep Focus Student', icon: '🔥', color: '#6366f1', desc: 'You regularly put in focused study time.', advice: 'Track topic-level outcomes so your long sessions stay purposeful.' },
  { id: 'casual', label: 'Casual Learner', icon: '📖', color: '#f59e0b', desc: 'Your study pattern is still light or irregular.', advice: 'Start with small daily targets and build a streak before increasing total hours.' },
  { id: 'burnout', label: 'Burnout Risk', icon: '⚠️', color: '#ef4444', desc: 'You may be studying more than needed or stacking very long days.', advice: 'Use 50-minute focus blocks, add breaks, and keep at least one lighter recovery day.' },
];

export default function InsightsTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [personaIdx, setPersonaIdx] = useState(2);

  useEffect(() => {
    const saved = localStorage.getItem('study_progress');
    if (saved) {
      const data = JSON.parse(saved);
      setEntries(data);
      const totalActual = data.reduce((s: number, e: any) => s + e.actual, 0);
      const totalPlanned = data.reduce((s: number, e: any) => s + e.planned, 0);
      const consistency = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
      const avgActual = data.length > 0 ? totalActual / [...new Set(data.map((e: any) => e.date))].length : 0;
      if (totalActual > totalPlanned * 1.15 || avgActual > 8) setPersonaIdx(3);
      else if (consistency >= 80 && avgActual <= 6) setPersonaIdx(0);
      else if (avgActual >= 4 && data.length >= 3) setPersonaIdx(1);
      else setPersonaIdx(2);
    }
  }, []);

  const persona = PERSONAS[personaIdx];
  const uniqueDates = [...new Set(entries.map((e: any) => e.date))];
  const streak = (() => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (uniqueDates.includes(ds)) s++; else break;
    }
    return s;
  })();
  const totalActual = entries.reduce((s: number, e: any) => s + e.actual, 0);
  const totalPlanned = entries.reduce((s: number, e: any) => s + e.planned, 0);
  const consistency = totalPlanned > 0 ? Math.min((totalActual / totalPlanned) * 100, 100) : 0;

  // Subject breakdown
  const bySubject: Record<string, number> = {};
  entries.forEach((e: any) => { bySubject[e.subject] = (bySubject[e.subject] || 0) + e.actual; });
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div>
      {/* Persona Card */}
      <div className="card" style={{ marginBottom: '1.5rem', border: `1px solid ${persona.color}44`, background: `${persona.color}0a` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem' }}>{persona.icon}</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1.2rem', color: persona.color, marginBottom: '0.4rem' }}>{persona.label}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{persona.desc}</p>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontStyle: 'italic' }}>💡 {persona.advice}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Study Sessions', value: entries.length },
          { label: 'Days Logged', value: uniqueDates.length },
          { label: 'Current Streak', value: `${streak} 🔥` },
          { label: 'Consistency', value: `${consistency.toFixed(0)}%` },
        ].map((m, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>{m.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Subject Breakdown */}
      {Object.keys(bySubject).length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">📚 Total Hours by Subject</div>
          {Object.entries(bySubject).map(([subj, hrs], i) => {
            const maxHrs = Math.max(...Object.values(bySubject));
            return (
              <div key={i} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{subj}</span>
                  <span style={{ color: COLORS[i % COLORS.length], fontWeight: 700 }}>{hrs.toFixed(2)}h</span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: '99px', height: '6px' }}>
                  <div style={{ width: `${(hrs / maxHrs) * 100}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: '99px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <p style={{ color: 'var(--text-muted)' }}>Save progress in the Progress tab to see your insights and productivity persona!</p>
        </div>
      )}
    </div>
  );
}
