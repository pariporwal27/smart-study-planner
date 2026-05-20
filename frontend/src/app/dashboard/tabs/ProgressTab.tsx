// Pydantic-like structure for study target milestones
// Core type definitions for logged study sessions
'use client';

import { useState, useEffect } from 'react';

interface ProgressEntry {
  date: string;
  subject: string;
  planned: number;
  actual: number;
}

interface Goal {
  id: number;
  subject: string;
  targetHours: number;
  completed: boolean;
}

interface RevisionTask {
  subject: string;
  reviewDate: string;
  intervalDays: number;
}

const SUBJECTS = ['Math', 'Physics', 'English'];

interface ProgressTabProps {
  addToast?: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export default function ProgressTab({ addToast }: ProgressTabProps) {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [actualHours, setActualHours] = useState<Record<string, number>>({});
  const [plannedHours] = useState<Record<string, number>>({ Math: 1.25, Physics: 1.25, English: 1.25 });

  // Goals State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalSubject, setGoalSubject] = useState(SUBJECTS[0]);
  const [goalHours, setGoalHours] = useState(5);

  // Spaced Repetition Revision State
  const [revisions, setRevisions] = useState<RevisionTask[]>([]);

  useEffect(() => {
    const savedProgress = localStorage.getItem('study_progress');
    if (savedProgress) setEntries(JSON.parse(savedProgress));

    const savedGoals = localStorage.getItem('study_goals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    } else {
      const defaultGoals = [
        { id: 1, subject: 'Math', targetHours: 10, completed: false },
        { id: 2, subject: 'Physics', targetHours: 8, completed: false }
      ];
      setGoals(defaultGoals);
      localStorage.setItem('study_goals', JSON.stringify(defaultGoals));
    }
  }, []);

  // Compute Spaced Repetition lists dynamically from logged study sessions!
  useEffect(() => {
    if (entries.length === 0) return;
    
    // For each unique logged study entry where actual hours > 0, schedule standard revision intervals:
    // T+1 day, T+3 days, T+7 days
    const computedRevisions: RevisionTask[] = [];
    
    // Sort entries by date descending to find the latest study session per subject
    const latestSessions: Record<string, string> = {};
    entries.forEach(e => {
      if (e.actual > 0) {
        if (!latestSessions[e.subject] || e.date > latestSessions[e.subject]) {
          latestSessions[e.subject] = e.date;
        }
      }
    });

    Object.entries(latestSessions).forEach(([subj, dateStr]) => {
      const baseDate = new Date(dateStr);
      
      // Calculate intervals
      [1, 3, 7].forEach(days => {
        const revDate = new Date(baseDate);
        revDate.setDate(baseDate.getDate() + days);
        computedRevisions.push({
          subject: subj,
          reviewDate: revDate.toISOString().split('T')[0],
          intervalDays: days
        });
      });
    });

    // Sort by review date ascending
    computedRevisions.sort((a, b) => a.reviewDate.localeCompare(b.reviewDate));
    setRevisions(computedRevisions.slice(0, 5)); // display next 5 revision targets
  }, [entries]);

  const saveProgress = () => {
    const newRows: ProgressEntry[] = SUBJECTS.map(s => ({
      date,
      subject: s,
      planned: plannedHours[s] || 0,
      actual: actualHours[s] || 0,
    }));
    
    const filtered = entries.filter(e => !(e.date === date && SUBJECTS.includes(e.subject)));
    const updated = [...filtered, ...newRows];
    setEntries(updated);
    localStorage.setItem('study_progress', JSON.stringify(updated));

    if (addToast) addToast("Progress saved successfully!", "success");

    // Auto-update goals progress!
    const updatedGoals = goals.map(g => {
      const totalStudied = updated
        .filter(e => e.subject === g.subject)
        .reduce((sum, e) => sum + e.actual, 0);
      
      if (totalStudied >= g.targetHours && !g.completed) {
        if (addToast) addToast(`🎯 Goal completed for ${g.subject}!`, "success");
        return { ...g, completed: true };
      }
      return g;
    });
    setGoals(updatedGoals);
    localStorage.setItem('study_goals', JSON.stringify(updatedGoals));
  };

  const resetProgress = () => {
    if (confirm('Clear all progress?')) {
      setEntries([]);
      localStorage.removeItem('study_progress');
      if (addToast) addToast("All study progress cleared.", "warning");
    }
  };

  // Add Custom Goal
  const addGoal = () => {
    const newGoal: Goal = {
      id: Date.now(),
      subject: goalSubject,
      targetHours: goalHours,
      completed: false
    };
    const updated = [...goals, newGoal];
    setGoals(updated);
    localStorage.setItem('study_goals', JSON.stringify(updated));
    if (addToast) addToast(`New milestone goal added for ${goalSubject}!`, "success");
  };

  const removeGoal = (id: number) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    localStorage.setItem('study_goals', JSON.stringify(updated));
  };

