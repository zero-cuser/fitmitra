import type {
  ExamActivityItem,
  ExamModeType,
  ExamSessionConfig,
  ExerciseKey,
  WorkoutConstraints
} from '../types/fitness.ts';
import { generateWorkout } from './workoutRecommendationEngine.ts';

/**
 * Returns default WorkoutConstraints for each Exam Mode duration.
 * Adheres strictly to hostel study-break realities: silent, small space, 0 equipment, low impact.
 */
export function getExamModeConstraints(mode: ExamModeType): WorkoutConstraints {
  switch (mode) {
    case 'reset':
      return {
        durationMinutes: 2,
        space: 'small',
        equipment: ['none'],
        noiseTolerance: 'silent',
        goal: 'wellness',
        difficulty: 'beginner',
        energyLevel: 'low'
      };
    case 'break':
      return {
        durationMinutes: 5,
        space: 'small',
        equipment: ['none'],
        noiseTolerance: 'silent',
        goal: 'wellness',
        difficulty: 'beginner',
        energyLevel: 'low'
      };
    case 'recharge':
      return {
        durationMinutes: 10,
        space: 'small',
        equipment: ['none'],
        noiseTolerance: 'low',
        goal: 'strength',
        difficulty: 'beginner',
        energyLevel: 'moderate'
      };
  }
}

/**
 * Builds a structured, multi-activity Exam Mode study break session
 * using the existing Adaptive Workout Engine to resolve movement exercises.
 */
