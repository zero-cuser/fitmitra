'use client';

import React, { useMemo } from 'react';
import {
  Zap,
  Flame,
  Utensils,
  HeartPulse,
  Users,
  Clock,
  ArrowRight,
  Shield,
  Droplets,
  Award,
  Play,
  Sparkles,
  TrendingUp,
  HeartHandshake
} from 'lucide-react';
import { useWorkout } from '@/context/WorkoutContext';
import { useAuth } from '@/context/AuthContext';
import { NavTabId } from '@/components/Shell/Sidebar';
import { ExerciseKey } from '@/types/fitness';
import { EXERCISE_CATALOG } from '@/data/exercises';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import confetti from 'canvas-confetti';

export interface HomeDashboardProps {
  onNavigate: (tab: NavTabId) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
  const {
    selectedExercise,
    setSelectedExercise,
    sessionReps,
    caloriesBurnedToday,
    caloriesGainedToday,
    streakDays,
    level,
    waterIntakeToday
  } = useWorkout();

  const { user, friends, cheerFriend } = useAuth();

  // Dynamic time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = useMemo(() => {
    if (!user?.name) return 'Athlete';
    return user.name.trim().split(' ')[0];
  }, [user?.name]);

  // Today's recommended workout based on actual user goal & exercise catalog
  const todaysWorkout = useMemo(() => {
    const primaryGoal = user?.goal || 'strength';
    let title = 'Full Body Functional Core';
    let meta = '15 min • Moderate • Zero equipment';
    let targetExercise: ExerciseKey = 'squats';
    let focusMuscles = 'Quads, Glutes & Core Stability';

    if (primaryGoal === 'strength') {
      title = 'Bodyweight Strength & Power';
      meta = '20 min • Challenging • Zero equipment';
      targetExercise = 'pushups';
      focusMuscles = 'Chest, Shoulders & Triceps Lockout';
    } else if (primaryGoal === 'fat_loss') {
      title = 'Metabolic Calorie Burn & Agility';
      meta = '15 min • High Energy • Zero equipment';
      targetExercise = 'jumpingJacks';
      focusMuscles = 'Full Body Cardio & Calves';
    } else if (primaryGoal === 'cardio' || primaryGoal === 'athletic') {
      title = 'Dynamic Athletic Agility';
      meta = '15 min • High Tempo • Zero equipment';
      targetExercise = 'lunges';
      focusMuscles = 'Unilateral Quads, Hamstrings & Balance';
    } else if (selectedExercise === 'plank') {
      title = 'Isometric Core & Posture Lockdown';
      meta = '10 min • Moderate • Zero equipment';
      targetExercise = 'plank';
      focusMuscles = 'Transverse Abdominis & Spine Alignment';
    }

    const config = EXERCISE_CATALOG[targetExercise];

    return {
      title,
      meta,
      exerciseKey: targetExercise,
      exerciseName: config?.name || 'Bodyweight Movement',
      focusMuscles,
      estBurn: (config?.calPerRep ? config.calPerRep * config.defaultTarget : 45).toFixed(0)
    };
  }, [user?.goal, selectedExercise]);

  const targetCalories = user?.targetDailyCalories || 2200;
  const caloriePercent = Math.min(Math.round((caloriesGainedToday / targetCalories) * 100), 100);

  const targetWater = user?.targetWaterMl || 2500;
  const waterPercent = Math.min(Math.round((waterIntakeToday / targetWater) * 100), 100);

  const handleStartWorkout = (exerciseKey?: ExerciseKey) => {
    if (exerciseKey) {
      setSelectedExercise(exerciseKey);
    }
    onNavigate('workout');
    // Scroll to viewport
    setTimeout(() => {
      const el = document.getElementById('camera-viewport-top');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCheer = (friendId: string) => {
    cheerFriend(friendId);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
  };

  const activeFriends = useMemo(() => {
    return (friends || []).slice(0, 3);
  }, [friends]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. GREETING & STRONGEST ACTION: START WORKOUT */}
      <Card variant="elevated" className="p-5 sm:p-7 relative overflow-hidden">
        {/* Subtle energetic background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/4 w-60 h-60 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center space-x-2">
              <Badge color="primary" size="sm" dot>
                Daily Action Hub
              </Badge>
              <Badge color="warning" size="sm">
                🔥 {streakDays}d Streak
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {greeting}, {firstName}
            </h1>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
              Small steps. Big progress.
            </p>
          </div>

          {/* Strongest Action: START WORKOUT CTA */}
          <div className="shrink-0 w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => handleStartWorkout()}
              className="py-4 px-8 text-sm sm:text-base font-black shadow-glow-primary bg-gradient-to-r from-primary via-primary-bright to-secondary hover:from-primary-bright hover:to-secondary cursor-pointer"
              leftIcon={<Play className="w-5 h-5 fill-white text-white" />}
              rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
            >
              START WORKOUT
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. TODAY'S WORKOUT CARD */}
      <Card variant="default" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-bright">
                Today&apos;s Workout
              </span>
              <span className="w-1 h-1 rounded-full bg-border-strong" />
              <span className="text-[10px] text-text-muted">Personalized for you</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight mt-0.5">
              {todaysWorkout.title}
            </h2>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-text-muted">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>{todaysWorkout.meta}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 text-xs text-text-secondary">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-text-primary">Featured Movement:</span>
              <span className="px-2 py-0.5 rounded-md bg-surface-elevated text-primary-bright font-bold border border-border-subtle">
                {todaysWorkout.exerciseName}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              Target Muscles: <span className="text-text-secondary">{todaysWorkout.focusMuscles}</span> • Est. Burn ~{todaysWorkout.estBurn} kcal
            </p>
          </div>

          <Button
            variant="secondary"
            size="md"
            onClick={() => handleStartWorkout(todaysWorkout.exerciseKey)}
            className="self-start sm:self-auto shrink-0"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Start This Workout
          </Button>
        </div>
      </Card>

      {/* 3. QUICK ACTIONS (4-GRID) */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
          Quick Actions
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Action 1: AI Coach */}
          <button
            onClick={() => handleStartWorkout()}
            className="p-4 rounded-2xl bg-surface border border-border-subtle hover:border-primary/50 hover:bg-surface-hover transition-all text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary-bright mb-3 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-primary-bright transition-colors">
              AI Coach
            </h4>
            <p className="text-[10px] sm:text-[11px] text-text-muted mt-0.5 line-clamp-1">
              Live pose tracking
            </p>
          </button>

          {/* Action 2: Short Workout */}
          <button
            onClick={() => handleStartWorkout('squats')}
            className="p-4 rounded-2xl bg-surface border border-border-subtle hover:border-success/50 hover:bg-surface-hover transition-all text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-success/10 border border-success/25 flex items-center justify-center text-success mb-3 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-success transition-colors">
              Short Workout
            </h4>
            <p className="text-[10px] sm:text-[11px] text-text-muted mt-0.5 line-clamp-1">
              5-min quick blast
            </p>
          </button>

          {/* Action 3: Nutrition */}
          <button
            onClick={() => onNavigate('progress')}
            className="p-4 rounded-2xl bg-surface border border-border-subtle hover:border-warning/50 hover:bg-surface-hover transition-all text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/25 flex items-center justify-center text-warning mb-3 group-hover:scale-110 transition-transform">
              <Utensils className="w-4 h-4" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-warning transition-colors">
              Nutrition
            </h4>
            <p className="text-[10px] sm:text-[11px] text-text-muted mt-0.5 line-clamp-1">
              Mess meals &amp; macros
            </p>
          </button>

          {/* Action 4: More / Mind Sanctuary */}
          <button
            onClick={() => onNavigate('workout')}
            className="p-4 rounded-2xl bg-surface border border-border-subtle hover:border-secondary/50 hover:bg-surface-hover transition-all text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center text-secondary mb-3 group-hover:scale-110 transition-transform">
              <HeartPulse className="w-4 h-4" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-secondary transition-colors">
              Mind Reset
            </h4>
            <p className="text-[10px] sm:text-[11px] text-text-muted mt-0.5 line-clamp-1">
              4-7-8 vagal breathing
            </p>
          </button>
        </div>
      </div>

      {/* 4. PROGRESS SUMMARY (REAL EXISTING DATA) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Today&apos;s Progress Summary
          </h3>
          <button
            onClick={() => onNavigate('progress')}
            className="text-[11px] text-primary-bright hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Full History</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Streak */}
          <Card variant="well" className="p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between text-text-muted text-xs">
              <span className="font-semibold">Streak</span>
              <Flame className="w-4 h-4 text-warning fill-warning" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-warning font-mono">
                {streakDays}<span className="text-xs font-normal text-text-muted ml-0.5">days</span>
              </p>
              <span className="text-[10px] text-text-muted block mt-0.5">Consistent training</span>
            </div>
          </Card>

          {/* Card 2: Today's Reps & Burn */}
          <Card variant="well" className="p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between text-text-muted text-xs">
              <span className="font-semibold">Workout Reps</span>
              <Zap className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-text-primary font-mono">
                {sessionReps}
              </p>
              <span className="text-[10px] text-success font-semibold block mt-0.5">
                ~{caloriesBurnedToday} kcal burned
              </span>
            </div>
          </Card>

          {/* Card 3: Calorie Intake vs Target */}
          <Card variant="well" className="p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between text-text-muted text-xs">
              <span className="font-semibold">Calorie Intake</span>
              <Utensils className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-text-primary font-mono">
                {caloriesGainedToday}{' '}
                <span className="text-[10px] font-normal text-text-muted">/ {targetCalories}</span>
              </p>
              <ProgressBar
                value={caloriePercent}
                variant="warning"
                size="sm"
                className="mt-1.5"
              />
            </div>
          </Card>

          {/* Card 4: Hydration Sentinel */}
          <Card variant="well" className="p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center justify-between text-text-muted text-xs">
              <span className="font-semibold">Hydration</span>
              <Droplets className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-text-primary font-mono">
                {(waterIntakeToday / 1000).toFixed(1)}{' '}
                <span className="text-[10px] font-normal text-text-muted">/ {(targetWater / 1000).toFixed(1)}L</span>
              </p>
              <ProgressBar
                value={waterPercent}
                variant="accent"
                size="sm"
                className="mt-1.5"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* 5. CAMPUS ACTIVITY / CHALLENGE (REAL EXISTING DATA) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Campus Activity
            </h3>
            <span className="text-[10px] text-success font-medium">
              • {friends.filter((f) => f.isOnline).length} active now
            </span>
          </div>
          <button
            onClick={() => onNavigate('community')}
            className="text-[11px] text-primary-bright hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View All Friends</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {activeFriends.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6 text-text-muted" />}
            title="No campus activity yet"
            description="Connect with hostel roommates and campus friends to track progress together."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate('community')}
              >
                Find Friends
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeFriends.map((friend) => (
              <Card
                key={friend.id}
                variant="well"
                className="p-3.5 space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${friend.avatarColor} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm relative`}
                    >
                      {friend.name.charAt(0)}
                      {friend.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{friend.name}</p>
                      <p className="text-[10px] text-text-muted truncate">@{friend.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCheer(friend.id)}
                    aria-label={`Cheer ${friend.name}`}
                    title="Send Cheer"
                    className="p-1.5 rounded-lg bg-surface-elevated hover:bg-danger/10 text-danger border border-border-subtle hover:border-danger/30 text-[11px] font-bold flex items-center space-x-1 cursor-pointer active:scale-95 transition-all shrink-0"
                  >
                    <span>❤️</span>
                    <span>{friend.cheerCount}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border-subtle">
                  <span className="text-text-muted">
                    Reps: <strong className="text-text-primary">{friend.todayStats.repsCompleted}</strong>
                  </span>
                  <span className="text-text-muted">
                    Burned: <strong className="text-success">{friend.todayStats.caloriesBurned} kcal</strong>
                  </span>
                  <span className="text-warning font-semibold">
                    {friend.todayStats.streakDays}d 🔥
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
