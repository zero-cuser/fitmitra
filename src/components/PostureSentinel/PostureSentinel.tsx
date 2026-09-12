'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { ShieldCheck, AlertTriangle, Play, Pause, RotateCcw, Clock, Sparkles, CheckCircle2, Sliders } from 'lucide-react';

export const PostureSentinel: React.FC = () => {
  const { postureScoreToday, setPostureScoreToday, soundEnabled } = useWorkout();

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [headTiltAngle, setHeadTiltAngle] = useState(14); // degrees forward
  const [slouchCount, setSlouchCount] = useState(2);
  const [activeTab, setActiveTab] = useState<'stretches' | 'pomodoro' | 'monitor'>('stretches');

  // Pomodoro timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [studyBlocksCompleted, setStudyBlocksCompleted] = useState(3);

  // Ergonomic Stretch Routine
  const stretches = [
    { name: 'Cervical Spine Retraction (Double Chin)', reps: '10 reps • 3s hold', desc: 'Pull chin straight back into your neck to align vertebrae.' },
    { name: 'Desk Doorway Chest Opener', reps: '30s hold', desc: 'Rest elbows on desk/chair and gently press chest forward to reverse hunched shoulders.' },
    { name: 'Thoracic Seated Twist', reps: '15s each side', desc: 'Grip chair backrest and exhale while rotating torso to decompress lumbar discs.' },
    { name: 'Overhead Lateral Stretch', reps: '20s hold', desc: 'Interlace fingers, push palms to ceiling, and lean gently to each side.' }
  ];

  // Simulation tick for monitoring
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMonitoring) {
      interval = setInterval(() => {
        setHeadTiltAngle((prev) => {
          // slight natural variance between 10° and 30°
          const delta = (Math.random() - 0.48) * 3;
          const next = Math.max(8, Math.min(32, Math.round(prev + delta)));
          if (next > 25) {
            setSlouchCount((c) => c + 1);
          }
          return next;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Pomodoro countdown tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setStudyBlocksCompleted((c) => c + 1);
            setActiveTab('stretches');
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isSlouching = headTiltAngle > 25;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cervical Ergonomics Sentinel</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Study Posture Guard & Pomodoro Breaks
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Monitors cervical forward-head tilt ($&gt;25^\circ$) while coding or reading, with automated 2-minute micro-stretch triggers.
            </p>
          </div>

          {/* Toggle Monitoring Button */}
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`py-2.5 px-5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 self-start sm:self-auto ${
              isMonitoring
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isMonitoring ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Sentinel</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Activate Posture Sentinel</span>
              </>
            )}
          </button>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Live Cervical Head Tilt</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className={`text-2xl font-black ${isSlouching ? 'text-rose-400' : 'text-emerald-400'}`}>
                {headTiltAngle}°
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                {isSlouching ? '⚠️ Exceeds 25° Slouch Threshold' : 'Optimal alignment (<25°)'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Slouch Alerts Caught</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-amber-400">{slouchCount}</span>
              <span className="text-[10px] text-slate-500">Corrected immediately</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Today&apos;s Posture Health Score</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-cyan-400">{postureScoreToday}%</span>
              <span className="text-[10px] text-emerald-400 font-medium">Ranked #1 in Wing A 🏆</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab('stretches')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stretches' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          2-Min Posture Correction Stretches
        </button>
        <button
          onClick={() => setActiveTab('pomodoro')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pomodoro' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          25m Focus Block & Break Timer
        </button>
        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'monitor' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Quick Tilt & Slouch Angle Check
        </button>
      </div>

      {/* Tab 1: Live Monitor Simulation Card */}
      {activeTab === 'monitor' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex items-center space-x-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                  isSlouching
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isSlouching ? '⚠️' : '🧘'}
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {isSlouching ? 'Tech-Neck Slouch Detected!' : 'Spine Alignment Neutral'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  {isSlouching
                    ? 'Your head is tilted forward past 25°. Retract your chin and align ears over your shoulders.'
                    : 'Great posture! Your cervical spine is under minimal compressive load.'}
                </p>
              </div>
            </div>

            {/* Slider to test angles manually */}
            <div className="w-full md:w-56 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1"><Sliders className="w-3 h-3" /> Simulate Angle:</span>
                <strong className={isSlouching ? 'text-rose-400' : 'text-emerald-400'}>{headTiltAngle}°</strong>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={headTiltAngle}
                onChange={(e) => setHeadTiltAngle(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Pomodoro Timer */}
      {activeTab === 'pomodoro' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-4">
            <Clock className="w-8 h-8 mx-auto text-cyan-400" />
            <h4 className="text-xl font-bold text-white">Academic Deep-Work Block</h4>
            <p className="text-xs text-slate-400">
              Study without interruption for 25 minutes. FitMitra will gently pause you for a 2-minute micro-stretch routine.
            </p>

            <div className="py-6">
              <span className="text-6xl font-black tracking-tight text-white font-mono">
                {formatTime(timerSeconds)}
              </span>
            </div>

            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`py-3 px-6 rounded-2xl font-bold text-xs shadow-md transition-all ${
                  isTimerRunning
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {isTimerRunning ? 'Pause Block' : 'Start 25m Focus Block'}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(25 * 60);
                }}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 pt-2">
              Completed Today: <strong className="text-emerald-400">{studyBlocksCompleted} Focus Blocks</strong> (75 mins deep study)
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: 2-Minute Stretches */}
      {activeTab === 'stretches' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-base font-bold text-white">2-Minute Spinal Decompression Routine</h4>
            <p className="text-xs text-slate-400 mt-0.5">Designed specifically for dorm desks and library study carrels.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stretches.map((str, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{str.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">
                    {str.reps}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{str.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
