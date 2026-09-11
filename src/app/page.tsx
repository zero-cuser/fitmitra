'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Navbar/Header';
import { ExerciseTabs } from '@/components/ExerciseSelector/ExerciseTabs';
import { StatsPanel } from '@/components/AIPoseCoach/StatsPanel';
import { WeeklyCalorieChart } from '@/components/Progress/WeeklyCalorieChart';
import { NutritionTracker } from '@/components/MessNutrition/NutritionTracker';
import { FriendsHub } from '@/components/Friends/FriendsHub';
import { PostureSentinel } from '@/components/PostureSentinel/PostureSentinel';
import { ExamStressReset } from '@/components/Wellness/ExamStressReset';
import {
  Zap,
  Flame,
  Users,
  ShieldCheck,
  HeartPulse,
  Shield,
  Eye,
  Sparkles,
  Cpu,
  TrendingUp
} from 'lucide-react';

// Isolate CameraView from SSR to prevent hydration issues with browser APIs
const CameraView = dynamic(
  () => import('@/components/AIPoseCoach/CameraView').then((mod) => mod.CameraView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/3] sm:aspect-[16/10] bg-[#090d16] rounded-3xl border border-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-400">Loading AI Biometric Viewport...</span>
        <span className="text-[10px] text-slate-600 mt-1">Initializing client-side WebAssembly models</span>
      </div>
    )
  }
);

type ActiveTabKey = 'coach' | 'nutrition' | 'friends' | 'posture' | 'mind';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTabKey>('coach');

  const navItems: { id: ActiveTabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'coach',
      label: 'AI Pose Coach',
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
      badge: 'Vision AI'
    },
    {
      id: 'nutrition',
      label: 'Weekly Calories & Nutrition',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      badge: 'Energy Balance'
    },
    {
      id: 'friends',
      label: 'Campus Friends',
      icon: <Users className="w-4 h-4 text-cyan-400" />,
      badge: 'Daily Compare'
    },
    {
      id: 'posture',
      label: 'Study Sentinel',
      icon: <ShieldCheck className="w-4 h-4 text-teal-400" />,
      badge: 'Pomodoro'
    },
    {
      id: 'mind',
      label: 'Exam Sanctuary',
      icon: <HeartPulse className="w-4 h-4 text-rose-400" />,
      badge: '4-7-8 Breathing'
    }
  ];

  return (
    <main className="min-h-screen bg-[#070b14] flex flex-col">
      {/* Top Header Navbar (No coins, with hostel wing profile) */}
      <Header />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Simplified Hub Segmented Control */}
        <div className="w-full bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-800 shadow-lg overflow-x-auto no-scrollbar">
          <div className="flex sm:grid sm:grid-cols-5 gap-1.5 min-w-[620px] sm:min-w-0">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-center space-x-2 py-3 px-3.5 rounded-xl font-bold text-xs transition-all relative whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-md border border-slate-700/80'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`hidden lg:inline-block text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-950 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: AI Pose Coach */}
        {activeTab === 'coach' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Target Exercise Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  Select Target Bodyweight Exercise
                </span>
                <span className="text-[10px] text-emerald-400/90 font-medium">
                  5 Preset Movements • Real-Time Joint Kinematics
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
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">100% On-Device</p>
                      <p className="text-[10px] text-slate-400">Zero video streaming or cloud storage</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">33 Keypoints</p>
                      <p className="text-[10px] text-slate-400">Sub-30ms Euclidean joint vector math</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Voice Coach</p>
                      <p className="text-[10px] text-slate-400">Real-time speech cues for dorm space</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Stats & Form Checklist */}
              <div className="lg:col-span-4">
                <StatsPanel />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Weekly Calories & Daily Nutrition */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* The Graphical 7-Day Calories Burned vs Gained Chart */}
            <WeeklyCalorieChart />

            {/* Daily Nutrition Smart-Logger & ₹100 Hacks */}
            <NutritionTracker />
          </div>
        )}

        {/* TAB 3: Campus Friends & Daily Comparison */}
        {activeTab === 'friends' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <FriendsHub />
          </div>
        )}

        {/* TAB 4: Study Posture Sentinel */}
        {activeTab === 'posture' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <PostureSentinel />
          </div>
        )}

        {/* TAB 5: Exam Stress & Breath Sanctuary */}
        {activeTab === 'mind' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ExamStressReset />
          </div>
        )}

      </div>
    </main>
  );
}
