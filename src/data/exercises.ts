import type { ExerciseConfig, ExerciseKey } from '../types/fitness';

/**
 * EXERCISE_CATALOG is the single source of truth for all exercises in FitMitra.
 * All thresholds, instructions, movement directions, and confidence gates are defined here.
 */
export const EXERCISE_CATALOG: Record<ExerciseKey, ExerciseConfig> = {
  squats: {
    id: 'squats',
    name: 'Bodyweight Squats',
    shortName: 'Squats',
    targetMuscles: 'Quads, Glutes & Core',
    category: 'Lower Body',
    metricUnit: 'reps',
    defaultTarget: 15,
    calPerRep: 0.32,
    isHoldExercise: false,
    direction: 'decreasing_flexion',
    upThreshold: 145,
    downThreshold: 125,
    repThresholds: {
      upThreshold: 145,
      downThreshold: 125,
      repCooldownMs: 600
    },
    formThresholds: {
      minTorsoAngle: 55,
      earlyCueAngle: 135
    },
    confidenceThresholds: {
      minJointConfidence: 0.20,
      minVisibleJoints: 2
    },
    instructions: [
      'Stand with feet shoulder-width apart, toes pointed slightly outward.',
      'Hinge hips back and bend knees until descending past depth threshold (< 125°).',
      'Keep your chest high and spine neutral throughout the movement.',
      'Push through your heels to return to full upright lockout (> 145°).'
    ],
    formChecklist: [
      'Hip-Knee-Ankle flexion below depth threshold',
      'Torso upright, avoid forward chest drop',
      'Knees track over toes, no inward knee valgus',
      'Full lockout at top'
    ]
  },
  pushups: {
    id: 'pushups',
    name: 'Floor / Desk Push-ups',
    shortName: 'Push-ups',
    targetMuscles: 'Chest, Triceps & Anterior Deltoids',
    category: 'Upper Body',
    metricUnit: 'reps',
    defaultTarget: 12,
    calPerRep: 0.45,
    isHoldExercise: false,
    direction: 'decreasing_flexion',
    upThreshold: 145,
    downThreshold: 125,
    repThresholds: {
      upThreshold: 145,
      downThreshold: 125,
      repCooldownMs: 600
    },
    formThresholds: {
      maxDeviation: 18
    },
    confidenceThresholds: {
      minJointConfidence: 0.20,
      minVisibleJoints: 2
    },
    instructions: [
      'Place hands slightly wider than shoulder-width apart.',
      'Maintain a rigid straight line from shoulders through hips to ankles.',
      'Lower chest until elbows bend below press threshold (< 125°).',
      'Press firmly through palms to full elbow extension (> 145°).'
    ],
    formChecklist: [
      'Elbow flexion past depth threshold at bottom',
      'Spine line deviation < 18° (no hip sag)',
      'Glutes and core engaged throughout',
      'Full lockout at top'
    ]
  },
  jumpingJacks: {
    id: 'jumpingJacks',
    name: 'Cardio Jumping Jacks',
    shortName: 'Jacks',
    targetMuscles: 'Cardiovascular, Calves & Shoulders',
    category: 'Cardio Burn',
    metricUnit: 'reps',
    defaultTarget: 25,
    calPerRep: 0.22,
    isHoldExercise: false,
    direction: 'increasing_abduction',
    upThreshold: 95,
    downThreshold: 70,
    repThresholds: {
      upThreshold: 95,
      downThreshold: 70,
      repCooldownMs: 500
    },
    confidenceThresholds: {
      minJointConfidence: 0.20,
      minVisibleJoints: 2
    },
    instructions: [
      'Start standing upright with feet together and hands at sides (< 70°).',
      'Jump feet outward while raising arms overhead into a wide V (> 95°).',
      'Land softly on balls of feet and return to starting position (< 70°).',
      'Maintain a steady, rhythmic cardiovascular cadence.'
    ],
    formChecklist: [
      'Arms abduct overhead past wide V threshold',
      'Feet land shoulder-width or wider',
      'Soft knee landings to protect joints',
      'Full cycle return to starting stance'
    ]
  },
  lunges: {
    id: 'lunges',
    name: 'Alternating Bodyweight Lunges',
    shortName: 'Lunges',
    targetMuscles: 'Quads, Hamstrings & Calves',
    category: 'Lower Body',
    metricUnit: 'reps',
    defaultTarget: 16,
    calPerRep: 0.35,
    isHoldExercise: false,
    direction: 'decreasing_flexion',
    upThreshold: 145,
    downThreshold: 125,
    repThresholds: {
      upThreshold: 145,
      downThreshold: 125,
      repCooldownMs: 600
    },
    confidenceThresholds: {
      minJointConfidence: 0.20,
      minVisibleJoints: 2
    },
    instructions: [
      'Step forward smoothly with one leg.',
      'Lower your hips until knees bend past lunge depth (< 125°).',
      'Keep front knee directly above front ankle, not past your toes.',
      'Drive off front heel to return upright to standing position (> 145°).'
    ],
    formChecklist: [
      'Front knee flexion past depth threshold',
      'Torso perpendicular to the floor',
      'Back knee hovering above floor',
      'Balanced foot strike'
    ]
  },
  plank: {
    id: 'plank',
    name: 'Isometric Forearm Plank',
    shortName: 'Plank',
    targetMuscles: 'Core, Transverse Abdominis & Glutes',
    category: 'Core Stability',
    metricUnit: 'seconds',
    defaultTarget: 30,
    calPerRep: 0.15,
    isHoldExercise: true,
    direction: 'isometric_hold',
    upThreshold: 180,
    downThreshold: 165,
    repThresholds: {
      upThreshold: 180,
      downThreshold: 165
    },
    formThresholds: {
      targetAngle: 180,
      maxDeviation: 15,
      minHorizontalSpan: 0.18,
      maxVerticalDelta: 0.40
    },
    confidenceThresholds: {
      minJointConfidence: 0.20,
      minVisibleJoints: 2
    },
    instructions: [
      'Rest on forearms with elbows aligned directly under shoulders.',
      'Extend legs back with toes on floor, feet hip-width apart.',
      'Maintain a continuous straight line from crown of head to heels (180° ± 15°).',
      'Breathe steadily into the diaphragm without letting lower back arch.'
    ],
    formChecklist: [
      'Shoulder-Hip-Ankle deviation < 15°',
      'No hip pike (butt in air)',
      'No lumbar hyper-extension (swayback)',
      'Forearms parallel, neck neutral'
    ]
  }
};

