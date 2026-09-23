'use client';

import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Lock,
  Bell,
  HelpCircle,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Database,
  Download,
  CheckCircle2,
  ChevronRight,
  Eye,
  Camera,
  Heart
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWorkout } from '@/context/WorkoutContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const ProfileView: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout, loginAsGuest } = useAuth();
  const { soundEnabled, toggleSound, voiceCoachEnabled, toggleVoiceCoach } = useWorkout();

  // Notification Preferences (persisted in localStorage)
  const [notifications, setNotifications] = useState({
    workoutReminders: true,
    hydrationAlerts: true,
    streakWarning: true,
    challengeUpdates: true
  });

  const [cacheClearFeedback, setCacheClearFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fitmitra_notification_prefs');
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch {
      // Ignore fallback
    }
  }, []);

  const toggleNotification = (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      localStorage.setItem('fitmitra_notification_prefs', JSON.stringify(updated));
    } catch {
      // Ignore fallback
    }
  };

  const handleExportData = () => {
    try {
      const history = localStorage.getItem('fitmitra_daily_calorie_history') || '[]';
      const parsedHistory = JSON.parse(history);
      const exportObject = {
        userProfile: user,
        calorieHistory: parsedHistory,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `fitmitra_fitness_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Reset local workout history cache? This will clear locally recorded session logs.')) {
      try {
        localStorage.removeItem('fitmitra_daily_calorie_history');
        localStorage.removeItem('fitmitra_logged_meals');
        setCacheClearFeedback('Local workout cache cleared successfully.');
        setTimeout(() => setCacheClearFeedback(null), 4000);
      } catch (e) {
        console.error('Clear cache failed:', e);
      }
    }
  };

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
          title="Profile & Settings"
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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Section Header */}
      <SectionHeader
        title="Settings & Profile"
        subtitle="Manage student biometrics, fitness targets, privacy controls, and coach preferences."
        badge={<Badge color="primary">Account Hub</Badge>}
        action={
          <Button
            variant="danger"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign Out
          </Button>
        }
      />

      {/* ======================================================== */}
      {/* SECTION 1: PROFILE */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span>1. Profile &amp; Biometrics</span>
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openAuthModal('signup')}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Edit Profile
          </Button>
        </div>

        {/* Identity Card */}
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
                <h4 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
                  {user.name}
                </h4>
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
            <span className="text-[10px] uppercase tracking-wider text-text-muted block">Hostel Wing</span>
            <span className="font-bold text-text-primary">{user.hostelWing || 'Hostel Campus'}</span>
          </div>
        </Card>

        {/* Physical Biometrics Card */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span>Physical Attributes &amp; BMR Base</span>
            </h5>
            <Badge color="primary" size="sm">Mifflin-St Jeor</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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

            <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
              <span className="text-[10px] text-text-muted">Basal BMR</span>
              <p className="text-lg font-black text-primary-bright mt-1">
                ~{user.calculatedBmr || 1680} <span className="text-xs font-normal text-text-muted">kcal</span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: GOALS & PREFERENCES */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Target className="w-4 h-4 text-warning" />
          <span>2. Goals &amp; Preferences</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Calories & Water */}
          <Card variant="default" className="space-y-4">
            <h5 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-warning" />
              <span>Daily Target Nutrients</span>
            </h5>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
                <div className="flex items-center space-x-1.5 text-warning mb-1">
                  <Flame className="w-4 h-4" />
                  <span className="text-[11px] font-bold">Daily Calorie Target</span>
                </div>
                <p className="text-xl font-black text-text-primary">
                  {user.targetDailyCalories || 2200}{' '}
                  <span className="text-xs font-normal text-text-muted">kcal</span>
                </p>
                <span className="text-[10px] text-text-muted">Maintenance &amp; Energy</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
                <div className="flex items-center space-x-1.5 text-accent mb-1">
                  <Droplets className="w-4 h-4" />
                  <span className="text-[11px] font-bold">Daily Hydration</span>
                </div>
                <p className="text-xl font-black text-text-primary">
                  {((user.targetWaterMl || 2500) / 1000).toFixed(1)}{' '}
                  <span className="text-xs font-normal text-text-muted">L</span>
                </p>
                <span className="text-[10px] text-text-muted">Study Focus Target</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {(user.goals && user.goals.length > 0 ? user.goals : [user.goal]).map((g) => {
                const info = goalLabels[g] || { label: g, color: 'primary' };
                return (
                  <Badge key={g} color={info.color} size="sm">
                    {info.label}
                  </Badge>
                );
              })}
            </div>
          </Card>

          {/* Audio & Coach Preferences */}
          <Card variant="default" className="space-y-4">
            <h5 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-primary" />
              <span>Audio &amp; Voice Coach Preferences</span>
            </h5>

            <div className="space-y-3">
              {/* Rep Sound Toggle */}
              <div className="p-3 rounded-xl bg-surface-well border border-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-surface border border-border-subtle text-primary">
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-text-muted" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary">Rep Completion Audio Beeps</p>
                    <p className="text-[10px] text-text-muted">Subtle sound chimes when reps are registered</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleSound}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    soundEnabled ? 'bg-primary' : 'bg-surface-elevated'
                  }`}
                  aria-label="Toggle rep sound"
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* AI Voice Coach Speech Toggle */}
              <div className="p-3 rounded-xl bg-surface-well border border-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-surface border border-border-subtle text-accent">
                    {voiceCoachEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-text-muted" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary">AI Real-Time Voice Coach</p>
                    <p className="text-[10px] text-text-muted">Spoken audio cues for depth, cadence, and form</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleVoiceCoach}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    voiceCoachEnabled ? 'bg-accent' : 'bg-surface-elevated'
                  }`}
                  aria-label="Toggle voice coach"
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                      voiceCoachEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: PRIVACY & SECURITY */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success" />
          <span>3. Privacy &amp; Security</span>
        </h3>

        <Card variant="default" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Guarantee 1 */}
            <div className="p-3.5 rounded-2xl bg-surface-well border border-border-subtle space-y-1.5">
              <div className="flex items-center space-x-2 text-success">
                <Camera className="w-4 h-4" />
                <span className="text-xs font-bold">100% On-Device Vision</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Your webcam video stream is processed entirely within your browser via WebAssembly. No video frames are ever recorded, saved, or uploaded to any server.
              </p>
            </div>

            {/* Guarantee 2 */}
            <div className="p-3.5 rounded-2xl bg-surface-well border border-border-subtle space-y-1.5">
              <div className="flex items-center space-x-2 text-primary">
                <Database className="w-4 h-4" />
                <span className="text-xs font-bold">Local Data Sovereignty</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Your daily workout records, meal logs, and streaks are stored strictly in client-side LocalStorage. You have full custody and control over your data.
              </p>
            </div>

            {/* Guarantee 3 */}
            <div className="p-3.5 rounded-2xl bg-surface-well border border-border-subtle space-y-1.5">
              <div className="flex items-center space-x-2 text-accent">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-bold">Camera Isolation</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                The camera hardware is completely deactivated the moment you navigate away from the AI Pose Coach. Zero background video capture is permitted.
              </p>
            </div>
          </div>

          {/* Data Controls & Backup Actions */}
          <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs text-text-secondary">
              <Database className="w-3.5 h-3.5 text-text-muted" />
              <span>Client Storage Status: <strong className="text-success font-semibold">Active &amp; Secure</strong></span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export Fitness Data (JSON)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearCache}
              >
                Reset Local Cache
              </Button>
            </div>
          </div>

          {cacheClearFeedback && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-medium flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{cacheClearFeedback}</span>
            </div>
          )}
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: NOTIFICATIONS */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" />
          <span>4. Notifications &amp; Reminders</span>
        </h3>

        <Card variant="default" className="space-y-3">
          <div className="divide-y divide-border-subtle">
            {/* Reminder 1: Dorm Workout */}
            <div className="py-3 first:pt-0 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-text-primary">Daily Dorm Workout Reminder</p>
                <p className="text-[11px] text-text-muted">Prompt for a 15-minute workout session at 6:00 PM</p>
              </div>

              <button
                type="button"
                onClick={() => toggleNotification('workoutReminders')}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                  notifications.workoutReminders ? 'bg-primary' : 'bg-surface-elevated'
                }`}
                aria-label="Toggle workout reminders"
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    notifications.workoutReminders ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reminder 2: Hydration Alerts */}
            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-text-primary">Hydration Sentinel Alerts</p>
                <p className="text-[11px] text-text-muted">Hourly study-break reminders to drink water</p>
              </div>

              <button
                type="button"
                onClick={() => toggleNotification('hydrationAlerts')}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                  notifications.hydrationAlerts ? 'bg-accent' : 'bg-surface-elevated'
                }`}
                aria-label="Toggle hydration alerts"
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    notifications.hydrationAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reminder 3: Streak Protection */}
            <div className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-text-primary">Streak Protection Warning</p>
                <p className="text-[11px] text-text-muted">Alert at 9:30 PM if daily workout or meal log is missing</p>
              </div>

              <button
                type="button"
                onClick={() => toggleNotification('streakWarning')}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                  notifications.streakWarning ? 'bg-warning' : 'bg-surface-elevated'
                }`}
                aria-label="Toggle streak warning"
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    notifications.streakWarning ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reminder 4: Campus Challenge Updates */}
            <div className="py-3 last:pb-0 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-text-primary">Campus Challenge Updates</p>
                <p className="text-[11px] text-text-muted">Notifications when classmates send cheers or update scores</p>
              </div>

              <button
                type="button"
                onClick={() => toggleNotification('challengeUpdates')}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                  notifications.challengeUpdates ? 'bg-success' : 'bg-surface-elevated'
                }`}
                aria-label="Toggle challenge updates"
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    notifications.challengeUpdates ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION 5: HELP & SUPPORT */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span>5. Help &amp; Support</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dorm Room Pose Guide */}
          <Card variant="default" className="space-y-2.5">
            <h5 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-primary" />
              <span>Campus Dorm Camera Guide</span>
            </h5>
            <ul className="text-[11px] text-text-secondary space-y-1.5 list-disc list-inside">
              <li>
                <strong>Distance:</strong> Position your phone or laptop 6 to 8 feet away at waist height.
              </li>
              <li>
                <strong>Lighting:</strong> Ensure ambient lighting is in front of you. Avoid bright backlights behind your body.
              </li>
              <li>
                <strong>Dorm Space Hack:</strong> In small dorms, place the laptop on your study table angled diagonally across the room.
              </li>
              <li>
                <strong>Full Body:</strong> For squats and jumping jacks, ensure your feet and shoulders remain inside the guide box.
              </li>
            </ul>
          </Card>

          {/* BMR & Nutrition FAQ */}
          <Card variant="default" className="space-y-2.5">
            <h5 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-warning" />
              <span>Mifflin-St Jeor Calorie Math FAQ</span>
            </h5>
            <ul className="text-[11px] text-text-secondary space-y-1.5 list-disc list-inside">
              <li>
                <strong>BMR Base:</strong> Calculates minimum energy required for life functions based on height, weight, age, and sex.
              </li>
              <li>
                <strong>Exercise Calories:</strong> Calorie burn uses exercise-specific kinematic MET values per validated rep.
              </li>
              <li>
                <strong>Safety Clamps:</strong> Caloric deficits are strictly clamped with a minimum floor of 1350 kcal for student health.
              </li>
              <li>
                <strong>Mess Menu:</strong> Nutrition values are calibrated to standard student campus hostel mess portions.
              </li>
            </ul>
          </Card>
        </div>

        {/* Sign Out Card */}
        <Card variant="default" className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-danger/20">
          <div>
            <h5 className="text-xs font-bold text-text-primary">Sign Out of FitMitra</h5>
            <p className="text-[11px] text-text-muted mt-0.5">
              End your active session on this device. Your offline records remain securely stored in your local browser cache.
            </p>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign Out
          </Button>
        </Card>
      </div>

    </div>
  );
};
