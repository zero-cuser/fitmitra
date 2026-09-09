// Dorm-friendly exercises and micro-breaks
export const AI_EXERCISES = {
  squats: {
    id: 'squats',
    name: 'Dorm Bodyweight Squats',
    targetMuscles: 'Quadriceps, Glutes, Hamstrings, Core',
    level: 'Beginner',
    calPerRep: 0.32,
    downAngle: 90, // knee angle when squat is reached
    upAngle: 160,  // standing straight
    keyJoints: ['hip', 'knee', 'ankle'],
    instructions: [
      'Stand with feet shoulder-width apart, toes pointing slightly outward.',
      'Lower hips back and down as if sitting in an invisible chair.',
      'Keep your chest high and back straight; do not let knees cave inward.',
      'Descend until thighs are parallel to the floor, then drive through heels to stand.'
    ],
    formCues: {
      depthError: 'Lower your hips parallel to the floor!',
      backError: 'Keep chest upright, do not collapse forward!',
      successCue: 'Great squat depth!'
    }
  },
  pushups: {
    id: 'pushups',
    name: 'Hostel Bed / Floor Push-ups',
    targetMuscles: 'Chest, Shoulders, Triceps, Core',
    level: 'Intermediate',
    calPerRep: 0.45,
    downAngle: 85,  // elbow angle in down position
    upAngle: 155,   // elbow lockout
    keyJoints: ['shoulder', 'elbow', 'wrist'],
    instructions: [
      'Place hands slightly wider than shoulder-width apart.',
      'Form a straight line from crown of head to heels, engaging your core.',
      'Lower your chest until it hovers 2 inches above the ground/bed.',
      'Push firmly back to start without sagging your lower back.'
    ],
    formCues: {
      depthError: 'Lower your chest closer to the floor!',
      backError: 'Tighten core, avoid sagging hips!',
      successCue: 'Strong push-up rep!'
    }
  },
  jumpingJacks: {
    id: 'jumpingJacks',
    name: 'Cardio Desk Jumping Jacks',
    targetMuscles: 'Calves, Deltoids, Cardiovascular Endurance',
    level: 'All Levels',
    calPerRep: 0.20,
    downAngle: 40,  // arms by side
    upAngle: 130,   // arms overhead
    keyJoints: ['hip', 'shoulder', 'elbow'],
    instructions: [
      'Begin standing tall with arms resting at your sides.',
      'Jump feet outward while raising arms overhead until hands nearly touch.',
      'Jump back to starting position landing softly on the balls of your feet.',
      'Keep a steady athletic rhythm.'
    ],
    formCues: {
      depthError: 'Raise your hands fully above your head!',
      backError: 'Land softly on balls of your feet!',
      successCue: 'Great tempo, keep bouncing!'
    }
  }
};

// 2-Minute Desk Micro-Breaks (For Pomodoro study breaks)
export const DESK_MICRO_BREAKS = [
  {
    id: 'b1',
    name: 'Cervical Spine & Neck Relief',
    durationSec: 45,
    benefit: 'Reverses forward head slouch from looking at laptop screens',
    instructions: 'Slowly drop right ear to right shoulder, hold 15s. Repeat on left. Gently tuck chin to chest and hold.',
    icon: '🧘'
  },
  {
    id: 'b2',
    name: 'Desk Chair Thoracic Twist',
    durationSec: 45,
    benefit: 'Restores spinal mobility and releases mid-back tightness',
    instructions: 'Sit tall, place right hand on left knee, grab back of chair with left hand. Gently twist to the left, exhale, hold 20s. Switch sides.',
    icon: '🔄'
  },
  {
    id: 'b3',
    name: 'Doorway Pec & Chest Opener',
    durationSec: 30,
    benefit: 'Opens hunched shoulders caused by typing and writing notes',
    instructions: 'Stand in doorway, place forearms against doorframe at 90 degrees. Step forward gently until feeling a deep stretch across chest.',
    icon: '🚪'
  },
  {
    id: 'b4',
    name: 'Wrist & Forearm Coder Stretch',
    durationSec: 30,
    benefit: 'Prevents repetitive strain injury (RSI) from typing & mouse use',
    instructions: 'Extend right arm with palm facing forward, pull fingers back gently with left hand for 15s. Flip hand down and pull.',
    icon: '✋'
  }
];

// Curated Dorm Workout Routines
export const DORM_ROUTINES = [
  {
    id: 'r1',
    title: '5-Min Pre-Exam Cortisol Flush',
    duration: '5 Mins',
    calBurn: 40,
    intensity: 'Mild / Energy Boost',
    badge: 'Exam Mode',
    desc: 'Designed to relieve mental anxiety, pump oxygen to the prefrontal cortex, and eliminate brain fog before tests.',
    exercises: [
      { name: 'Jumping Jacks (Warmup)', reps: '30 secs' },
      { name: 'Desk Bodyweight Squats', reps: '15 reps' },
      { name: 'Torso Twists & Shoulder Rolls', reps: '45 secs' },
      { name: 'Slow Box Breathing Reset', reps: '60 secs' }
    ]
  },
  {
    id: 'r2',
    title: '10-Min Dorm Room HIIT Ignite',
    duration: '10 Mins',
    calBurn: 95,
    intensity: 'High / Sweat Session',
    badge: 'Zero Equipment',
    desc: 'High-efficiency interval circuit that fits between your bed and study table. Burns calories and spikes metabolic rate.',
    exercises: [
      { name: 'High Knees in Place', reps: '40s on, 20s rest' },
      { name: 'Dorm Squats', reps: '40s on, 20s rest' },
      { name: 'Push-ups (Floor or Bed incline)', reps: '40s on, 20s rest' },
      { name: 'Shadow Boxing Jabs', reps: '40s on, 20s rest' },
      { name: 'Plank Hold', reps: '40s on, 20s rest' }
    ]
  },
  {
    id: 'r3',
    title: '15-Min Study Marathon Power Routine',
    duration: '15 Mins',
    calBurn: 140,
    intensity: 'Moderate / Strength Focus',
    badge: 'Full Body',
    desc: 'Builds core strength, glute activation, and posture endurance so you can sit without lower back fatigue.',
    exercises: [
      { name: 'Glute Bridges (On floor or bed)', reps: '3 sets × 12 reps' },
      { name: 'Chair Step-Ups / Elevated Lunges', reps: '3 sets × 10 each' },
      { name: 'Slow Controlled Squats', reps: '3 sets × 15 reps' },
      { name: 'Incline Push-ups', reps: '3 sets × 12 reps' },
      { name: 'Superman Back Extensions', reps: '3 sets × 12 reps' }
    ]
  }
];
