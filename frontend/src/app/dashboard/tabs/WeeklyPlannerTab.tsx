'use client';
import { useState } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const MULTIPLIERS: Record<string, number> = { Mon: 1.15, Tue: 1.1, Wed: 1.0, Thu: 1.0, Fri: 0.95, Sat: 0.75, Sun: 0.65 };

const SUBJECTS = ['Math', 'Physics', 'English'];
const SUBJECT_HOURS = [2.1, 1.7, 1.2];

export default function WeeklyPlannerTab() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [xp, setXp] = useState(99);
  const xpLevel = Math.floor(xp / 25) + 1;
  const xpProgress = (xp % 25) / 25 * 100;

  const totalDaily = 5;

  const dayPlan = DAYS.map((day, i) => {
    const mult = MULTIPLIERS[day];
    const dayTotal = Math.min(totalDaily * mult, totalDaily);
    return {
      day,
      date: (() => { const d = new Date(); d.setDate(d.getDate() + i); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); })(),
      total: dayTotal,
      subjects: SUBJECTS.map((s, si) => ({
        name: s,
        hours: +(dayTotal * (SUBJECT_HOURS[si] / SUBJECT_HOURS.reduce((a, b) => a + b, 0))).toFixed(2),
        color: COLORS[si],
      })),
    };
  });

  const current = dayPlan[selectedDay];
  const totalHours = current.subjects.reduce((s, sub) => s + sub.hours, 0);
  const fmtH = (h: number) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`; };

  // Donut chart
  let cumAngle = -90;
  const donutSlices = current.subjects.map(sub => {
    const pct = sub.hours / totalHours;
    const angle = pct * 360;
    const start = cumAngle;
    cumAngle += angle;
    const r = 70;
    const cx = 100, cy = 100;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(start + angle));
    const y2 = cy + r * Math.sin(toRad(start + angle));
    const largeArc = angle > 180 ? 1 : 0;
    return { ...sub, pct, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z` };
  });

  return (
    <div>
      {/* XP Bar */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 700, color: '#a5b4fc' }}>Weekly XP</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setXp(xp + 10)}>Regenerate Plan</button>
            <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setXp(xp + 25)}>Claim XP +25</button>
          </div>
        </div>
        <div style={{ background: 'var(--border)', borderRadius: '99px', height: '12px', overflow: 'hidden', marginBottom: '0.4rem' }}>
          <div style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg,#f6b26b,#10b981)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{xp} XP — Level {xpLevel}</p>
      </div>

      {/* Day Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {dayPlan.map((dp, i) => (
          <button key={i} onClick={() => setSelectedDay(i)}
            style={{ padding: '0.5rem 1rem', borderRadius: '99px', border: `1px solid ${selectedDay === i ? '#6366f1' : 'var(--border)'}`, background: selectedDay === i ? 'rgba(99,102,241,0.2)' : 'transparent', color: selectedDay === i ? '#a5b4fc' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: selectedDay === i ? 700 : 400, transition: 'all 0.2s' }}>
            {dp.day}, {dp.date}
          </button>
        ))}
      </div>

      {/* Day Plan */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div className="card">
          <div className="card-title">{current.day}, {current.date}</div>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>{fmtH(current.total)}</p>
          {current.subjects.map((sub, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: sub.color }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{sub.name}</span>
              </div>
              <span style={{ fontWeight: 700, color: sub.color }}>{fmtH(sub.hours)}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {donutSlices.map((slice, i) => (
              <path key={i} d={slice.path} fill={slice.color} fillOpacity="0.85" stroke="var(--bg-card)" strokeWidth="2" />
            ))}
            <circle cx="100" cy="100" r="40" fill="var(--bg-card)" />
            <text x="100" y="96" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="bold">{fmtH(totalHours)}</text>
            <text x="100" y="112" textAnchor="middle" fill="var(--text-muted)" fontSize="10">total</text>
          </svg>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
            {donutSlices.map((s, i) => (
              <span key={i} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />{s.name} {(s.pct * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
