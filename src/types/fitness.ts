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
