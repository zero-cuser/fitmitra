import { ExerciseConfig, ExerciseKey } from '../types/fitness';

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
    upThreshold: 160,
    downThreshold: 90,
    instructions: [
      'Stand with feet shoulder-width apart, toes pointed slightly outward.',
      'Hinge hips back and bend knees until thighs are parallel to the ground (< 90°).',
      'Keep your chest high and spine neutral throughout the movement.',
      'Push through your heels to return to full upright lockout (> 160°).'
    ],
    formChecklist: [
      'Hip-Knee-Ankle depth below 90°',
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
    upThreshold: 155,
    downThreshold: 90,
    instructions: [
      'Place hands slightly wider than shoulder-width apart.',
      'Maintain a rigid straight line from shoulders through hips to ankles.',
      'Lower chest until elbows bend to 90° or lower.',
      'Press firmly through palms to full elbow extension (> 155°).'
    ],
    formChecklist: [
      'Elbow flexion to 90° at bottom',
      'Spine line deviation < 18° (no hip sag)',
      'Glutes and core engaged throughout',
      'Full lockout at top'
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
    upThreshold: 160,
    downThreshold: 90,
    instructions: [
      'Step forward smoothly with one leg.',
      'Lower your hips until both front and back knees bend to 90° angles.',
      'Keep front knee directly above front ankle, not past your toes.',
      'Drive off front heel to return upright to standing position.'
    ],
    formChecklist: [
      'Front knee flexion at 90°',
      'Torso perpendicular to the floor',
      'Back knee hovering 2 inches off floor',
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
    calPerRep: 0.15, // per second
    isHoldExercise: true,
    upThreshold: 180,
    downThreshold: 165,
    instructions: [
      'Rest on forearms with elbows aligned directly under shoulders.',
      'Extend legs back with toes on floor, feet hip-width apart.',
      'Maintain a continuous straight line from crown of head to heels.',
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
