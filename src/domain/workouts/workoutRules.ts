/**
 * FitMitra Platform-Neutral Workout Rules
 * 
 * Pure deterministic domain functions for workout progress, calorie burn, XP, and session summaries.
 * Free of React state, DOM, LocalStorage, or network dependencies.
 */

import type { ExerciseKey, WorkoutSummary } from '../models/domainTypes.ts';
import { DOMAIN_EXERCISE_CATALOG } from '../exercises/exerciseCatalog.ts';

/**
 * Calculates percentage completion and remaining reps for an active workout set.
 */
export function calculateWorkoutProgress(
  completedReps: number,
  targetReps: number
): {
  progressPercentage: number;
  isCompleted: boolean;
  remainingReps: number;
} {
  const safeTarget = Math.max(1, targetReps);
  const safeCompleted = Math.max(0, completedReps);
  const progressPercentage = Math.min(100, Math.round((safeCompleted / safeTarget) * 100));
  const isCompleted = safeCompleted >= safeTarget;
  const remainingReps = Math.max(0, safeTarget - safeCompleted);

  return {
    progressPercentage,
    isCompleted,
    remainingReps
  };
}

/**
 * Calculates estimated active calories burned based on biomechanical exercise rate.
 */
export function calculateCaloriesBurned(
  exerciseKey: ExerciseKey,
  repsOrSeconds: number,
  customCalRate?: number
): number {
  const definition = DOMAIN_EXERCISE_CATALOG[exerciseKey];
  const rate = customCalRate ?? definition?.calPerRep ?? 0.3;
  return Math.round(Math.max(0, repsOrSeconds) * rate);
}

/**
 * Calculates XP earned from completed reps or hold duration.
 */
export function calculateXpEarned(
  repsOrSeconds: number,
  isCompleted: boolean,
  isHoldExercise = false
): number {
  const baseRate = isHoldExercise ? 2 : 10;
  const repXp = Math.floor(Math.max(0, repsOrSeconds) / (isHoldExercise ? 5 : 1)) * baseRate;
  const completionBonus = isCompleted ? 50 : 0;
  return repXp + completionBonus;
}

/**
 * Calculates level and progress towards next level from total XP.
 * Rule: 100 XP per level.
 */
export function calculateLevelFromXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPercent: number;
} {
  const safeXp = Math.max(0, xp);
  const level = Math.floor(safeXp / 100) + 1;
  const currentLevelXp = safeXp % 100;
  const nextLevelXp = 100;
  const levelProgressPercent = Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100));

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    levelProgressPercent
  };
}

/**
 * Builds an immutable, self-contained summary of a completed workout session.
 */
export function calculateSessionSummary(params: {
  exerciseKey: ExerciseKey;
  completedReps: number;
  targetReps: number;
  durationSeconds: number;
  postureScore?: number;
}): WorkoutSummary {
  const definition = DOMAIN_EXERCISE_CATALOG[params.exerciseKey] || DOMAIN_EXERCISE_CATALOG.squats;
  const progress = calculateWorkoutProgress(params.completedReps, params.targetReps);
  const caloriesBurned = calculateCaloriesBurned(params.exerciseKey, params.completedReps);
  const xpEarned = calculateXpEarned(params.completedReps, progress.isCompleted, definition.isHoldExercise);

  return {
    exerciseKey: params.exerciseKey,
    exerciseName: definition.name,
    completedReps: params.completedReps,
    targetReps: params.targetReps,
    durationSeconds: Math.max(0, params.durationSeconds),
    caloriesBurned,
    averagePostureScore: Math.min(100, Math.max(0, params.postureScore ?? 90)),
    isCompleted: progress.isCompleted,
    xpEarned
  };
}
