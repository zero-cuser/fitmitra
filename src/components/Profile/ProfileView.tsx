'use client';

import React from 'react';
import {
  User,
  Flame,
  Droplets,
  Ruler,
  Weight,
  Calendar,
  Activity,
  LogOut,
  Sparkles,
  Edit3,
  Target,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const ProfileView: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout, loginAsGuest } = useAuth();

  const goalLabels: Record<string, { label: string; color: any }> = {
    fat_loss: { label: 'Fat Loss & Burn', color: 'warning' },
    strength: { label: 'Strength & Muscle', color: 'primary' },
    cardio: { label: 'Endurance & Stamina', color: 'accent' },
    toning: { label: 'Lean Definition', color: 'success' },
    athletic: { label: 'Athletic Agility', color: 'warning' },
    wellness: { label: 'Functional Fitness', color: 'secondary' },
    posture: { label: 'Functional Alignment', color: 'accent' },
    mobility: { label: 'Functional Mobility', color: 'secondary' }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <SectionHeader
          title="User Profile & Settings"
          subtitle="Sign in or set up your biometric profile to track custom calorie and hydration targets."
          badge={<Badge color="primary">Account Hub</Badge>}
        />

        <Card variant="elevated" className="text-center p-8 sm:p-12 max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-surface-well border border-border-strong mx-auto flex items-center justify-center text-primary shadow-inner">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-text-primary">No Active Profile Found</h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Create your profile to calculate your personalized Mifflin-St Jeor daily calories, water targets, and save workouts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => openAuthModal('signup')}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Create Account
            </Button>
            <Button
              variant="secondary"
              onClick={() => openAuthModal('login')}
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={loginAsGuest}
            >
              Demo Guest Profile
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Section Header */}
      <SectionHeader
        title="My Fitness Profile"
        subtitle="Manage your personal biometrics, calorie goals, and account preferences."
        badge={<Badge color="primary">Account &amp; Biometrics</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openAuthModal('signup')}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Edit Profile
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={logout}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        }
      />

      {/* Main Profile Identity Card */}
      <Card variant="elevated" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${
              user.avatarColor || 'from-primary to-accent'
            } flex items-center justify-center text-white text-2xl font-black shadow-xl ring-2 ring-white/10`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
                {user.name}
              </h3>
              <Badge color="success" size="sm">
                Verified Student
              </Badge>
            </div>
            <p className="text-xs text-primary-bright font-mono mt-0.5">@{user.username || 'student'}</p>
            <div className="flex items-center space-x-3 text-[11px] text-text-muted mt-1">
              <span>{user.email}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-text-muted" />
                Joined {user.joinedDate}
              </span>
            </div>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-surface-well border border-border-subtle text-xs text-text-secondary">
          <span className="text-[10px] uppercase tracking-wider text-text-muted block">Campus Wing</span>
          <span className="font-bold text-text-primary">{user.hostelWing || 'Hostel Campus'}</span>
        </div>
      </Card>

      {/* Grid: Biometric Stats + Calculated Daily Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Physical Biometrics */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>Physical Attributes</span>
            </h4>
            <span className="text-[10px] text-text-muted uppercase font-mono">BMR Base</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Ruler className="w-3 h-3 text-primary" /> Height
              </span>
              <p className="text-lg font-black text-text-primary mt-1">
                {user.heightCm || 175} <span className="text-xs font-normal text-text-muted">cm</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Weight className="w-3 h-3 text-accent" /> Weight
              </span>
              <p className="text-lg font-black text-text-primary mt-1">
                {user.weightKg || 68} <span className="text-xs font-normal text-text-muted">kg</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
              <span className="text-[10px] text-text-muted">Age / Sex</span>
              <p className="text-lg font-black text-text-primary mt-1">
                {user.age || 20}y <span className="text-xs font-normal text-text-muted capitalize">({user.gender || 'M'})</span>
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-well border border-border-subtle flex items-center justify-between text-xs">
            <span className="text-text-secondary">Estimated Basal Metabolic Rate (BMR):</span>
            <span className="font-mono font-bold text-primary-bright">
              ~{user.calculatedBmr || 1680} kcal/day
            </span>
          </div>
        </Card>

        {/* Daily Calculated Targets */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Target className="w-4 h-4 text-warning" />
              <span>Daily Caloric &amp; Water Targets</span>
            </h4>
            <Badge color="warning" size="sm">Mifflin-St Jeor</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
              <div className="flex items-center space-x-1.5 text-warning mb-1">
                <Flame className="w-4 h-4" />
                <span className="text-[11px] font-bold">Target Calories</span>
              </div>
              <p className="text-xl font-black text-text-primary">
                {user.targetDailyCalories || 2200}{' '}
                <span className="text-xs font-normal text-text-muted">kcal/day</span>
              </p>
              <span className="text-[10px] text-text-muted">Maintenance &amp; Activity</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
              <div className="flex items-center space-x-1.5 text-accent mb-1">
                <Droplets className="w-4 h-4" />
                <span className="text-[11px] font-bold">Target Hydration</span>
              </div>
              <p className="text-xl font-black text-text-primary">
                {((user.targetWaterMl || 2500) / 1000).toFixed(1)}{' '}
                <span className="text-xs font-normal text-text-muted">L/day</span>
              </p>
              <span className="text-[10px] text-text-muted">Cognitive Focus</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-well border border-border-subtle flex items-center justify-between text-xs">
            <span className="text-text-secondary">Activity Profile:</span>
            <span className="font-bold text-text-primary capitalize">
              {user.activityLevel ? user.activityLevel.replace('_', ' ') : 'Moderate (3-5 workouts/wk)'}
            </span>
          </div>
        </Card>

      </div>

      {/* Fitness Goals */}
      <Card variant="default" className="space-y-3">
        <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success" />
          <span>Active Fitness Goals</span>
        </h4>

        <div className="flex flex-wrap gap-2 pt-1">
          {(user.goals && user.goals.length > 0 ? user.goals : [user.goal]).map((g) => {
            const info = goalLabels[g] || { label: g, color: 'primary' };
            return (
              <Badge key={g} color={info.color} size="md">
                {info.label}
              </Badge>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
