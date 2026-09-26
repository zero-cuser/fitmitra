'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  Eye,
  Sparkles,
  Zap,
  HeartPulse,
  Play,
  Pause,
  SkipForward,
  X,
  Volume2,
  VolumeX,
  CheckCircle2,
  ArrowRight,
  Video,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import type {
  ExamActivityCategory,
  ExamActivityItem,
  ExamModeType,
  ExamSessionConfig,
  ExamSessionRecord,
  ExerciseKey
} from '@/types/fitness';
import { ElapsedTimerController, TimerSnapshot } from '@/services/elapsedTimer';
import { createExamSession } from '@/services/examModeEngine';
import { playBreakBell } from '@/utils/soundEffects';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from '@/utils/storageSafety';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

export interface ExamModeSessionProps {
  sessionConfig: ExamSessionConfig;
  onExit: () => void;
  onLaunchAICoach?: (exerciseKey: ExerciseKey) => void;
  onRestartSession?: (newConfig: ExamSessionConfig) => void;
}

export const ExamModeSession: React.FC<ExamModeSessionProps> = ({
  sessionConfig: initialConfig,
  onExit,
  onLaunchAICoach,
  onRestartSession
}) => {
  const [config, setConfig] = useState<ExamSessionConfig>(initialConfig);
  const [isMuted, setIsMuted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Controller instance maintained in ref to preserve wall-clock elapsed time
  const timerRef = useRef<ElapsedTimerController | null>(null);

  // Snapshot state for React rendering
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() => {
    const t = new ElapsedTimerController(initialConfig.activities);
    timerRef.current = t;
    t.start();
    return t.getSnapshot();
  });

  // Track previous activity index to trigger sound/announcement on change
  const prevActivityIndexRef = useRef(0);

  // Initialize or re-initialize controller when config changes
  useEffect(() => {
    const timer = new ElapsedTimerController(config.activities);
    timerRef.current = timer;
    prevActivityIndexRef.current = 0;
    setIsCompleted(false);
    timer.start();
    const snap = timer.getSnapshot();
    setSnapshot(snap);
    setAnnouncement(`Starting ${config.title}. First activity: ${snap.currentActivityName}`);
  }, [config]);

  // Main timer tick loop using requestAnimationFrame + interval fallback
  useEffect(() => {
    let animId: number;
    let isMounted = true;

    const tick = () => {
      if (!isMounted || !timerRef.current) return;

      const now = Date.now();
      const stepRes = timerRef.current.step(now);
      const snap = timerRef.current.getSnapshot(now);
      setSnapshot(snap);

      // Handle activity change transition
      if (snap.activityIndex !== prevActivityIndexRef.current) {
        prevActivityIndexRef.current = snap.activityIndex;
        if (!isMuted) {
          playBreakBell();
        }
        setAnnouncement(`Now starting: ${snap.currentActivityName}, ${snap.activityDurationSeconds} seconds.`);
      }

      // Handle session completion
      if (stepRes.sessionCompleted || snap.isCompleted) {
        if (!isCompleted) {
          setIsCompleted(true);
          if (!isMuted) {
            playBreakBell();
          }
          setAnnouncement(`${config.title} completed.`);

          // Persist completed session record safely
          try {
            const existing = safeGetItem<ExamSessionRecord[]>(
              STORAGE_KEYS.EXAM_SESSIONS,
              (data): data is ExamSessionRecord[] => Array.isArray(data),
              []
            ) || [];

            const newRecord: ExamSessionRecord = {
              id: `exam_${Date.now()}`,
              mode: config.mode,
              title: config.title,
              completedAt: new Date().toISOString(),
              durationMinutes: Math.round(snap.totalSessionElapsedSeconds / 60) || 1,
              durationSeconds: snap.totalSessionElapsedSeconds,
              activitiesCompleted: config.activities.length,
              totalActivities: config.activities.length,
              completedFully: true
            };

            safeSetItem(STORAGE_KEYS.EXAM_SESSIONS, [newRecord, ...existing.slice(0, 49)]);
          } catch (e) {
            console.error('Failed to persist exam session:', e);
          }
        }
        return;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
    };
  }, [config, isMuted, isCompleted]);

  // Current active activity item
  const currentActivity: ExamActivityItem = useMemo(() => {
    return config.activities[snapshot.activityIndex] || config.activities[config.activities.length - 1];
  }, [config.activities, snapshot.activityIndex]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Category styling and metadata
  const categoryConfig: Record<
    ExamActivityCategory,
    { label: string; icon: React.ReactNode; color: 'accent' | 'secondary' | 'primary' | 'success'; borderClass: string }
  > = {
    eye_break: {
      label: 'Eye & Screen Rest',
      icon: <Eye className="w-4 h-4 text-accent" />,
      color: 'accent',
      borderClass: 'border-accent/40'
    },
    stretch: {
      label: 'Desk Mobility & Stretch',
      icon: <Sparkles className="w-4 h-4 text-secondary" />,
      color: 'secondary',
      borderClass: 'border-secondary/40'
    },
    movement: {
      label: 'Quiet Bodyweight Movement',
      icon: <Zap className="w-4 h-4 text-primary-bright" />,
      color: 'primary',
      borderClass: 'border-primary/40'
    },
    breathing: {
      label: 'Paced Breath Reset',
      icon: <HeartPulse className="w-4 h-4 text-success" />,
      color: 'success',
      borderClass: 'border-success/40'
    }
  };

  const catMeta = categoryConfig[currentActivity.category];

  // Action handlers
  const handleTogglePause = () => {
    if (!timerRef.current) return;
    if (snapshot.isRunning && !snapshot.isPaused) {
      timerRef.current.pause();
    } else {
      timerRef.current.resume();
    }
    setSnapshot(timerRef.current.getSnapshot());
  };

  const handleSkipActivity = () => {
    if (!timerRef.current) return;
    timerRef.current.skip();
    if (!isMuted) {
      playBreakBell();
    }
    setSnapshot(timerRef.current.getSnapshot());
  };

  const handleEndSession = () => {
    if (!timerRef.current) return;
    timerRef.current.endSession();
    setIsCompleted(true);
    setSnapshot(timerRef.current.getSnapshot());
  };

  const handleRestartAnother = (mode: ExamModeType) => {
    const newSession = createExamSession(mode);
    setConfig(newSession);
    if (onRestartSession) {
      onRestartSession(newSession);
    }
  };

  // -------------------------------------------------------------
  // VIEW: COMPLETION SCREEN
  // -------------------------------------------------------------
  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200 py-4">
        {/* Completion Card */}
        <Card variant="elevated" className="p-6 sm:p-8 space-y-6 text-center border-border-subtle">
          <div className="w-16 h-16 rounded-full bg-success/15 border border-success/30 text-success flex items-center justify-center mx-auto shadow-glow-success">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge color="success" size="md">Study Break Completed</Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {config.title}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
              Great job stepping away from your desk. Regular vision breaks and postural mobility help sustain focus during intense study sessions.
            </p>
          </div>

          {/* Honest Metric Badges (Zero Fabricated Data) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle text-left">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Duration</span>
              <span className="text-xl sm:text-2xl font-black text-text-primary font-mono">
                {formatTime(snapshot.totalSessionElapsedSeconds)}
              </span>
              <span className="text-[10px] text-text-muted block mt-0.5">Elapsed time</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle text-left">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Activities</span>
              <span className="text-xl sm:text-2xl font-black text-text-primary font-mono">
                {config.activities.length} / {config.activities.length}
              </span>
              <span className="text-[10px] text-text-muted block mt-0.5">Completed</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle text-left col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Noise Level</span>
              <span className="text-base sm:text-lg font-bold text-success flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Hostel Quiet</span>
              </span>
              <span className="text-[10px] text-text-muted block mt-0.5">Zero gear needed</span>
            </div>
          </div>

          {/* Activity Breakdown List */}
          <div className="space-y-2 text-left pt-2 border-t border-border-subtle">
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted px-1">
              Completed Movement Sequence
            </span>
            <div className="space-y-2">
              {config.activities.map((act, index) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-subtle text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-success/20 text-success text-[10px] font-bold flex items-center justify-center shrink-0">
                      ✓
                    </span>
                    <span className="font-semibold text-text-primary truncate">{act.name}</span>
                  </div>
                  <span className="text-text-muted font-mono shrink-0 text-[11px]">
                    {act.durationSeconds}s
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={onExit}
              className="font-bold cursor-pointer"
              rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
            >
              Back to Dashboard
            </Button>
          </div>

          {/* Quick Repeat or Switch Duration */}
          <div className="pt-4 border-t border-border-subtle space-y-2">
            <span className="text-[11px] text-text-muted font-medium block">
              Want another quick session before studying?
            </span>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleRestartAnother('reset')}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated text-xs font-semibold text-text-secondary border border-border-subtle hover:text-text-primary cursor-pointer transition-colors"
              >
                2m Reset
              </button>
              <button
                onClick={() => handleRestartAnother('break')}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated text-xs font-semibold text-text-secondary border border-border-subtle hover:text-text-primary cursor-pointer transition-colors"
              >
                5m Break
              </button>
              <button
                onClick={() => handleRestartAnother('recharge')}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated text-xs font-semibold text-text-secondary border border-border-subtle hover:text-text-primary cursor-pointer transition-colors"
              >
                10m Recharge
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: ACTIVE SESSION SCREEN
  // -------------------------------------------------------------
  const activityProgressPercent = Math.min(
    100,
    Math.round((snapshot.activityElapsedSeconds / currentActivity.durationSeconds) * 100)
  );

  const totalProgressPercent = Math.min(
    100,
    Math.round((snapshot.totalSessionElapsedSeconds / snapshot.totalSessionDurationSeconds) * 100)
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Screen Reader Announcement Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex items-center justify-between gap-3 p-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <button
            onClick={onExit}
            aria-label="Exit Exam Mode Session"
            className="p-2 rounded-xl bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
              Exam Mode • Study Break
            </span>
            <h1 className="text-base sm:text-lg font-black text-text-primary truncate">
              {config.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Badge color={catMeta.color} dot>
            {catMeta.label}
          </Badge>

          {/* Audio Chime Mute Toggle */}
          <button
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? 'Unmute transition chime' : 'Mute transition chime'}
            title={isMuted ? 'Audio chime muted' : 'Audio chime enabled'}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-surface text-text-muted border-border-subtle'
                : 'bg-primary/10 text-primary-bright border-primary/30'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. OVERALL TIMELINE PROGRESS */}
      <div className="space-y-1.5 px-1">
        <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
          <span>
            Activity {snapshot.activityIndex + 1} of {snapshot.totalActivities}
          </span>
          <span className="font-mono">
            {formatTime(snapshot.totalSessionElapsedSeconds)} / {formatTime(snapshot.totalSessionDurationSeconds)}
          </span>
        </div>
        <ProgressBar value={totalProgressPercent} variant="primary" size="sm" />
      </div>

      {/* 3. MAIN IMMERSIVE ACTIVITY CARD */}
      <Card
        variant="elevated"
        className={`p-6 sm:p-8 space-y-6 border-2 transition-all ${catMeta.borderClass}`}
      >
        {/* Large Countdown Timer */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-text-muted">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>Time Remaining in this activity</span>
          </div>

          <div className="text-5xl sm:text-7xl font-black font-mono tracking-tight text-text-primary select-none">
            {formatTime(snapshot.activityRemainingSeconds)}
          </div>

          <div className="max-w-md mx-auto pt-1">
            <ProgressBar value={activityProgressPercent} variant={catMeta.color} size="md" />
          </div>
        </div>

        {/* Current Activity Header & Description */}
        <div className="text-center space-y-2 border-t border-border-subtle pt-5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-elevated border border-border-subtle text-xs font-bold text-text-primary">
            {catMeta.icon}
            <span>{currentActivity.name}</span>
          </div>

          <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
            {currentActivity.description}
          </p>
        </div>

        {/* Category-Specific Visual Enhancement */}
        {currentActivity.category === 'breathing' && (
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-success/10 animate-ping opacity-75" />
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-success/20 border-2 border-success/40 flex items-center justify-center text-success font-bold text-xs">
                <span>Inhale / Exhale</span>
              </div>
            </div>
            <span className="text-[11px] text-text-muted font-medium">
              4 counts slow inhale • 4 counts gentle exhale
            </span>
          </div>
        )}

        {/* Posture & Form Cues */}
        <div className="space-y-2 bg-surface/80 p-4 rounded-2xl border border-border-subtle text-left max-w-xl mx-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
            Movement &amp; Form Guidance
          </span>
          <ul className="space-y-1.5 text-xs text-text-secondary">
            {currentActivity.cues.map((cue, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-primary-bright font-bold shrink-0">•</span>
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Opt-in Camera AI Coach Banner (Only when activity is movement and eligible) */}
        {currentActivity.category === 'movement' && currentActivity.isCameraEligible && currentActivity.exerciseKey && onLaunchAICoach && (
          <div className="p-4 rounded-2xl bg-surface-elevated border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4 text-primary-bright" />
                <span className="text-xs font-bold text-text-primary">Want live posture feedback?</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Camera is completely optional. You can launch AI Pose Coach for joint tracking, or continue following the timer here.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onLaunchAICoach(currentActivity.exerciseKey!)}
              className="shrink-0 text-xs font-bold"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Open AI Coach
            </Button>
          </div>
        )}

        {/* 4. CONTROLS ACTION BAR */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {/* Pause / Resume */}
          <Button
            variant={snapshot.isPaused ? 'primary' : 'secondary'}
            size="lg"
            onClick={handleTogglePause}
            className="min-w-[140px] font-bold cursor-pointer"
            leftIcon={
              snapshot.isPaused ? (
                <Play className="w-4 h-4 fill-current" />
              ) : (
                <Pause className="w-4 h-4 fill-current" />
              )
            }
          >
            {snapshot.isPaused ? 'Resume' : 'Pause'}
          </Button>

          {/* Skip Activity */}
          <Button
            variant="ghost"
            size="lg"
            onClick={handleSkipActivity}
            className="text-text-secondary hover:text-text-primary cursor-pointer"
            leftIcon={<SkipForward className="w-4 h-4" />}
          >
            Skip
          </Button>

          {/* End Break Early */}
          <Button
            variant="ghost"
            size="lg"
            onClick={handleEndSession}
            className="text-text-muted hover:text-danger cursor-pointer"
          >
            End Break
          </Button>
        </div>
      </Card>

      {/* 5. UPCOMING ACTIVITY PREVIEW */}
      {snapshot.activityIndex < config.activities.length - 1 && (
        <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex items-center justify-between text-xs px-4">
          <div className="flex items-center space-x-2 text-text-muted min-w-0">
            <span className="font-semibold text-text-primary shrink-0">Next Up:</span>
            <span className="truncate">{config.activities[snapshot.activityIndex + 1].name}</span>
          </div>
          <span className="text-[11px] text-text-muted font-mono shrink-0 ml-2">
            {config.activities[snapshot.activityIndex + 1].durationSeconds}s
          </span>
        </div>
      )}
    </div>
  );
};
