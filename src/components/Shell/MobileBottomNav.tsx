'use client';

import React from 'react';
import { Home, Zap, TrendingUp, Users, User } from 'lucide-react';
import { NavTabId } from './Sidebar';

export interface MobileBottomNavProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentTab, onSelectTab }) => {
  const navItems: {
    id: NavTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'workout', label: 'Workout', icon: Zap },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-surface/95 backdrop-blur-xl border-t border-border-subtle z-50 px-2 flex items-center justify-around select-none"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all relative cursor-pointer ${
              isActive ? 'text-primary-bright' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {/* Active Top Pip Glow */}
            {isActive && (
              <div className="absolute top-0 w-8 h-1 bg-primary-bright rounded-b-full shadow-sm shadow-primary/80" />
            )}

            <div className={`p-1 rounded-lg transition-transform ${isActive ? 'scale-110' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>

            <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
