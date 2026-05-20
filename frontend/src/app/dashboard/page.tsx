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

interface Balloon {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

const BALLOON_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [isLight, setIsLight] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [balloons, setBalloons] = useState<Balloon[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('theme-light');
    if (saved === 'true') {
      setIsLight(true);
      document.documentElement.classList.add('light-theme');
    }

    const savedReminders = localStorage.getItem('study_reminders_enabled');
    if (savedReminders !== null) {
      setRemindersEnabled(savedReminders === 'true');
    }
  }, []);

  // Pre-unlock Audio Context on first user interaction to bypass browser autoplay blocks
  useEffect(() => {
    const unlock = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = (window as any).globalAudioCtx || new AudioContextClass();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          // Play silent buffer to prime hardware
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          
          (window as any).globalAudioCtx = ctx;
        }
      } catch (e) {
        console.warn('Audio pre-unlock failed:', e);
      }
      // Remove listeners once primed
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const toggleTheme = () => {
    const next = !isLight;
    setIsLight(next);
    if (next) {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('theme-light', 'true');
    } else {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('theme-light', 'false');
    }
  };

  const toggleReminders = () => {
    const next = !remindersEnabled;
    setRemindersEnabled(next);
    localStorage.setItem('study_reminders_enabled', next ? 'true' : 'false');
  };

  // Automatic study reminders background effect
  useEffect(() => {
    const checkReminder = () => {
      const savedReminders = localStorage.getItem('study_reminders_enabled');
      if (savedReminders === 'false') return;

      const now = new Date();
      const DAYS_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDay = DAYS_MAP[now.getDay()];
      const currentHour = now.getHours();
      const currentDateStr = now.toISOString().split('T')[0];

      let slotIndex = -1;
      if (currentHour >= 9 && currentHour < 12) {
        slotIndex = 0;
      } else if (currentHour >= 13 && currentHour < 16) {
        slotIndex = 1;
      } else if (currentHour >= 17 && currentHour < 20) {
        slotIndex = 2;
      }

      if (slotIndex !== -1) {
        const savedTimetable = localStorage.getItem('study_timetable');
        if (savedTimetable) {
          try {
            const timetable = JSON.parse(savedTimetable);
            const cell = timetable.find((c: any) => c.day === currentDay && c.slotIndex === slotIndex);
            if (cell) {
              const lastReminderKey = `${currentDateStr}-${slotIndex}`;
              const savedLastReminder = localStorage.getItem('study_last_reminder_slot');
              if (savedLastReminder !== lastReminderKey) {
                addToast(`🔔 Study Reminder: Time to study ${cell.subject}! (${cell.timeRange}) 📚`, 'info');
                localStorage.setItem('study_last_reminder_slot', lastReminderKey);
              }
            }
          } catch (e) {
            console.error('Error checking timetable reminders:', e);
          }
        }
      }
    };

    // Check on mount (after short delay to ensure initial load completes)
    const timeout = setTimeout(checkReminder, 1500);

    // Set interval to check every 30 seconds
    const interval = setInterval(checkReminder, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [remindersEnabled]);

  const addToast = (message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const playCelebrationSound = () => {
    try {
      let ctx = (window as any).globalAudioCtx;
      if (!ctx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        ctx = new AudioContext();
        (window as any).globalAudioCtx = ctx;
      }
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playTone = (freq: number, start: number, duration: number, type: 'sine' | 'triangle' | 'sawtooth' | 'square' = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      
      // Joyful chord synthesis! C5 -> E5 -> G5 -> C6 level-up chime!
      playTone(523.25, now, 0.35, 'triangle');       // C5
      playTone(659.25, now + 0.06, 0.35, 'triangle');  // E5
      playTone(783.99, now + 0.12, 0.35, 'triangle');  // G5
      playTone(1046.50, now + 0.18, 0.45, 'sine');    // C6
      
      // Bubble pops matching the balloons
      playTone(880.00, now + 0.04, 0.12, 'sine');     // A5 pop
      playTone(1174.66, now + 0.14, 0.12, 'sine');    // D6 pop
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  const triggerCelebration = () => {
    const list: Balloon[] = [];
    const baseId = Date.now();
    for (let i = 0; i < 54; i++) {
      list.push({
        id: baseId + i,
        left: Math.random() * 100,
        color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        delay: Math.random() * 0.7,
        duration: 1.1 + Math.random() * 1.1,
        size: 38 + Math.random() * 22
      });
    }
    setBalloons(list);
    playCelebrationSound();
    
    // Cleanup balloons after they finish floating
    setTimeout(() => {
      setBalloons([]);
    }, 4000);
  };

  return (
    <div>
      {/* 🎈 Celebratory Floating Balloons */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999, overflow: 'hidden' }}>
        {balloons.map(b => (
          <div 
            key={b.id} 
            style={{
              position: 'absolute',
              bottom: '-120px',
              left: `${b.left}%`,
              width: `${b.size}px`,
              height: `${b.size * 1.25}px`,
              background: b.color,
              borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
              boxShadow: 'inset -8px -8px 0 rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.15)',
              animation: `floatUpSway ${b.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              animationDelay: `${b.delay}s`
            }}
          >
            {/* Balloon String */}
            <div style={{
              position: 'absolute',
              bottom: `-${b.size * 0.4}px`,
              left: '50%',
              width: '2px',
              height: `${b.size * 0.4}px`,
              background: 'rgba(255,255,255,0.4)',
              transform: 'translateX(-50%)'
            }} />
            {/* Balloon Knot */}
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              left: '50%',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: `6px solid ${b.color}`,
              transform: 'translateX(-50%)'
            }} />
          </div>
        ))}
      </div>

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* 🔔 Premium Study Reminders Toggle */}
          <button
            onClick={toggleReminders}
            title={remindersEnabled ? 'Mute Study Reminders' : 'Enable Study Reminders'}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: remindersEnabled ? '#f59e0b' : 'var(--text-muted)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: remindersEnabled ? '0 0 15px rgba(245, 158, 11, 0.2)' : '0 4px 15px rgba(0,0,0,0.1)',
              borderColor: remindersEnabled ? '#f59e0b' : 'var(--border)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'scale(1.08)';
              if (remindersEnabled) {
                e.currentTarget.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.4)';
              } else {
                e.currentTarget.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.4)';
              }
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = remindersEnabled ? '0 0 15px rgba(245, 158, 11, 0.2)' : '0 4px 15px rgba(0,0,0,0.1)';
            }}
          >
            {remindersEnabled ? '🔔' : '🔕'}
          </button>

          {/* 🌓 Premium Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
            onMouseOver={e => { 
              e.currentTarget.style.borderColor = 'var(--accent)'; 
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.4)';
            }}
            onMouseOut={e => { 
              e.currentTarget.style.borderColor = 'var(--border)'; 
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}
          >
            {isLight ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map((t, i) => (
          <button key={i} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {activeTab === 0 && <DailyPlanTab triggerCelebration={triggerCelebration} />}
        {activeTab === 1 && <ProgressTab addToast={addToast} triggerCelebration={triggerCelebration} />}
        {activeTab === 2 && <WeeklyPlannerTab addToast={addToast} triggerCelebration={triggerCelebration} />}
        {activeTab === 3 && <InsightsTab />}
        {activeTab === 4 && <ZenModeTab />}
        {activeTab === 5 && <ChatAssistantTab />}
      </div>

      <style jsx global>{`
        @keyframes floatUpSway {
          0% { 
            transform: translateY(120px) translateX(0) scale(0.2) rotate(0deg); 
            opacity: 0; 
          }
          10% { 
            opacity: 0.95; 
            transform: translateY(0px) translateX(0) scale(1) rotate(2deg);
          }
          30% {
            transform: translateY(-40vh) translateX(-25px) rotate(-8deg);
          }
          60% {
            transform: translateY(-80vh) translateX(25px) rotate(8deg);
          }
          85% {
            opacity: 0.9;
          }
          100% { 
            transform: translateY(-135vh) translateX(-5px) scale(0.9) rotate(-3deg); 
            opacity: 0; 
          }
        }
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
