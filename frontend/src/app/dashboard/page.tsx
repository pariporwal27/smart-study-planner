'use client';
import { useState } from 'react';
import DailyPlanTab from './tabs/DailyPlanTab';
import ProgressTab from './tabs/ProgressTab';
import WeeklyPlannerTab from './tabs/WeeklyPlannerTab';
import InsightsTab from './tabs/InsightsTab';
import ZenModeTab from './tabs/ZenModeTab';

const TABS = ['📅 Daily Plan', '📈 Progress', '🗓️ Weekly Planner', '🧠 Insights', '🧘 Zen Mode'];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-text">
          <h2>Smart Study Planner</h2>
          <p>ML-based daily subject allocation using Linear Regression and Random Forest.</p>
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
        {activeTab === 0 && <DailyPlanTab />}
        {activeTab === 1 && <ProgressTab />}
        {activeTab === 2 && <WeeklyPlannerTab />}
        {activeTab === 3 && <InsightsTab />}
        {activeTab === 4 && <ZenModeTab />}
      </div>
    </div>
  );
}
