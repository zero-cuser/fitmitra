'use client';

import React, { useState } from 'react';
import { X, User, Mail, Lock, Sparkles, ShieldCheck, Dumbbell, Compass, HeartPulse, Building2, AtSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FitnessGoal } from '@/types/fitness';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalTab, openAuthModal, login, signup, loginAsGuest } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hostelWing, setHostelWing] = useState('Aryabhatta Wing A (Room 204)');
  const [goal, setGoal] = useState<FitnessGoal>('posture');
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authModalTab === 'signup') {
      const res = signup(name, username, email, password, hostelWing, goal);
      if (!res.success) {
        setError(res.error || 'Failed to sign up.');
      } else {
        setName('');
        setUsername('');
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
    loginAsGuest();
  };

  const HOSTEL_OPTIONS = [
    'Aryabhatta Wing A (Room 204)',
    'Ramanujan Wing B (Room 312)',
    'Sarojini Wing C (Room 108)',
    'Gargi Wing D (Room 402)',
    'Bhabha Wing E (Room 115)',
    'Day Scholar / Off-Campus Flat'
  ];

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
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/10 text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        
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
              ? 'Create your zero-cloud student profile to track workouts and connect with friends.'
              : 'Sign in to access your personal kinematics, friend comparison, and weekly logs.'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setError(null);
              openAuthModal('signup');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              authModalTab === 'signup'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              openAuthModal('login');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              authModalTab === 'login'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalTab === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Campus Username (For Friends)
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. aarav_fit"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Hostel / Dorm Wing
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={hostelWing}
                    onChange={(e) => setHostelWing(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                  >
                    {HOSTEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-slate-900 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@univ.edu.in"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {authModalTab === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Primary Student Wellness Goal
              </label>
              <div className="grid grid-cols-2 gap-2">
                {goalsList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGoal(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      goal === item.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {item.icon}
                      <span className="text-xs font-bold text-slate-200">{item.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 transition-all active:scale-[0.99]"
          >
            {authModalTab === 'signup' ? 'Complete Profile & Enter' : 'Sign In'}
          </button>
        </form>

        {/* Demo Fast Track for Judges */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col items-center">
          <p className="text-[11px] text-slate-400 mb-2">Evaluating for Smart India Hackathon?</p>
          <button
            type="button"
            onClick={handleDemoStudent}
            className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-emerald-400 transition-colors flex items-center justify-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Demo Sign-in (Aarav Sharma - Wing A)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
