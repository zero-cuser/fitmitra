'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar, NavTabId } from '@/components/Shell/Sidebar';
import { MobileTopBar } from '@/components/Shell/MobileTopBar';
import { MobileBottomNav } from '@/components/Shell/MobileBottomNav';
import { WorkoutDiscovery } from '@/components/WorkoutSelection/WorkoutDiscovery';
import { WorkoutCompletion, WorkoutSummary } from '@/components/WorkoutCompletion/WorkoutCompletion';
import { ProgressDashboard } from '@/components/Progress/ProgressDashboard';
import { StatsPanel } from '@/components/AIPoseCoach/StatsPanel';
import { NutritionTracker } from '@/components/MessNutrition/NutritionTracker';
import { FriendsHub } from '@/components/Friends/FriendsHub';
import { ExamStressReset } from '@/components/Wellness/ExamStressReset';
import { AIWorkoutAdvisor } from '@/components/AIWorkoutAdvisor/AIWorkoutAdvisor';
import { ProfileView } from '@/components/Profile/ProfileView';
import { HomeDashboard } from '@/components/Dashboard/HomeDashboard';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { NetworkBanner } from '@/components/ui/NetworkBanner';
import {
  Shield,
  Eye,
  Sparkles,
  Cpu,
  TrendingUp,
  Users,
  Compass,
  Video,
  CheckCircle2
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
  const [workoutMode, setWorkoutMode] = useState<'discovery' | 'coach' | 'completion'>('discovery');
  const [completionSummary, setCompletionSummary] = useState<WorkoutSummary | null>(null);

  const handleNavigateFromHome = (tab: NavTabId) => {
    setActiveTab(tab);
    if (tab === 'workout') {
      setWorkoutMode('coach');
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col overflow-x-hidden">
      {/* Desktop Dark Left Sidebar */}
      <Sidebar currentTab={activeTab} onSelectTab={setActiveTab} />

      {/* Mobile Compact Top Bar */}
      <MobileTopBar onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 xl:pl-72 flex flex-col min-w-0 pb-20 lg:pb-8">
        <NetworkBanner />
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* TAB 1: HOME DASHBOARD */}
          {activeTab === 'home' && <HomeDashboard onNavigate={handleNavigateFromHome} />}

          {/* TAB 2: WORKOUT (Discovery, Immersive AI Pose Coach, & Completion) */}
          {activeTab === 'workout' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header with Mode Switcher (only shown during Discovery or Active Coach) */}
              {workoutMode !== 'completion' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
                  <SectionHeader
                    title={workoutMode === 'discovery' ? 'AI Workout Studio' : 'AI Biometric Pose Coach'}
                    subtitle={
                      workoutMode === 'discovery'
                        ? 'Discover campus-friendly routines and launch 100% on-device posture tracking.'
                        : 'Real-time joint vector kinematics with instant speech feedback and dorm privacy.'
                    }
                    badge={
                      <Badge color="primary" dot>
                        {workoutMode === 'discovery' ? 'Routine Library' : 'Live Camera Active'}
                      </Badge>
                    }
                    icon={<Cpu className="w-5 h-5 text-primary-bright" />}
                  />

                  {/* Mode Switcher Segmented Control */}
                  <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface border border-border-subtle self-start sm:self-center shrink-0">
                    <button
                      onClick={() => setWorkoutMode('discovery')}
                      className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                        workoutMode === 'discovery'
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Discovery</span>
                    </button>

                    <button
                      onClick={() => setWorkoutMode('coach')}
                      className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                        workoutMode === 'coach'
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>AI Coach</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 1: WORKOUT DISCOVERY */}
              {workoutMode === 'discovery' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  <WorkoutDiscovery onStartWorkout={() => setWorkoutMode('coach')} />

                  {/* AI Space & Equipment Workout Advisor */}
                  <AIWorkoutAdvisor onStartWorkout={() => setWorkoutMode('coach')} />

                  {/* Exam Stress & Breath Sanctuary inside workout */}
                  <div className="pt-4 border-t border-border-subtle">
                    <ExamStressReset />
                  </div>
                </div>
              )}

              {/* MODE 2: IMMERSIVE AI POSE COACH */}
              {workoutMode === 'coach' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Viewport + Companion Stats Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left/Dominant: Camera & Pose Coach Screen */}
                    <div className="lg:col-span-8 flex flex-col space-y-4">
                      <CameraView
                        onBack={() => setWorkoutMode('discovery')}
                        onComplete={(summary) => {
                          setCompletionSummary(summary);
                          setWorkoutMode('completion');
                        }}
                      />

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

                    {/* Right: Companion Stats Panel */}
                    <div className="lg:col-span-4">
                      <StatsPanel />
                    </div>

                  </div>
                </div>
              )}

              {/* MODE 3: WORKOUT COMPLETION */}
              {workoutMode === 'completion' && completionSummary && (
                <WorkoutCompletion
                  summary={completionSummary}
                  onDone={() => {
                    setActiveTab('home');
                    setWorkoutMode('discovery');
                  }}
                  onTryAnother={() => {
                    setWorkoutMode('discovery');
                  }}
                />
              )}

            </div>
          )}

          {/* TAB 3: PROGRESS & NUTRITION */}
          {activeTab === 'progress' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SectionHeader
                title="Weekly Progress & Consistency"
                subtitle="Track weekly goals, workout consistency, and energy balance over time."
                badge={<Badge color="primary" dot>Performance Metrics</Badge>}
                icon={<TrendingUp className="w-5 h-5 text-primary-bright" />}
              />

              {/* Clean Progress Dashboard prioritizing Weekly Goals, Workout Count, Activity, Streak & Intentional Empty States */}
              <ProgressDashboard onNavigate={setActiveTab} />

              {/* Daily Nutrition Smart-Logger & ₹100 Hacks */}
              <NutritionTracker />
            </div>
          )}

          {/* TAB 4: COMMUNITY & FRIENDS */}
          {activeTab === 'community' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SectionHeader
                title="Campus Challenges & Friends"
                subtitle="Join campus fitness sprints, track dorm challenge goals, and compare daily progress."
                badge={<Badge color="accent">Community Hub</Badge>}
                icon={<Users className="w-5 h-5 text-accent" />}
              />

              <FriendsHub
                onStartWorkout={() => {
                  setActiveTab('workout');
                  setWorkoutMode('coach');
                }}
              />
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
