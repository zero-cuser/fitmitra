import type {
  EquipmentType,
  ExerciseConstraintMetadata,
  ExerciseDifficulty,
  ExerciseKey,
  FitnessGoal,
  NoiseRating,
  RecommendationResult,
  RecommendedRoutineItem,
  RelaxationOption,
  SpaceRequirement,
  WorkoutConstraints
} from '../types/fitness.ts';
import { EXERCISE_CONSTRAINTS } from '../data/exercises.ts';

const SPACE_HIERARCHY: Record<SpaceRequirement, number> = {
  tiny: 1,
  small: 2,
  medium: 3,
  large: 4
};

const NOISE_HIERARCHY: Record<NoiseRating, number> = {
  silent: 1,
  low: 2,
  moderate: 3,
  high: 4
};

const DIFFICULTY_HIERARCHY: Record<ExerciseDifficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
};

interface ScoredExercise {
  metadata: ExerciseConstraintMetadata;
  score: number;
  goalMatch: 'primary' | 'secondary' | 'none';
}

/**
 * Pure, deterministic recommendation engine for FitMitra.
 * Generates an explainable workout routine matching exact user constraints.
 */
export function generateWorkout(
  constraints: WorkoutConstraints,
  catalog: Record<ExerciseKey, ExerciseConstraintMetadata> = EXERCISE_CONSTRAINTS
): RecommendationResult {
  const exercises = Object.values(catalog);

  // -------------------------------------------------------------
  // 1. HARD CONSTRAINT FILTERING
  // -------------------------------------------------------------
  const userSpaceRank = SPACE_HIERARCHY[constraints.space];
  const userNoiseRank = NOISE_HIERARCHY[constraints.noiseTolerance];
  const userDifficultyRank = DIFFICULTY_HIERARCHY[constraints.difficulty];

  const candidateExercises: ExerciseConstraintMetadata[] = [];
  const rejectedReasons: { id: ExerciseKey; reason: string }[] = [];

  for (const ex of exercises) {
    // Exclusion check
    if (constraints.excludedExerciseIds?.includes(ex.id)) {
      rejectedReasons.push({ id: ex.id, reason: 'Manually excluded by user preference' });
      continue;
    }

    // Space check (exercise required space cannot exceed user space)
    if (SPACE_HIERARCHY[ex.space] > userSpaceRank) {
      rejectedReasons.push({
        id: ex.id,
        reason: `Requires '${ex.space}' space, but available space is '${constraints.space}'`
      });
      continue;
    }

    // Noise check (exercise noise cannot exceed user tolerance)
    if (NOISE_HIERARCHY[ex.noise] > userNoiseRank) {
      rejectedReasons.push({
        id: ex.id,
        reason: `Generates '${ex.noise}' noise, exceeding tolerance '${constraints.noiseTolerance}'`
      });
      continue;
    }

    // Equipment check (user must have all required equipment)
    const hasRequiredEquipment = ex.equipment.every(
      (eq) => eq === 'none' || constraints.equipment.includes(eq)
    );
    if (!hasRequiredEquipment) {
      rejectedReasons.push({
        id: ex.id,
        reason: `Requires equipment [${ex.equipment.join(', ')}], which is unavailable`
      });
      continue;
    }

    // Difficulty cap check (beginners are protected from advanced movements)
    if (userDifficultyRank === 1 && DIFFICULTY_HIERARCHY[ex.difficulty] > 2) {
      rejectedReasons.push({
        id: ex.id,
        reason: `Difficulty '${ex.difficulty}' exceeds beginner capacity`
      });
      continue;
    }

    candidateExercises.push(ex);
  }

  // -------------------------------------------------------------
  // 2. NO-SOLUTION DIAGNOSIS
  // -------------------------------------------------------------
  if (candidateExercises.length === 0) {
    const blockingConstraints: string[] = [];
    const relaxationOptions: RelaxationOption[] = [];

    // Analyze why candidates were emptied
    const noiseViolations = rejectedReasons.filter((r) => r.reason.includes('noise'));
    const spaceViolations = rejectedReasons.filter((r) => r.reason.includes('space'));
    const exclusionViolations = rejectedReasons.filter((r) => r.reason.includes('excluded'));

    if (noiseViolations.length > 0 && constraints.noiseTolerance === 'silent') {
      blockingConstraints.push('Strict silent noise tolerance eliminates high-energy cardio exercises.');
      relaxationOptions.push({
        field: 'noiseTolerance',
        label: 'Allow Low Noise (Controlled Floor Steps)',
        suggestedValue: 'low'
      });
    }

    if (spaceViolations.length > 0 && constraints.space === 'tiny') {
      blockingConstraints.push('Compact bedside space (~2×2 ft) excludes prone floor movements.');
      relaxationOptions.push({
        field: 'space',
        label: 'Expand Space to Hostel Room Floor',
        suggestedValue: 'small'
      });
    }

    if (exclusionViolations.length === exercises.length) {
      blockingConstraints.push('All catalog exercises have been excluded.');
      relaxationOptions.push({
        field: 'excludedExerciseIds',
        label: 'Clear Exercise Exclusions',
        suggestedValue: []
      });
    }

    if (constraints.durationMinutes < 2) {
      blockingConstraints.push('Requested duration is under the 2-minute minimum workout threshold.');
      relaxationOptions.push({
        field: 'durationMinutes',
        label: 'Increase Duration to 5 Minutes',
        suggestedValue: 5
      });
    }

    if (blockingConstraints.length === 0) {
      blockingConstraints.push('No exercises in the catalog satisfy all selected constraints simultaneously.');
      relaxationOptions.push({
        field: 'noiseTolerance',
        label: 'Relax Noise Restrictions',
        suggestedValue: 'moderate'
      });
      relaxationOptions.push({
        field: 'space',
        label: 'Select Larger Space',
        suggestedValue: 'medium'
      });
    }

    return {
      success: false,
      blockingConstraints,
      relaxationOptions
    };
  }

  // -------------------------------------------------------------
  // 3. DETERMINISTIC SCORING & RANKING
  // -------------------------------------------------------------
  const scoredCandidates: ScoredExercise[] = candidateExercises.map((ex) => {
    let score = 0;
    let goalMatch: 'primary' | 'secondary' | 'none' = 'none';

    // Goal alignment
    if (ex.primaryGoals.includes(constraints.goal)) {
      score += 30;
      goalMatch = 'primary';
    } else if (ex.secondaryGoals.includes(constraints.goal)) {
      score += 15;
      goalMatch = 'secondary';
    } else {
      score += 5;
    }

    // Difficulty alignment
    if (ex.difficulty === constraints.difficulty) {
      score += 10;
    } else {
      score += 5;
    }

    // Preferred exercises boost
    if (constraints.preferredExerciseIds?.includes(ex.id)) {
      score += 25;
    }

    // Energy level tuning
    if (constraints.energyLevel === 'low') {
      // Favor static holds or moderate movements
      if (ex.id === 'plank' || ex.id === 'squats') score += 10;
      if (ex.noise === 'high') score -= 15;
    } else if (constraints.energyLevel === 'high') {
      // Favor cardio & explosive compound
      if (ex.id === 'jumpingJacks' || ex.id === 'lunges') score += 10;
    }

    return { metadata: ex, score, goalMatch };
  });

  // Sort deterministically: highest score first; tiebreak alphabetically by ID
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.metadata.id.localeCompare(b.metadata.id);
  });

  // -------------------------------------------------------------
  // 4. DURATION & SET FITTING
  // -------------------------------------------------------------
  const duration = Math.max(2, Math.min(45, Math.round(constraints.durationMinutes)));
  
  // Decide exercise count based on requested duration
  let targetExerciseCount: number;
  let setsPerExercise: number;

  if (duration <= 3) {
    targetExerciseCount = 1;
    setsPerExercise = 2;
  } else if (duration <= 7) {
    targetExerciseCount = Math.min(2, scoredCandidates.length);
    setsPerExercise = duration <= 5 ? 2 : 3;
  } else if (duration <= 12) {
    targetExerciseCount = Math.min(3, scoredCandidates.length);
    setsPerExercise = 3;
  } else {
    targetExerciseCount = Math.min(4, scoredCandidates.length);
    setsPerExercise = 3;
  }

  // Pick top N distinct exercises
  const selectedScored = scoredCandidates.slice(0, targetExerciseCount);

  // Build routine items
  const items: RecommendedRoutineItem[] = selectedScored.map(({ metadata, goalMatch }) => {
    // Scale reps slightly by difficulty
    let reps = metadata.defaultReps;
    if (constraints.difficulty === 'beginner' && metadata.metricUnit === 'reps') {
      reps = Math.max(8, Math.round(metadata.defaultReps * 0.8));
    } else if (constraints.difficulty === 'advanced' && metadata.metricUnit === 'reps') {
      reps = Math.round(metadata.defaultReps * 1.3);
    }

    const estMinutes = Math.max(1, Math.round((metadata.secondsPerSet * setsPerExercise) / 60));

    let reason: string;
    if (goalMatch === 'primary') {
      reason = `Primary focus for ${constraints.goal.replace('_', ' ')}`;
    } else if (goalMatch === 'secondary') {
      reason = `Synergistic support for ${constraints.goal.replace('_', ' ')}`;
    } else {
      reason = `Balanced conditioning in ${constraints.space} space`;
    }

    return {
      exerciseKey: metadata.id,
      name: metadata.name,
      sets: setsPerExercise,
      repsOrSeconds: reps,
      unit: metadata.metricUnit,
      estMinutes,
      reason
    };
  });

  // Compute total duration
  const totalDurationMinutes = items.reduce((acc, it) => acc + it.estMinutes, 0);

  // -------------------------------------------------------------
  // 5. STRUCTURED EXPLANATION GENERATION
  // -------------------------------------------------------------
  const explanation: string[] = [
    `Fits your ${duration}-minute target (~${totalDurationMinutes} min active routine)`,
    constraints.equipment.length === 1 && constraints.equipment[0] === 'none'
      ? 'Requires zero equipment (100% bodyweight)'
      : `Compatible with your available gear: ${constraints.equipment.join(', ')}`,
    constraints.noiseTolerance === 'silent'
      ? '100% silent movements with zero floor impact (roommate-friendly)'
      : constraints.noiseTolerance === 'low'
      ? 'Low-noise controlled movements safe for dorm hours'
      : 'Unrestricted movement intensity for maximum burn',
    constraints.space === 'tiny'
      ? 'Stationary footprint fitting beside your dorm bed (~2×2 ft)'
      : constraints.space === 'small'
      ? 'Requires only a standard dorm room floor or yoga mat length'
      : 'Spacious movement pattern utilizing open room floor',
    `Calibrated for ${constraints.difficulty} level targeting ${constraints.goal.replace('_', ' ')}`
  ];

  // Title formatting
  const noiseTag = constraints.noiseTolerance === 'silent' ? 'SILENT ' : '';
  const goalTag = constraints.goal.toUpperCase().replace('_', ' ');
  const title = `HOSTEL ${noiseTag}${goalTag} — ${totalDurationMinutes} MIN`;

  // Aggregate minimum equipment needed
  const equipmentNeeded: EquipmentType[] = Array.from(
    new Set(selectedScored.flatMap((s) => s.metadata.equipment))
  );

  return {
    success: true,
    title,
    totalDurationMinutes,
    space: constraints.space,
    noise: constraints.noiseTolerance,
    difficulty: constraints.difficulty,
    equipmentNeeded,
    items,
    explanation
  };
}
