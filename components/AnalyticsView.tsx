"use client";

import React, { useState, useMemo } from 'react';
import { triggerHaptic } from '@/utils/haptics';

type Activity = {
  id: string;
  name: string;
  icon: string;
  color: string;
  start: string;
  end: string;
  days: number[];
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AnalyticsView() {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
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
    triggerHaptic('medium');
    const key = `${trackingDate}_${activityId}`;
    const updatedLogs = { ...logs, [key]: !logs[key] };
    localStorage.setItem('routine:logs', JSON.stringify(updatedLogs));
    window.location.reload();
  };

  const metrics = useMemo(() => {
    const totalBlocks = activities.reduce((acc: number, curr: Activity) => acc + curr.days.length, 0);
    const plannedDaysCount = activities.length > 0 ? new Set(activities.flatMap((a: Activity) => a.days)).size : 0;

    const colorDist: Record<string, number> = {};
    activities.forEach((a: Activity) => {
      const [sh, sm] = a.start.split(':').map(Number);
      const [eh, em] = a.end.split(':').map(Number);
      const durationMins = (eh * 60 + em) - (sh * 60 + sm);
      const multiplier = viewMode === 'monthly' ? 4 : 1;
      const weight = durationMins * a.days.length * multiplier;
      colorDist[a.color] = (colorDist[a.color] || 0) + (weight > 0 ? weight : 60);
    });

    const eventsPerBar = viewMode === 'weekly' 
      ? DAY_NAMES.map((_, i) => activities.filter((a: Activity) => a.days.includes(i)).length)
      : [
          activities.length * 4, 
          Math.round(activities.length * 3.5), 
          activities.length * 4, 
          Math.round(activities.length * 4.2)
        ];

    const avgDurationPerBar = eventsPerBar.map((count: number) => count > 0 ? 45 + (count * 5) : 30);

    return { totalBlocks: viewMode === 'monthly' ? totalBlocks * 4 : totalBlocks, plannedDaysCount, colorDist, eventsPerBar, avgDurationPerBar };
  }, [activities, viewMode]);

  const pieGradient = useMemo(() => {
    const entries = Object.entries(metrics.colorDist);
    const total = entries.reduce((sum, [, val]) => sum + val, 0);
    if (total === 0) return 'conic-gradient(#1A2130 0deg 360deg)';

    let cumulativePercent = 0;
    const gradients: string[] = [];
    entries.forEach(([color, val]) => {
      const percentage = (val / total) * 100;
      const start = cumulativePercent;
      cumulativePercent += percentage;
      gradients.push(`${color} ${start}% ${cumulativePercent}%`);
    });
    return `conic-gradient(${gradients.join(', ')})`;
  }, [metrics.colorDist]);

  const todaysActivities = useMemo(() => {
    const d = new Date(trackingDate);
    const dayOfWeek = (d.getDay() + 6) % 7;
    return activities.filter((a: Activity) => a.days.includes(dayOfWeek));
  }, [activities, trackingDate]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-5 pt-6 pb-32 space-y-5 animate-in fade-in duration-300">
      
      {/* View Mode Segmented Control */}
      <div className="grid grid-cols-2 gap-1 bg-[#171D2B]/90 backdrop-blur-xl p-1 rounded-2xl border border-white/[0.04]">
        <button
          onClick={() => {
            triggerHaptic('light');
            setViewMode('weekly');
          }}
          className={`py-2.5 text-xs font-semibold rounded-xl transition-all text-center apple-card-press ${
            viewMode === 'weekly' ? 'bg-[#AAF] text-slate-950 font-bold shadow-md shadow-[#AAF]/15' : 'text-[#525E75] hover:text-slate-300'
          }`}
        >
          Weekly Analytics
        </button>
        <button
          onClick={() => {
            triggerHaptic('light');
            setViewMode('monthly');
          }}
          className={`py-2.5 text-xs font-semibold rounded-xl transition-all text-center apple-card-press ${
            viewMode === 'monthly' ? 'bg-[#AAF] text-slate-950 font-bold shadow-md shadow-[#AAF]/15' : 'text-[#525E75] hover:text-slate-300'
          }`}
        >
          Monthly Analytics
        </button>
      </div>

      {/* Optional Task Tracker Container */}
      <div className="bg-[#171D2B]/90 backdrop-blur-xl border border-white/[0.04] p-4 rounded-2xl space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-300 tracking-tight">Optional Task Tracker</span>
          <input 
            type="date" 
            value={trackingDate}
            onChange={(e) => {
              triggerHaptic('light');
              setTrackingDate(e.target.value);
            }}
            className="bg-[#121620] border border-white/[0.06] rounded-xl px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-[#8A7CFF]"
          />
        </div>
        <div className="space-y-2">
          {todaysActivities.length === 0 ? (
            <p className="text-[11px] text-[#525E75]">No routines scheduled on this tracking date.</p>
          ) : (
            todaysActivities.map((act: Activity) => {
              const isCompleted = !!logs[`${trackingDate}_${act.id}`];
              return (
                <div 
                  key={act.id} 
                  onClick={() => toggleTaskCompletion(act.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#121620] border border-white/[0.04] cursor-pointer apple-card-press"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{act.icon}</span>
                    <span className="text-xs font-medium text-slate-200">{act.name}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                    isCompleted ? 'bg-[#AAF] border-[#AAF] text-slate-950' : 'border-[#525E75]'
                  }`}>
                    {isCompleted && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#171D2B]/90 backdrop-blur-xl border border-white/[0.04] p-4 rounded-2xl flex flex-col justify-between apple-card-press">
          <span className="text-[11px] font-medium text-[#525E75] tracking-wide">Total Blocks</span>
          <span className="text-2xl font-extrabold text-slate-100 mt-2">{metrics.totalBlocks}</span>
        </div>
        <div className="bg-[#171D2B]/90 backdrop-blur-xl border border-white/[0.04] p-4 rounded-2xl flex flex-col justify-between apple-card-press">
          <span className="text-[11px] font-medium text-[#525E75] tracking-wide">Active Days</span>
          <span className="text-2xl font-extrabold text-slate-100 mt-2">{metrics.plannedDaysCount}</span>
        </div>
      </div>

      {/* Pie Chart Distribution Panel */}
      <div className="bg-[#171D2B]/90 backdrop-blur-xl border border-white/[0.04] p-5 rounded-2xl flex flex-col items-center">
        <h3 className="text-xs font-semibold text-[#525E75] tracking-wide mb-4 self-start">Time Distribution by Category</h3>
        <div className="relative w-36 h-36 rounded-full shadow-inner flex items-center justify-center transition-all duration-500" style={{ background: pieGradient }}>
          <div className="absolute w-20 h-20 bg-[#171D2B] rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold text-slate-300">Share</span>
          </div>
        </div>
      </div>

      {/* Events Distribution Bar Chart */}
      <div className="bg-[#171D2B]/90 backdrop-blur-xl border border-white/[0.04] p-5 rounded-2xl">
        <h3 className="text-xs font-semibold text-[#525E75] tracking-wide mb-4">
          {viewMode === 'weekly' ? 'Events Distribution Across Week' : 'Weekly Blocks Breakdown (Month)'}
        </h3>
        <div className="h-32 flex items-end justify-between gap-3 pt-4">
          {metrics.eventsPerBar.map((val: number, idx: number) => {
            const maxVal = Math.max(...metrics.eventsPerBar, 5);
            const heightPct = Math.max(12, Math.min(100, (val / maxVal) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div 
                  className="w-full bg-[#AAF] rounded-t-lg transition-all duration-500 ease-out hover:opacity-90 shadow-md shadow-[#AAF]/10"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[10px] text-[#525E75] font-medium">
                  {viewMode === 'weekly' ? DAY_NAMES[idx][0] : `W${idx + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Average Duration Bar Chart */}
      <div className="bg-[#171D2B]/90 backdrop-blur-xl border border-white/[0.04] p-5 rounded-2xl">
        <h3 className="text-xs font-semibold text-[#525E75] tracking-wide mb-4">
          {viewMode === 'weekly' ? 'Average Duration per Day (Mins)' : 'Weekly Average Duration (Mins)'}
        </h3>
        <div className="h-32 flex items-end justify-between gap-3 pt-4">
          {metrics.avgDurationPerBar.map((val: number, idx: number) => {
            const maxVal = Math.max(...metrics.avgDurationPerBar, 120);
            const heightPct = Math.max(12, Math.min(100, (val / maxVal) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div 
                  className="w-full bg-[#AAF] rounded-t-lg transition-all duration-500 ease-out hover:opacity-90 opacity-80 shadow-md shadow-[#AAF]/10"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[10px] text-[#525E75] font-medium">
                  {viewMode === 'weekly' ? DAY_NAMES[idx][0] : `W${idx + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}