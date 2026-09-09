import React, { useState, useEffect } from 'react';
import { useFitness } from '../../context/FitnessContext';
import { DESK_MICRO_BREAKS } from '../../data/exercises';
import { coachVoice } from '../../utils/voiceCoach';
import { playChimeAlert } from '../../utils/soundEffects';
import {
  ShieldAlert,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Smile,
  Frown,
  CheckCircle,
  Laptop
} from 'lucide-react';

export const PostureSentinel = () => {
  const { logPostureBreak, user } = useFitness();
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSlouching, setIsSlouching] = useState(false);
  const [headTiltAngle, setHeadTiltAngle] = useState(14); // 0-25 is good, >25 is slouch
  const [postureScore, setPostureScore] = useState(92);
  const [activeBreak, setActiveBreak] = useState(null);
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0);

  // Timer loop
  useEffect(() => {
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      if (user.soundEnabled) playChimeAlert();
      coachVoice.speak("Study block completed! Time for a 2-minute spinal micro-break!", true);
      // Auto-trigger first break
      startBreak(DESK_MICRO_BREAKS[0]);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, user.soundEnabled]);

  // Break countdown loop
  useEffect(() => {
    let breakInterval;
    if (activeBreak && breakTimeRemaining > 0) {
      breakInterval = setInterval(() => {
        setBreakTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (activeBreak && breakTimeRemaining === 0) {
      // Break completed
      logPostureBreak();
      coachVoice.speak("Great stretch! Your spine thanks you. Return to studying fresh!", true);
      setActiveBreak(null);
    }
    return () => clearInterval(breakInterval);
  }, [activeBreak, breakTimeRemaining, logPostureBreak]);

  // Slouch simulator / detector toggle
  const handleToggleSlouch = () => {
    const nextState = !isSlouching;
    setIsSlouching(nextState);
    if (nextState) {
      setHeadTiltAngle(38);
      setPostureScore(prev => Math.max(prev - 15, 45));
      if (user.soundEnabled) playChimeAlert();
      coachVoice.speak("Posture check! Sit tall and roll your shoulders back!", true);
    } else {
      setHeadTiltAngle(12);
      setPostureScore(prev => Math.min(prev + 10, 98));
    }
  };

  const startBreak = (microBreak) => {
    setActiveBreak(microBreak);
    setBreakTimeRemaining(microBreak.durationSec);
    coachVoice.speak(`Starting ${microBreak.name}. ${microBreak.instructions}`);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Laptop className="w-4 h-4" />
            <span>Ergonomics & Pomodoro Sentinel</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Study Posture & Micro-Breaks</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Protect your spine during marathon coding and exam prep. Prevents "tech-neck", headaches, and back stiffness with automatic 2-minute mobility breaks.
          </p>
        </div>

        {/* Posture Score Pill */}
        <div className="flex items-center space-x-3 bg-slate-900/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl">
          <div className={`p-2 rounded-xl ${postureScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {postureScore >= 80 ? <Smile className="w-5 h-5" /> : <Frown className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Posture Rating</div>
            <div className="text-lg font-black text-white">{postureScore}% <span className="text-xs font-normal text-slate-400">Optimum</span></div>
          </div>
        </div>
      </div>

      {/* Grid: Sentinel Status + Pomodoro Clock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Real-time Sentinel Card (6 cols) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Cervical Spine Monitor</span>
              <h3 className="text-lg font-bold text-white mt-1">Live Desk Ergonomics</h3>
            </div>
            <button
              onClick={handleToggleSlouch}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isSlouching
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSlouching ? 'Simulating Slouch (Click to Fix)' : 'Simulate Slouch Alert'}</span>
            </button>
          </div>

          {/* Visual Slouch Indicator Avatar */}
          <div className={`p-6 rounded-2xl border transition-all text-center ${
            isSlouching
              ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-900/20'
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="relative inline-block mx-auto mb-3">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isSlouching
                  ? 'bg-rose-500 text-slate-950 rotate-12 scale-105 shadow-xl shadow-rose-500/40'
                  : 'bg-emerald-500 text-slate-950'
              }`}>
                {isSlouching ? <ShieldAlert className="w-10 h-10" /> : <Smile className="w-10 h-10" />}
              </div>
            </div>

            <h4 className={`text-base font-bold ${isSlouching ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isSlouching ? '⚠️ Slouching & Forward Head Crane Detected!' : '✅ Optimal Ergonomic Alignment'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isSlouching
                ? 'Head is tilted 38° forward. Roll shoulders back, elevate your laptop screen, and tuck your chin.'
                : 'Spine is neutral and cervical vertebrae are unloaded. Great posture!'}
            </p>

            <div className="mt-4 inline-flex items-center space-x-2 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800 text-xs">
              <span className="text-slate-400">Neck Angle:</span>
              <span className={`font-mono font-bold ${isSlouching ? 'text-rose-400' : 'text-emerald-400'}`}>{headTiltAngle}°</span>
              <span className="text-slate-500">(Target &lt; 25°)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Desk Breaks Taken</div>
              <div className="text-lg font-bold text-cyan-400 mt-1">{user ? '4 Breaks' : '0'}</div>
            </div>
            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Next Auto-Check</div>
              <div className="text-lg font-bold text-slate-200 mt-1">In 8 Mins</div>
            </div>
          </div>
        </div>

        {/* Right: Pomodoro Study Timer (6 cols) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Academic Focus Session</span>
              <div className="flex space-x-2">
                {[25, 50].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setStudyMinutes(mins);
                      setTimeLeft(mins * 60);
                      setIsTimerRunning(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      studyMinutes === mins
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {mins}m Study
                  </button>
                ))}
              </div>
            </div>

            {/* Timer Clock Display */}
            <div className="text-center py-6">
              <div className="text-6xl md:text-7xl font-mono font-black text-white tracking-wider">
                {formatTime(timeLeft)}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {isTimerRunning ? 'Study interval in progress... Stay focused!' : 'Paused. Ready when you are.'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-lg ${
                  isTimerRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                }`}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isTimerRunning ? 'Pause Session' : 'Start Focus Timer'}</span>
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimeLeft(studyMinutes * 60);
                }}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>🎁 Reward on Completion:</span>
            <span className="font-bold text-purple-400">+20 FitCoins & +15 XP</span>
          </div>
        </div>
      </div>

      {/* Active Micro-Break Modal / Section if active */}
      {activeBreak && (
        <div className="bg-gradient-to-r from-purple-950/60 to-slate-900 border-2 border-purple-500/50 rounded-2xl p-6 shadow-2xl animate-fade-in">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-4xl p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30">
                {activeBreak.icon}
              </div>
              <div>
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">Active Spinal Micro-Break</span>
                <h3 className="text-xl font-black text-white">{activeBreak.name}</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-lg">{activeBreak.instructions}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-center px-4 py-2 bg-slate-950/80 rounded-xl border border-purple-500/40">
                <div className="text-2xl font-black font-mono text-purple-300">{breakTimeRemaining}s</div>
                <div className="text-[10px] text-slate-400 uppercase">Remaining</div>
              </div>
              <button
                onClick={() => {
                  logPostureBreak();
                  setActiveBreak(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/30 transition-all"
              >
                Mark Done (+20 Coins)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Minute Micro-Break Catalog */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Quick Desk Relievers (No Equipment Needed)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DESK_MICRO_BREAKS.map((brk) => (
            <div key={brk.id} className="glass-card rounded-xl p-4 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl">{brk.icon}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {brk.durationSec}s
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white">{brk.name}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{brk.benefit}</p>
              </div>

              <button
                onClick={() => startBreak(brk)}
                className="mt-4 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-1 transition-all"
              >
                <span>Start Stretch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
