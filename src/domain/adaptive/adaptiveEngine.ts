/**
 * FitMitra Platform-Neutral Adaptive Hostel Workout Engine
 * 
 * Re-exports the deterministic constraint satisfaction recommendation solver
 * under the clean domain namespace.
 */

export { generateWorkout } from '../../services/workoutRecommendationEngine.ts';
export type {
  WorkoutConstraints,
  RecommendationResult,
  RecommendedRoutineItem,
  RelaxationOption
} from '../../types/fitness.ts';
