'use client';

import React from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { EXERCISE_CATALOG } from '@/data/exercises';
import { getPlankAlignmentMetrics } from './AngleMath';
import { CheckCircle2, AlertTriangle, RotateCcw, Plus, Activity, Award } from 'lucide-react';

export const StatsPanel: React.FC = () => {
  const {
    selectedExercise,
    sessionReps,
    targetReps,
    liveAngle,
    currentStage,
    activeFaults,
    isInFrame,
    isTracking,
    recordRep,
    resetSession
  } = useWorkout();

  const config = EXERCISE_CATALOG[selectedExercise];
  const progressPercent = Math.min(Math.round((sessionReps / targetReps) * 100), 100);
  const estCalories = (sessionReps * config.calPerRep).toFixed(1);
  const plankDeviationThreshold = config.formThresholds?.maxDeviation ?? 15;
  const plankMetrics = getPlankAlignmentMetrics(liveAngle, plankDeviationThreshold);

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Main Repetition / Progress Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              {config.category}
            </span>
            <h3 className="text-lg font-black text-white">{config.name}</h3>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-[11px] font-bold text-slate-300">
            {config.targetMuscles.split(',')[0]}
          </div>
        </div>

        {/* Big Counter & Angle Display */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          
          {/* Reps Counter */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              {config.isHoldExercise ? 'Seconds' : 'Completed Reps'}
            </span>
            <div className="flex items-baseline space-x-1">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {sessionReps}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {targetReps}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium mt-1">
              ~{estCalories} kcal burned
            </span>
          </div>

          {/* Real-Time Joint Angle */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              {config.isHoldExercise ? 'Alignment Angle' : 'Live Joint Angle'}
            </span>
            <div className="flex items-baseline space-x-0.5">
              <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">
                {liveAngle}°
              </span>
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  config.isHoldExercise
                    ? plankMetrics.isGoodAlignment
                      ? 'bg-emerald-400'
                      : 'bg-rose-400 animate-pulse'
                    : currentStage === 'down'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {config.isHoldExercise
                  ? plankMetrics.isGoodAlignment
                    ? 'Good Alignment'
                    : `Off Axis (±${plankMetrics.deviation}°)`
                  : `Stage: ${currentStage}`}
              </span>
            </div>
          </div>

        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
            <span className="text-slate-400">Goal Progress</span>
            <span className="text-emerald-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-300 shadow-sm shadow-emerald-500/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => recordRep(config.isHoldExercise ? 5 : 1)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{config.isHoldExercise ? '+5s Hold' : '+1 Manual Rep'}</span>
          </button>

          <button
            onClick={resetSession}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-white transition-all"
            title="Reset Current Set"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 2. Bio-Mechanical Form Guard & Cues */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider mb-3">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Bio-Mechanical Form Guard</span>
        </div>

        {/* Active Fault Alert if any */}
        {isTracking && !isInFrame ? (
          <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] font-medium">Position yourself fully in camera frame to track reps.</span>
          </div>
        ) : activeFaults.length > 0 ? (
          <div className="mb-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1 animate-in fade-in duration-200">
            <div className="flex items-center space-x-1.5 font-bold text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Real-Time Biometric Fault Detected:</span>
            </div>
            {activeFaults.map((f, idx) => (
              <p key={idx} className="text-[11px] pl-5">
                • {f.message}
              </p>
            ))}
          </div>
        ) : (
          <div className="mb-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-medium">Kinematics locked. Alignment within target thresholds.</span>
          </div>
        )}

        {/* Form Checklist */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Key Execution Checklist
          </span>
          {config.formChecklist.map((item, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span className="text-[11px] leading-snug">{item}</span>
            </div>
          ))}
        </div>

        {/* Audio Coach Badge */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Voice Coach Active</span>
          </span>
          <span className="text-emerald-400 font-semibold">+10 XP per valid rep</span>
        </div>

      </div>
    </div>
  );
};
