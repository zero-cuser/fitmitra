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
  | 'decreasing_flexion' // High angle start/lockout -> low angle flexion depth -> high angle lockout (squats, pushups, lunges)
  | 'increasing_abduction' // Low angle start/closed -> high angle overhead abduction -> low angle closed (jumping jacks)
  | 'isometric_hold'; // Continuous hold targeting straight collinear alignment (plank)

export type EquipmentType = 'none' | 'mat' | 'chair' | 'dumbbells' | 'bands';

export type SpaceRequirement = 'tiny' | 'small' | 'medium' | 'large';

export type NoiseRating = 'silent' | 'low' | 'moderate' | 'high';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type EnergyLevel = 'low' | 'moderate' | 'high';

export interface ExerciseConstraintMetadata {
  id: ExerciseKey;
  name: string;
  category: string;
  targetMuscles: string;
  equipment: EquipmentType[];
  optionalEquipment?: EquipmentType[];
  space: SpaceRequirement;
  noise: NoiseRating;
  difficulty: ExerciseDifficulty;
  primaryGoals: FitnessGoal[];
  secondaryGoals: FitnessGoal[];
  secondsPerSet: number;
  defaultSets: number;
  defaultReps: number;
  metricUnit: 'reps' | 'seconds';
}

export interface WorkoutConstraints {
  durationMinutes: number;
  space: SpaceRequirement;
  equipment: EquipmentType[];
  noiseTolerance: NoiseRating;
  goal: FitnessGoal;
  difficulty: ExerciseDifficulty;
  excludedExerciseIds?: ExerciseKey[];
  preferredExerciseIds?: ExerciseKey[];
  energyLevel?: EnergyLevel;
}

export interface RecommendedRoutineItem {
  exerciseKey: ExerciseKey;
  name: string;
  sets: number;
  repsOrSeconds: number;
  unit: 'reps' | 'seconds';
  estMinutes: number;
  reason: string;
}

export interface RelaxationOption {
  field: keyof WorkoutConstraints;
  label: string;
  suggestedValue: any;
}

export type RecommendationResult =
  | {
      success: true;
      title: string;
      totalDurationMinutes: number;
      space: SpaceRequirement;
      noise: NoiseRating;
      difficulty: ExerciseDifficulty;
      equipmentNeeded: EquipmentType[];
      items: RecommendedRoutineItem[];
      explanation: string[];
    }
  | {
      success: false;
      blockingConstraints: string[];
      relaxationOptions: RelaxationOption[];
    };

export interface RepTransitionThresholds {
  /** The angle to confirm start / return / lockout position */
  upThreshold: number;
  /** The angle to confirm depth / inflection / bottom position */
  downThreshold: number;
  /** Optional minimum hold time (ms) required at inflection */
  minHoldMs?: number;
  /** Cooldown time (ms) after rep completion to prevent bounce/jitter */
  repCooldownMs?: number;
}

export interface FormAlignmentThresholds {
  /** Target ideal angle for hold exercises (e.g., 180° for straight plank) */
  targetAngle?: number;
  /** Maximum allowable deviation in degrees (e.g., 15° for plank) */
  maxDeviation?: number;
  /** Warning threshold for torso angle (e.g., chest drop < 55° in squats) */
  minTorsoAngle?: number;
  /** Guidance knee flexion angle when descending (e.g., 135°) */
  earlyCueAngle?: number;
  /** Minimum horizontal coordinate span between joints for prone orientation */
  minHorizontalSpan?: number;
  /** Maximum vertical delta between shoulder and ankle for prone orientation */
  maxVerticalDelta?: number;
}

export interface ConfidenceThresholds {
  /** Minimum confidence score for a landmark to be considered in-frame */
  minJointConfidence: number;
  /** Minimum count of required visible landmarks for the exercise */
  minVisibleJoints: number;
  /** Minimum confidence required on active angle vertices to register rep transitions */
  minRepConfidence?: number;
  /** Minimum confidence required on secondary joints to evaluate and issue form faults */
  minFormGuardConfidence?: number;
  /** Explicit landmark indices for bilateral required kinematic joint chains */
  requiredJointChains?: number[][];
}

export interface ExerciseConfig {
  id: ExerciseKey;
  name: string;
  targetMuscles: string;
  category: string;
  shortName: string;
  metricUnit: 'reps' | 'seconds';
  defaultTarget: number;
  calPerRep: number;
  isHoldExercise: boolean;
  instructions: string[];
  formChecklist: string[];
  /** Direction of kinematic movement */
  direction: MovementDirection;
  /** Structured rep transition thresholds */
  repThresholds: RepTransitionThresholds;
  /** Alignment and posture thresholds */
  formThresholds?: FormAlignmentThresholds;
  /** Camera and joint confidence thresholds */
  confidenceThresholds?: ConfidenceThresholds;
  /** Top-level up threshold (matches repThresholds.upThreshold for compatibility) */
  upThreshold: number;
  /** Top-level down threshold (matches repThresholds.downThreshold for compatibility) */
  downThreshold: number;
}

export const LANDMARK_INDEX = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
} as const;

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
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

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  hostelWing?: string;
  goal: FitnessGoal;
  goals?: FitnessGoal[];
  joinedDate: string;
  avatarColor: string;
  // Calorie & Body Metrics
  age?: number;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very_active';
  calculatedBmr?: number;
  targetDailyCalories?: number;
  targetWaterMl?: number;
}

export interface FriendTodayStats {
  repsCompleted: number;
  caloriesBurned: number;
  caloriesGained: number;
  postureScore: number;
  streakDays: number;
  favoriteExercise: string;
}

export interface Friend {
  id: string;
  name: string;
  username: string;
  hostelWing?: string;
  avatarColor: string;
  statusText: string;
  isOnline: boolean;
  todayStats: FriendTodayStats;
  cheerCount: number;
}

export interface DailyCalorieRecord {
  day: string; // 'Mon', 'Tue', etc.
  date: string;
  caloriesBurned: number;
  caloriesGained: number;
  netBalance: number; // gained - burned
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

export type FoodMenuItem = MessMenuItem;

export interface LoggedMeal {
  id: string;
  itemId: string;
  name: string;
  timestamp: string;
  calories: number;
  protein: number;
  icon: string;
}

export interface WorkoutState {
  selectedExercise: ExerciseKey;
  sessionReps: number;
  targetReps: number;
  currentStage: 'up' | 'down';
  liveAngle: number;
  streakDays: number;
  xp: number;
  level: number;
  soundEnabled: boolean;
  voiceCoachEnabled: boolean;
}

// ========================================================
// EXAM MODE / STUDY BREAK TYPES
// ========================================================

export type ExamModeType = 'reset' | 'break' | 'recharge';

export type ExamActivityCategory = 'eye_break' | 'stretch' | 'movement' | 'breathing';

export interface ExamActivityItem {
  id: string;
  name: string;
  category: ExamActivityCategory;
  durationSeconds: number;
  description: string;
  cues: string[];
  exerciseKey?: ExerciseKey; // Set when camera pose tracking is applicable
  isCameraEligible: boolean;
}

export interface ExamSessionConfig {
  mode: ExamModeType;
  title: string;
  totalDurationSeconds: number;
  activities: ExamActivityItem[];
  constraintsUsed: WorkoutConstraints;
}

export interface ExamSessionRecord {
  id: string;
  mode: ExamModeType;
  title: string;
  completedAt: string;
  durationMinutes: number;
  durationSeconds: number;
  activitiesCompleted: number;
  totalActivities: number;
  completedFully: boolean;
}


