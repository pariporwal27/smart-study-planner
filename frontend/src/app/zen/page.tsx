'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ZenMode() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="zen-shell">
      <Link href="/dashboard" className="zen-exit">← Exit Zen Mode</Link>

      <p className="zen-title">Deep Focus Session</p>

      <div className="zen-clock-wrapper">
        <div className={`zen-clock-glow ${isRunning ? 'running' : ''}`}></div>
        <div className="zen-clock">
          <span className="zen-time">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="zen-controls">
        <button className="zen-btn-start" onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? '⏸ Pause' : '▶ Start Focus'}
        </button>
        <button className="zen-btn-reset" onClick={() => { setIsRunning(false); setTimeLeft(25 * 60); }}>
          Reset
        </button>
      </div>

      <div className="zen-task-box">
        <p className="zen-task-label">Current Task</p>
        <div className="zen-task-card">
          Click to select a task to focus on...
        </div>
      </div>
    </div>
  );
}
