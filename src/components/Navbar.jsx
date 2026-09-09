import React from 'react';
import { useFitness } from '../context/FitnessContext';
import {
  Flame,
  Coins,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Award,
  Zap
} from 'lucide-react';

export const Navbar = () => {
  const { user, toggleSound, resetData } = useFitness();

  const xpPercent = Math.min(Math.round((user.xp / user.nextLevelXp) * 100), 100);

  return (
    <header className="sticky top-0 z-40 bg-[#070b14]/85 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Tagline */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                Fit<span className="text-emerald-400">Mitra</span>
              </h1>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Student AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {user.hostel} • Room {user.roomNo}
            </p>
          </div>
        </div>

        {/* Right Stats & Controls */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Level & XP Mini Bar */}
          <div className="hidden lg:flex items-center space-x-2.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 font-black text-xs flex items-center justify-center border border-purple-500/30">
              L{user.level}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>XP {user.xp}</span>
                <span>/ {user.nextLevelXp}</span>
              </div>
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* FitCoins Counter */}
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm text-xs font-bold text-purple-300">
            <Coins className="w-4 h-4 text-purple-400" />
            <span>{user.fitCoins}</span>
            <span className="hidden sm:inline text-slate-500 font-normal">Coins</span>
          </div>

          {/* Daily Streak Flame */}
          <div className="flex items-center space-x-1.5 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-400">
            <Flame className="w-4 h-4 fill-orange-400 animate-pulse" />
            <span>{user.currentStreak}d</span>
            <span className="hidden sm:inline font-semibold">Streak</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all ${
              user.soundEnabled
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                : 'bg-slate-900 border-slate-800 text-slate-600'
            }`}
            title="Toggle Sound Effects"
          >
            {user.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Reset Demo Data for Hackathon Testing */}
          <button
            onClick={resetData}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
            title="Reset Demo State"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
