'use client';
import { useState } from 'react';
import { generateSchedule } from '@/lib/api';

interface Subject { name: string; difficulty: number; past_score: number; }
interface ScheduleItem { subject: string; allocated_hours: number; priority: string; }

const DEFAULT_SUBJECTS: Subject[] = [
  { name: 'Math', difficulty: 4, past_score: 65 },
  { name: 'Physics', difficulty: 5, past_score: 55 },
  { name: 'English', difficulty: 2, past_score: 85 },
];

const PRIORITY_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

interface DailyPlanTabProps {
  triggerCelebration?: () => void;
}

export default function DailyPlanTab({ triggerCelebration }: DailyPlanTabProps = {}) {
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [newName, setNewName] = useState('');
  const [daysLeft, setDaysLeft] = useState(21);
  const [hoursPerDay, setHoursPerDay] = useState(5);
  const [schedule, setSchedule] = useState<ScheduleItem[] | null>(null);
  const [modelUsed, setModelUsed] = useState('');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addSubject = () => {
    const name = newName.trim();
    if (!name || subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) return;
    setSubjects([...subjects, { name, difficulty: 3, past_score: 70 }]);
    setNewName('');
  };

  const removeSubject = (i: number) => setSubjects(subjects.filter((_, idx) => idx !== i));
  const updateSubject = (i: number, f: keyof Subject, v: any) =>
    setSubjects(subjects.map((s, idx) => idx === i ? { ...s, [f]: v } : s));

  const handleGenerate = async () => {
    if (!subjects.length) { setError('Add at least one subject.'); return; }
    setLoading(true); setError(''); setSchedule(null);
    try {
      const data = await generateSchedule(subjects, daysLeft, hoursPerDay);
      setSchedule(data.schedule);
      setModelUsed(data.model_used);
      if (triggerCelebration) triggerCelebration();
    } catch { setError('Could not reach the AI backend. Make sure FastAPI is running on port 8000.'); }
    setLoading(false);
  };

  const suggestions = schedule ? schedule
    .filter(s => s.priority === 'High' || s.allocated_hours === Math.max(...schedule.map(x => x.allocated_hours)))
    .slice(0, 3) : [];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-title">⚙️ Study Settings</div>
          <div className="form-group">
            <label className="form-label">Days Until Exam: <strong style={{ color: '#a5b4fc' }}>{daysLeft}</strong></label>
            <input type="range" min="1" max="90" value={daysLeft} onChange={e => setDaysLeft(+e.target.value)} className="slider" />
            <div className="slider-labels"><span>1 day</span><span>90 days</span></div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Study Hours / Day: <strong style={{ color: '#a5b4fc' }}>{hoursPerDay}h</strong></label>
            <input type="range" min="1" max="12" step="0.5" value={hoursPerDay} onChange={e => setHoursPerDay(+e.target.value)} className="slider" />
            <div className="slider-labels"><span>1h</span><span>12h</span></div>
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: '1.25rem', justifyContent: 'center' }} onClick={handleGenerate} disabled={loading}>
            {loading ? <><span className="spinner" />&nbsp;Generating…</> : '✨ Generate AI Schedule'}
          </button>
        </div>
        <div className="card">
          <div className="card-title">📚 Add Subject</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input type="text" placeholder="e.g. Chemistry…" value={newName}
              onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()} className="text-input" />
            <button className="btn-primary" style={{ padding: '0.6rem 1.1rem' }} onClick={addSubject}>+ Add</button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{subjects.length} subject{subjects.length !== 1 ? 's' : ''} added.</p>
        </div>
      </div>

      {error && <div className="error-box">⚠️ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {subjects.map((sub, i) => (
          <div key={i} className="card subject-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700 }}>{sub.name}</span>
              <button className="remove-btn" onClick={() => removeSubject(i)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty: <span style={{ color: sub.difficulty >= 4 ? '#ef4444' : sub.difficulty >= 3 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>{'★'.repeat(sub.difficulty)}{'☆'.repeat(5 - sub.difficulty)} ({sub.difficulty}/5)</span></label>
              <input type="range" min="1" max="5" value={sub.difficulty} onChange={e => updateSubject(i, 'difficulty', +e.target.value)} className="slider" />
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">Past Score: <span style={{ color: sub.past_score >= 80 ? '#10b981' : sub.past_score >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{sub.past_score}%</span></label>
              <input type="range" min="0" max="100" value={sub.past_score} onChange={e => updateSubject(i, 'past_score', +e.target.value)} className="slider" />
            </div>
          </div>
        ))}
      </div>

      {schedule && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-title">🤖 Recommended Daily Plan <span className="model-badge">{modelUsed}</span></div>
              <table className="data-table">
                <thead><tr><th>Subject</th><th>Difficulty</th><th>Past Score</th><th>Days Left</th><th>Study Hours</th><th>Priority</th></tr></thead>
                <tbody>
                  {schedule.map((item, i) => {
                    const sub = subjects.find(s => s.name === item.subject);
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{item.subject}</td>
                        <td>{sub?.difficulty ?? '-'}</td>
                        <td>{sub?.past_score ?? '-'}%</td>
                        <td>{daysLeft}</td>
                        <td style={{ fontWeight: 700, color: '#a5b4fc' }}>{item.allocated_hours.toFixed(2)}h</td>
                        <td><span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: `${PRIORITY_COLOR[item.priority]}22`, color: PRIORITY_COLOR[item.priority], border: `1px solid ${PRIORITY_COLOR[item.priority]}44`, fontWeight: 600, textTransform: 'uppercase' }}>{item.priority}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Bar chart using SVG */}
              <div style={{ marginTop: '1.25rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Study Hours Bar Chart</p>
                <svg width="100%" height="120" style={{ overflow: 'visible' }}>
                  {schedule.map((item, i) => {
                    const maxH = Math.max(...schedule.map(s => s.allocated_hours));
                    const barW = 100 / schedule.length;
                    const barH = (item.allocated_hours / maxH) * 90;
                    const x = i * barW + barW * 0.1;
                    const color = PRIORITY_COLOR[item.priority];
                    return (
                      <g key={i}>
                        <rect x={`${x}%`} y={100 - barH} width={`${barW * 0.8}%`} height={barH} rx="4" fill={color} fillOpacity="0.8" />
                        <text x={`${x + barW * 0.4}%`} y="115" textAnchor="middle" fill="#8888aa" fontSize="11">{item.subject}</text>
                        <text x={`${x + barW * 0.4}%`} y={95 - barH} textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">{item.allocated_hours.toFixed(1)}h</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card">
                <div className="card-title">🏆 Best Model Selected</div>
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', color: '#a5b4fc', fontWeight: 600 }}>
                  ✅ {modelUsed}
                </div>
              </div>
              <div className="card">
                <div className="card-title">💡 Smart Suggestions</div>
                {suggestions.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No urgent subjects found.</p> : suggestions.map((s, i) => (
                  <div key={i} style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: `3px solid ${PRIORITY_COLOR[s.priority]}` }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.subject}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {s.priority === 'High' ? 'Needs immediate focus — high difficulty or low past score.' : `Keep ${s.subject} as your main focus today.`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
