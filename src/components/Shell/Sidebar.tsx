'use client';

import React from 'react';
import {
  Home,
  Zap,
  TrendingUp,
  Users,
  User,
  Flame,
  Volume2,
  VolumeX,
  Sparkles,
  LogOut,
  LogIn,
  Shield
} from 'lucide-react';
import { useWorkout } from '@/context/WorkoutContext';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';

export type NavTabId = 'home' | 'workout' | 'progress' | 'community' | 'profile';

export interface SidebarProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { streakDays, xp, level, voiceCoachEnabled, toggleVoiceCoach } = useWorkout();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  const xpInCurrentLevel = xp % 100;
  const xpProgressPercent = Math.min(xpInCurrentLevel, 100);

  const navItems: {
    id: NavTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'workout', label: 'Workout', icon: Zap, badge: 'Vision AI' },
    { id: 'progress', label: 'Progress', icon: TrendingUp, badge: 'Energy' },
    { id: 'community', label: 'Community', icon: Users, badge: 'Daily' },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="hidden lg:flex w-64 xl:w-72 flex-col fixed inset-y-0 left-0 bg-surface border-r border-border-subtle z-40 select-none"
    >
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-border-subtle shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-white/10">
            <Zap className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-lg font-black tracking-tight text-white">
                Fit<span className="text-primary-bright">Mitra</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/15 text-primary-bright border border-primary/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-text-muted">AI Biometrics & Nutrition</p>
          </div>
        </div>
      </div>

      {/* Navigation Destinations */}
      <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        <span className="px-3 text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-2">
          Menu
        </span>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all relative group cursor-pointer ${
                isActive
                  ? 'bg-primary/10 text-primary-bright border border-primary/30 shadow-md shadow-primary/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-primary-bright' : 'text-text-muted group-hover:text-text-primary'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <Badge
                  color={isActive ? 'primary' : 'muted'}
                  size="sm"
                  className="text-[10px]"
                >
                  {item.badge}
                </Badge>
              )}

              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-bright rounded-r-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Gamification & Audio Controls Footer */}
      <div className="p-4 border-t border-border-subtle bg-surface/80 space-y-3 shrink-0">
        
        {/* Streak & Level Bar */}
        <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-warning font-bold">
              <Flame className="w-4 h-4 fill-warning animate-pulse" />
              <span>{streakDays}d Streak</span>
            </div>
            <span className="text-[11px] font-semibold text-text-muted">
              Lvl {level} • {xpInCurrentLevel}/100 XP
            </span>
          </div>

          <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-warning via-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${xpProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Voice Coach Toggle */}
        <button
          onClick={toggleVoiceCoach}
          className={`w-full p-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border ${
            voiceCoachEnabled
              ? 'bg-success/10 text-success border-success/30 hover:bg-success/20'
              : 'bg-surface-elevated text-text-muted border-border-subtle hover:text-text-primary'
          }`}
        >
          <div className="flex items-center space-x-2">
            {voiceCoachEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>AI Voice Coach</span>
          </div>
          <span className="text-[10px] font-mono">{voiceCoachEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* User Account / Auth Card */}
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
            <div
              onClick={() => onSelectTab('profile')}
              className="flex items-center space-x-2.5 min-w-0 cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
                  user.avatarColor || 'from-primary to-secondary'
                } flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{user.name}</p>
                <p className="text-[10px] text-text-muted truncate">@{user.username || 'student'}</p>
              </div>
            </div>

            <button
              onClick={logout}
              aria-label="Sign Out"
              title="Sign Out"
              className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('signup')}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-primary to-primary-bright hover:from-primary-bright hover:to-primary text-white font-bold text-xs shadow-md shadow-primary/25 transition-all flex items-center justify-center space-x-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Profile</span>
          </button>
        )}

      </div>
    </aside>
  );
};
