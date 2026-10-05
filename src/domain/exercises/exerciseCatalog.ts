/**
 * FitMitra Platform-Neutral Exercise Catalog
 * 
 * Single source of truth for all exercise kinematic configurations, thresholds, and biomechanical definitions.
 * Free of DOM, Canvas, React, or Web-specific APIs.
 */

import type { DomainExerciseDefinition, ExerciseKey } from '../models/domainTypes.ts';

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

export const DOMAIN_EXERCISE_CATALOG: Record<ExerciseKey, DomainExerciseDefinition> = {
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
      minJointConfidence: 0.25,
      minVisibleJoints: 2,
      minRepConfidence: 0.30,
      minFormGuardConfidence: 0.35,
      requiredJointChains: [
        [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE],
        [LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_KNEE]
      ]
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
      minJointConfidence: 0.25,
      minVisibleJoints: 2,
      minRepConfidence: 0.30,
      minFormGuardConfidence: 0.35,
      requiredJointChains: [
        [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST],
        [LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_ELBOW, LANDMARK_INDEX.RIGHT_WRIST]
      ]
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
    targetMuscles: 'Cardio, Calves & Shoulder Deltoids',
    category: 'Cardio',
    metricUnit: 'reps',
    defaultTarget: 20,
    calPerRep: 0.28,
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
      minJointConfidence: 0.25,
      minVisibleJoints: 2,
      minRepConfidence: 0.30,
      requiredJointChains: [
        [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST],
        [LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_WRIST]
      ]
    },
    instructions: [
      'Start standing upright with feet together and arms at your sides.',
      'Jump feet outward while sweeping arms overhead past threshold (> 95°).',
      'Return smoothly to the starting stance with arms close to your hips (< 70°).'
    ],
    formChecklist: [
      'Arms fully reach overhead above shoulders at apex',
      'Controlled landing on balls of feet',
      'Arms return fully to torso on recovery'
    ]
  },
  lunges: {
    id: 'lunges',
    name: 'Walking / Static Lunges',
    shortName: 'Lunges',
    targetMuscles: 'Quads, Hamstrings & Glutes',
    category: 'Lower Body',
    metricUnit: 'reps',
    defaultTarget: 10,
    calPerRep: 0.35,
    isHoldExercise: false,
    direction: 'decreasing_flexion',
    upThreshold: 145,
    downThreshold: 125,
    repThresholds: {
      upThreshold: 145,
      downThreshold: 125,
      repCooldownMs: 700
    },
    confidenceThresholds: {
      minJointConfidence: 0.25,
      minVisibleJoints: 2,
      minRepConfidence: 0.30,
      requiredJointChains: [
        [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE],
        [LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_KNEE, LANDMARK_INDEX.RIGHT_ANKLE]
      ]
    },
    instructions: [
      'Take a controlled step forward, keeping your torso tall and upright.',
      'Descend until the lead knee flexes past depth threshold (< 125°).',
      'Drive upward through your front heel to return to standing lockout (> 145°).'
    ],
    formChecklist: [
      'Front knee flexion below 125° at deepest point',
      'Torso remains upright, spine neutral',
      'Smooth drive back to standing position'
    ]
  },
  plank: {
    id: 'plank',
    name: 'Core Stability Plank',
    shortName: 'Plank',
    targetMuscles: 'Rectus Abdominis & Transverse Core',
    category: 'Core',
    metricUnit: 'seconds',
    defaultTarget: 30,
    calPerRep: 0.15,
    isHoldExercise: true,
    direction: 'isometric_hold',
    upThreshold: 180,
    downThreshold: 165,
    repThresholds: {
      upThreshold: 180,
      downThreshold: 165,
      repCooldownMs: 1000
    },
    formThresholds: {
      maxDeviation: 15,
      minHorizontalSpan: 0.20,
      maxVerticalDelta: 0.35
    },
    confidenceThresholds: {
      minJointConfidence: 0.25,
      minVisibleJoints: 3,
      minRepConfidence: 0.30,
      minFormGuardConfidence: 0.35,
      requiredJointChains: [
        [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_ANKLE],
        [LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_ANKLE]
      ]
    },
    instructions: [
      'Position yourself prone on elbows and toes, body parallel to floor.',
      'Maintain collinear alignment across shoulder, hip, and ankle lines.',
      'Hold position continuously while maintaining steady abdominal breathing.'
    ],
    formChecklist: [
      'Collinear body alignment (hip deviation < 15°)',
      'Horizontal prone body orientation in camera view',
      'Continuous engaged isometric hold'
    ]
  }
};

