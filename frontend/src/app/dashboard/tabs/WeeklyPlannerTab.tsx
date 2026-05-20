'use client';

import { useState, useEffect } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const SUBJECTS = ['Math', 'Physics', 'English', 'Chemistry', 'Biology', 'History'];

interface TimetableCell {
  day: string;
  slotIndex: number;
  subject: string;
  timeRange: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  unlocked: boolean;
  claimed: boolean;
  icon: string;
}

interface DailyQuest {
  id: string;
  title: string;
  xpReward: number;
  completed: boolean;
  claimed: boolean;
  icon: string;
}

interface WeeklyPlannerTabProps {
  addToast?: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export default function WeeklyPlannerTab({ addToast }: WeeklyPlannerTabProps) {
  // --- XP & Gamification State ---
  const [xp, setXp] = useState(99);
  const [streakCount, setStreakCount] = useState(3);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // --- Timetable State ---
  const [timetable, setTimetable] = useState<TimetableCell[]>([]);
  const [editingCell, setEditingCell] = useState<{ day: string; slotIndex: number } | null>(null);
  const [editSubject, setEditSubject] = useState(SUBJECTS[0]);
  const [editTime, setEditTime] = useState('');

  const xpLevel = Math.floor(xp / 100) + 1;
  const xpProgress = xp % 100; // Let's normalize levels at 100 XP increments for smoother visual feedback!

  // Default Slots
  const SLOTS = [
    { name: '🌅 Morning', defaultTime: '09:00 - 12:00' },
    { name: '☀️ Afternoon', defaultTime: '13:00 - 16:00' },
    { name: '🌆 Evening', defaultTime: '17:00 - 20:00' }
  ];

  // Load from LocalStorage
  useEffect(() => {
    // Timetable Loader
    const savedTimetable = localStorage.getItem('study_timetable');
    if (savedTimetable) {
      setTimetable(JSON.parse(savedTimetable));
    } else {
      // Seed default values
      const initialCells: TimetableCell[] = [];
      DAYS.forEach(day => {
        SLOTS.forEach((slot, sIdx) => {
          initialCells.push({
            day,
            slotIndex: sIdx,
            subject: SUBJECTS[sIdx % SUBJECTS.length],
            timeRange: slot.defaultTime
          });
        });
      });
      setTimetable(initialCells);
      localStorage.setItem('study_timetable', JSON.stringify(initialCells));
    }

    // Gamification Loaders
    const savedXp = localStorage.getItem('study_xp');
    if (savedXp) setXp(Number(savedXp));

    const savedQuests = localStorage.getItem('study_quests');
    if (savedQuests) {
      setDailyQuests(JSON.parse(savedQuests));
    } else {
      const defaultQuests: DailyQuest[] = [
        { id: 'quest_1', title: 'Start a Zen Session', xpReward: 30, completed: false, claimed: false, icon: '🧘' },
        { id: 'quest_2', title: 'Customize a Timetable Slot', xpReward: 20, completed: false, claimed: false, icon: '🗓️' },
        { id: 'quest_3', title: 'Complete your planned daily quota', xpReward: 50, completed: false, claimed: false, icon: '🔥' }
      ];
      setDailyQuests(defaultQuests);
      localStorage.setItem('study_quests', JSON.stringify(defaultQuests));
    }

    const savedAchievements = localStorage.getItem('study_achievements');
    if (savedAchievements) {
      setAchievements(JSON.parse(savedAchievements));
    } else {
      const defaultAchievements: Achievement[] = [
        { id: 'ach_1', title: 'Early Bird', description: 'Schedule 2 hours of Morning study', xpReward: 100, unlocked: false, claimed: false, icon: '🌅' },
        { id: 'ach_2', title: 'Consistency Champ', description: 'Maintain a 3-day streak', xpReward: 150, unlocked: true, claimed: false, icon: '🏆' },
        { id: 'ach_3', title: 'Focus Master', description: 'Complete a 60-min Zen Session', xpReward: 200, unlocked: false, claimed: false, icon: '⚡' }
      ];
      setAchievements(defaultAchievements);
      localStorage.setItem('study_achievements', JSON.stringify(defaultAchievements));
    }
  }, []);

  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // --- XP Gamification Handlers ---
  const awardXp = (amount: number) => {
    setXp(prev => {
      const nextXp = prev + amount;
      localStorage.setItem('study_xp', nextXp.toString());
      
      const newLevel = Math.floor(nextXp / 100) + 1;
      const oldLevel = Math.floor(prev / 100) + 1;
      if (newLevel > oldLevel && addToast) {
        addToast(`🎉 LEVEL UP! You reached Level ${newLevel}! 🏆`, 'success');
      }
      return nextXp;
    });
  };

  const claimQuest = (questId: string) => {
    const updated = dailyQuests.map(q => {
      if (q.id === questId && !q.claimed) {
        awardXp(q.xpReward);
        if (addToast) addToast(`Quest claimed! +${q.xpReward} XP awarded.`, 'success');
        return { ...q, claimed: true, completed: true };
      }
      return q;
    });
    setDailyQuests(updated);
    saveToStorage('study_quests', updated);
  };

  const claimAchievement = (achId: string) => {
    const updated = achievements.map(a => {
      if (a.id === achId && a.unlocked && !a.claimed) {
        awardXp(a.xpReward);
        if (addToast) addToast(`Achievement unlocked! +${a.xpReward} XP awarded.`, 'success');
        return { ...a, claimed: true };
      }
      return a;
    });
    setAchievements(updated);
    saveToStorage('study_achievements', updated);
  };

  // --- Timetable Cell Editing Handlers ---
  const handleCellClick = (day: string, slotIndex: number) => {
    const cell = timetable.find(c => c.day === day && c.slotIndex === slotIndex);
    if (cell) {
      setEditingCell({ day, slotIndex });
      setEditSubject(cell.subject);
      setEditTime(cell.timeRange);
    }
  };

  const saveCellEdit = () => {
    if (!editingCell) return;
    const updated = timetable.map(c => {
      if (c.day === editingCell.day && c.slotIndex === editingCell.slotIndex) {
        return { ...c, subject: editSubject, timeRange: editTime || c.timeRange };
      }
      return c;
    });
    setTimetable(updated);
    saveToStorage('study_timetable', updated);
    setEditingCell(null);
    if (addToast) addToast(`Successfully updated study slot for ${editingCell.day}!`, 'success');

    // Trigger quest completion!
    const quests = dailyQuests.map(q => q.id === 'quest_2' ? { ...q, completed: true } : q);
    setDailyQuests(quests);
    saveToStorage('study_quests', quests);
  };

  return (
    <div>
      {/* 🏆 High-Fidelity Gamification dashboard header panel */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.05))', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Level Info */}
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Level Progression</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a5b4fc', marginTop: '0.2rem' }}>🎓 Level {xpLevel}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', width: '260px' }}>
              <div style={{ flex: 1, background: 'var(--border)', height: '10px', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--purple))', borderRadius: '99px', transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{xpProgress}/100 XP</span>
            </div>
          </div>

          {/* Streak Counter */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily consistency streak</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginTop: '0.2rem' }}>
              🔥 {streakCount} Days
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Keep study sessions active to grow streak!</p>
          </div>

          {/* XP Booster */}
          <div>
            <button className="btn-primary" onClick={() => awardXp(25)} style={{ padding: '0.6rem 1.25rem' }}>
              ⚡ Boost XP (+25 XP)
            </button>
          </div>

        </div>
      </div>

      {/* Daily Quests & Achievements Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Daily Quests List */}
        <div className="card">
          <div className="card-title">🎯 Daily Quests</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {dailyQuests.map(q => (
              <div key={q.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: '10px', transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{q.icon}</span>
                  <div>
                    <span style={{ fontWeight: 600, textDecoration: q.completed ? 'line-through' : 'none', color: q.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {q.title}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>+{q.xpReward} XP</span>
                  </div>
                </div>
                
                {q.claimed ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Claimed ✅</span>
                ) : (
                  <button 
                    onClick={() => claimQuest(q.id)}
                    disabled={!q.completed}
                    style={{
                      background: q.completed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${q.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                      color: q.completed ? '#10b981' : 'var(--text-muted)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: q.completed ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s'
                    }}
                  >
                    Claim Reward
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Unlocked Achievements list */}
        <div className="card">
          <div className="card-title">🏆 Trophy Achievements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {achievements.map(a => (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', background: a.unlocked ? 'rgba(139, 92, 246, 0.05)' : 'var(--bg-secondary)',
                border: `1px solid ${a.unlocked ? 'rgba(139, 92, 246, 0.2)' : 'var(--border)'}`,
                borderRadius: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem', filter: a.unlocked ? 'none' : 'grayscale(100%)' }}>{a.icon}</span>
                  <div>
                    <span style={{ fontWeight: 700, color: a.unlocked ? '#c084fc' : 'var(--text-muted)' }}>{a.title}</span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.description}</span>
                  </div>
                </div>

                {a.claimed ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Claimed 🎖️</span>
                ) : (
                  <button
                    onClick={() => claimAchievement(a.id)}
                    disabled={!a.unlocked}
                    style={{
                      background: a.unlocked ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${a.unlocked ? 'rgba(139, 92, 246, 0.3)' : 'var(--border)'}`,
                      color: a.unlocked ? '#a5b4fc' : 'var(--text-muted)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: a.unlocked ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s'
                    }}
                  >
                    Claim +{a.xpReward} XP
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 🗓️ Interactive Dynamic Timetable Grid (Fully customizable) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title">🗓️ Interactive Grid Calendar (Click on any cell to change subject/time)</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Schedule custom study plans for days of the week. Clicking on any block triggers study slot customizations.
        </p>

        {/* Timetable Editing modal panel */}
        {editingCell && (
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: '12px',
            padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem',
            alignItems: 'center', animation: 'slideIn 0.2s ease'
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Edit {editingCell.day} - {SLOTS[editingCell.slotIndex].name} Slot:
            </span>
            <select 
              value={editSubject} 
              onChange={e => setEditSubject(e.target.value)}
              className="text-input"
              style={{ width: '150px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input 
              type="text" 
              value={editTime}
              onChange={e => setEditTime(e.target.value)}
              placeholder="e.g. 09:30 - 11:30"
              className="text-input"
              style={{ width: '160px' }}
            />
            <button className="btn-primary" onClick={saveCellEdit} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Save Slot</button>
            <button className="btn-secondary" onClick={() => setEditingCell(null)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Cancel</button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>Day</th>
                {SLOTS.map((s, idx) => (
                  <th key={idx} style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                    <div>{s.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{day}</td>
                  {SLOTS.map((slot, sIdx) => {
                    const cell = timetable.find(c => c.day === day && c.slotIndex === sIdx);
                    const subIndex = SUBJECTS.indexOf(cell?.subject || '');
                    const color = COLORS[subIndex >= 0 ? subIndex % COLORS.length : 0];
                    return (
                      <td 
                        key={sIdx}
                        onClick={() => handleCellClick(day, sIdx)}
                        style={{
                          padding: '0.75rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          background: `${color}1a`,
                          border: `1px solid ${color}44`,
                          color: color,
                          padding: '0.6rem 0.5rem',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}
                        >
                          <span style={{ fontSize: '0.85rem' }}>{cell?.subject || 'Free'}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>⏰ {cell?.timeRange || slot.defaultTime}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
