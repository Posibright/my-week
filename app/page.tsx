"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsView } from '@/components/AnalyticsView';
import { TrackingView } from '@/components/TrackingView';
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

type ScheduleItem = 
  | { type: 'gap'; start: string; end: string; mins: number }
  | (Activity & { type: 'block' });

const COLORS = ["#6FB7FF", "#FF8F87", "#57C7A3", "#FFB648", "#B48CFF", "#FF7AA8"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const FREE_WINDOW = [6 * 60, 23 * 60]; 

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const fmt12 = (hhmm: string) => {
  let [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ap}`;
};

const toHHMM = (min: number) => {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`;
};

export default function MyWeekApp() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0); // For directional slide choreography
  const [currentTab, setCurrentTab] = useState<'routine' | 'tracking' | 'analytics'>('routine');
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("📝");
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");
  const [formDays, setFormDays] = useState<number[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('routine:activities');
    if (saved) setActivities(JSON.parse(saved));
    const today = (new Date().getDay() + 6) % 7;
    setSelectedDay(today);
  }, []);

  const saveToStorage = (data: Activity[]) => {
    setActivities(data);
    localStorage.setItem('routine:activities', JSON.stringify(data));
  };

  const changeDayWithDirection = (newDay: number) => {
    triggerHaptic('light');
    setDirection(newDay > selectedDay ? 1 : -1);
    setSelectedDay(newDay);
  };

  const goToPreviousDay = () => {
    triggerHaptic('light');
    setDirection(-1);
    setSelectedDay((prev) => (prev === 0 ? 6 : prev - 1));
  };

  const goToNextDay = () => {
    triggerHaptic('light');
    setDirection(1);
    setSelectedDay((prev) => (prev === 6 ? 0 : prev + 1));
  };

  const todaysBlocks = useMemo(() => {
    return activities
      .filter((a: Activity) => a.days.includes(selectedDay))
      .sort((a: Activity, b: Activity) => toMin(a.start) - toMin(b.start));
  }, [activities, selectedDay]);

  const selectedDaySubtitle = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7;
    const diff = selectedDay - currentDayOfWeek;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);

    return targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }, [selectedDay]);

  const freeHours = useMemo(() => {
    const iv = todaysBlocks
      .map((b: Activity) => [Math.max(toMin(b.start), FREE_WINDOW[0]), Math.min(toMin(b.end), FREE_WINDOW[1])])
      .filter(([s, e]) => e > s)
      .sort((a, b) => a[0] - b[0]);

    let busy = 0, curEnd = FREE_WINDOW[0];
    for (const [s, e] of iv) {
      const start = Math.max(s, curEnd);
      if (e > start) {
        busy += e - start;
        curEnd = Math.max(curEnd, e);
      }
    }
    const total = FREE_WINDOW[1] - FREE_WINDOW[0];
    const freeMins = Math.max(0, total - busy);
    return { h: Math.floor(freeMins / 60), m: freeMins % 60 };
  }, [todaysBlocks]);

  const listWithGaps = useMemo(() => {
    const list: ScheduleItem[] = [];
    let lastEnd = FREE_WINDOW[0];

    todaysBlocks.forEach((block: Activity) => {
      const blockStart = toMin(block.start);
      if (blockStart > lastEnd) {
        list.push({ type: 'gap', start: toHHMM(lastEnd), end: block.start, mins: blockStart - lastEnd });
      }
      list.push({ ...block, type: 'block' });
      lastEnd = Math.max(lastEnd, toMin(block.end));
    });

    if (lastEnd < FREE_WINDOW[1]) {
      list.push({ type: 'gap', start: toHHMM(lastEnd), end: toHHMM(FREE_WINDOW[1]), mins: FREE_WINDOW[1] - lastEnd });
    }
    return list;
  }, [todaysBlocks]);

  const openSheet = (block?: Activity) => {
    triggerHaptic('light');
    if (block) {
      setEditingId(block.id);
      setFormName(block.name);
      setFormIcon(block.icon);
      setFormColor(block.color);
      setFormStart(block.start);
      setFormEnd(block.end);
      setFormDays(block.days);
    } else {
      setEditingId(null);
      setFormName("");
      setFormIcon("📝");
      setFormColor(COLORS[selectedDay % COLORS.length]);
      setFormStart("09:00");
      setFormEnd("10:00");
      setFormDays([selectedDay]);
    }
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim() || formDays.length === 0 || toMin(formEnd) <= toMin(formStart)) {
      triggerHaptic('heavy');
      alert("Please check your inputs (Name required, End > Start, at least one day selected).");
      return;
    }

    triggerHaptic('heavy');
    const newBlock: Activity = {
      id: editingId || `a_${Date.now()}`,
      name: formName,
      icon: formIcon,
      color: formColor,
      start: formStart,
      end: formEnd,
      days: formDays,
    };

    if (editingId) {
      saveToStorage(activities.map((a: Activity) => a.id === editingId ? newBlock : a));
    } else {
      saveToStorage([...activities, newBlock]);
    }
    setIsSheetOpen(false);
  };

  const handleDelete = () => {
    triggerHaptic('heavy');
    if (editingId) {
      saveToStorage(activities.filter((a: Activity) => a.id !== editingId));
      setIsSheetOpen(false);
    }
  };

  const exportICS = () => {
    triggerHaptic('medium');
    if (activities.length === 0) return alert("Nothing to export.");
    let events = "";
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dow = (d.getDay() + 6) % 7;
      const dayBlocks = activities.filter((a: Activity) => a.days.includes(dow));
      const dateStr = d.toISOString().split('T')[0].replace(/-/g, "");

      dayBlocks.forEach((b: Activity) => {
        const startStr = b.start.replace(":", "") + "00";
        const endStr = b.end.replace(":", "") + "00";
        events += `BEGIN:VEVENT\r\nUID:${b.id}-${dateStr}@myweek\r\nDTSTART:${dateStr}T${startStr}\r\nDTEND:${dateStr}T${endStr}\r\nSUMMARY:${b.icon} ${b.name}\r\nBEGIN:VALARM\r\nTRIGGER:-PT10M\r\nACTION:DISPLAY\r\nDESCRIPTION:Reminder\r\nEND:VALARM\r\nEND:VEVENT\r\n`;
      });
    }

    const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MyWeek//EN\r\nCALSCALE:GREGORIAN\r\n${events}END:VCALENDAR\r\n`;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#121620] text-slate-100 font-sans max-w-md mx-auto relative overflow-hidden antialiased select-none">
      
      {/* Header */}
      {currentTab === 'routine' && (
        <header className="px-5 pt-7 pb-4 shrink-0 bg-[#171D2B]/90 backdrop-blur-xl border-b border-white/[0.04] z-10">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-base font-semibold tracking-tight text-slate-300">My Week</h1>
            <button onClick={exportICS} className="bg-[#242C3D] hover:bg-[#2E374D] active:scale-95 text-slate-300 text-xs font-medium px-3.5 py-1.5 rounded-xl apple-spring">
              Export week
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {DAY_LETTERS.map((letter, i) => (
              <button
                key={i}
                onClick={() => changeDayWithDirection(i)}
                className={`flex flex-col items-center justify-center py-3.5 rounded-xl apple-spring apple-card-press ${
                  selectedDay === i 
                    ? 'bg-[#AAF] text-slate-950 font-bold shadow-lg shadow-[#AAF]/15 scale-[1.04]' 
                    : 'bg-[#1A2130]/50 text-[#525E75] hover:text-slate-300'
                }`}
              >
                <span className="text-xs tracking-wider">{letter}</span>
                {activities.some((a: Activity) => a.days.includes(i)) && selectedDay !== i && (
                  <div className="w-1 h-1 rounded-full bg-[#525E75] mt-1.5 transition-all" />
                )}
              </button>
            ))}
          </div>
        </header>
      )}

      {/* Main View Switcher with Apple Motion Physics */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {currentTab === 'routine' && (
          <div 
            key={selectedDay} 
            className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              direction > 0 ? 'animate-in fade-in slide-in-from-right-3' : 'animate-in fade-in slide-in-from-left-3'
            }`}
          >
            <div className="px-6 pt-6 pb-2 shrink-0 flex items-center justify-between">
              <div>
                <div className="text-3xl font-extrabold tracking-tight text-slate-200">
                  {freeHours.h}h {freeHours.m > 0 && `${freeHours.m}m`}
                </div>
                <div className="text-xs font-medium text-[#525E75] mt-0.5 tracking-wide">
                  free on {selectedDaySubtitle}
                </div>
              </div>

              {/* Day Arrow Steppers */}
              <div className="flex items-center gap-1 bg-[#171D2B] p-1.5 rounded-2xl border border-white/[0.04]">
                <button
                  onClick={goToPreviousDay}
                  className="w-8 h-8 rounded-xl bg-[#121620] hover:bg-[#242C3D] flex items-center justify-center text-slate-300 apple-card-press"
                  aria-label="Previous day"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToNextDay}
                  className="w-8 h-8 rounded-xl bg-[#121620] hover:bg-[#242C3D] flex items-center justify-center text-slate-300 apple-card-press"
                  aria-label="Next day"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5 pb-28 scroll-smooth">
              {listWithGaps.length === 0 || (listWithGaps.length === 1 && listWithGaps[0].type === 'gap') ? (
                <div className="text-center text-[#525E75] mt-16 text-xs leading-relaxed animate-in fade-in duration-500">
                  Nothing scheduled for this day.<br />Tap <span className="text-slate-400 font-bold">+</span> to add a routine block.
                </div>
              ) : (
                listWithGaps.map((item, idx) => {
                  if (item.type === 'gap') {
                    if (item.mins < 15) return null;
                    return (
                      <div key={`gap-${idx}`} className="flex items-center justify-center py-1.5 opacity-40">
                        <span className="text-[11px] font-medium text-[#525E75] tracking-wide">
                          {fmt12(item.start)} – {fmt12(item.end)}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => openSheet(item)}
                      className="rounded-2xl p-4 flex flex-col gap-1.5 shadow-sm cursor-pointer apple-card-press"
                      style={{ backgroundColor: item.color }}
                    >
                      <div className="flex justify-between items-center opacity-70">
                        <span className="text-[11px] font-bold text-slate-900 tracking-tight">
                          {fmt12(item.start)} – {fmt12(item.end)}
                        </span>
                      </div>
                      <div className="text-base font-bold text-slate-900 flex items-center gap-2 leading-snug tracking-tight">
                        <span className="text-sm">{item.icon}</span> {item.name}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {currentTab === 'tracking' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
            <TrackingView />
          </div>
        )}

        {currentTab === 'analytics' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
            <AnalyticsView />
          </div>
        )}
      </div>

      {/* Floating Action Button with Fluid Spring Hover */}
      {currentTab === 'routine' && (
        <button
          onClick={() => openSheet()}
          className="absolute bottom-24 right-6 w-14 h-14 bg-[#8A7CFF] hover:bg-[#796bef] text-white text-2xl flex items-center justify-center rounded-full shadow-2xl shadow-[#8A7CFF]/30 z-20 apple-card-press"
        >
          +
        </button>
      )}

      {/* Bottom Navigation Dock with Blur Backdrop */}
      <nav className="absolute bottom-0 left-0 right-0 bg-[#171D2B]/85 backdrop-blur-2xl border-t border-white/[0.04] px-8 py-3.5 flex justify-around items-center z-20">
        <button
          onClick={() => {
            triggerHaptic('light');
            setCurrentTab('routine');
          }}
          className={`flex flex-col items-center gap-1 apple-spring apple-card-press ${
            currentTab === 'routine' ? 'text-[#AAF] scale-105' : 'text-[#525E75] hover:text-slate-300'
          }`}
        >
          <svg className="w-5 h-5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] font-semibold tracking-wide">Routine</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setCurrentTab('tracking');
          }}
          className={`flex flex-col items-center gap-1 apple-spring apple-card-press ${
            currentTab === 'tracking' ? 'text-[#AAF] scale-105' : 'text-[#525E75] hover:text-slate-300'
          }`}
        >
          <svg className="w-5 h-5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-[10px] font-semibold tracking-wide">Tracker</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setCurrentTab('analytics');
          }}
          className={`flex flex-col items-center gap-1 apple-spring apple-card-press ${
            currentTab === 'analytics' ? 'text-[#AAF] scale-105' : 'text-[#525E75] hover:text-slate-300'
          }`}
        >
          <svg className="w-5 h-5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2v8H3v-8zm5-6h2v14H8V7zm5-4h2v18h-2V3zm5 9h2v9h-2v-9z" />
          </svg>
          <span className="text-[10px] font-semibold tracking-wide">Analytics</span>
        </button>
      </nav>

      {/* Bottom Sheet Modal with Fluid Entrance Curve */}
      {isSheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-35 transition-opacity animate-in fade-in duration-300" onClick={() => setIsSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#171D2B]/95 backdrop-blur-2xl border-t border-white/[0.06] rounded-t-[32px] p-6 z-40 shadow-2xl animate-in slide-in-from-bottom duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <div className="w-10 h-1 bg-[#2C354A] rounded-full mx-auto mb-5" />
            
            <h2 className="text-base font-bold mb-5 text-slate-200 tracking-tight">
              {editingId ? "Edit block" : "New block"}
            </h2>

            <div className="space-y-4">
              <div className="flex gap-2.5">
                <div className="w-14">
                  <label className="block text-[11px] font-bold text-[#525E75] mb-1">Icon</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full bg-[#121620] border border-white/[0.06] rounded-xl py-2.5 text-center text-lg text-slate-200 focus:outline-none focus:border-[#8A7CFF]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-[#525E75] mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    placeholder="e.g. Software Eng lecture"
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-[#121620] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#8A7CFF]"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-[#525E75] mb-1">Starts</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full bg-[#121620] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-[#525E75] mb-1">Ends</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full bg-[#121620] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#525E75] mb-1.5">Color</label>
                <div className="flex gap-2.5">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        triggerHaptic('light');
                        setFormColor(c);
                      }}
                      className={`w-7 h-7 rounded-full transition-transform active:scale-90 ${formColor === c ? 'scale-110 ring-2 ring-white/80 ring-offset-2 ring-offset-[#171D2B]' : 'opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#525E75] mb-1.5">Repeats on</label>
                <div className="flex gap-1.5">
                  {DAY_LETTERS.map((l, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        triggerHaptic('light');
                        if (formDays.includes(i)) setFormDays(formDays.filter(d => d !== i));
                        else setFormDays([...formDays, i]);
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold apple-card-press ${
                        formDays.includes(i) 
                          ? 'bg-[#8A7CFF] text-white shadow-sm' 
                          : 'bg-[#121620] text-[#525E75] border border-white/[0.04]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                {editingId && (
                  <button onClick={handleDelete} className="flex-1 bg-[#241E24] hover:bg-[#2D2226] text-[#FF8F87] font-semibold text-sm py-3 rounded-xl apple-card-press">
                    Delete
                  </button>
                )}
                <button onClick={handleSave} className="flex-[2] bg-[#8A7CFF] hover:bg-[#796bef] text-white font-semibold text-sm py-3 rounded-xl shadow-lg shadow-[#8A7CFF]/20 apple-card-press">
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}