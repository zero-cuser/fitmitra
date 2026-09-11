'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Navbar/Header';
import { ExerciseTabs } from '@/components/ExerciseSelector/ExerciseTabs';
import { StatsPanel } from '@/components/AIPoseCoach/StatsPanel';
import { Shield, Sparkles, Cpu, Eye } from 'lucide-react';

// Isolate CameraView completely from server-side rendering to prevent hydration crashes
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

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070b14] flex flex-col">
      {/* Top Navigation Header (No Coins) */}
      <Header />

      {/* Main Workspace Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Horizontal Exercise Selector Segment Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Select Target Workout
            </span>
            <span className="text-[10px] text-emerald-400/90 font-medium">
              4 Preset Movements • Real-Time Joint Kinematics
            </span>
          </div>
          <ExerciseTabs />
        </div>

        {/* Core Layout: Left (Camera Viewport) + Right (Stats & Guidance) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Interactive Pose Tracking Viewport */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <CameraView />

            {/* Privacy & Hardware Assurance Note */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">100% On-Device</p>
                  <p className="text-[10px] text-slate-400">Zero video streaming or cloud storage</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">33 Keypoints</p>
                  <p className="text-[10px] text-slate-400">Sub-30ms Euclidean joint math</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Voice Coach</p>
                  <p className="text-[10px] text-slate-400">Audio cues for hands-free training</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Stats, Biometrics & Form Guidance Sidebar */}
          <div className="lg:col-span-4">
            <StatsPanel />
          </div>

        </div>

      </div>
    </main>
  );
}
