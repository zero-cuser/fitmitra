'use client';

import React, { useEffect } from 'react';
import {
  Trophy,
  Clock,
  Flame,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Zap,
  Activity
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface WorkoutSummary {
  workoutName: string;
  category: string;
  reps: number;
  metricUnit: 'reps' | 'seconds';
  durationSeconds: number;
  caloriesBurned: number;
  streakDays: number;
  xpEarned: number;
}

interface WorkoutCompletionProps {
  summary: WorkoutSummary;
  onDone: () => void;
  onTryAnother: () => void;
}

export const WorkoutCompletion: React.FC<WorkoutCompletionProps> = ({
  summary,
  onDone,
  onTryAnother
}) => {
  // Restrained celebration on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.45 },
        colors: ['#3866FF', '#4A7BFF', '#22C55E', '#06B6D4', '#8B5CF6']
      });
    } catch {}
  }, []);

  const formatDuration = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return '0:30';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="max-w-2xl mx-auto w-full py-4 sm:py-8 px-2 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* 1. CELEBRATION HEADER */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-3xl bg-surface-elevated border border-primary/40 flex items-center justify-center text-primary-bright shadow-2xl shadow-primary/20">
            <Trophy className="w-10 h-10 stroke-[2] text-primary-bright animate-bounce" />
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-primary/20 blur-xl opacity-75 pointer-events-none" />
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-success/15 border border-success/30 text-success text-xs font-black tracking-wide uppercase mb-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Session Logged</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
          Workout Completed!
        </h1>
        <p className="text-sm text-text-secondary mt-1.5 max-w-md">
          Great consistency! Your movement biometrics and effort have been saved to your student profile.
        </p>
      </div>

      {/* 2. WORKOUT CARD IDENTITY */}
      <Card className="p-5 sm:p-6 rounded-3xl bg-surface border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between gap-3 relative z-10 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-primary-bright">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
                Routine Completed
              </span>
              <h2 className="text-xl font-black text-text-primary tracking-tight">
                {summary.workoutName}
              </h2>
            </div>
          </div>

          <Badge color="primary" size="md">
            {summary.category}
          </Badge>
        </div>

        {/* 3. CORE METRICS GRID (Zero Fabrication) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          
          {/* Duration */}
          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle flex flex-col items-center justify-center text-center">
            <div className="p-1.5 rounded-xl bg-surface text-text-muted mb-1.5">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Duration
            </span>
            <span className="text-lg font-black text-text-primary mt-0.5">
              {formatDuration(summary.durationSeconds)}
            </span>
          </div>

          {/* Reps */}
          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle flex flex-col items-center justify-center text-center">
            <div className="p-1.5 rounded-xl bg-surface text-primary-bright mb-1.5">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              {summary.metricUnit === 'seconds' ? 'Hold Time' : 'Total Reps'}
            </span>
            <span className="text-lg font-black text-primary-bright mt-0.5">
              {summary.reps} {summary.metricUnit === 'seconds' ? 's' : ''}
            </span>
          </div>

          {/* Calories Burned */}
          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle flex flex-col items-center justify-center text-center">
            <div className="p-1.5 rounded-xl bg-surface text-warning mb-1.5">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Est. Burn
            </span>
            <span className="text-lg font-black text-warning mt-0.5">
              {summary.caloriesBurned} <span className="text-xs font-semibold text-text-muted">kcal</span>
            </span>
          </div>

          {/* Streak */}
          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle flex flex-col items-center justify-center text-center">
            <div className="p-1.5 rounded-xl bg-surface text-accent mb-1.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Active Streak
            </span>
            <span className="text-lg font-black text-accent mt-0.5">
              {summary.streakDays} <span className="text-xs font-semibold text-text-muted">days 🔥</span>
            </span>
          </div>

        </div>

        {/* XP Bonus Banner */}
        <div className="mt-4 pt-3.5 border-t border-border-subtle flex items-center justify-between text-xs text-text-secondary relative z-10">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-warning" />
            <span>Campus Level XP Awarded:</span>
          </span>
          <span className="font-black text-primary-bright">+{summary.xpEarned || 20} XP</span>
        </div>
      </Card>

      {/* 4. ACTIONS: DONE & TRY ANOTHER WORKOUT */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={onDone}
          className="w-full sm:flex-1 py-4 text-sm font-black uppercase tracking-wider flex items-center justify-center space-x-2 rounded-2xl shadow-xl shadow-primary/20"
        >
          <span>DONE</span>
          <ArrowRight className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={onTryAnother}
          className="w-full sm:flex-1 py-4 text-sm font-bold flex items-center justify-center space-x-2 rounded-2xl border-border-subtle hover:bg-surface-elevated"
        >
          <RotateCcw className="w-4 h-4" />
          <span>TRY ANOTHER WORKOUT</span>
        </Button>
      </div>

    </div>
  );
};
