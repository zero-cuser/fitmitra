'use client';

import React from 'react';
import { Zap, Flame, Volume2, VolumeX } from 'lucide-react';
import { useWorkout } from '@/context/WorkoutContext';
import { useAuth } from '@/context/AuthContext';
import { NavTabId } from './Sidebar';

export interface MobileTopBarProps {
  onSelectTab: (tab: NavTabId) => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ onSelectTab }) => {
  const { streakDays, voiceCoachEnabled, toggleVoiceCoach } = useWorkout();
  const { user, isAuthenticated, openAuthModal } = useAuth();

  return (
    <header className="lg:hidden sticky top-0 z-30 w-full bg-surface/95 backdrop-blur-xl border-b border-border-subtle h-14 px-4 flex items-center justify-between select-none">
      {/* Brand Identity */}
      <div
        onClick={() => onSelectTab('home')}
        className="flex items-center space-x-2.5 cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
          <Zap className="w-4 h-4 text-white stroke-[2.5]" />
        </div>
        <span className="text-base font-black tracking-tight text-white">
          Fit<span className="text-primary-bright">Mitra</span>
        </span>
      </div>

      {/* Quick Metrics & Actions */}
      <div className="flex items-center space-x-2.5">
        {/* Streak Pill */}
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-subtle text-xs font-bold text-warning">
          <Flame className="w-3.5 h-3.5 fill-warning animate-pulse" />
          <span>{streakDays}d</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={toggleVoiceCoach}
          aria-label={voiceCoachEnabled ? 'Disable Voice Coach' : 'Enable Voice Coach'}
          className={`p-2 rounded-lg text-xs transition-all border ${
            voiceCoachEnabled
              ? 'bg-success/10 text-success border-success/30'
              : 'bg-surface-elevated text-text-muted border-border-subtle'
          }`}
        >
          {voiceCoachEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Profile Avatar / Sign In */}
        {isAuthenticated && user ? (
          <button
            onClick={() => onSelectTab('profile')}
            aria-label="View Profile"
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
              user.avatarColor || 'from-primary to-secondary'
            } flex items-center justify-center text-white text-xs font-bold border border-white/20 shadow-sm`}
          >
            {user.name.charAt(0).toUpperCase()}
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('signup')}
            className="px-2.5 py-1 rounded-lg bg-primary text-white font-bold text-xs shadow-sm"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