/**
 * Validates an exercise configuration against impossible, contradictory, or out-of-bounds parameters.
 */
export const validateExerciseConfig = (
  config: ExerciseConfig
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config) {
    return { isValid: false, errors: ['Exercise configuration is null or undefined'] };
  }

  const { id, direction, repThresholds, formThresholds, confidenceThresholds } = config;

  if (!id) {
    errors.push('Exercise config is missing required id');
  }

  // Validate rep thresholds
  if (!repThresholds || typeof repThresholds.upThreshold !== 'number' || typeof repThresholds.downThreshold !== 'number') {
    errors.push('repThresholds must provide numeric upThreshold and downThreshold');
  } else {
    const { upThreshold, downThreshold } = repThresholds;

    if (isNaN(upThreshold) || isNaN(downThreshold)) {
      errors.push('Threshold angles must be valid numbers');
    }
    if (upThreshold < 0 || upThreshold > 360 || downThreshold < 0 || downThreshold > 360) {
      errors.push(`Thresholds out of geometric bounds: up=${upThreshold}, down=${downThreshold} (must be in [0, 360])`);
    }

    if (direction === 'decreasing_flexion') {
      // In decreasing flexion (squats, pushups, lunges): lockout is high angle, depth is low angle.
      if (upThreshold <= downThreshold) {
        errors.push(
          `Impossible decreasing_flexion configuration: upThreshold (${upThreshold}°) must be strictly greater than downThreshold (${downThreshold}°)`
        );
      } else if (upThreshold - downThreshold < 10) {
        errors.push(
          `Insufficient hysteresis in decreasing_flexion: upThreshold (${upThreshold}°) and downThreshold (${downThreshold}°) must differ by at least 10°`
        );
      }
    } else if (direction === 'increasing_abduction') {
      // In increasing abduction (jumping jacks): peak open is high angle, resting closed is low angle.
      if (upThreshold <= downThreshold) {
        errors.push(
          `Impossible increasing_abduction configuration: upThreshold (${upThreshold}°) must be strictly greater than downThreshold (${downThreshold}°)`
        );
      } else if (upThreshold - downThreshold < 15) {
        errors.push(
          `Insufficient hysteresis in increasing_abduction: upThreshold (${upThreshold}°) and downThreshold (${downThreshold}°) must differ by at least 15°`
        );
      }
    } else if (direction === 'isometric_hold') {
      // For holds: upThreshold represents ideal collinear angle (180°), downThreshold represents min acceptable angle.
      if (upThreshold < downThreshold) {
        errors.push(
          `Impossible isometric_hold configuration: upThreshold (${upThreshold}°) cannot be lower than downThreshold (${downThreshold}°)`
        );
      }
    }
  }

  // Validate form thresholds if present
  if (formThresholds) {
    if (formThresholds.maxDeviation !== undefined) {
      if (formThresholds.maxDeviation <= 0 || formThresholds.maxDeviation > 45) {
        errors.push(`maxDeviation must be between 1° and 45°, got ${formThresholds.maxDeviation}°`);
      }
    }
    if (formThresholds.targetAngle !== undefined) {
      if (formThresholds.targetAngle < 90 || formThresholds.targetAngle > 180) {
        errors.push(`targetAngle must be between 90° and 180°, got ${formThresholds.targetAngle}°`);
      }
    }
  }

  // Validate confidence thresholds if present
  if (confidenceThresholds) {
    if (confidenceThresholds.minJointConfidence <= 0 || confidenceThresholds.minJointConfidence > 1.0) {
      errors.push(`minJointConfidence must be in (0, 1.0], got ${confidenceThresholds.minJointConfidence}`);
    }
    if (confidenceThresholds.minVisibleJoints < 1) {
      errors.push(`minVisibleJoints must be >= 1, got ${confidenceThresholds.minVisibleJoints}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Compatibility Adapter:
 * Normalizes partial, legacy, or flat exercise configurations into fully-structured
 * ExerciseConfig objects while guaranteeing top-level and nested thresholds stay in sync.
 *
 * Why needed:
 * Allows older components or test harnesses specifying only `{ upThreshold: 160, downThreshold: 90 }`
 * to seamlessly interact with the modern structured state machine without code breakages.
 */
export const resolveExerciseConfig = (
  raw: Partial<ExerciseConfig> & { id: ExerciseKey }
): ExerciseConfig => {
  const base = EXERCISE_CATALOG[raw.id] || EXERCISE_CATALOG.squats;
  const upThreshold = raw.repThresholds?.upThreshold ?? raw.upThreshold ?? base.upThreshold;
  const downThreshold = raw.repThresholds?.downThreshold ?? raw.downThreshold ?? base.downThreshold;

  const resolved: ExerciseConfig = {
    ...base,
    ...raw,
    upThreshold,
    downThreshold,
    direction: raw.direction ?? base.direction,
    repThresholds: {
      ...base.repThresholds,
      ...raw.repThresholds,
      upThreshold,
      downThreshold
    },
    formThresholds: {
      ...base.formThresholds,
      ...raw.formThresholds
    },
    confidenceThresholds: {
      ...base.confidenceThresholds,
      ...raw.confidenceThresholds
    }
  };

  const validation = validateExerciseConfig(resolved);
  if (!validation.isValid) {
    throw new Error(`Invalid exercise configuration for '${raw.id}': ${validation.errors.join('; ')}`);
  }

  return resolved;
};
