'use client';

import React, { useState, useMemo } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import {
  EquipmentType,
  ExerciseDifficulty,
  ExerciseKey,
  FitnessGoal,
  NoiseRating,
  RecommendationResult,
  SpaceRequirement,
  WorkoutConstraints
} from '@/types/fitness';
import { generateWorkout } from '@/services/workoutRecommendationEngine';
import { EXERCISE_CATALOG } from '@/data/exercises';
import {
  Sparkles,
  Bot,
  Maximize2,
  Volume2,
  VolumeX,
  Clock,
  Dumbbell,
  Compass,
  CheckCircle2,
  Play,
  Flame,
  Shield,
  Layers,
  Zap,
  ArrowRight,
  Info,
  SlidersHorizontal,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface AIWorkoutAdvisorProps {
  onStartWorkout?: (exerciseId: ExerciseKey) => void;
}

export const AIWorkoutAdvisor: React.FC<AIWorkoutAdvisorProps> = ({ onStartWorkout }) => {
  const { setSelectedExercise } = useWorkout();

  // Primary Constraint State
  const [durationMinutes, setDurationMinutes] = useState<number>(7);
  const [space, setSpace] = useState<SpaceRequirement>('small');
  const [noiseTolerance, setNoiseTolerance] = useState<NoiseRating>('silent');
  const [equipment, setEquipment] = useState<EquipmentType[]>(['none']);
  const [goal, setGoal] = useState<FitnessGoal>('strength');
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty>('beginner');
  const [excludedExerciseIds, setExcludedExerciseIds] = useState<ExerciseKey[]>([]);

  // UI accordion for advanced filters
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Toggle equipment selections (none resets others; adding others clears none)
  const toggleEquipment = (eq: EquipmentType) => {
    if (eq === 'none') {
      setEquipment(['none']);
      return;
    }
    const current = equipment.filter((e) => e !== 'none');
    if (current.includes(eq)) {
      const next = current.filter((e) => e !== eq);
      setEquipment(next.length ? next : ['none']);
    } else {
      setEquipment([...current, eq]);
    }
  };

  // Toggle exercise exclusions
  const toggleExclusion = (key: ExerciseKey) => {
    setExcludedExerciseIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  // Presets
  const applyPreset = (
    dur: number,
    sp: SpaceRequirement,
    noise: NoiseRating,
    eq: EquipmentType[],
    g: FitnessGoal,
    diff: ExerciseDifficulty
  ) => {
    setDurationMinutes(dur);
    setSpace(sp);
    setNoiseTolerance(noise);
    setEquipment(eq);
    setGoal(g);
    setDifficulty(diff);
    setExcludedExerciseIds([]);
  };

  // Run the deterministic engine
  const constraints: WorkoutConstraints = useMemo(
    () => ({
      durationMinutes,
      space,
      noiseTolerance,
      equipment,
      goal,
      difficulty,
      excludedExerciseIds
    }),
    [durationMinutes, space, noiseTolerance, equipment, goal, difficulty, excludedExerciseIds]
  );

  const recommendation = useMemo(() => generateWorkout(constraints), [constraints]);
  const success = recommendation.success ? recommendation : null;
  const failure = !recommendation.success ? (recommendation as Extract<RecommendationResult, { success: false }>) : null;

  // Launch exercise into AI Pose Coach
  const handleLaunchExercise = (exerciseKey: ExerciseKey) => {
    setSelectedExercise(exerciseKey);
    if (onStartWorkout) {
      onStartWorkout(exerciseKey);
    } else {
      const cam = document.getElementById('camera-viewport-top');
      if (cam) cam.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Apply a suggested relaxation
  const handleApplyRelaxation = (field: keyof WorkoutConstraints, value: any) => {
    if (field === 'noiseTolerance') setNoiseTolerance(value);
    else if (field === 'space') setSpace(value);
    else if (field === 'durationMinutes') setDurationMinutes(value);
    else if (field === 'goal') setGoal(value);
    else if (field === 'excludedExerciseIds') setExcludedExerciseIds(value);
  };

  return (
    <Card variant="interactive" className="p-5 sm:p-7 rounded-3xl space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary-bright text-xs font-semibold mb-2">
            <Bot className="w-3.5 h-3.5" />
            <span>Deterministic Constraint Engine</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
            Adaptive Hostel Workout Engine
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Describe your available time, room footprint, and noise limits. FitMitra crafts a 100% compliant routine.
          </p>
        </div>

        {/* Quick Hostel Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset(7, 'small', 'silent', ['none'], 'strength', 'beginner')}
            className="px-3 py-1.5 rounded-xl bg-surface-well hover:bg-surface-elevated border border-border-subtle text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-warning" />
            <span>7-Min Silent Dorm</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset(5, 'tiny', 'silent', ['none'], 'strength', 'beginner')}
            className="px-3 py-1.5 rounded-xl bg-surface-well hover:bg-surface-elevated border border-border-subtle text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3 h-3 text-accent" />
            <span>Bedside Quick Burn</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: CONSTRAINT SELECTORS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-2xl bg-surface-well border border-border-subtle">
        
        {/* 1. Time / Duration */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary-bright" />
            <span>Time Available</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[2, 5, 7, 10, 15, 20].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setDurationMinutes(dur)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all ${
                  durationMinutes === dur
                    ? 'bg-primary text-white shadow-md shadow-primary/20 border border-primary-bright/30'
                    : 'bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {dur} min
              </button>
            ))}
          </div>
        </div>

        {/* 2. Room Space */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-accent" />
            <span>Available Space</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'tiny', label: 'Bedside', desc: '~2×2 ft' },
              { id: 'small', label: 'Hostel Room', desc: 'Mat length' },
              { id: 'medium', label: 'Room Floor', desc: '2 paces' },
              { id: 'large', label: 'Gym / Open', desc: 'Full spread' }
            ].map(({ id, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSpace(id as SpaceRequirement)}
                className={`p-2 rounded-xl text-left transition-all border ${
                  space === id
                    ? 'border-accent bg-accent/15 text-white font-bold'
                    : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <div className="text-xs font-bold leading-tight">{label}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Noise Tolerance */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-success" />
            <span>Noise Tolerance</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'silent', label: '100% Silent', desc: 'Roommate sleeping' },
              { id: 'low', label: 'Low Noise', desc: 'Controlled steps' },
              { id: 'moderate', label: 'Moderate', desc: 'Standard floor' },
              { id: 'high', label: 'Unrestricted', desc: 'Jumping allowed' }
            ].map(({ id, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setNoiseTolerance(id as NoiseRating)}
                className={`p-2 rounded-xl text-left transition-all border ${
                  noiseTolerance === id
                    ? 'border-success bg-success/15 text-white font-bold'
                    : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <div className="text-xs font-bold leading-tight">{label}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Fitness Goal */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-warning" />
            <span>Focus Goal</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'strength', label: 'Strength' },
              { id: 'fat_loss', label: 'Fat Loss' },
              { id: 'cardio', label: 'Cardio' },
              { id: 'posture', label: 'Posture & Core' }
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setGoal(id as FitnessGoal)}
                className={`p-2 rounded-xl text-center text-xs transition-all border ${
                  goal === id
                    ? 'border-warning bg-warning/15 text-white font-bold'
                    : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Difficulty */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-secondary" />
            <span>Difficulty Level</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['beginner', 'intermediate', 'advanced'] as ExerciseDifficulty[]).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficulty(diff)}
                className={`py-2 px-1 rounded-xl text-xs capitalize transition-all border ${
                  difficulty === diff
                    ? 'border-secondary bg-secondary/15 text-white font-bold'
                    : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Equipment Available */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-primary-bright" />
            <span>Available Gear</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'none', label: 'No Equipment' },
              { id: 'mat', label: 'Yoga Mat' },
              { id: 'chair', label: 'Dorm Chair' }
            ].map(({ id, label }) => {
              const active = equipment.includes(id as EquipmentType);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleEquipment(id as EquipmentType)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all border ${
                    active
                      ? 'border-primary bg-primary/20 text-white font-bold'
                      : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced Exclusions Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-text-muted hover:text-text-primary font-semibold flex items-center gap-1 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary-bright" />
          <span>Advanced: Exercise Exclusions ({excludedExerciseIds.length} excluded)</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 p-3.5 rounded-2xl bg-surface border border-border-subtle space-y-2 animate-in fade-in duration-200">
            <p className="text-[11px] text-text-secondary">
              Select any exercises you want the recommendation engine to strictly avoid:
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EXERCISE_CATALOG) as ExerciseKey[]).map((key) => {
                const isExcluded = excludedExerciseIds.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleExclusion(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                      isExcluded
                        ? 'border-danger/50 bg-danger/15 text-danger'
                        : 'border-border-subtle bg-surface-well text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>{EXERCISE_CATALOG[key].shortName}</span>
                    {isExcluded && <span className="text-[10px] font-bold">✕ Excluded</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: RECOMMENDATION RESULT / NO-SOLUTION STATE */}
      {/* ======================================================== */}
      {success && (
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-strong space-y-5 animate-in fade-in duration-200">
          
          {/* Header of Generated Routine */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-success">
                  Deterministic Recommendation Generated
                </span>
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                {success.title}
              </h4>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge color="primary">{success.totalDurationMinutes} min total</Badge>
              <Badge color="secondary">{success.difficulty}</Badge>
              <Badge color={success.noise === 'silent' ? 'success' : 'warning'}>
                {success.noise}
              </Badge>
            </div>
          </div>

          {/* Exercise Items List */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Routine Structure ({success.items.length} Movement{success.items.length > 1 ? 's' : ''})
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {success.items.map((item, idx) => (
                <div
                  key={item.exerciseKey}
                  className="p-4 rounded-2xl bg-surface-elevated/70 border border-border-subtle flex items-start justify-between gap-3 group hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary-bright text-[11px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="font-extrabold text-sm text-text-primary truncate">
                        {item.name}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-text-secondary pl-7">
                      <span className="font-semibold text-text-primary">
                        {item.sets} sets × {item.repsOrSeconds} {item.unit}
                      </span>
                      <span className="text-text-muted">•</span>
                      <span className="text-text-muted">~{item.estMinutes} min</span>
                    </div>

                    <p className="text-[11px] text-text-muted pl-7 italic truncate">
                      {item.reason}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLaunchExercise(item.exerciseKey)}
                    leftIcon={<Play className="w-3 h-3 text-primary-bright" />}
                    className="shrink-0 text-xs py-1.5"
                  >
                    Coach
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Why this workout? Explanation Box */}
          <div className="p-4 rounded-2xl bg-surface-well border border-border-subtle space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Why This Workout? (Deterministic Explanation)</span>
            </h5>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary">
              {success.explanation.map((bullet, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleLaunchExercise(success.items[0].exerciseKey)}
              leftIcon={<Play className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
              className="w-full justify-center py-3.5 text-sm font-black shadow-lg shadow-primary/25"
            >
              Start Workout with AI Pose Coach
            </Button>
          </div>
        </div>
      )}

      {failure && (
        /* NO-SOLUTION STATE */
        <div className="p-6 rounded-3xl bg-danger/5 border border-danger/30 space-y-4 text-left animate-in fade-in duration-200">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-text-primary">
                No Suitable Workout Matches All Constraints
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                FitMitra will not fabricate an invalid routine. Here is why the search returned empty:
              </p>
            </div>
          </div>

          {/* Blocking Reasons */}
          <ul className="space-y-1.5 pl-4 border-l-2 border-danger/40 text-xs text-text-secondary">
            {failure.blockingConstraints.map((reason, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-danger font-bold">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          {/* Relaxation Options */}
          {failure.relaxationOptions.length > 0 && (
            <div className="pt-2 border-t border-border-subtle space-y-2">
              <p className="text-xs font-bold text-text-primary">
                Recommended constraint relaxations to find a match:
              </p>
              <div className="flex flex-wrap gap-2">
                {failure.relaxationOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyRelaxation(opt.field, opt.suggestedValue)}
                    className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border-strong text-xs font-semibold text-primary-bright transition-colors flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
