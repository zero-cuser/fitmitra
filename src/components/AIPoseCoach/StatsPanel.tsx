'use client';

import React from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { EXERCISE_CATALOG } from '@/data/exercises';
import { getPlankAlignmentMetrics } from './AngleMath';
import { CheckCircle2, AlertTriangle, RotateCcw, Plus, Activity, Award } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

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
      <div className="bg-surface border border-border-subtle rounded-3xl p-5 shadow-xl relative overflow-hidden">
        
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <span className="text-[10px] font-extrabold text-primary-bright uppercase tracking-wider">
              {config.category}
            </span>
            <h3 className="text-lg font-black text-text-primary">{config.name}</h3>
          </div>
          <Badge color="primary" size="sm">
            {config.targetMuscles.split(',')[0]}
          </Badge>
        </div>

        {/* Big Counter & Angle Display */}
        <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
          
          {/* Reps Counter */}
          <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
              {config.isHoldExercise ? 'Seconds' : 'Completed Reps'}
            </span>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
                {sessionReps}
              </span>
              <span className="text-xs font-bold text-text-muted">
                / {targetReps}
              </span>
            </div>
            <span className="text-[10px] text-primary-bright font-bold mt-1">
              ~{estCalories} kcal burned
            </span>
          </div>

          {/* Real-Time Joint Angle */}
          <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
              {config.isHoldExercise ? 'Alignment Angle' : 'Live Joint Angle'}
            </span>
            <div className="flex items-baseline space-x-0.5">
              <span className="text-3xl sm:text-4xl font-black text-primary-bright tracking-tight">
                {liveAngle}°
              </span>
            </div>
            <div className="flex items-center space-x-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  config.isHoldExercise
                    ? plankMetrics.isGoodAlignment
                      ? 'bg-success'
                      : 'bg-warning animate-pulse'
                    : currentStage === 'down'
                    ? 'bg-accent animate-pulse'
                    : 'bg-success'
                }`}
              />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                {config.isHoldExercise
                  ? plankMetrics.isGoodAlignment
                    ? 'GOOD ALIGNMENT'
                    : 'ADJUST POSITION'
                  : `Stage: ${currentStage}`}
              </span>
            </div>
          </div>

        </div>

        {/* Progress Bar */}
        <div className="mb-4 relative z-10">
          <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
            <span className="text-text-muted">Goal Progress</span>
            <span className="text-primary-bright font-black">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-surface-elevated rounded-full overflow-hidden p-0.5 border border-border-subtle">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary-bright to-accent rounded-full transition-all duration-300 shadow-sm shadow-primary/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-2 relative z-10">
          <button
            onClick={() => recordRep(config.isHoldExercise ? 5 : 1)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary-bright font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{config.isHoldExercise ? '+5s Hold' : '+1 Manual Rep'}</span>
          </button>

          <button
            onClick={resetSession}
            className="p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-text-primary transition-all"
            title="Reset Current Set"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 2. Bio-Mechanical Form Guard & Cues */}
      <div className="bg-surface border border-border-subtle rounded-3xl p-5 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-extrabold text-text-primary uppercase tracking-wider mb-3">
          <Activity className="w-4 h-4 text-primary-bright" />
          <span>Biomechanical Form Guard</span>
        </div>

        {/* Active Fault Alert if any */}
        {isTracking && !isInFrame ? (
          <div className="mb-3 p-3 rounded-2xl bg-warning/10 border border-warning/30 text-warning text-xs flex items-center space-x-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <span className="text-[11px] font-semibold">Position yourself fully in camera frame to track reps.</span>
          </div>
        ) : activeFaults.length > 0 ? (
          <div className="mb-3 p-3 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs space-y-1 animate-in fade-in duration-200">
            <div className="flex items-center space-x-1.5 font-bold text-danger">
              <AlertTriangle className="w-4 h-4" />
              <span>Posture Adjustment Suggested:</span>
            </div>
            {activeFaults.map((f, idx) => (
              <p key={idx} className="text-[11px] pl-5 text-text-primary">
                • {f.message}
              </p>
            ))}
          </div>
        ) : (
          <div className="mb-3 p-3 rounded-2xl bg-success/10 border border-success/30 text-success text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span className="text-[11px] font-semibold">
              {config.isHoldExercise
                ? plankMetrics.isGoodAlignment
                  ? 'GOOD ALIGNMENT'
                  : 'ADJUST POSITION'
                : 'Kinematics locked. Alignment within target thresholds.'}
            </span>
          </div>
        )}

        {/* Form Checklist */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
            Execution Checklist
          </span>
          {config.formChecklist.map((item, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-xs text-text-secondary">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-bright mt-1.5 shrink-0" />
              <span className="text-[11px] leading-snug">{item}</span>
            </div>
          ))}
        </div>

        {/* Audio Coach Badge */}
        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-muted">
          <span className="flex items-center space-x-1">
            <Award className="w-3.5 h-3.5 text-warning" />
            <span>Voice Coach Active</span>
          </span>
          <span className="text-primary-bright font-bold">+10 XP per valid rep</span>
        </div>

      </div>
    </div>
  );
};
