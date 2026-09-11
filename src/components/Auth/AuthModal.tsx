'use client';

import React, { useState } from 'react';
import { X, User, Mail, Lock, Sparkles, CheckCircle2, ShieldCheck, Dumbbell, Compass, HeartPulse } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FitnessGoal } from '@/types/fitness';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalTab, openAuthModal, login, signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [goal, setGoal] = useState<FitnessGoal>('posture');
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authModalTab === 'signup') {
      const res = signup(name, email, password, goal);
      if (!res.success) {
        setError(res.error || 'Failed to sign up.');
      } else {
        setName('');
        setEmail('');
        setPassword('');
      }
    } else {
      const res = login(email, password);
      if (!res.success) {
        setError(res.error || 'Failed to sign in.');
      } else {
        setEmail('');
        setPassword('');
      }
    }
  };

  const handleDemoStudent = () => {
    login('aarav.student@univ.edu.in', 'student123');
  };

  const goalsList: { id: FitnessGoal; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'posture',
      label: 'Posture Correction',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      desc: 'Reverse tech-neck & desk hunch'
    },
    {
      id: 'strength',
      label: 'Strength & Muscle',
      icon: <Dumbbell className="w-4 h-4 text-cyan-400" />,
      desc: 'Build bodyweight push/squat power'
    },
    {
      id: 'mobility',
      label: 'Mobility & Hip Flow',
      icon: <Compass className="w-4 h-4 text-teal-400" />,
      desc: 'Decompress hips, knees & spine'
    },
    {
      id: 'cardio',
      label: 'Cardio & Stamina',
      icon: <HeartPulse className="w-4 h-4 text-rose-400" />,
      desc: 'Boost endurance & metabolic burn'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/10 text-white overflow-hidden">
        
        {/* Background glow ornament */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="mb-6">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus AI Profile</span>
          </div>
          <h3 className="text-2xl font-black tracking-tight">
            {authModalTab === 'signup' ? 'Join FitMitra' : 'Welcome Back'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {authModalTab === 'signup'
              ? 'Create your zero-hardware fitness profile to save streaks and custom goals.'
              : 'Log in to continue your streak and workout milestones.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80 mb-5">
          <button
            type="button"
            onClick={() => {
              setError(null);
              openAuthModal('login');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              authModalTab === 'login'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              openAuthModal('signup');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              authModalTab === 'signup'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalTab === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              College or Personal Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@univ.edu.in"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>
          </div>

          {/* Goal Selector for Sign Up */}
          {authModalTab === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Primary Fitness Goal
              </label>
              <div className="grid grid-cols-2 gap-2">
                {goalsList.map((g) => {
                  const isSelected = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5">
                          {g.icon}
                          <span className="text-[11px] font-bold text-white leading-tight">
                            {g.label}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{g.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs tracking-wide uppercase transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] mt-2"
          >
            {authModalTab === 'signup' ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={handleDemoStudent}
            className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center space-x-1"
          >
            <span>⚡ Quick Demo: Sign in as Student Pilot (Aarav)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
