'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar, NavTabId } from '@/components/Shell/Sidebar';
import { MobileTopBar } from '@/components/Shell/MobileTopBar';
import { MobileBottomNav } from '@/components/Shell/MobileBottomNav';
import { ExerciseTabs } from '@/components/ExerciseSelector/ExerciseTabs';
import { StatsPanel } from '@/components/AIPoseCoach/StatsPanel';
import { WeeklyCalorieChart } from '@/components/Progress/WeeklyCalorieChart';
import { NutritionTracker } from '@/components/MessNutrition/NutritionTracker';
import { FriendsHub } from '@/components/Friends/FriendsHub';
import { ExamStressReset } from '@/components/Wellness/ExamStressReset';
import { AIWorkoutAdvisor } from '@/components/AIWorkoutAdvisor/AIWorkoutAdvisor';
import { ProfileView } from '@/components/Profile/ProfileView';
import { useWorkout } from '@/context/WorkoutContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  Zap,
  Flame,
  Users,
  HeartPulse,
  Shield,
  Eye,
  Sparkles,
  Cpu,
  TrendingUp,
  ArrowRight,
  Activity,
  Award
} from 'lucide-react';

// Isolate CameraView from SSR to prevent hydration issues with browser APIs
const CameraView = dynamic(
  () => import('@/components/AIPoseCoach/CameraView').then((mod) => mod.CameraView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/3] sm:aspect-[16/10] bg-surface-elevated rounded-3xl border border-border-subtle flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-3" />
        <span className="text-xs font-semibold text-text-secondary">Loading AI Biometric Viewport...</span>
        <span className="text-[10px] text-text-muted mt-1">Initializing client-side WebAssembly models</span>
      </div>
    )
  }
);

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const { sessionReps, caloriesBurnedToday, caloriesGainedToday, streakDays, level } = useWorkout();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col overflow-x-hidden">
      {/* Desktop Dark Left Sidebar */}
      <Sidebar currentTab={activeTab} onSelectTab={setActiveTab} />

      {/* Mobile Compact Top Bar */}
      <MobileTopBar onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 xl:pl-72 flex flex-col min-w-0 pb-20 lg:pb-8">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* TAB 1: HOME DASHBOARD */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Energetic Welcome Banner */}
              <Card variant="elevated" className="relative overflow-hidden p-6 sm:p-8">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <Badge color="primary" size="sm" dot>
                        FitMitra AI Operating System
                      </Badge>
                      <Badge color="warning" size="sm">
                        🔥 {streakDays} Day Streak
                      </Badge>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-text-primary tracking-tight">
                      Welcome back,{' '}
                      <span className="bg-gradient-to-r from-primary-bright via-accent to-success bg-clip-text text-transparent">
                        {user?.name || 'Athlete'}
                      </span>
                    </h1>

                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                      Zero-hardware client-side AI fitness coach. Real-time Euclidean joint kinematics, student mess calorie balancing, and dorm space optimization.
                    </p>
                  </div>

                  {/* Fast Action CTA */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => setActiveTab('workout')}
                      leftIcon={<Zap className="w-4 h-4 text-white" />}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Start AI Workout
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => setActiveTab('progress')}
                      leftIcon={<TrendingUp className="w-4 h-4 text-accent" />}
                    >
                      View Energy Log
                    </Button>
                  </div>
                </div>

                {/* Metric Quick Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border-subtle">
                  <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Today&apos;s Reps</span>
                    <span className="text-xl sm:text-2xl font-black text-text-primary font-mono">{sessionReps}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Calories Burned</span>
                    <span className="text-xl sm:text-2xl font-black text-success font-mono">~{caloriesBurnedToday} kcal</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Food Calories</span>
                    <span className="text-xl sm:text-2xl font-black text-warning font-mono">{caloriesGainedToday} kcal</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-well border border-border-subtle">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Athlete Rank</span>
                    <span className="text-xl sm:text-2xl font-black text-primary-bright font-mono">Level {level}</span>
                  </div>
                </div>
              </Card>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                  variant="interactive"
                  onClick={() => setActiveTab('workout')}
                  className="space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary-bright group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-primary-bright transition-colors">
                      AI Pose Coach
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Webcam biometric kinematics for squats, push-ups, lunges, and planks.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-primary-bright pt-1">
                    <span>Launch Viewport</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>

                <Card
                  variant="interactive"
                  onClick={() => setActiveTab('progress')}
                  className="space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/25 flex items-center justify-center text-warning group-hover:scale-110 transition-transform">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-warning transition-colors">
                      Nutrition &amp; Energy
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Daily Indian campus mess meals, ₹100 protein hacks, and hydration tracker.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-warning pt-1">
                    <span>View Calorie Log</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>

                <Card
                  variant="interactive"
                  onClick={() => setActiveTab('community')}
                  className="space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
                      Friends Progress
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Connect with friends, send cheers, and view daily head-to-head stats.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-accent pt-1">
                    <span>Explore Community</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>

                <Card
                  variant="interactive"
                  onClick={() => setActiveTab('workout')}
                  className="space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-secondary transition-colors">
                      Exam Sanctuary
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      4-7-8 parasympathetic vagal breath reset for pre-exam stress relief.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-secondary pt-1">
                    <span>Start Breathing</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </div>

              {/* AI Spatial Advisor Preview on Home */}
              <AIWorkoutAdvisor />
            </div>
          )}

          {/* TAB 2: WORKOUT (AI Pose Coach & Kinematics) */}
          {activeTab === 'workout' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SectionHeader
                title="AI Biometric Pose Coach"
                subtitle="Select an exercise, enable your camera, and perform reps with real-time joint kinematic feedback."
                badge={<Badge color="primary" dot>Vision AI Viewport</Badge>}
                icon={<Cpu className="w-5 h-5 text-primary" />}
              />

              {/* Exercise Selector */}
              <div id="camera-viewport-top" className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    Target Bodyweight Exercise
                  </span>
                  <span className="text-[10px] text-success font-medium">
                    5 Presets • Sub-30ms Euclidean Kinematics
                  </span>
                </div>
                <ExerciseTabs />
              </div>

              {/* Viewport + Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Viewport */}
                <div className="lg:col-span-8 flex flex-col space-y-4">
                  <CameraView />

                  {/* Privacy & Hardware Trust Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-success/10 text-success shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary">100% On-Device</p>
                        <p className="text-[10px] text-text-muted">Zero video streaming or cloud storage</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-accent/10 text-accent shrink-0">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary">33 Keypoints</p>
                        <p className="text-[10px] text-text-muted">Sub-30ms Euclidean joint vector math</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary-bright shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary">Voice Coach</p>
                        <p className="text-[10px] text-text-muted">Real-time speech cues for dorm space</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Stats & Form Checklist */}
                <div className="lg:col-span-4">
                  <StatsPanel />
                </div>
              </div>

              {/* AI Space & Equipment Workout Advisor */}
              <AIWorkoutAdvisor />

              {/* Exam Stress & Breath Sanctuary inside workout */}
              <div className="pt-4 border-t border-border-subtle">
                <ExamStressReset />
              </div>
            </div>
          )}

          {/* TAB 3: PROGRESS & NUTRITION */}
          {activeTab === 'progress' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SectionHeader
                title="Weekly Calorie History & Daily Nutrition"
                subtitle="Compare 7-day intake vs. exercise burn and log real student mess meals."
                badge={<Badge color="warning">Energy Balance</Badge>}
                icon={<TrendingUp className="w-5 h-5 text-warning" />}
              />

              {/* The Graphical 7-Day Calories Burned vs Gained Chart */}
              <WeeklyCalorieChart />

              {/* Daily Nutrition Smart-Logger & ₹100 Hacks */}
              <NutritionTracker />
            </div>
          )}

          {/* TAB 4: COMMUNITY & FRIENDS */}
          {activeTab === 'community' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SectionHeader
                title="Campus Friends & Daily Faceoff"
                subtitle="Connect with friends, compare daily reps, and cheer each other on."
                badge={<Badge color="accent">Community Hub</Badge>}
                icon={<Users className="w-5 h-5 text-accent" />}
              />

              <FriendsHub />
            </div>
          )}

          {/* TAB 5: PROFILE & SETTINGS */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <ProfileView />
            </div>
          )}

        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav currentTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}
