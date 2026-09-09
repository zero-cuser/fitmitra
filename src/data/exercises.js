// Dorm-friendly exercises and micro-breaks
export const AI_EXERCISES = {
  squats: {
    id: 'squats',
    name: 'Dorm Bodyweight Squats',
    shortName: 'Squats',
    targetMuscles: 'Quadriceps, Glutes, Hamstrings, Core',
    level: 'Beginner',
    defaultTargetReps: 15,
    calPerRep: 0.35,
    metricUnit: 'reps',
    downAngle: 90, // knee angle when squat depth is reached (< 90°)
    upAngle: 160,  // standing straight (> 160°)
    keyJoints: ['hip', 'knee', 'ankle'],
    instructions: [
      'Stand facing camera, feet shoulder-width apart, toes pointing slightly out.',
      'Lower hips back and down until thighs are parallel to the floor (< 90° knee angle).',
      'Keep your chest high, back straight, and prevent knees from caving inward.',
      'Drive up through your heels to return to standing position (> 160°).'
    ],
    formCues: {
      depthError: 'Go deeper below 90°!',
      backError: 'Keep chest upright, do not collapse forward!',
      kneeCaveError: 'Push knees outward over toes!',
      successCue: 'Great squat depth!'
    }
  },
  pushups: {
    id: 'pushups',
    name: 'Hostel Bed / Floor Push-ups',
    shortName: 'Push-ups',
    targetMuscles: 'Pectorals, Triceps, Anterior Deltoids, Core',
    level: 'Intermediate',
    defaultTargetReps: 12,
    calPerRep: 0.45,
    metricUnit: 'reps',
    downAngle: 88,  // elbow angle in bottom position (< 90°)
    upAngle: 160,   // elbow extension (> 160°)
    keyJoints: ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'],
    instructions: [
      'Place hands slightly wider than shoulder-width on floor or edge of dorm bed.',
      'Lock in a rigid straight line from shoulders through hips to ankles (< 15° deviation).',
      'Lower your chest until elbows bend beyond 90 degrees.',
      'Push firmly back up to full lockout without sagging your lower back.'
    ],
    formCues: {
      depthError: 'Lower chest deeper below 90°!',
      backError: 'Keep hips aligned, avoid sagging!',
      successCue: 'Strong push-up rep!'
    }
  },
  jumpingJacks: {
    id: 'jumpingJacks',
    name: 'Cardio Jumping Jacks',
    shortName: 'Jumping Jacks',
    targetMuscles: 'Calves, Deltoids, Cardiovascular Endurance',
    level: 'All Levels',
    defaultTargetReps: 25,
    calPerRep: 0.20,
    metricUnit: 'reps',
    downAngle: 45,  // arms by sides (< 45°)
    upAngle: 135,   // arms overhead (> 135°)
    keyJoints: ['hip', 'shoulder', 'wrist', 'ankle'],
    instructions: [
      'Start standing tall with hands at your sides and feet together.',
      'Jump feet outward wider than shoulder width while swinging arms overhead.',
      'Clap or bring hands together above head (> 135° arm abduction).',
      'Jump back to starting position landing softly on the balls of your feet.'
    ],
    formCues: {
      depthError: 'Raise arms fully overhead!',
      backError: 'Land softly on balls of feet!',
      successCue: 'Great tempo, keep bouncing!'
    }
  },
  lunges: {
    id: 'lunges',
    name: 'Alternating Dorm Lunges',
    shortName: 'Lunges',
    targetMuscles: 'Quadriceps, Glutes, Hamstrings, Calves',
    level: 'Beginner - Int.',
    defaultTargetReps: 16,
    calPerRep: 0.38,
    metricUnit: 'reps',
    downAngle: 92,  // front knee angle in lunge bottom (< 95°)
    upAngle: 155,   // standing straight (> 155°)
    keyJoints: ['hip', 'knee', 'ankle'],
    instructions: [
      'Stand tall, then take a controlled step forward with your lead leg.',
      'Lower your hips until your front knee bends to 90° and back knee hovers above floor.',
      'Keep your torso perpendicular to the floor; do not lean forward over knee.',
      'Push firmly off front heel to return to standing position.'
    ],
    formCues: {
      depthError: 'Lower front knee to 90°!',
      backError: 'Keep torso upright, do not lean forward!',
      successCue: 'Clean lunge, good balance!'
    }
  },
  plank: {
    id: 'plank',
    name: 'Desk / Floor Isometric Plank',
    shortName: 'Plank Hold',
    targetMuscles: 'Rectus Abdominis, Transverse Abdominis, Glutes, Shoulders',
    level: 'All Levels',
    defaultTargetReps: 30, // seconds
    calPerRep: 0.15, // kcal per second of hold
    metricUnit: 'seconds',
    downAngle: 15,  // max 15° deviation from straight line (Shoulder-Hip-Ankle)
    upAngle: 15,
    keyJoints: ['shoulder', 'hip', 'ankle'],
    instructions: [
      'Plant forearms or hands on the floor or edge of study desk beneath shoulders.',
      'Form a strict straight line from shoulders through hips down to ankles.',
      'Maintain spine straightness: deviation between shoulder-hip-ankle must stay < 15°.',
      'Engage glutes and pull navel toward spine; hold steady and breathe evenly.'
    ],
    formCues: {
      depthError: 'Hips are sagging! Lift hips up!',
      backError: 'Hips are too high! Flatten into straight plank!',
      successCue: 'Solid plank alignment!'
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
