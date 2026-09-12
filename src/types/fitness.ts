export type ExerciseKey = 'squats' | 'pushups' | 'jumpingJacks' | 'lunges' | 'plank' | 'cervicalRetraction' | 'chestOpener';

export type FitnessGoal = 'posture' | 'strength' | 'mobility' | 'cardio';

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
  upThreshold: number;
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
