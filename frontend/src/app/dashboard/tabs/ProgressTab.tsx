'use client';
import { useState, useEffect } from 'react';

interface ProgressEntry { date: string; subject: string; planned: number; actual: number; }

const SUBJECTS = ['Math', 'Physics', 'English'];

export default function ProgressTab() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [actualHours, setActualHours] = useState<Record<string, number>>({});
  const [plannedHours] = useState<Record<string, number>>({ Math: 1.25, Physics: 1.25, English: 1.25 });

  useEffect(() => {
    const saved = localStorage.getItem('study_progress');
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  const saveProgress = () => {
    const newRows: ProgressEntry[] = SUBJECTS.map(s => ({
      date, subject: s,
      planned: plannedHours[s] || 0,
      actual: actualHours[s] || 0,
    }));
    const filtered = entries.filter(e => !(e.date === date && SUBJECTS.includes(e.subject)));
    const updated = [...filtered, ...newRows];
    setEntries(updated);
    localStorage.setItem('study_progress', JSON.stringify(updated));
  };

  const resetProgress = () => {
    if (confirm('Clear all progress?')) { setEntries([]); localStorage.removeItem('study_progress'); }
  };

  // Stats
  const totalPlanned = entries.reduce((s, e) => s + e.planned, 0);
  const totalActual = entries.reduce((s, e) => s + e.actual, 0);
  const consistency = totalPlanned > 0 ? Math.min((totalActual / totalPlanned) * 100, 100) : 0;
  const uniqueDates = [...new Set(entries.map(e => e.date))].sort();
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

  // Chart data: aggregate by date
  const byDate = uniqueDates.map(d => {
    const dayEntries = entries.filter(e => e.date === d);
    return { date: d, planned: dayEntries.reduce((s, e) => s + e.planned, 0), actual: dayEntries.reduce((s, e) => s + e.actual, 0) };
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

      {/* Log Progress */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">📝 Log Today's Progress</div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Progress Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-input" style={{ width: '160px' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
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

      {/* Line Chart */}
      {byDate.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
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
      )}

      {/* History Table */}
      {entries.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-title" style={{ padding: '1.25rem 1.5rem 0' }}>🗂 Progress History</div>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Subject</th><th>Planned</th><th>Actual</th><th>Completion</th></tr></thead>
            <tbody>
              {[...entries].reverse().slice(0, 20).map((e, i) => {
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
