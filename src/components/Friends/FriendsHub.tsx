'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DailyComparisonModal } from './DailyComparisonModal';
import { CampusChallenges } from './CampusChallenges';
import { Friend, ExerciseKey, ExamModeType, WorkoutConstraints } from '@/types/fitness';
import {
  Users,
  UserPlus,
  Trophy,
  Flame,
  Zap,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import confetti from 'canvas-confetti';

interface FriendsHubProps {
  onStartWorkout?: (exerciseKey?: ExerciseKey) => void;
  onStartExamMode?: (mode?: ExamModeType) => void;
  onStartAdaptiveWorkout?: (constraints?: WorkoutConstraints) => void;
}

export const FriendsHub: React.FC<FriendsHubProps> = ({
  onStartWorkout,
  onStartExamMode,
  onStartAdaptiveWorkout
}) => {
  const { user, friends, addFriend, cheerFriend } = useAuth();
  const [activeView, setActiveView] = useState<'challenges' | 'friends'>('challenges');
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
      {/* Top Banner & View Switcher */}
      <Card variant="elevated" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Campus Community Hub</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Campus Challenges &amp; Friends
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Join campus fitness sprints, track dorm challenge goals, and compare daily progress with classmates.
            </p>
          </div>

          {/* View Mode Segmented Control */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-well border border-border-subtle self-start sm:self-center shrink-0">
            <button
              onClick={() => setActiveView('challenges')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                activeView === 'challenges'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Campus Challenges</span>
            </button>

            <button
              onClick={() => setActiveView('friends')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                activeView === 'friends'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends Network ({friends.length})</span>
            </button>
          </div>
        </div>

        {/* View 2: Connect Friend Form (only shown if on Friends view) */}
        {activeView === 'friends' && (
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Connect with Campus Friends</span>
              <div className="px-2.5 py-1 rounded-xl bg-surface-well border border-border-subtle text-[11px] flex items-center space-x-1.5 text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>
                  <strong>{friends.filter((f) => f.isOnline).length}</strong> Online now
                </span>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={friendQuery}
                  onChange={(e) => {
                    setFriendQuery(e.target.value);
                    setAddFeedback(null);
                  }}
                  placeholder="Enter student username (e.g. rahul_sen, priya_p)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-well border border-border-subtle rounded-xl text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Connect Friend
              </Button>
            </form>

            {addFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
                  addFeedback.success
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-danger/10 border-danger/30 text-danger'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{addFeedback.message}</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* VIEW 1: CAMPUS CHALLENGES */}
      {activeView === 'challenges' && (
        <div className="animate-in fade-in duration-200">
          <CampusChallenges
            onStartWorkout={onStartWorkout}
            onStartExamMode={onStartExamMode}
            onStartAdaptiveWorkout={onStartAdaptiveWorkout}
          />
        </div>
      )}

      {/* VIEW 2: FRIENDS CARDS GRID */}
      {activeView === 'friends' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
          {friends.map((friend) => (
            <Card
              key={friend.id}
              variant="default"
              className="space-y-4 relative overflow-hidden"
            >
              {/* Online Indicator Accent Line */}
              {friend.isOnline && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success to-accent" />
              )}

              {/* Friend Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`relative w-12 h-12 rounded-2xl bg-gradient-to-tr ${friend.avatarColor} flex items-center justify-center text-white font-black text-base shadow-md`}
                  >
                    {friend.name.charAt(0)}
                    {friend.isOnline && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-success border-2 border-surface" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-text-primary">{friend.name}</h4>
                      <span className="text-[10px] text-primary-bright font-mono">
                        @{friend.username}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
                      {friend.hostelWing || 'Fitness Friend'}
                    </p>
                  </div>
                </div>

                {/* Cheer Button */}
                <button
                  type="button"
                  onClick={() => handleCheer(friend.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-surface-well hover:bg-surface-elevated border border-border-subtle text-[11px] font-semibold text-danger hover:text-red-400 transition-colors flex items-center space-x-1.5 active:scale-95"
                  title="Send Cheer / Motivation"
                >
                  <span>❤️</span>
                  <span className="font-mono">{friend.cheerCount}</span>
                </button>
              </div>

              {/* Status Speech Bubble */}
              <div className="p-3 rounded-xl bg-surface-well border border-border-subtle text-xs text-text-secondary flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="italic line-clamp-1">&quot;{friend.statusText}&quot;</span>
              </div>

              {/* Today's Stats Preview Pills */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-surface-well border border-border-subtle">
                  <span className="block text-[10px] text-text-muted">Reps</span>
                  <span className="text-xs font-black text-text-primary">
                    {friend.todayStats.repsCompleted}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-surface-well border border-border-subtle">
                  <span className="block text-[10px] text-text-muted">Burned</span>
                  <span className="text-xs font-black text-warning">
                    {friend.todayStats.caloriesBurned}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-surface-well border border-border-subtle">
                  <span className="block text-[10px] text-text-muted">Posture</span>
                  <span className="text-xs font-black text-accent">
                    {friend.todayStats.postureScore}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-surface-well border border-border-subtle">
                  <span className="block text-[10px] text-text-muted">Streak</span>
                  <span className="text-xs font-black text-warning">
                    {friend.todayStats.streakDays}d 🔥
                  </span>
                </div>
              </div>

              {/* Actions: Compare Today */}
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setSelectedFriendForComparison(friend)}
                leftIcon={<Trophy className="w-3.5 h-3.5 text-warning" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5 text-text-muted" />}
              >
                Compare Today&apos;s Progress
              </Button>
            </Card>
          ))}
        </div>
      )}

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