/**
 * Validates the kinematic integrity and sanity of an exercise configuration.
 * Prevents impossible biomechanical states (e.g. upThreshold <= downThreshold).
 */
export function validateExerciseConfig(config: DomainExerciseDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.id || !config.name) {
    errors.push('Exercise must have a valid id and name.');
  }

  const { upThreshold, downThreshold, repCooldownMs } = config.repThresholds;

  if (config.direction === 'decreasing_flexion') {
    if (upThreshold <= downThreshold) {
      errors.push(
        `Decreasing flexion exercise "${config.id}" has impossible thresholds: upThreshold (${upThreshold}) must be strictly greater than downThreshold (${downThreshold}).`
      );
    }
  } else if (config.direction === 'increasing_abduction') {
    if (upThreshold <= downThreshold) {
      errors.push(
        `Increasing abduction exercise "${config.id}" has impossible thresholds: upThreshold (${upThreshold}) must be strictly greater than downThreshold (${downThreshold}).`
      );
    }
  }

  // Minimum hysteresis band to prevent rapid boundary fluttering
  const hysteresis = Math.abs(upThreshold - downThreshold);
  if (hysteresis < 10) {
    errors.push(
      `Exercise "${config.id}" has insufficient hysteresis band (${hysteresis}°). Minimum difference is 10° to prevent rep bouncing.`
    );
  }

  if (repCooldownMs < 100) {
    errors.push(`Exercise "${config.id}" repCooldownMs (${repCooldownMs}ms) is dangerously low. Minimum is 100ms.`);
  }

  if (config.formThresholds?.maxDeviation !== undefined && config.formThresholds.maxDeviation <= 0) {
    errors.push(`Exercise "${config.id}" maxDeviation must be positive.`);
  }

  if (config.confidenceThresholds) {
    const { minJointConfidence, minVisibleJoints, minRepConfidence } = config.confidenceThresholds;
    if (minJointConfidence <= 0 || minJointConfidence > 1.0) {
      errors.push(`Exercise "${config.id}" minJointConfidence (${minJointConfidence}) must be in (0, 1].`);
    }
    if (minVisibleJoints < 1) {
      errors.push(`Exercise "${config.id}" minVisibleJoints must be at least 1.`);
    }
    if (minRepConfidence !== undefined && (minRepConfidence <= 0 || minRepConfidence > 1.0)) {
      errors.push(`Exercise "${config.id}" minRepConfidence must be in (0, 1].`);
    }
  }

  if (upThreshold > 360 || upThreshold < 0 || downThreshold > 360 || downThreshold < 0) {
    errors.push(`Exercise "${config.id}" thresholds must be within [0, 360] degrees.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Compatibility adapter normalizing legacy partial configurations into structured DomainExerciseDefinition.
 */
export function resolveExerciseConfig(raw: Partial<DomainExerciseDefinition> & { id: ExerciseKey }): DomainExerciseDefinition {
  const base = DOMAIN_EXERCISE_CATALOG[raw.id] || DOMAIN_EXERCISE_CATALOG.squats;

  const up = raw.upThreshold ?? raw.repThresholds?.upThreshold ?? base.repThresholds.upThreshold;
  const down = raw.downThreshold ?? raw.repThresholds?.downThreshold ?? base.repThresholds.downThreshold;
  const cooldown = raw.repThresholds?.repCooldownMs ?? base.repThresholds.repCooldownMs;

  const resolved: DomainExerciseDefinition = {
    ...base,
    ...raw,
    upThreshold: up,
    downThreshold: down,
    repThresholds: {
      upThreshold: up,
      downThreshold: down,
      repCooldownMs: cooldown
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
  if (!validation.valid) {
    throw new Error(`Invalid resolved exercise configuration for "${raw.id}": ${validation.errors.join('; ')}`);
  }

  return resolved;
}
