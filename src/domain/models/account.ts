/**
 * FitMitra Domain Models
 * 
 * Platform-neutral, serializable domain contracts.
 * Free of DOM, browser, React, and Next.js dependencies for seamless Android interop.
 */

import type { ExerciseKey, FitnessGoal, NoiseRating, SpaceRequirement } from '../../types/fitness.ts';

export type AuthType = 'anonymous' | 'authenticated';

/**
 * Core cryptographic identity entity.
 * Completely decoupled from user application profile.
 */
export interface Account {
  id: string; // Stable ID: acc_<timestamp>_<hex>
  authType: AuthType;
  provider?: 'email' | 'google' | 'passkey';
  email?: string;
  emailVerified: boolean;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  lastSeenAt: string; // ISO 8601 UTC
}

/**
 * User-configurable physical and environment preferences.
 */
export interface UserPreferences {
  noiseTolerance: NoiseRating;
  space: SpaceRequirement;
  soundMuted: boolean;
  voiceCoachEnabled: boolean;
  preferredWorkoutMinutes?: number;
}

/**
 * User physical metrics (optional, sensitive biometrics).
 */
export interface UserBiometrics {
  age?: number;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very_active';
  calculatedBmr?: number;
  targetDailyCalories?: number;
  targetWaterMl?: number;
}

/**
 * Application profile entity, owned by an Account.
 */
export interface DomainUserProfile {
  accountId: string; // References Account.id
  displayName: string;
  username: string;
  avatarColor: string;
  hostelWing?: string;
  fitnessGoal: FitnessGoal;
  goals: FitnessGoal[];
  biometrics?: UserBiometrics;
  preferences: UserPreferences;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

/**
 * Append-only immutable workout session summary record.
 * Raw video frames and skeletal coordinates are strictly excluded.
 */
export interface WorkoutSessionRecord {
  id: string; // Stable ID: work_<timestamp>_<hex>
  accountId: string; // References Account.id
  exerciseKey: ExerciseKey;
  exerciseName: string;
  reps: number;
  durationSeconds: number;
  postureScore?: number;
  timestamp: string; // ISO 8601 UTC
  isHostelFriendly: boolean;
  completedFully: boolean;
  source: 'pose_coach' | 'manual' | 'adaptive_routine';
}

/**
 * Curated, read-only static challenge definition.
 */
export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  category: 'strength' | 'consistency' | 'wellness' | 'exam' | 'hostel';
  type: 'rep_target' | 'duration_target' | 'streak' | 'session_count';
  targetValue: number;
  unit: string;
  durationDays: number;
  rules: string[];
  exerciseKeys?: ExerciseKey[];
  tagline?: string;
}

/**
 * Mutable user participation in a campus challenge.
 */
export interface ChallengeParticipation {
  id: string; // Stable ID: part_<accountId>_<challengeId>
  accountId: string;
  challengeId: string;
  joinedAt: string; // ISO 8601 UTC
  currentValue: number;
  targetValue: number;
  completedDays: string[]; // YYYY-MM-DD
  completedSessions: number;
  processedActivityIds: string[]; // Deduplication registry
  completed: boolean;
  completedAt?: string; // ISO 8601 UTC
}

// ========================================================
// STABLE ID & TIMESTAMP UTILITIES
// ========================================================

/**
 * Converts a Date object or current epoch into strict ISO 8601 UTC string.
 */
export function toIsoUtcString(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Validates whether a given string is a valid ISO 8601 UTC format.
 */
export function isValidIsoUtc(str: string): boolean {
  if (typeof str !== 'string') return false;
  // Regex for ISO 8601 UTC with optional fractional seconds: YYYY-MM-DDTHH:mm:ss(.sss)?Z
  const isoUtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;
  if (!isoUtcRegex.test(str)) return false;
  const parsed = new Date(str);
  return !isNaN(parsed.getTime());
}

/**
 * Generates an immutable, collision-resistant stable identifier with a domain prefix.
 * e.g. "work_1727371200000_a3f91b"
 */
export function generateStableId(prefix: string): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${randomPart}`;
}
