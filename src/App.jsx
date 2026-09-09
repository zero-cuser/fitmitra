import React, { useState } from 'react';
import { FitnessProvider, useFitness } from './context/FitnessContext';
import { Navbar } from './components/Navbar';
import { PoseCoach } from './components/AIPoseCoach/PoseCoach';
import { PostureSentinel } from './components/PostureSentinel/PostureSentinel';
import { WorkoutHub } from './components/DormWorkouts/WorkoutHub';
import { NutritionTracker } from './components/MessNutrition/NutritionTracker';
import { LeaderboardAndQuests } from './components/Gamification/LeaderboardAndQuests';
import { ExamStressReset } from './components/Wellness/ExamStressReset';
import {
  Activity,
  Laptop,
  Dumbbell,
  Utensils,
  Trophy,
  Heart,
  Flame,
  Droplets,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

const DashboardContent = () => {
  const { todayStats, user } = useFitness();
  const [activeTab, setActiveTab] = useState('coach');

  const navTabs = [
    { id: 'coach', label: 'AI Pose Coach', icon: Activity, badge: 'Vision AI' },
    { id: 'posture', label: 'Posture Sentinel', icon: Laptop, badge: 'Study Mode' },
    { id: 'workouts', label: 'Dorm Workouts', icon: Dumbbell, badge: 'Zero Gear' },
    { id: 'nutrition', label: 'Mess Nutrition', icon: Utensils, badge: '₹100 Hacks' },
    { id: 'gamification', label: 'Campus Squads', icon: Trophy, badge: 'Rivalry' },
    { id: 'wellness', label: 'Mind-Body Reset', icon: Heart, badge: 'Exam Zen' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100">
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Quick Daily Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reps Today</div>
              <div className="text-xl font-black text-white">{todayStats.repsCompleted}</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Burned Today</div>
              <div className="text-xl font-black text-white">{todayStats.caloriesBurned} <span className="text-xs font-normal text-slate-400">kcal</span></div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Water Intake</div>
              <div className="text-xl font-black text-white">{todayStats.waterMl} <span className="text-xs font-normal text-slate-400">ml</span></div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Desk Breaks</div>
              <div className="text-xl font-black text-white">{todayStats.postureBreaksTaken} <span className="text-xs font-normal text-slate-400">breaks</span></div>
            </div>
          </div>
        </div>

        {/* Navigation Tab Bar */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/60">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 border ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="transition-all duration-300">
          {activeTab === 'coach' && <PoseCoach />}
          {activeTab === 'posture' && <PostureSentinel />}
          {activeTab === 'workouts' && <WorkoutHub />}
          {activeTab === 'nutrition' && <NutritionTracker />}
          {activeTab === 'gamification' && <LeaderboardAndQuests />}
          {activeTab === 'wellness' && <ExamStressReset />}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Client-Side Privacy: Camera feeds and health records never leave your device.</span>
          </div>

          <div className="flex items-center space-x-4">
            <span>Built for Student Innovation Hackathon</span>
            <span>•</span>
            <span className="text-slate-400 font-mono">FitMitra v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <FitnessProvider>
        <DashboardContent />
      </FitnessProvider>
    </ErrorBoundary>
  );
}
