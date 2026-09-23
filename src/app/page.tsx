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
import { HomeDashboard } from '@/components/Dashboard/HomeDashboard';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  Shield,
  Eye,
  Sparkles,
  Cpu,
  TrendingUp,
  Users
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
          {activeTab === 'home' && <HomeDashboard onNavigate={setActiveTab} />}

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
