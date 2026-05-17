'use client';

import { useState, useEffect } from 'react';
import { generateSchedule } from '@/lib/api';

const mockSubjects = [
  { name: "Math", difficulty_level: 4, past_score: 65 },
  { name: "Physics", difficulty_level: 5, past_score: 55 },
  { name: "English", difficulty_level: 2, past_score: 85 },
];

export default function Dashboard() {
  const [subjects] = useState(mockSubjects);
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await generateSchedule(subjects, 21, 5.0);
      setSchedule(data);
    } catch (err) {
      setError('Could not reach the AI backend. Make sure the FastAPI server is running on port 8000.');
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h2>Welcome back, Pari! 👋</h2>
          <p>Here is your AI study overview for today.</p>
        </div>
        <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? <><span className="spinner"></span> Generating...</> : <>✨ Generate AI Schedule</>}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', color: '#f87171', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* AI Schedule Results */}
      {schedule && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-title">
            🤖 AI Recommended Study Plan
            <span className="model-badge">{schedule.model_used}</span>
          </div>
          <div className="schedule-grid">
            {schedule.schedule.map((item: any, idx: number) => (
              <div key={idx} className="schedule-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="schedule-subject">{item.subject}</span>
                  <span className={`badge badge-${item.priority?.toLowerCase()}`}>{item.priority}</span>
                </div>
                <div className="schedule-hours">
                  {item.allocated_hours.toFixed(1)}<span>hrs / day</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subjects Table */}
      <h3 className="section-title">Your Subjects</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Difficulty</th>
              <th>Past Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 600 }}>{sub.name}</td>
                <td>
                  <span style={{ color: sub.difficulty_level >= 4 ? '#f87171' : sub.difficulty_level >= 3 ? '#fbbf24' : '#34d399' }}>
                    {'★'.repeat(sub.difficulty_level)}{'☆'.repeat(5 - sub.difficulty_level)}
                  </span>
                </td>
                <td>{sub.past_score}%</td>
                <td>
                  <span className={`badge ${sub.past_score >= 80 ? 'badge-low' : sub.past_score >= 60 ? 'badge-medium' : 'badge-high'}`}>
                    {sub.past_score >= 80 ? 'Good' : sub.past_score >= 60 ? 'Needs Work' : 'Urgent'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
