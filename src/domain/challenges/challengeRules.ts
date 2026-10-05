/**
 * FitMitra Platform-Neutral Challenge Rules & Progress Logic
 * 
 * Pure functions operating on domain data models with zero direct storage calls.
 */

import type {
  CampusChallenge,
  ChallengeProgress,
  CompletedActivityRecord
} from '../../types/fitness.ts';
import {
  CAMPUS_CHALLENGES_CATALOG,
  getChallengeById,
  validateChallenge,
  recordActivityProgress,
  mapChallengeToWorkoutConstraints
} from '../../services/campusChallengesService.ts';

export {
  CAMPUS_CHALLENGES_CATALOG,
  getChallengeById,
  validateChallenge,
  recordActivityProgress,
  mapChallengeToWorkoutConstraints
};

/**
 * Checks if a challenge target has been achieved.
 */
export function isChallengeComplete(currentValue: number, targetValue: number): boolean {
  return Math.max(0, currentValue) >= Math.max(1, targetValue);
}

/**
 * Calculates clamped integer completion percentage for a challenge.
 */
export function calculateChallengePercentage(currentValue: number, targetValue: number): number {
  const safeTarget = Math.max(1, targetValue);
  const safeCurrent = Math.max(0, currentValue);
  return Math.min(100, Math.round((safeCurrent / safeTarget) * 100));
}

/**
 * Pure function: initializes a new ChallengeProgress record for a user.
 */
export function initializeChallengeParticipation(
  challengeId: string,
  nowIso = new Date().toISOString()
): ChallengeProgress {
  return {
    challengeId,
    joinedAt: nowIso,
    currentValue: 0,
    completedDays: [],
    completedSessions: 0,
    processedActivityIds: [],
    completed: false
  };
}
