"use client";

import React, { useState, useMemo } from 'react';

type Activity = {
  id: string;
  name: string;
  icon: string;
  color: string;
  start: string;
  end: string;
  days: number[];
};

export function TrackingView() {
  const [trackingDate, setTrackingDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { activities, logs } = useMemo(() => {
    if (typeof window === 'undefined') return { activities: [], logs: {} };
    const savedActs = localStorage.getItem('routine:activities');
    const savedLogs = localStorage.getItem('routine:logs');
    return {
      activities: savedActs ? JSON.parse(savedActs) : [],
      logs: savedLogs ? JSON.parse(savedLogs) : {}
    };
  }, []);

  const toggleTaskCompletion = (activityId: string) => {
    const key = `${trackingDate}_${activityId}`;
    const updatedLogs = { ...logs, [key]: !logs[key] };
    localStorage.setItem('routine:logs', JSON.stringify(updatedLogs));
    window.location.reload(); // Quick refresh to reflect state across analytics & tracker
  };

  const todaysActivities = useMemo(() => {
    const d = new Date(trackingDate);
    const dayOfWeek = (d.getDay() + 6) % 7;
    return activities.filter((a: Activity) => a.days.includes(dayOfWeek));
  }, [activities, trackingDate]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-5 pt-6 pb-32 space-y-5 animate-in fade-in duration-300">
      
      {/* Date Header Controller */}
      <div className="flex justify-between items-center bg-[#171D2B]/90 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.04]">
        <div>
          <h2 className="text-sm font-bold text-slate-200">Daily Log</h2>
          <p className="text-[11px] text-[#525E75]">Check off completed routine blocks</p>
        </div>
        <input 
          type="date" 
          value={trackingDate}
          onChange={(e) => setTrackingDate(e.target.value)}
          className="bg-[#121620] border border-white/[0.06] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#8A7CFF]"
        />
      </div>

      {/* Task Checkoff List */}
      <div className="space-y-2.5">
        {todaysActivities.length === 0 ? (
          <div className="text-center text-[#525E75] mt-16 text-xs leading-relaxed">
            No routines scheduled for this date.
          </div>
        ) : (
          todaysActivities.map((act: Activity) => {
            const isCompleted = !!logs[`${trackingDate}_${act.id}`];
            return (
              <div 
                key={act.id} 
                onClick={() => toggleTaskCompletion(act.id)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#171D2B]/90 backdrop-blur-xl border border-white/[0.04] cursor-pointer apple-card-press"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{act.icon}</span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{act.name}</h3>
                    <span className="text-[10px] text-[#525E75]">{act.start} – {act.end}</span>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-xl flex items-center justify-center border transition-all ${
                  isCompleted ? 'bg-[#AAF] border-[#AAF] text-slate-950 scale-105 shadow-md shadow-[#AAF]/20' : 'border-[#525E75] bg-[#121620]'
                }`}>
                  {isCompleted && <span className="text-xs font-bold">✓</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}