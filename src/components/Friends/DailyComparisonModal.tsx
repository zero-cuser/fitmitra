'use client';

import React from 'react';
import { X, Trophy, Flame, Utensils, Award, HeartHandshake, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { Friend, UserProfile } from '@/types/fitness';
import { useWorkout } from '@/context/WorkoutContext';
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
  const { sessionReps, caloriesBurnedToday, caloriesGainedToday, streakDays, postureScoreToday, soundEnabled } = useWorkout();

  if (!friend || !currentUser) return null;

  const handleCheerClick = () => {
    onCheer(friend.id);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  // Compare metrics
  const comparisonItems = [
    {
      label: 'Workout Reps Today',
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
      userVal: sessionReps,
      friendVal: friend.todayStats.repsCompleted,
      unit: 'reps',
      userWins: sessionReps >= friend.todayStats.repsCompleted
    },
    {
      label: 'Calories Burned (Exercise)',
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      userVal: caloriesBurnedToday,
      friendVal: friend.todayStats.caloriesBurned,
      unit: 'kcal',
      userWins: caloriesBurnedToday >= friend.todayStats.caloriesBurned
    },
    {
      label: 'Food & Meals Logged (Intake)',
      icon: <Utensils className="w-4 h-4 text-amber-400" />,
      userVal: caloriesGainedToday,
      friendVal: friend.todayStats.caloriesGained,
      unit: 'kcal',
      userWins: caloriesGainedToday <= friend.todayStats.caloriesGained // Lower or mindful intake
    },
    {
      label: 'Desk Posture Score',
      icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />,
      userVal: postureScoreToday,
      friendVal: friend.todayStats.postureScore,
      unit: '%',
      userWins: postureScoreToday >= friend.todayStats.postureScore
    },
    {
      label: 'Active Campus Streak',
      icon: <Trophy className="w-4 h-4 text-yellow-400" />,
      userVal: streakDays,
      friendVal: friend.todayStats.streakDays,
      unit: 'days',
      userWins: streakDays >= friend.todayStats.streakDays
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/10 text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Background glow ornament */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Trophy className="w-3.5 h-3.5" />
            <span>Head-to-Head Progress Matchup</span>
          </div>
          <h3 className="text-2xl font-black tracking-tight">Today&apos;s Fitness Faceoff</h3>
          <p className="text-xs text-slate-400 mt-1">
            Comparing your daily biometric progress side-by-side with your friend.
          </p>
        </div>

        {/* User vs Friend Profile Banner */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6">
          {/* Current User */}
          <div className="flex flex-col items-center text-center p-2">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${currentUser.avatarColor} flex items-center justify-center text-white font-black text-base shadow-md mb-2`}>
              {currentUser.name.charAt(0)}
            </div>
            <span className="text-xs font-bold text-white line-clamp-1">{currentUser.name} (You)</span>
            <span className="text-[10px] text-emerald-400 font-mono">@{currentUser.username}</span>
            <span className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{currentUser.hostelWing || 'Active Member'}</span>
          </div>

          {/* Friend */}
          <div className="flex flex-col items-center text-center p-2 border-l border-slate-800">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${friend.avatarColor} flex items-center justify-center text-white font-black text-base shadow-md mb-2`}>
              {friend.name.charAt(0)}
            </div>
            <span className="text-xs font-bold text-white line-clamp-1">{friend.name}</span>
            <span className="text-[10px] text-cyan-400 font-mono">@{friend.username}</span>
            <span className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{friend.hostelWing || 'Fitness Friend'}</span>
          </div>
        </div>

        {/* Comparison Rows */}
        <div className="space-y-3 mb-6">
          {comparisonItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-2"
            >
              {/* User Value */}
              <div className="w-20 text-left">
                <span className={`text-sm sm:text-base font-black ${item.userWins ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {item.userVal} <span className="text-[10px] font-normal text-slate-500">{item.unit}</span>
                </span>
                {item.userWins && (
                  <span className="block text-[9px] text-emerald-400 font-semibold">Leading ✨</span>
                )}
              </div>

              {/* Metric Label */}
              <div className="flex-1 text-center px-2">
                <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-slate-300">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </div>

              {/* Friend Value */}
              <div className="w-20 text-right">
                <span className={`text-sm sm:text-base font-black ${!item.userWins ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {item.friendVal} <span className="text-[10px] font-normal text-slate-500">{item.unit}</span>
                </span>
                {!item.userWins && (
                  <span className="block text-[9px] text-cyan-400 font-semibold">Leading ✨</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Button: Cheer Friend */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleCheerClick}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Cheer @{friend.username} ({friend.cheerCount} cheers)</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
