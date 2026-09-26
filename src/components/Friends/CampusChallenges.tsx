'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Zap,
  Target,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Users,
  ArrowRight,
  X,
  Sparkles,
  Footprints,
  Compass,
  RotateCcw,
  Info
} from 'lucide-react';
import { useWorkout } from '@/context/WorkoutContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  CampusChallenge,
  ChallengeCategory,
  ChallengeProgress,
  ExerciseKey,
  ExamModeType,
  WorkoutConstraints
} from '@/types/fitness';
import {
  getChallengeCatalog,
  loadAllChallengeProgress,
  joinChallenge,
  leaveChallenge,
  mapChallengeToWorkoutConstraints
} from '@/services/campusChallengesService';

export interface CampusChallengesProps {
  onStartWorkout?: (exerciseKey?: ExerciseKey) => void;
  onStartExamMode?: (mode?: ExamModeType) => void;
  onStartAdaptiveWorkout?: (constraints?: WorkoutConstraints) => void;
}

export const CampusChallenges: React.FC<CampusChallengesProps> = ({
  onStartWorkout,
  onStartExamMode,
  onStartAdaptiveWorkout
}) => {
  const { friends } = useAuth();
  const catalog = useMemo(() => getChallengeCatalog(), []);

  // Local persistent challenge progress state
  const [progressMap, setProgressMap] = useState<Record<string, ChallengeProgress>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChallenge, setSelectedChallenge] = useState<CampusChallenge | null>(null);

  // Load progress on mount
  useEffect(() => {
    setProgressMap(loadAllChallengeProgress());
  }, []);

  // Filter challenges by category
  const filteredChallenges = useMemo(() => {
    if (selectedCategory === 'all') return catalog;
    return catalog.filter((c) => c.category === selectedCategory);
  }, [catalog, selectedCategory]);

  const handleJoin = (challengeId: string) => {
    const updated = joinChallenge(challengeId);
    setProgressMap((prev) => ({
      ...prev,
      [challengeId]: updated
    }));
  };

  const handleLeave = (challengeId: string) => {
    leaveChallenge(challengeId);
    setProgressMap((prev) => {
      const copy = { ...prev };
      delete copy[challengeId];
      return copy;
    });
  };

  // Launch appropriate activity for this challenge
  const handleLaunchChallengeActivity = (challenge: CampusChallenge) => {
    setSelectedChallenge(null);

    if (challenge.category === 'exam') {
      if (onStartExamMode) {
        onStartExamMode('break');
      }
      return;
    }

    if (challenge.exerciseKeys && challenge.exerciseKeys.length > 0) {
      if (onStartWorkout) {
        onStartWorkout(challenge.exerciseKeys[0]);
      }
      return;
    }

    if (challenge.category === 'hostel' && onStartAdaptiveWorkout) {
      const constraints = mapChallengeToWorkoutConstraints(challenge);
      onStartAdaptiveWorkout(constraints);
      return;
    }

    if (onStartWorkout) {
      onStartWorkout();
    }
  };

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Challenges' },
    { id: 'consistency', label: 'Consistency' },
    { id: 'strength', label: 'Strength' },
    { id: 'hostel', label: 'Hostel' },
    { id: 'exam', label: 'Exam Breaks' },
    { id: 'wellness', label: 'Wellness' }
  ];

  const getCategoryColor = (cat: ChallengeCategory): 'primary' | 'accent' | 'secondary' | 'success' | 'warning' => {
    switch (cat) {
      case 'strength':
        return 'primary';
      case 'consistency':
        return 'warning';
      case 'hostel':
        return 'secondary';
      case 'exam':
        return 'accent';
      case 'wellness':
        return 'success';
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
              selectedCategory === cat.id
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover border border-border-subtle'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Challenges Grid */}
      {filteredChallenges.length === 0 ? (
        <EmptyState
          icon={<Target className="w-8 h-8 text-text-muted" />}
          title="No challenges found"
          description="Check back later or select another category."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredChallenges.map((challenge) => {
            const progress = progressMap[challenge.id];
            const isJoined = !!progress;
            const isCompleted = isJoined && progress.completed;
            const currentValue = progress ? progress.currentValue : 0;
            const percent = Math.min(100, Math.round((currentValue / challenge.targetValue) * 100));
            const remaining = Math.max(0, challenge.targetValue - currentValue);
            const colorVariant = getCategoryColor(challenge.category);

            return (
              <Card
                key={challenge.id}
                variant="interactive"
                className={`flex flex-col justify-between space-y-4 relative overflow-hidden transition-all ${
                  isCompleted ? 'border-success/40 bg-gradient-to-br from-surface to-success/5' : ''
                }`}
              >
                {/* Header Meta */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="p-2 rounded-xl bg-surface-well border border-border-subtle shrink-0">
                        {challenge.category === 'strength' && <Zap className="w-4 h-4 text-primary" />}
                        {challenge.category === 'consistency' && <Flame className="w-4 h-4 text-warning" />}
                        {challenge.category === 'hostel' && <ShieldCheck className="w-4 h-4 text-secondary" />}
                        {challenge.category === 'exam' && <Target className="w-4 h-4 text-accent" />}
                        {challenge.category === 'wellness' && <Sparkles className="w-4 h-4 text-success" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-text-primary tracking-tight truncate">
                          {challenge.title}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-[10px] text-text-muted capitalize">
                          <span>{challenge.category}</span>
                          <span>•</span>
                          <span>{challenge.difficulty}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge
                      color={isCompleted ? 'success' : isJoined ? 'primary' : 'muted'}
                      size="sm"
                      dot={isJoined && !isCompleted}
                    >
                      {isCompleted ? '✓ Completed' : isJoined ? 'In Progress' : 'Open'}
                    </Badge>
                  </div>

                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                    {challenge.description}
                  </p>
                </div>

                {/* Progress Bar (if joined or showing target) */}
                <div className="p-3 rounded-2xl bg-surface-well border border-border-subtle space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-lg font-black text-text-primary font-mono">
                        {currentValue.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-text-muted">
                        / {challenge.targetValue.toLocaleString()} {challenge.unit}
                      </span>
                    </div>

                    <span className="text-xs font-mono font-bold text-primary-bright">
                      {percent}%
                    </span>
                  </div>

                  <ProgressBar value={percent} variant={colorVariant} size="sm" />

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span>{challenge.durationDays} Days Duration</span>
                    </span>

                    <span className="font-semibold text-text-secondary">
                      {isCompleted ? (
                        <span className="text-success flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Target Reached!
                        </span>
                      ) : isJoined ? (
                        <span>{remaining.toLocaleString()} {challenge.unit} to go</span>
                      ) : (
                        <span>Target: {challenge.targetValue} {challenge.unit}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-subtle">
                  {!isJoined ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleJoin(challenge.id)}
                      className="cursor-pointer font-bold"
                    >
                      Join Challenge
                    </Button>
                  ) : isCompleted ? (
                    <span className="text-xs font-semibold text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Challenge Complete
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleLaunchChallengeActivity(challenge)}
                      className="cursor-pointer font-bold"
                      leftIcon={<Zap className="w-3.5 h-3.5" />}
                    >
                      Continue
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedChallenge(challenge)}
                    className="text-text-muted hover:text-text-primary cursor-pointer text-xs"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Challenge Detail Modal */}
      {selectedChallenge && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="challenge-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-xl bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl text-text-primary overflow-hidden max-h-[90vh] overflow-y-auto space-y-6">
            {/* Close Button */}
            <button
              onClick={() => setSelectedChallenge(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Close challenge modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge color={getCategoryColor(selectedChallenge.category)} size="sm">
                  {selectedChallenge.category.toUpperCase()}
                </Badge>
                <Badge color="muted" size="sm">
                  {selectedChallenge.difficulty.toUpperCase()}
                </Badge>
                <span className="text-xs text-text-muted flex items-center gap-1 ml-auto">
                  <Clock className="w-3 h-3" /> {selectedChallenge.durationDays} Days
                </span>
              </div>

              <h3 id="challenge-modal-title" className="text-2xl font-black tracking-tight text-text-primary">
                {selectedChallenge.title}
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">
                {selectedChallenge.description}
              </p>
            </div>

            {/* Progress Display */}
            {(() => {
              const progress = progressMap[selectedChallenge.id];
              const isJoined = !!progress;
              const isCompleted = isJoined && progress.completed;
              const currentValue = progress ? progress.currentValue : 0;
              const percent = Math.min(100, Math.round((currentValue / selectedChallenge.targetValue) * 100));
              const remaining = Math.max(0, selectedChallenge.targetValue - currentValue);

              return (
                <div className="p-4 rounded-2xl bg-surface-well border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">
                        Your Personal Progress
                      </span>
                      <p className="text-2xl font-black text-text-primary font-mono mt-0.5">
                        {currentValue.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-text-muted">
                          / {selectedChallenge.targetValue.toLocaleString()} {selectedChallenge.unit}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold block">
                        Completion
                      </span>
                      <p className="text-xl font-mono font-black text-primary-bright">
                        {percent}%
                      </p>
                    </div>
                  </div>

                  <ProgressBar
                    value={percent}
                    variant={getCategoryColor(selectedChallenge.category)}
                    size="md"
                  />

                  <div className="text-xs text-text-secondary pt-1 flex items-center justify-between">
                    <span>
                      {isCompleted ? (
                        <strong className="text-success flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Target Achieved!
                        </strong>
                      ) : (
                        <span>
                          Remaining Target:{' '}
                          <strong className="text-text-primary font-mono">
                            {remaining.toLocaleString()} {selectedChallenge.unit}
                          </strong>
                        </span>
                      )}
                    </span>
                    <Badge color={isCompleted ? 'success' : isJoined ? 'primary' : 'muted'} size="sm">
                      {isCompleted ? 'Completed' : isJoined ? 'Participating' : 'Not Joined'}
                    </Badge>
                  </div>
                </div>
              );
            })()}

            {/* Challenge Rules & Requirements */}
            <div className="p-4 rounded-2xl bg-surface-well border border-border-subtle space-y-2.5 text-xs text-text-secondary">
              <h5 className="font-bold text-text-primary flex items-center gap-1.5">
                <Target className="w-4 h-4 text-accent" />
                <span>Challenge Guidelines &amp; Requirements</span>
              </h5>
              <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] leading-relaxed">
                {selectedChallenge.rules.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            </div>

            {/* Privacy Transparency Notice */}
            <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle text-[11px] text-text-muted flex items-start space-x-2">
              <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>
                100% on-device challenge tracking. Your workout completions and rep counts update your progress locally with zero data sent to external servers.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {!progressMap[selectedChallenge.id] ? (
                <Button
                  variant="primary"
                  className="w-full sm:flex-1 font-bold"
                  onClick={() => handleJoin(selectedChallenge.id)}
                >
                  Join Challenge
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto text-text-muted hover:text-danger"
                  onClick={() => handleLeave(selectedChallenge.id)}
                >
                  Leave Challenge
                </Button>
              )}

              {/* Start/Find a Workout Action */}
              <Button
                variant="primary"
                className="w-full sm:flex-1 font-bold"
                onClick={() => handleLaunchChallengeActivity(selectedChallenge)}
                leftIcon={<Zap className="w-4 h-4" />}
              >
                {selectedChallenge.category === 'exam'
                  ? 'Start Exam Break'
                  : 'Find a Workout'}
              </Button>

              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setSelectedChallenge(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
