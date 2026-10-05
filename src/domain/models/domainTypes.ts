/**
 * FitMitra Platform-Neutral Domain Types
 * 
 * Free of DOM, Canvas, React, and Next.js dependencies.
 * Directly portable to Kotlin data classes for native Android.
 */

export type ExerciseKey = 'squats' | 'pushups' | 'jumpingJacks' | 'lunges' | 'plank';

export type FitnessGoal =
  | 'fat_loss'
  | 'strength'
  | 'cardio'
  | 'toning'
  | 'athletic'
  | 'wellness'
  | 'posture'
  | 'mobility';

export type MovementDirection =
  | 'decreasing_flexion' // High angle start -> low angle flexion depth -> high angle lockout (squats, pushups, lunges)
  | 'increasing_abduction' // Low angle start -> high angle abduction overhead -> low angle closed (jumping jacks)
  | 'isometric_hold'; // Continuous hold targeting straight collinear alignment (plank)

export type EquipmentType = 'none' | 'mat' | 'chair' | 'dumbbells' | 'bands';

export type SpaceRequirement = 'tiny' | 'small' | 'medium' | 'large';

export type NoiseRating = 'silent' | 'low' | 'moderate' | 'high';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type EnergyLevel = 'low' | 'moderate' | 'high';

export interface RepTransitionThresholds {
  upThreshold: number;
  downThreshold: number;
  repCooldownMs: number;
}

export interface FormAlignmentThresholds {
  maxDeviation?: number;
  minTorsoAngle?: number;
  earlyCueAngle?: number;
  minHorizontalSpan?: number;
  maxVerticalDelta?: number;
}

export interface ConfidenceThresholds {
  minJointConfidence: number;
  minVisibleJoints: number;
  minRepConfidence?: number;
  minFormGuardConfidence?: number;
  requiredJointChains?: number[][];
}

export interface DomainExerciseDefinition {
  id: ExerciseKey;
  name: string;
  shortName: string;
  targetMuscles: string;
  category: string;
  metricUnit: 'reps' | 'seconds';
  defaultTarget: number;
  calPerRep: number;
  isHoldExercise: boolean;
  instructions: string[];
  formChecklist: string[];
  direction: MovementDirection;
  repThresholds: RepTransitionThresholds;
  formThresholds?: FormAlignmentThresholds;
  confidenceThresholds?: ConfidenceThresholds;
  upThreshold: number;
  downThreshold: number;
}

export interface FormFault {
  joint: string;
  x: number;
  y: number;
  message: string;
}

export interface TelemetryResult {
  inFrame: boolean;
  angle: number;
  stage: 'up' | 'down';
  repCompleted: boolean;
  formFaults: FormFault[];
  isGoodForm: boolean;
  formCue: string | null;
}

export interface DailyCalorieRecord {
  day: string; // 'Mon', 'Tue', etc.
  date: string;
  caloriesBurned: number;
  caloriesGained: number;
  netBalance: number;
}

export interface MessMenuItem {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  icon: string;
}

export interface LoggedMeal {
  id: string;
  itemId: string;
  name: string;
  timestamp: string;
  calories: number;
  protein: number;
  icon: string;
}

export interface WorkoutSummary {
  exerciseKey: ExerciseKey;
  exerciseName: string;
  completedReps: number;
  targetReps: number;
  durationSeconds: number;
  caloriesBurned: number;
  averagePostureScore: number;
  isCompleted: boolean;
  xpEarned: number;
}

export interface StreakSummary {
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  isStreakActiveToday: boolean;
}

export interface ProgressSummary {
  weeklyWorkoutsCount: number;
  weeklyTotalMinutes: number;
  weeklyCaloriesBurned: number;
  weeklyCaloriesGained: number;
  currentStreakDays: number;
  xpTotal: number;
  currentLevel: number;
}
