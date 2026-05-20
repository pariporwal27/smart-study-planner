// Convert custom minutes inputs into focus seconds
// Transition preset indexes resetting active countdowns
// Active side-effect managing countdown interval callbacks
// Dynamic Pomodoro timer values defined in seconds
'use client';

import { useState, useEffect, useRef } from 'react';

const PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
];

export default function ZenModeTab() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PRESETS[0].seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [customMin, setCustomMin] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeLeft === 0 && isRunning) {
        setIsRunning(false);
        setDone(true);
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  const selectPreset = (idx: number) => {
    setSelectedPreset(idx);
    setTimeLeft(PRESETS[idx].seconds);
    setIsRunning(false);
    setDone(false);
    setShowCustom(false);
  };

  const applyCustom = () => {
    const mins = parseInt(customMin);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      setTimeLeft(mins * 60);
      setIsRunning(false);
      setDone(false);
      setSelectedPreset(-1);
      setShowCustom(false);
    }
  };

  const reset = () => {
    setIsRunning(false);
    setDone(false);
    const secs = selectedPreset >= 0 ? PRESETS[selectedPreset].seconds : (parseInt(customMin) || 25) * 60;
    setTimeLeft(secs);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h3 className="section-title" style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>🧘 Deep Focus Zen Session</h3>

      {/* Timer Presets */}
      <div className="zen-presets">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            className={`zen-preset-btn ${selectedPreset === i ? 'active' : ''}`}
            onClick={() => selectPreset(i)}
          >
            {p.label}
          </button>
        ))}
        <button
          className={`zen-preset-btn ${showCustom ? 'active' : ''}`}
          onClick={() => setShowCustom(!showCustom)}
        >
          Custom
        </button>
      </div>

      {/* Custom Input */}
      {showCustom && (
        <div className="zen-custom-input">
          <input
            type="number"
            min="1"
            max="180"
            placeholder="Minutes (1-180)"
            value={customMin}
            onChange={e => setCustomMin(e.target.value)}
            className="zen-input"
          />
          <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={applyCustom}>Set</button>
        </div>
      )}

      {/* Clock */}
      <div className="zen-clock-wrapper" style={{ margin: '2rem 0' }}>
        <div className={`zen-clock-glow ${isRunning ? 'running' : ''}`}></div>
        <div className="zen-clock">
          {done ? (
            <span style={{ fontSize: '3rem' }}>🎉</span>
          ) : (
            <span className="zen-time">{formatTime(timeLeft)}</span>
          )}
        </div>
      </div>

      {done && (
        <p style={{ color: '#a5b4fc', marginBottom: '1.5rem', fontWeight: 600 }}>
          Session complete! Great work! 🚀
        </p>
      )}

      {/* Controls */}
      <div className="zen-controls">
        {!done && (
          <button
            className="zen-btn-start"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? '⏸ Pause' : (timeLeft < (selectedPreset >= 0 ? PRESETS[selectedPreset].seconds : timeLeft + 1) ? '▶ Resume' : '▶ Start Focus')}
          </button>
        )}
        <button className="zen-btn-reset" onClick={reset}>
          ↺ Reset
        </button>
      </div>

      <div className="zen-task-box" style={{ marginTop: '2.5rem' }}>
        <p className="zen-task-label">Current Task</p>
        <div className="zen-task-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          📚 Focus on your highest-priority subject first.
        </div>
      </div>
    </div>
  );
}
