/**
 * FitMitra Platform-Neutral Pose Contracts & Feedback Events
 * 
 * Defines the normalized landmark and frame representations consumed by the domain,
 * alongside abstract domain feedback events emitted during workout tracking.
 */

import type { ExerciseKey, FormFault } from '../models/domainTypes.ts';

/**
 * Normalized 2D/3D skeletal landmark coordinate.
 * Coordinates are normalized in [0.0, 1.0].
 */
export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Time-stamped frame containing a full set of skeletal landmarks.
 */
export interface PoseFrame {
  landmarks: PoseLandmark[];
  timestampMs: number;
}

// ========================================================
// PLATFORM FEEDBACK EVENTS
// ========================================================

export type DomainEventType =
  | 'RepCompleted'
  | 'SetCompleted'
  | 'ExerciseStarted'
  | 'FormWarning'
  | 'WorkoutCompleted'
  | 'HoldProgress';

export interface RepCompletedEvent {
  type: 'RepCompleted';
  exerciseKey: ExerciseKey;
  repNumber: number;
  targetReps: number;
  timestamp: string; // ISO 8601 UTC
}

export interface SetCompletedEvent {
  type: 'SetCompleted';
  exerciseKey: ExerciseKey;
  totalReps: number;
  targetReps: number;
  durationSeconds: number;
  timestamp: string;
}

export interface ExerciseStartedEvent {
  type: 'ExerciseStarted';
  exerciseKey: ExerciseKey;
  targetReps: number;
  timestamp: string;
}

export interface FormWarningEvent {
  type: 'FormWarning';
  exerciseKey: ExerciseKey;
  message: string;
  faults: FormFault[];
  timestamp: string;
}

export interface HoldProgressEvent {
  type: 'HoldProgress';
  exerciseKey: ExerciseKey;
  secondsHeld: number;
  targetSeconds: number;
  timestamp: string;
}

export interface WorkoutCompletedEvent {
  type: 'WorkoutCompleted';
  exerciseKey: ExerciseKey;
  completedReps: number;
  targetReps: number;
  durationSeconds: number;
  caloriesBurned: number;
  xpEarned: number;
  timestamp: string;
}

export type DomainWorkoutEvent =
  | RepCompletedEvent
  | SetCompletedEvent
  | ExerciseStartedEvent
  | FormWarningEvent
  | HoldProgressEvent
  | WorkoutCompletedEvent;