  const toggleGoalComplete = (id: number) => {
    const updated = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
    setGoals(updated);
    localStorage.setItem('study_goals', JSON.stringify(updated));
    if (addToast) addToast("Goal status updated!", "success");
  };

  // Calculations
  const totalPlanned = entries.reduce((s, e) => s + e.planned, 0);
  const totalActual = entries.reduce((s, e) => s + e.actual, 0);
  const consistency = totalPlanned > 0 ? Math.min((totalActual / totalPlanned) * 100, 100) : 0;
  const uniqueDates = [...new Set(entries.map(e => e.date))].sort();
  
  const streak = (() => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (uniqueDates.includes(ds)) s++; else break;
    }
    return s;
  })();

  const byDate = uniqueDates.map(d => {
    const dayEntries = entries.filter(e => e.date === d);
    return {
      date: d,
      planned: dayEntries.reduce((s, e) => s + e.planned, 0),
      actual: dayEntries.reduce((s, e) => s + e.actual, 0)
    };
  });

  const maxH = Math.max(...byDate.map(d => Math.max(d.planned, d.actual)), 1);

  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Consistency Score', value: `${consistency.toFixed(1)}%`, color: consistency >= 80 ? '#10b981' : consistency >= 50 ? '#f59e0b' : '#ef4444' },
          { label: 'Current Streak', value: `${streak} days`, color: '#a5b4fc' },
          { label: 'Status Badge', value: consistency >= 80 ? 'Highly Consistent' : consistency >= 50 ? 'Moderately Consistent' : 'Needs Improvement', color: '#8b5cf6' },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{stat.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Log Progress */}
        <div className="card">
          <div className="card-title">📝 Log Today's Progress</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Progress Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="text-input" style={{ width: '160px' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {SUBJECTS.map(s => (
              <div key={s} className="form-group">
                <label className="form-label">{s} actual hours: <strong style={{ color: '#a5b4fc' }}>{(actualHours[s] || 0).toFixed(2)}</strong></label>
                <input type="range" min="0" max="8" step="0.25" value={actualHours[s] || 0}
                  onChange={e => setActualHours({ ...actualHours, [s]: +e.target.value })}
                  className="slider" />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={saveProgress}>💾 Save Progress</button>
            <button className="btn-secondary" onClick={resetProgress}>🗑 Reset Progress</button>
          </div>
        </div>

        {/* Goal Milestone Tracker */}
        <div className="card">
          <div className="card-title">🎯 Custom Study Goals</div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <select 
              value={goalSubject} 
              onChange={e => setGoalSubject(e.target.value)} 
              className="text-input"
              style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input 
              type="number" 
              min="1" 
              max="100" 
              value={goalHours} 
              onChange={e => setGoalHours(Number(e.target.value))} 
              className="text-input" 
              style={{ width: '80px', textAlign: 'center' }} 
            />
            <button className="btn-primary" onClick={addGoal} style={{ padding: '0.6rem 1rem' }}>+ Goal</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
            {goals.map(g => {
              const studied = entries.filter(e => e.subject === g.subject).reduce((sum, e) => sum + e.actual, 0);
              const pct = Math.min((studied / g.targetHours) * 100, 100);
              return (
                <div key={g.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, textDecoration: g.completed ? 'line-through' : 'none', color: g.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      🏆 {g.subject} Target: {g.targetHours}h
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <input type="checkbox" checked={g.completed} onChange={() => toggleGoalComplete(g.id)} style={{ cursor: 'pointer' }} />
                      <button onClick={() => removeGoal(g.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                    </div>
                  </div>
                  <div style={{ background: 'var(--border)', height: '4px', borderRadius: '99px' }}>
                    <div style={{ background: g.completed ? '#10b981' : '#6366f1', width: `${pct}%`, height: '100%', borderRadius: '99px' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Progress: {studied.toFixed(1)}h / {g.targetHours}h ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
            {goals.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>No milestone goals configured.</p>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Line Chart */}
        {byDate.length > 0 ? (
          <div className="card">
            <div className="card-title">📊 Planned vs Actual Study Hours</div>
            <svg width="100%" height="160" style={{ overflow: 'visible' }}>
              {byDate.map((d, i) => {
                const x = byDate.length === 1 ? 50 : (i / (byDate.length - 1)) * 90 + 5;
                const yP = 140 - (d.planned / maxH) * 120;
                const yA = 140 - (d.actual / maxH) * 120;
                const prevX = i === 0 ? x : byDate.length === 1 ? 50 : ((i - 1) / (byDate.length - 1)) * 90 + 5;
                const prevD = byDate[i - 1];
                const prevYP = i === 0 ? yP : 140 - (prevD.planned / maxH) * 120;
                const prevYA = i === 0 ? yA : 140 - (prevD.actual / maxH) * 120;
                return (
                  <g key={i}>
                    {i > 0 && <>
                      <line x1={`${prevX}%`} y1={prevYP} x2={`${x}%`} y2={yP} stroke="#6366f1" strokeWidth="2" />
                      <line x1={`${prevX}%`} y1={prevYA} x2={`${x}%`} y2={yA} stroke="#10b981" strokeWidth="2" />
                    </>}
                    <circle cx={`${x}%`} cy={yP} r="4" fill="#6366f1" />
                    <circle cx={`${x}%`} cy={yA} r="4" fill="#10b981" />
                    <text x={`${x}%`} y="158" textAnchor="middle" fill="#8888aa" fontSize="9">{d.date.slice(5)}</text>
                  </g>
                );
              })}
            </svg>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#6366f1' }}>● Planned</span>
              <span style={{ fontSize: '0.78rem', color: '#10b981' }}>● Actual</span>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)' }}>
            Log study sessions above to draw your productivity comparison chart.
          </div>
        )}

        {/* 🧠 Spaced Repetition Revision Planner */}
        <div className="card">
          <div className="card-title">🧠 Spaced Repetition Revision Schedule</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Calculated study-refresh sessions dynamically configured to maximize retention.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {revisions.map((rev, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'var(--bg-secondary)', borderLeft: '3px solid var(--purple)', borderRadius: '4px 8px 8px 4px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{rev.subject}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    ({rev.intervalDays === 1 ? '1st Review' : rev.intervalDays === 3 ? '2nd Review' : '3rd Review'})
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', background: 'rgba(139, 92, 246, 0.15)', color: '#a5b4fc', padding: '0.2rem 0.6rem', borderRadius: '99px', fontWeight: 600 }}>
                  📅 {rev.reviewDate}
                </span>
              </div>
            ))}
            {revisions.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem' }}>
                No active revisions scheduled. Schedule active study logs to activate Leitner Spaced Repetition!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      {entries.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-title" style={{ padding: '1.25rem 1.5rem 0' }}>🗂 Progress History</div>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Subject</th><th>Planned</th><th>Actual</th><th>Completion</th></tr></thead>
            <tbody>
              {[...entries].reverse().slice(0, 10).map((e, i) => {
                const pct = e.planned > 0 ? Math.min((e.actual / e.planned) * 100, 100) : 0;
                return (
                  <tr key={i}>
                    <td>{e.date}</td>
                    <td style={{ fontWeight: 600 }}>{e.subject}</td>
                    <td>{e.planned.toFixed(2)}h</td>
                    <td>{e.actual.toFixed(2)}h</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: 'var(--border)', borderRadius: '99px', height: '4px' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '99px' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
