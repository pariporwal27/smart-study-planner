'use client';

import { useState } from 'react';
import { generateSchedule } from '@/lib/api';

interface Subject {
  name: string;
  difficulty: number;
  past_score: number;
}

interface ScheduleItem {
  subject: string;
  allocated_hours: number;
  priority: string;
}

const DEFAULT_SUBJECTS: Subject[] = [
  { name: 'Math', difficulty: 4, past_score: 65 },
  { name: 'Physics', difficulty: 5, past_score: 55 },
  { name: 'English', difficulty: 2, past_score: 85 },
];

export default function Dashboard() {
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [daysLeft, setDaysLeft] = useState(21);
  const [hoursPerDay, setHoursPerDay] = useState(5);
  const [schedule, setSchedule] = useState<ScheduleItem[] | null>(null);
  const [modelUsed, setModelUsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Subject management
  const addSubject = () => {
    const name = newSubjectName.trim();
    if (!name || subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) return;
    setSubjects([...subjects, { name, difficulty: 3, past_score: 70 }]);
    setNewSubjectName('');
  };

  const removeSubject = (idx: number) => {
    setSubjects(subjects.filter((_, i) => i !== idx));
  };

  const updateSubject = (idx: number, field: keyof Subject, value: number | string) => {
    setSubjects(subjects.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleGenerate = async () => {
    if (subjects.length === 0) { setError('Please add at least one subject.'); return; }
    setLoading(true);
    setError('');
    setSchedule(null);
    try {
      const data = await generateSchedule(subjects, daysLeft, hoursPerDay);
      setSchedule(data.schedule);
      setModelUsed(data.model_used);
    } catch {
      setError('Could not reach the AI backend. Make sure FastAPI is running on port 8000 (backend terminal).');
    }
    setLoading(false);
  };

  const priorityColor = (p: string) => {
    if (p === 'High') return '#ef4444';
    if (p === 'Medium') return '#f59e0b';
    return '#10b981';
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-text">
          <h2>Welcome back, Pari! 👋</h2>
          <p>Configure your subjects and generate your AI study plan.</p>
        </div>
        <button className="btn-primary" onClick={handleGenerate} disabled={loading || subjects.length === 0}>
          {loading ? <><span className="spinner"></span>&nbsp;Generating…</> : '✨ Generate AI Schedule'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', color: '#f87171', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* ── Global Settings ── */}
        <div className="card">
          <div className="card-title">⚙️ Study Settings</div>

          <div className="form-group">
            <label className="form-label">Days Until Exam: <strong style={{ color: '#a5b4fc' }}>{daysLeft}</strong></label>
            <input
              type="range" min="1" max="90" value={daysLeft}
              onChange={e => setDaysLeft(Number(e.target.value))}
              className="slider"
            />
            <div className="slider-labels"><span>1 day</span><span>90 days</span></div>
          </div>

          <div className="form-group" style={{ marginTop: '1.25rem' }}>
            <label className="form-label">Study Hours / Day: <strong style={{ color: '#a5b4fc' }}>{hoursPerDay}h</strong></label>
            <input
              type="range" min="1" max="12" step="0.5" value={hoursPerDay}
              onChange={e => setHoursPerDay(Number(e.target.value))}
              className="slider"
            />
            <div className="slider-labels"><span>1h</span><span>12h</span></div>
          </div>
        </div>

        {/* ── Add Subject ── */}
        <div className="card">
          <div className="card-title">📚 Add a Subject</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="e.g. Chemistry, Biology…"
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSubject()}
              className="text-input"
            />
            <button className="btn-primary" style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }} onClick={addSubject}>
              + Add
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} added. Press Enter or click Add.
          </p>
        </div>
      </div>

      {/* ── Subject Cards ── */}
      <h3 className="section-title">Your Subjects</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {subjects.map((sub, idx) => (
          <div key={idx} className="card subject-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{sub.name}</span>
              <button onClick={() => removeSubject(idx)} className="remove-btn" title="Remove subject">✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">
                Difficulty:&nbsp;
                <span style={{ color: sub.difficulty >= 4 ? '#ef4444' : sub.difficulty >= 3 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                  {'★'.repeat(sub.difficulty)}{'☆'.repeat(5 - sub.difficulty)} ({sub.difficulty}/5)
                </span>
              </label>
              <input
                type="range" min="1" max="5" value={sub.difficulty}
                onChange={e => updateSubject(idx, 'difficulty', Number(e.target.value))}
                className="slider"
              />
              <div className="slider-labels"><span>Easy</span><span>Very Hard</span></div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">
                Past Score:&nbsp;
                <span style={{ color: scoreColor(sub.past_score), fontWeight: 700 }}>{sub.past_score}%</span>
              </label>
              <input
                type="range" min="0" max="100" value={sub.past_score}
                onChange={e => updateSubject(idx, 'past_score', Number(e.target.value))}
                className="slider"
              />
              <div className="slider-labels"><span>0%</span><span>100%</span></div>
            </div>
          </div>
        ))}

        {subjects.length === 0 && (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📖</div>
            <p>No subjects yet. Add one above to get started!</p>
          </div>
        )}
      </div>

      {/* ── AI Schedule Results ── */}
      {schedule && (
        <>
          <h3 className="section-title">
            🤖 AI Study Plan&nbsp;
            <span className="model-badge">{modelUsed}</span>
          </h3>
          <div className="schedule-grid" style={{ marginBottom: '2rem' }}>
            {schedule.map((item, idx) => (
              <div key={idx} className="schedule-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="schedule-subject">{item.subject}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                    borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: `${priorityColor(item.priority)}22`,
                    color: priorityColor(item.priority),
                    border: `1px solid ${priorityColor(item.priority)}44`
                  }}>
                    {item.priority}
                  </span>
                </div>
                <div className="schedule-hours">
                  {item.allocated_hours.toFixed(2)}<span>hrs / day</span>
                </div>
                {/* Progress bar proportional to hours */}
                <div style={{ background: 'var(--border)', borderRadius: '99px', height: '4px', marginTop: '0.5rem' }}>
                  <div style={{
                    height: '100%', borderRadius: '99px',
                    background: `linear-gradient(90deg, ${priorityColor(item.priority)}, #8b5cf6)`,
                    width: `${Math.min((item.allocated_hours / hoursPerDay) * 100, 100)}%`
                  }} />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {((item.allocated_hours / hoursPerDay) * 100).toFixed(0)}% of your daily time
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
