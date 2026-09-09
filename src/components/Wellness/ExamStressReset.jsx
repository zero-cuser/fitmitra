import React, { useState, useEffect } from 'react';
import { useFitness } from '../../context/FitnessContext';
import { coachVoice } from '../../utils/voiceCoach';
import {
  Heart,
  Droplets,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle,
  Plus
} from 'lucide-react';

export const ExamStressReset = () => {
  const { todayStats, logWater, logMindfulSession } = useFitness();

  // 4-7-8 Breathing state
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('idle'); // 'inhale' | 'hold' | 'exhale' | 'idle'
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(4);
  const [roundsCompleted, setRoundsCompleted] = useState(0);

  // 20-20-20 Eye guard state
  const [eyeSeconds, setEyeSeconds] = useState(20);
  const [isEyeTimerRunning, setIsEyeTimerRunning] = useState(false);

  // Breathing loop
  useEffect(() => {
    let interval;
    if (isBreathingActive) {
      interval = setInterval(() => {
        setPhaseSecondsLeft(prev => {
          if (prev <= 1) {
            // Transition phase
            if (breathPhase === 'inhale') {
              setBreathPhase('hold');
              coachVoice.speak("Hold your breath gently.");
              return 7;
            } else if (breathPhase === 'hold') {
              setBreathPhase('exhale');
              coachVoice.speak("Exhale completely through your mouth.");
              return 8;
            } else {
              // Complete round
              const nextRounds = roundsCompleted + 1;
              setRoundsCompleted(nextRounds);
              if (nextRounds >= 4) {
                setIsBreathingActive(false);
                setBreathPhase('idle');
                coachVoice.speak("Wonderful session. Your nervous system is calmed and centered.", true);
                logMindfulSession(3);
                return 4;
              }
              setBreathPhase('inhale');
              coachVoice.speak("Breathe in deeply through your nose.");
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathPhase('idle');
      setPhaseSecondsLeft(4);
    }
    return () => clearInterval(interval);
  }, [isBreathingActive, breathPhase, roundsCompleted, logMindfulSession]);

  const toggleBreathing = () => {
    if (!isBreathingActive) {
      setIsBreathingActive(true);
      setBreathPhase('inhale');
      setPhaseSecondsLeft(4);
      setRoundsCompleted(0);
      coachVoice.speak("Starting 4-7-8 breathing. Inhale gently through your nose.", true);
    } else {
      setIsBreathingActive(false);
      setBreathPhase('idle');
    }
  };

  // Eye rest timer loop
  useEffect(() => {
    let timer;
    if (isEyeTimerRunning && eyeSeconds > 0) {
      timer = setInterval(() => {
        setEyeSeconds(prev => prev - 1);
      }, 1000);
    } else if (eyeSeconds === 0 && isEyeTimerRunning) {
      setIsEyeTimerRunning(false);
      setEyeSeconds(20);
      coachVoice.speak("Eye strain reset complete! Your eyes are rested.", true);
    }
    return () => clearInterval(timer);
  }, [isEyeTimerRunning, eyeSeconds]);

  const waterPercent = Math.min(Math.round((todayStats.waterMl / todayStats.waterTargetMl) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Heart className="w-4 h-4" />
            <span>Nervous System Recovery</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Exam Stress & Mind-Body Sanctuary</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Physical health is intimately tied to mental focus. Flush out cortisol spikes, stay hydrated in hostel rooms, and prevent digital eye strain.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl">
          <Droplets className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Hydration Progress</div>
            <div className="text-lg font-black text-white">{todayStats.waterMl} ml <span className="text-xs text-slate-400 font-normal">/ {todayStats.waterTargetMl}ml</span></div>
          </div>
        </div>
      </div>

      {/* Grid: 4-7-8 Breathing + Hydration + Eye Strain */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 4-7-8 Breathing Visualizer (7 cols) */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-slate-800 space-y-6 text-center">
          <div className="flex justify-between items-center text-left">
            <div>
              <span className="text-xs uppercase font-semibold text-cyan-400 tracking-wider">Parasympathetic Reset</span>
              <h3 className="text-lg font-bold text-white mt-0.5">4-7-8 Box Breathing</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Round {roundsCompleted} of 4</span>
          </div>

          {/* Animated Circle Visualizer */}
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="relative w-56 h-56 flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                  breathPhase === 'inhale'
                    ? 'scale-110 bg-cyan-500/20 border-2 border-cyan-400'
                    : breathPhase === 'hold'
                    ? 'scale-105 bg-purple-500/20 border-2 border-purple-400'
                    : breathPhase === 'exhale'
                    ? 'scale-90 bg-emerald-500/20 border-2 border-emerald-400'
                    : 'scale-95 bg-slate-800/40 border border-slate-700'
                }`}
              />

              {/* Inner core circle */}
              <div className="relative z-10 text-center">
                <span className="text-4xl font-mono font-black text-white block">
                  {isBreathingActive ? `${phaseSecondsLeft}s` : '4-7-8'}
                </span>
                <span className="text-xs uppercase font-bold tracking-widest text-cyan-300 mt-1 block">
                  {breathPhase === 'inhale'
                    ? 'Inhale (Nose)'
                    : breathPhase === 'hold'
                    ? 'Hold Breath'
                    : breathPhase === 'exhale'
                    ? 'Exhale (Mouth)'
                    : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={toggleBreathing}
              className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-lg ${
                isBreathingActive
                  ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30'
              }`}
            >
              {isBreathingActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isBreathingActive ? 'Stop Exercise' : 'Start 4-7-8 Breathing'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Derived from ancient pranayama, 4-7-8 stimulates the vagus nerve, rapidly lowering heart rate and subduing pre-exam panic.
          </p>
        </div>

        {/* Right Column: Hydration & Eye Guard (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Hydration Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span>Hostel Hydration Sentinel</span>
              </h3>
              <span className="text-xs text-cyan-400 font-bold font-mono">{waterPercent}%</span>
            </div>

            {/* Visual water level bar */}
            <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 shadow-md shadow-cyan-500/30"
                style={{ width: `${waterPercent}%` }}
              />
            </div>

            {/* Quick add buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => logWater(250)}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-200 flex items-center justify-center space-x-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>+250 ml (Glass)</span>
              </button>

              <button
                onClick={() => logWater(500)}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-200 flex items-center justify-center space-x-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>+500 ml (Bottle)</span>
              </button>
            </div>
          </div>

          {/* 20-20-20 Eye Strain Guard */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <span>20-20-20 Digital Eye Guard</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold border border-purple-500/20">
                Screen Rest
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Every 20 minutes of screen coding, look at an object at least 20 feet away for 20 seconds.
            </p>

            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="font-mono text-2xl font-bold text-white">
                {eyeSeconds}s
              </div>
              <button
                onClick={() => {
                  setEyeSeconds(20);
                  setIsEyeTimerRunning(!isEyeTimerRunning);
                  if (!isEyeTimerRunning) {
                    coachVoice.speak("Look away from your screen. Focus on an object far across the room for 20 seconds.");
                  }
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isEyeTimerRunning
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                }`}
              >
                {isEyeTimerRunning ? 'Pause' : 'Start 20s Lookaway'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
