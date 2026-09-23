'use client';

import React from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import {
  Flame,
  Target,
  Dumbbell,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Activity,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { WeeklyCalorieChart } from './WeeklyCalorieChart';
import { NavTabId } from '@/components/Shell/Sidebar';

interface ProgressDashboardProps {
  onNavigate: (tab: NavTabId) => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ onNavigate }) => {
  const {
    weeklyCalorieHistory,
    streakDays,
    caloriesBurnedToday,
    level,
    xp
  } = useWorkout();

  // Real data calculations without fabrication
  const totalBurnedWeek = weeklyCalorieHistory.reduce((sum, d) => sum + d.caloriesBurned, 0);
  const activeWorkoutDays = weeklyCalorieHistory.filter((d) => d.caloriesBurned > 0).length;
  const weeklyTargetDays = 5;
  const weeklyGoalPercent = Math.min(100, Math.round((activeWorkoutDays / weeklyTargetDays) * 100));
  const avgBurnPerActiveDay = activeWorkoutDays > 0 ? Math.round(totalBurnedWeek / activeWorkoutDays) : 0;

  // Check whether intentional empty state should be rendered
  const hasWorkoutHistory = totalBurnedWeek > 0 || caloriesBurnedToday > 0;

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS ROW: Prioritizing Weekly Goal, Workout Count, Activity, Streak */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Weekly Goal */}
        <Card className="p-5 rounded-3xl bg-surface border-border-subtle flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
              Weekly Goal
            </span>
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary-bright">
              <Target className="w-4 h-4" />
            </div>
          </div>

          <div className="my-1">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                {activeWorkoutDays}
              </span>
              <span className="text-xs font-bold text-text-muted">
                / {weeklyTargetDays} active days
              </span>
            </div>
            <div className="mt-2.5">
              <ProgressBar value={weeklyGoalPercent} size="sm" variant="primary" />
            </div>
          </div>

          <p className="text-[11px] text-text-secondary mt-2">
            {activeWorkoutDays >= weeklyTargetDays
              ? '🎯 Target reached! Fantastic dedication.'
              : `${weeklyTargetDays - activeWorkoutDays} more sessions to reach weekly target.`}
          </p>
        </Card>

        {/* Card 2: Workout Count */}
        <Card className="p-5 rounded-3xl bg-surface border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
              Workout Sessions
            </span>
            <div className="p-1.5 rounded-xl bg-accent/10 text-accent">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>

          <div className="my-1">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-black text-accent tracking-tight">
                {activeWorkoutDays}
              </span>
              <span className="text-xs font-semibold text-text-muted">sessions</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              Recorded in the last 7 days
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] text-text-muted pt-2 border-t border-border-subtle">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span>100% on-device tracking</span>
          </div>
        </Card>

        {/* Card 3: Activity & Calorie Burn */}
        <Card className="p-5 rounded-3xl bg-surface border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
              Weekly Activity Burn
            </span>
            <div className="p-1.5 rounded-xl bg-warning/10 text-warning">
              <Flame className="w-4 h-4" />
            </div>
          </div>

          <div className="my-1">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-black text-warning tracking-tight">
                {totalBurnedWeek}
              </span>
              <span className="text-xs font-bold text-text-muted">kcal</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              {avgBurnPerActiveDay > 0
                ? `~${avgBurnPerActiveDay} kcal per workout day`
                : 'No exercise burn logged yet'}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] text-text-muted pt-2 border-t border-border-subtle">
            <TrendingUp className="w-3.5 h-3.5 text-warning" />
            <span>Energy output</span>
          </div>
        </Card>

        {/* Card 4: Streak */}
        <Card className="p-5 rounded-3xl bg-surface border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
              Consistency Streak
            </span>
            <div className="p-1.5 rounded-xl bg-success/10 text-success">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="my-1">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl sm:text-3xl font-black text-success tracking-tight">
                {streakDays}
              </span>
              <span className="text-xs font-bold text-text-muted">days active 🔥</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              Level {level} Athlete ({xp} XP)
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] text-text-muted pt-2 border-t border-border-subtle">
            <Calendar className="w-3.5 h-3.5 text-primary-bright" />
            <span>Daily habit retention</span>
          </div>
        </Card>

      </div>

      {/* 2. MAIN PROGRESS VISUALIZATION OR INTENTIONAL EMPTY STATE */}
      {!hasWorkoutHistory ? (
        /* Intentional Empty State for New Users (No fake historical activity) */
        <Card className="p-8 sm:p-12 rounded-3xl bg-surface border-border-subtle text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary-bright shadow-xl shadow-primary/10">
            <Activity className="w-8 h-8" />
          </div>

          <div className="max-w-md space-y-1.5">
            <h3 className="text-xl font-black text-text-primary tracking-tight">
              No Workout History Yet
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Complete your first AI-coached routine to start recording reps, tracking energy output, and building your weekly consistency streak.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => onNavigate('workout')}
            className="font-black px-6 py-3.5 rounded-2xl flex items-center space-x-2 shadow-lg shadow-primary/25"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Your First Workout</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>
      ) : (
        /* Historical Progress Chart with Real Data */
        <WeeklyCalorieChart />
      )}

    </div>
  );
};
