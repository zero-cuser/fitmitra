export type ExerciseKey = 'squats' | 'pushups' | 'lunges' | 'plank';

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
  email: string;
  goal: FitnessGoal;
  joinedDate: string;
  avatarColor: string;
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
