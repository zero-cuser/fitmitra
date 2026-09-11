'use client';

import React, { useState } from 'react';
import {
  Zap,
  Flame,
  Volume2,
  VolumeX,
  User,
  LogOut,
  ChevronDown,
  Target,
  Sparkles
} from 'lucide-react';
import { useWorkout } from '@/context/WorkoutContext';
import { useAuth } from '@/context/AuthContext';

export const Header: React.FC = () => {
  const { streakDays, xp, level, voiceCoachEnabled, toggleVoiceCoach } = useWorkout();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // XP progress in current level (100 XP per level)
  const xpInCurrentLevel = xp % 100;
  const xpProgressPercent = Math.min(xpInCurrentLevel, 100);

  const goalLabels: Record<string, string> = {
    posture: 'Posture Correction',
    strength: 'Strength & Muscle',
    mobility: 'Mobility & Flexibility',
    cardio: 'Cardio & Stamina'
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#070b14]/85 border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
            <Zap className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight text-white">
                Fit<span className="text-emerald-400">Mitra</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AI Coach
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Zero-Hardware Biometric Fitness & Ergonomics
            </p>
          </div>
        </div>

        {/* Center/Right: Motivational Metrics (Streak, Level/XP, Audio Toggle) - NO COINS */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* Streak Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold text-amber-400 shadow-sm">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
            <span>{streakDays}d Streak</span>
          </div>

          {/* Level & XP Progress */}
          <div className="hidden md:flex flex-col justify-center px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs min-w-[130px]">
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="font-bold text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Lvl {level}
              </span>
              <span className="text-slate-400">{xpInCurrentLevel}/100 XP</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${xpProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Audio / Voice Coach Toggle */}
          <button
            onClick={toggleVoiceCoach}
            title={voiceCoachEnabled ? 'Mute AI Voice Coach' : 'Enable AI Voice Coach'}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center transition-all border ${
              voiceCoachEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {voiceCoachEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* User Profile / Auth Button */}
          <div className="relative">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-left"
                >
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${user.avatarColor || 'from-emerald-500 to-teal-700'} flex items-center justify-center text-white text-xs font-bold shadow-inner`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-xs font-medium text-white leading-tight max-w-[100px] truncate">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {goalLabels[user.goal] || 'Fitness'}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-emerald-400 font-mono truncate">@{user.username || 'student'}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {user.targetDailyCalories ? `🎯 ${user.targetDailyCalories} kcal/day target` : 'Daily Fitness Profile'}
                      </p>
                      <div className="mt-1.5 inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                        <Target className="w-3 h-3" />
                        <span>{goalLabels[user.goal] || 'General'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        openAuthModal('login');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Switch Account</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 transition-colors mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('signup')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5"
              >
                <User className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Sign In</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
