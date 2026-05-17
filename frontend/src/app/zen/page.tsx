'use client';

import { useState, useEffect } from 'react';
import { getTasks } from '@/lib/api';
import Link from 'next/link';

export default function ZenMode() {
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min default
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // In a real scenario we'd fetch tasks. Let's mock a few for the demo.
    setTasks([
      { id: 1, title: 'Review Calculus Chapter 4', status: 'pending' },
      { id: 2, title: 'Write English Essay Draft', status: 'pending' },
    ]);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Could play a sound here
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center">
      {/* Invisible/Subtle exit button as requested previously */}
      <Link 
        href="/dashboard" 
        className="absolute top-4 left-4 text-slate-800 hover:text-slate-400 transition-colors opacity-20 hover:opacity-100 px-4 py-2"
      >
        Exit Zen Mode
      </Link>

      <div className="text-center max-w-lg w-full px-6">
        <h2 className="text-2xl font-medium text-slate-400 mb-8 tracking-widest uppercase">Deep Focus</h2>
        
        {/* Timer */}
        <div className="relative group">
          <div className={`absolute -inset-1 rounded-full blur opacity-25 transition duration-1000 ${isRunning ? 'bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50' : 'bg-slate-800'}`}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-full w-64 h-64 mx-auto flex items-center justify-center shadow-2xl">
            <h1 className="text-7xl font-light tabular-nums text-slate-50 tracking-tight">
              {formatTime(timeLeft)}
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center mt-12">
          <button 
            onClick={toggleTimer}
            className={`px-8 py-3 rounded-full font-medium transition ${
              isRunning ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
            }`}
          >
            {isRunning ? 'Pause' : 'Start Focus'}
          </button>
          <button 
            onClick={resetTimer}
            className="px-8 py-3 rounded-full font-medium bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 transition"
          >
            Reset
          </button>
        </div>

        {/* Current Task */}
        <div className="mt-16">
          <p className="text-sm text-slate-500 uppercase tracking-wider mb-4">Current Task</p>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition"
               onClick={() => setActiveTask(tasks[0])}>
            <p className="text-lg font-medium text-slate-300">
              {activeTask ? activeTask.title : 'Select a task to focus on...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
