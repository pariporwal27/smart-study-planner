'use client';

import { useState, useEffect } from 'react';
import { getSubjects, generateSchedule } from '@/lib/api';

export default function Dashboard() {
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a real app we'd fetch subjects from the DB, but for MVP we mock some inputs
    const mockSubjects = [
      { name: "Math", difficulty_level: 4, past_score: 65 },
      { name: "Physics", difficulty_level: 5, past_score: 55 },
      { name: "English", difficulty_level: 2, past_score: 85 }
    ];
    setSubjects(mockSubjects);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateSchedule(subjects, 21, 5.0);
      setSchedule(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back!</h2>
          <p className="text-slate-400 mt-2">Here is your study overview for today.</p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Generating...' : '✨ Generate AI Schedule'}
        </button>
      </header>

      {schedule && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            AI Recommended Plan
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/30">
              {schedule.model_used}
            </span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {schedule.schedule.map((item, idx) => (
              <div key={idx} className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">{item.subject}</h4>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      item.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                      item.priority === 'Medium' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-200 my-4">
                    {item.allocated_hours.toFixed(1)} <span className="text-sm font-normal text-slate-500">hrs</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xl font-bold mb-4">Your Subjects</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="p-4 font-medium">Subject</th>
                <th className="p-4 font-medium">Difficulty</th>
                <th className="p-4 font-medium">Past Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {subjects.map((sub, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50">
                  <td className="p-4 font-medium">{sub.name}</td>
                  <td className="p-4 text-slate-400">{sub.difficulty_level} / 5</td>
                  <td className="p-4 text-slate-400">{sub.past_score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