export function createExamSession(
  mode: ExamModeType,
  overrides?: Partial<WorkoutConstraints>
): ExamSessionConfig {
  const baseConstraints = getExamModeConstraints(mode);
  const constraints: WorkoutConstraints = {
    ...baseConstraints,
    ...overrides
  };

  // Obtain deterministic movement exercises from Adaptive Hostel Workout Engine
  const recommendation = generateWorkout(constraints);
  const recommendedKeys: ExerciseKey[] = recommendation.success
    ? recommendation.items.map((i) => i.exerciseKey)
    : ['squats'];

  const primaryMovementKey: ExerciseKey = recommendedKeys[0] || 'squats';
  const secondaryMovementKey: ExerciseKey = recommendedKeys[1] || 'plank';

  const activities: ExamActivityItem[] = [];

  if (mode === 'reset') {
    // 2-MINUTE RESET (120 seconds total)
    activities.push({
      id: 'act_eye_reset',
      name: 'Screen Rest & Distant Focus',
      category: 'eye_break',
      durationSeconds: 30,
      description: 'Look away from your screen at an object at least 20 feet away to rest eye focus.',
      cues: [
        'Blink gently and relax your eye focus',
        'Drop your shoulders away from your ears',
        'Release forehead and jaw tension'
      ],
      isCameraEligible: false
    });

    activities.push({
      id: 'act_neck_shoulder',
      name: 'Neck & Shoulder Mobility',
      category: 'stretch',
      durationSeconds: 45,
      description: 'Slow, gentle head tilts and backward shoulder rolls to relieve study desk stiffness.',
      cues: [
        'Roll shoulders backwards in 5 smooth circles',
        'Tilt ear towards shoulder, hold gently for 5 seconds per side',
        'Keep breathing naturally throughout'
      ],
      isCameraEligible: false
    });

    activities.push({
      id: `act_movement_${primaryMovementKey}`,
      name: primaryMovementKey === 'squats' ? 'Gentle Bodyweight Squats' : 'Desk Movement Reset',
      category: 'movement',
      durationSeconds: 45,
      description: 'Controlled bodyweight movement to circulate blood flow after prolonged sitting.',
      cues: [
        'Move with smooth, controlled cadence',
        'Keep heels planted firmly on floor',
        'Camera tracking is optional'
      ],
      exerciseKey: primaryMovementKey,
      isCameraEligible: true
    });
  } else if (mode === 'break') {
    // 5-MINUTE BREAK (300 seconds total)
    activities.push({
      id: 'act_eye_posture',
      name: 'Eye Rest & Posture Alignment',
      category: 'eye_break',
      durationSeconds: 45,
      description: 'Disengage from digital screens, look across the room, and align your spine upright.',
      cues: [
        'Focus on a distant wall, tree, or object',
        'Stand tall with weight balanced evenly on both feet',
        'Relax facial muscles and breathe steadily'
      ],
      isCameraEligible: false
    });

    activities.push({
      id: 'act_thoracic_stretch',
      name: 'Shoulder & Upper-Back Mobility',
      category: 'stretch',
      durationSeconds: 60,
      description: 'Standing chest opener and shoulder circle stretches to counter desk hunching.',
      cues: [
        'Interlace fingers behind back and gently open chest',
        'Avoid overarching lower back',
        'Breathe into ribs and hold comfortably'
      ],
      isCameraEligible: false
    });

    activities.push({
      id: `act_movement_${primaryMovementKey}`,
      name: primaryMovementKey === 'squats' ? 'Bodyweight Squats' : 'Desk Physical Movement',
      category: 'movement',
      durationSeconds: 90,
      description: 'Smooth, rhythm-paced reps to activate legs and core without making noise.',
      cues: [
        'Maintain balanced upright posture',
        'Control the descent smoothly',
        'Camera tracking available if desired'
      ],
      exerciseKey: primaryMovementKey,
      isCameraEligible: true
    });

    activities.push({
      id: 'act_paced_breathing',
      name: 'Paced Breathing Reset',
      category: 'breathing',
      durationSeconds: 60,
      description: 'Steady 4-second inhale and 4-second exhale to settle pacing before resuming study.',
      cues: [
        'Inhale slowly through nose for 4 counts',
        'Pause momentarily',
        'Exhale gently through mouth for 4 counts'
      ],
      isCameraEligible: false
    });

    activities.push({
      id: 'act_lower_stretch',
      name: 'Standing Hamstring & Calf Stretch',
      category: 'stretch',
      durationSeconds: 45,
      description: 'Gentle standing calf stretch against your study chair or wall.',
      cues: [
        'Step one leg back with heel down',
        'Keep front knee softly bent',
        'Switch sides after 20 seconds'
      ],
      isCameraEligible: false
    });
  } else {
    // 10-MINUTE RECHARGE (600 seconds total)
    activities.push({
      id: 'act_decompression',
      name: 'Desk Decompression & Screen Rest',
      category: 'eye_break',
      durationSeconds: 60,
      description: 'Complete screen break: step away from your study area, blink, and look out a window.',
      cues: [
        'Look at the furthest visible object',
        'Shake out wrists, fingers, and arms',
        'Take three full, natural breaths'
      ],
      isCameraEligible: false
    });

    activities.push({
      id: 'act_full_upper_mobility',
      name: 'Neck, Shoulder & Thoracic Mobility',
      category: 'stretch',
      durationSeconds: 90,
      description: 'Comprehensive upper-body mobility circuit for neck, traps, and upper back.',
      cues: [
        'Slow neck half-circles (shoulder to chest to shoulder)',
        'Arm circles forward and backward',
        'Gentle standing side-bends'
      ],
      isCameraEligible: false
    });

    activities.push({
      id: `act_movement_${primaryMovementKey}`,
      name: primaryMovementKey === 'squats' ? 'Bodyweight Squat Circuit' : 'Lower-Body Movement',
      category: 'movement',
      durationSeconds: 120,
      description: 'Active lower-body movement to elevate circulation and counter stagnation.',
      cues: [
        'Steady, controlled reps',
        'Keep core engaged and posture upright',
        'Camera tracking available'
      ],
      exerciseKey: primaryMovementKey,
      isCameraEligible: true
    });

    activities.push({
      id: `act_movement_${secondaryMovementKey}`,
      name: secondaryMovementKey === 'plank' ? 'Core Stability Hold' : 'Bodyweight Movement Set 2',
      category: 'movement',
      durationSeconds: 120,
      description: 'Quiet, stationary core or balance movement.',
      cues: [
        'Focus on stability over speed',
        'Keep spine in neutral alignment',
        'Breathe evenly throughout'
      ],
      exerciseKey: secondaryMovementKey,
      isCameraEligible: true
    });

    activities.push({
      id: 'act_full_stretch',
      name: 'Full-Body Standing Stretch',
      category: 'stretch',
      durationSeconds: 90,
      description: 'Full-body reach, standing hip-flexor stretch, and gentle torso twists.',
      cues: [
        'Reach arms tall towards the ceiling',
        'Gentle torso rotations with feet planted',
        'Release any lingering muscle tightness'
      ],
      isCameraEligible: false
    });

    activities.push({
      id: 'act_breath_hydrate',
      name: 'Breath Pacing & Hydration Break',
      category: 'breathing',
      durationSeconds: 120,
      description: 'Drink a glass of water and take 2 minutes of relaxed, rhythmic breathing.',
      cues: [
        'Hydrate with a glass of water',
        'Sit or stand comfortably',
        'Breathe slowly and rhythmically to conclude your break'
      ],
      isCameraEligible: false
    });
  }

  const titles: Record<ExamModeType, string> = {
    reset: '2-Minute Desk Reset',
    break: '5-Minute Study Break',
    recharge: '10-Minute Study Recharge'
  };

  const totalDurationSeconds = activities.reduce((acc, a) => acc + a.durationSeconds, 0);

  return {
    mode,
    title: titles[mode],
    totalDurationSeconds,
    activities,
    constraintsUsed: constraints
  };
}
