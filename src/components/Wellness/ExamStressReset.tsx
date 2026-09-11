'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Pause, RotateCcw, Heart, Info, CheckCircle2 } from 'lucide-react';
import { sounds } from '@/utils/soundEffects';

type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale';

export const ExamStressReset: React.FC = () => {
  const [phase, setPhase] = useState<BreathPhase>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(4);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isActive) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // State transition machine
            if (phase === 'idle' || phase === 'exhale') {
              setPhase('inhale');
              return 4;
            } else if (phase === 'inhale') {
              setPhase('hold');
              return 7;
            } else if (phase === 'hold') {
              setPhase('exhale');
              setCompletedCycles((c) => c + 1);
              return 8;
            }
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setPhase('idle');
      setSecondsRemaining(4);
    }

    return () => clearInterval(timer);
  }, [isActive, phase]);

  const handleToggle = () => {
    if (!isActive) {
      setIsActive(true);
      setPhase('inhale');
      setSecondsRemaining(4);
    } else {
      setIsActive(false);
      setPhase('idle');
    }
  };

  const getPhaseInstruction = () => {
    switch (phase) {
      case 'inhale':
        return { text: 'Inhale through nose deeply...', color: 'text-emerald-400', scale: 'scale-125' };
      case 'hold':
        return { text: 'Hold breath • Retain calm...', color: 'text-cyan-400', scale: 'scale-125' };
      case 'exhale':
        return { text: 'Exhale slowly through mouth...', color: 'text-teal-400', scale: 'scale-90' };
      default:
        return { text: 'Press Start to begin 4-7-8 Breathing', color: 'text-slate-400', scale: 'scale-100' };
    }
  };

  const currentInfo = getPhaseInstruction();

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-2">
          <Heart className="w-3.5 h-3.5" />
          <span>Autonomic Nervous System Regulation</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Exam Stress & 4-7-8 Breath Sanctuary
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Designed by Dr. Andrew Weil: Stimulates parasympathetic vagus nerve tone to rapidly lower heart rate and clear brain fog before exams or vivas.
        </p>
      </div>

      {/* Main Interactive Breathing Circle Arena */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
        
        {/* Background ambient ripples */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="w-96 h-96 rounded-full border border-teal-500/20 animate-ping duration-1000" />
        </div>

        {/* Breathing Circle Visualizer */}
        <div className="relative flex items-center justify-center my-4">
          <div
            className={`w-48 h-48 sm:w-60 sm:h-60 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-1000 shadow-2xl ${
              phase === 'inhale'
                ? 'bg-emerald-500/20 border-emerald-400 shadow-emerald-500/30 scale-125'
                : phase === 'hold'
                ? 'bg-cyan-500/20 border-cyan-400 shadow-cyan-500/30 scale-125 animate-pulse'
                : phase === 'exhale'
                ? 'bg-teal-500/10 border-teal-500/60 shadow-teal-500/20 scale-90'
                : 'bg-slate-950 border-slate-800 scale-100'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              {phase === 'idle' ? 'Ready' : phase}
            </span>
            <span className="text-5xl font-black text-white font-mono">
              {isActive ? secondsRemaining : '4-7-8'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              {isActive ? 'Seconds' : 'Vagal Reset'}
            </span>
          </div>
        </div>

        {/* Dynamic Instruction */}
        <div>
          <h4 className={`text-base sm:text-lg font-bold transition-colors ${currentInfo.color}`}>
            {currentInfo.text}
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Cycles Completed: <strong className="text-white">{completedCycles}</strong> • ~{completedCycles * 19}s parasympathetic recharge
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggle}
            className={`py-3 px-8 rounded-2xl font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center space-x-2 ${
              isActive
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Breath</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start 4-7-8 Exercise</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsActive(false);
              setPhase('idle');
              setSecondsRemaining(4);
              setCompletedCycles(0);
            }}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset Counter"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
