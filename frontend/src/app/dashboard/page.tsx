'use client';

import { useState, useEffect } from 'react';
import DailyPlanTab from './tabs/DailyPlanTab';
import ProgressTab from './tabs/ProgressTab';
import WeeklyPlannerTab from './tabs/WeeklyPlannerTab';
import InsightsTab from './tabs/InsightsTab';
import ZenModeTab from './tabs/ZenModeTab';
import ChatAssistantTab from './tabs/ChatAssistantTab';

const TABS = [
  '📅 Daily Plan', 
  '📈 Progress & Goals', 
  '🗓️ Weekly Timetable', 
  '🧠 Insights', 
  '🧘 Zen Mode', 
  '💬 Chat Assistant'
];

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [isLight, setIsLight] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('theme-light');
    if (saved === 'true') {
      setIsLight(true);
      document.documentElement.classList.add('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isLight;
    setIsLight(next);
    if (next) {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('theme-light', 'true');
      addToast('🌓 Light theme activated!', 'info');
    } else {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('theme-light', 'false');
      addToast('🌓 Dark theme activated!', 'info');
    }
  };

  const addToast = (message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  return (
    <div>
      {/* 🔔 Floating Notification Toast Area */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '0.75rem', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            pointerEvents: 'auto',
            background: 'var(--bg-secondary)',
            border: `1px solid ${t.type === 'success' ? '#10b981' : t.type === 'warning' ? '#f59e0b' : '#6366f1'}`,
            color: 'var(--text-primary)',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            animation: 'slideIn 0.3s ease forwards',
            minWidth: '220px'
          }}>
            <span>{t.type === 'success' ? '✅' : t.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-text">
          <h2>Smart Study Planner</h2>
          <p>ML-based daily subject allocation using Linear Regression and Random Forest.</p>
        </div>

        {/* 🌓 Premium Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            fontFamily: 'inherit'
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          {isLight ? '🌙 Go Dark' : '☀️ Go Light'}
        </button>
      </div>

      <div className="tab-bar">
        {TABS.map((t, i) => (
          <button key={i} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => { setActiveTab(i); addToast(`Switched to ${t.slice(2)}`, 'info'); }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {activeTab === 0 && <DailyPlanTab />}
        {activeTab === 1 && <ProgressTab addToast={addToast} />}
        {activeTab === 2 && <WeeklyPlannerTab addToast={addToast} />}
        {activeTab === 3 && <InsightsTab />}
        {activeTab === 4 && <ZenModeTab />}
        {activeTab === 5 && <ChatAssistantTab />}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
