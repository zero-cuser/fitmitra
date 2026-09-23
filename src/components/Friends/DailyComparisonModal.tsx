'use client';

import React from 'react';
import { X, Trophy, Flame, Utensils, ShieldCheck, Zap, HeartHandshake } from 'lucide-react';
import { Friend, UserProfile } from '@/types/fitness';
import { useWorkout } from '@/context/WorkoutContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import confetti from 'canvas-confetti';

interface DailyComparisonModalProps {
  friend: Friend | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onCheer: (friendId: string) => void;
}

export const DailyComparisonModal: React.FC<DailyComparisonModalProps> = ({
  friend,
  currentUser,
  onClose,
  onCheer
}) => {
  const { sessionReps, caloriesBurnedToday, caloriesGainedToday, streakDays, postureScoreToday } =
    useWorkout();

  if (!friend || !currentUser) return null;

  const handleCheerClick = () => {
    onCheer(friend.id);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  // Compare real metrics
  const comparisonItems = [
    {
      label: 'Workout Reps Today',
      icon: <Zap className="w-4 h-4 text-primary" />,
      userVal: sessionReps,
      friendVal: friend.todayStats.repsCompleted,
      unit: 'reps',
      userWins: sessionReps >= friend.todayStats.repsCompleted
    },
    {
      label: 'Calories Burned (Exercise)',
      icon: <Flame className="w-4 h-4 text-warning" />,
      userVal: caloriesBurnedToday,
      friendVal: friend.todayStats.caloriesBurned,
      unit: 'kcal',
      userWins: caloriesBurnedToday >= friend.todayStats.caloriesBurned
    },
    {
      label: 'Food & Meals Logged (Intake)',
      icon: <Utensils className="w-4 h-4 text-accent" />,
      userVal: caloriesGainedToday,
      friendVal: friend.todayStats.caloriesGained,
      unit: 'kcal',
      userWins: caloriesGainedToday <= friend.todayStats.caloriesGained
    },
    {
      label: 'Form & Consistency Score',
      icon: <ShieldCheck className="w-4 h-4 text-success" />,
      userVal: postureScoreToday,
      friendVal: friend.todayStats.postureScore,
      unit: '%',
      userWins: postureScoreToday >= friend.todayStats.postureScore
    },
    {
      label: 'Active Streak',
      icon: <Trophy className="w-4 h-4 text-warning" />,
      userVal: streakDays,
      friendVal: friend.todayStats.streakDays,
      unit: 'days',
      userWins: streakDays >= friend.todayStats.streakDays
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="faceoff-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl text-text-primary overflow-hidden max-h-[90vh] overflow-y-auto space-y-6">
        {/* Ambient glow ornaments */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-bright text-xs font-semibold mb-2">
            <Trophy className="w-3.5 h-3.5" />
            <span>Head-to-Head Faceoff</span>
          </div>
          <h3 id="faceoff-modal-title" className="text-2xl font-black tracking-tight text-text-primary">
            Today&apos;s Biometric Faceoff
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Side-by-side real progress comparison with your campus fitness friend.
          </p>
        </div>

        {/* User vs Friend Profile Banner */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-well border border-border-subtle">
          {/* Current User */}
          <div className="flex flex-col items-center text-center p-2">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${currentUser.avatarColor} flex items-center justify-center text-white font-black text-base shadow-md mb-2`}
            >
              {currentUser.name.charAt(0)}
            </div>
            <span className="text-xs font-bold text-text-primary line-clamp-1">
              {currentUser.name} (You)
            </span>
            <span className="text-[10px] text-primary-bright font-mono">@{currentUser.username}</span>
            <span className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
              {currentUser.hostelWing || 'Active Member'}
            </span>
          </div>

          {/* Friend */}
          <div className="flex flex-col items-center text-center p-2 border-l border-border-subtle">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${friend.avatarColor} flex items-center justify-center text-white font-black text-base shadow-md mb-2`}
            >
              {friend.name.charAt(0)}
            </div>
            <span className="text-xs font-bold text-text-primary line-clamp-1">{friend.name}</span>
            <span className="text-[10px] text-accent font-mono">@{friend.username}</span>
            <span className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
              {friend.hostelWing || 'Fitness Friend'}
            </span>
          </div>
        </div>

        {/* Comparison Rows */}
        <div className="space-y-2.5">
          {comparisonItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-surface-well border border-border-subtle flex items-center justify-between gap-2"
            >
              {/* User Value */}
              <div className="w-24 text-left">
                <span
                  className={`text-sm sm:text-base font-black ${
                    item.userWins ? 'text-success' : 'text-text-secondary'
                  }`}
                >
                  {item.userVal}{' '}
                  <span className="text-[10px] font-normal text-text-muted">{item.unit}</span>
                </span>
                {item.userWins && (
                  <span className="block text-[9px] text-success font-semibold">Leading ✨</span>
                )}
              </div>

              {/* Metric Label */}
              <div className="flex-1 text-center px-2">
                <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-text-secondary">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </div>

              {/* Friend Value */}
              <div className="w-24 text-right">
                <span
                  className={`text-sm sm:text-base font-black ${
                    !item.userWins ? 'text-accent' : 'text-text-secondary'
                  }`}
                >
                  {item.friendVal}{' '}
                  <span className="text-[10px] font-normal text-text-muted">{item.unit}</span>
                </span>
                {!item.userWins && (
                  <span className="block text-[9px] text-accent font-semibold">Leading ✨</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            variant="primary"
            className="w-full sm:flex-1"
            onClick={handleCheerClick}
            leftIcon={<HeartHandshake className="w-4 h-4" />}
          >
            Cheer @{friend.username} ({friend.cheerCount} cheers)
          </Button>

          <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
