'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DailyComparisonModal } from './DailyComparisonModal';
import { Friend } from '@/types/fitness';
import { Users, UserPlus, Trophy, Flame, ShieldCheck, HeartHandshake, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const FriendsHub: React.FC = () => {
  const { user, friends, addFriend, cheerFriend } = useAuth();
  const [friendQuery, setFriendQuery] = useState('');
  const [addFeedback, setAddFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedFriendForComparison, setSelectedFriendForComparison] = useState<Friend | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendQuery.trim()) return;

    const res = addFriend(friendQuery);
    setAddFeedback(res);
    if (res.success) {
      setFriendQuery('');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.5 } });
    }
  };

  const handleCheer = (friendId: string) => {
    cheerFriend(friendId);
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Add Friend Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Campus Social Network</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Friends & Daily Progress Hub
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Connect with friends to compare daily reps, calories, and posture scores.
            </p>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center space-x-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span><strong>{friends.filter((f) => f.isOnline).length}</strong> Friends active right now</span>
          </div>
        </div>

        {/* Add Friend Input Form */}
        <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={friendQuery}
              onChange={(e) => {
                setFriendQuery(e.target.value);
                setAddFeedback(null);
              }}
              placeholder="Enter friend username (e.g. rahul_sen, priya_p)..."
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Connect Friend</span>
          </button>
        </form>

        {addFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
              addFeedback.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{addFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Friends Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-md hover:border-slate-700/90 transition-all space-y-4 relative overflow-hidden"
          >
            {/* Online Indicator Line */}
            {friend.isOnline && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            )}

            {/* Friend Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-tr ${friend.avatarColor} flex items-center justify-center text-white font-black text-base shadow-md`}>
                  {friend.name.charAt(0)}
                  {friend.isOnline && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-white">{friend.name}</h4>
                    <span className="text-[10px] text-emerald-400 font-mono">@{friend.username}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{friend.hostelWing || 'Fitness Friend'}</p>
                </div>
              </div>

              {/* Cheer Count */}
              <button
                onClick={() => handleCheer(friend.id)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center space-x-1.5 active:scale-95"
                title="Send Cheer / Motivation"
              >
                <span>❤️</span>
                <span>{friend.cheerCount}</span>
              </button>
            </div>

            {/* Status Speech Bubble */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="italic line-clamp-1">&quot;{friend.statusText}&quot;</span>
            </div>

            {/* Today's Stats Preview Pills */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/70">
                <span className="block text-[10px] text-slate-500">Reps</span>
                <span className="text-xs font-black text-white">{friend.todayStats.repsCompleted}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/70">
                <span className="block text-[10px] text-slate-500">Burned</span>
                <span className="text-xs font-black text-emerald-400">{friend.todayStats.caloriesBurned}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/70">
                <span className="block text-[10px] text-slate-500">Posture</span>
                <span className="text-xs font-black text-cyan-400">{friend.todayStats.postureScore}%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/70">
                <span className="block text-[10px] text-slate-500">Streak</span>
                <span className="text-xs font-black text-amber-400">{friend.todayStats.streakDays}d 🔥</span>
              </div>
            </div>

            {/* Actions: Compare Today */}
            <button
              onClick={() => setSelectedFriendForComparison(friend)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all flex items-center justify-center space-x-2 border border-slate-700/60 active:scale-[0.99]"
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>Compare Today&apos;s Progress</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Comparison Modal */}
      {selectedFriendForComparison && (
        <DailyComparisonModal
          friend={selectedFriendForComparison}
          currentUser={user}
          onClose={() => setSelectedFriendForComparison(null)}
          onCheer={handleCheer}
        />
      )}

    </div>
  );
};
