import { ExerciseKey, FormFault, LandmarkPoint, TelemetryResult } from '@/types/fitness';

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

/**
 * Calculates 2D planar angle at joint B given points A, B, and C in degrees [0, 180].
 */
export const calculateAngle = (
  a?: LandmarkPoint,
  b?: LandmarkPoint,
  c?: LandmarkPoint
): number => {
  if (!a || !b || !c) return 180;

  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return Math.round(angle);
};

export const checkLandmarksInFrame = (
  landmarks: LandmarkPoint[],
  indices: number[],
  minVisibility = 0.55
): boolean => {
  if (!landmarks || landmarks.length < 33) return false;
  return indices.every((idx) => {
    const pt = landmarks[idx];
    return pt && (pt.visibility === undefined || pt.visibility >= minVisibility);
  });
};

// 1. SQUAT FORM & REP KINEMATICS
export const evaluateSquatLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down'
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.RIGHT_HIP,
    LANDMARK_INDEX.LEFT_KNEE,
    LANDMARK_INDEX.RIGHT_KNEE,
    LANDMARK_INDEX.LEFT_ANKLE,
    LANDMARK_INDEX.RIGHT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.55);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Step back so full body is visible'
    };
  }

  // Use the leg with highest visibility
  const leftVis = (landmarks[LANDMARK_INDEX.LEFT_KNEE]?.visibility ?? 0.8) + (landmarks[LANDMARK_INDEX.LEFT_HIP]?.visibility ?? 0.8);
  const rightVis = (landmarks[LANDMARK_INDEX.RIGHT_KNEE]?.visibility ?? 0.8) + (landmarks[LANDMARK_INDEX.RIGHT_HIP]?.visibility ?? 0.8);
  const isLeft = leftVis >= rightVis;

  const hip = landmarks[isLeft ? LANDMARK_INDEX.LEFT_HIP : LANDMARK_INDEX.RIGHT_HIP];
  const knee = landmarks[isLeft ? LANDMARK_INDEX.LEFT_KNEE : LANDMARK_INDEX.RIGHT_KNEE];
  const ankle = landmarks[isLeft ? LANDMARK_INDEX.LEFT_ANKLE : LANDMARK_INDEX.RIGHT_ANKLE];
  const shoulder = landmarks[isLeft ? LANDMARK_INDEX.LEFT_SHOULDER : LANDMARK_INDEX.RIGHT_SHOULDER];

  const kneeAngle = calculateAngle(hip, knee, ankle) || 160;
  const torsoAngle = calculateAngle(shoulder, hip, knee) || 160;

  const formFaults: FormFault[] = [];
  let isGoodForm = true;

  // Depth fault when in bottom
  if (kneeAngle > 95 && currentStage === 'down') {
    formFaults.push({
      joint: 'knee',
      x: knee.x,
      y: knee.y,
      message: 'Go deeper below 90°'
    });
    isGoodForm = false;
  }

  // Torso / Chest collapse fault
  if (torsoAngle < 65) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: 'Chest up, spine neutral!'
    });
    isGoodForm = false;
  }

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;

  if (kneeAngle <= 90) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Good depth, now drive up!';
    }
  } else if (kneeAngle >= 160 && currentStage === 'down') {
    newStage = 'up';
    repCompleted = true;
    formCue = 'Clean squat rep!';
  }

  return {
    inFrame: true,
    angle: kneeAngle,
    stage: newStage,
    repCompleted,
    formFaults,
    isGoodForm,
    formCue
  };
};

// 2. PUSH-UP FORM & REP KINEMATICS
export const evaluatePushupLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down'
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_ELBOW,
    LANDMARK_INDEX.LEFT_WRIST,
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.55);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Step into frame in plank position'
    };
  }

  const shoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const elbow = landmarks[LANDMARK_INDEX.LEFT_ELBOW];
  const wrist = landmarks[LANDMARK_INDEX.LEFT_WRIST];
  const hip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const ankle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const elbowAngle = calculateAngle(shoulder, elbow, wrist) || 160;
  const bodyLineAngle = calculateAngle(shoulder, hip, ankle) || 180;
  const bodyDeviation = Math.abs(180 - bodyLineAngle);

  const formFaults: FormFault[] = [];
  let isGoodForm = true;

  // Hip sagging or piking fault
  if (bodyDeviation > 18) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: bodyLineAngle < 162 ? 'Lift hips up!' : 'Lower hips straight!'
    });
    isGoodForm = false;
  }

  // Depth fault
  if (elbowAngle > 95 && currentStage === 'down') {
    formFaults.push({
      joint: 'elbow',
      x: elbow.x,
      y: elbow.y,
      message: 'Lower chest deeper!'
    });
    isGoodForm = false;
  }

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;

  if (elbowAngle <= 90) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Chest down, press up!';
    }
  } else if (elbowAngle >= 155 && currentStage === 'down') {
    newStage = 'up';
    repCompleted = true;
    formCue = 'Solid push-up!';
  }

  return {
    inFrame: true,
    angle: elbowAngle,
    stage: newStage,
    repCompleted,
    formFaults,
    isGoodForm,
    formCue
  };
};

// 3. LUNGE FORM & REP KINEMATICS
export const evaluateLungeLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down'
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.RIGHT_HIP,
    LANDMARK_INDEX.LEFT_KNEE,
    LANDMARK_INDEX.RIGHT_KNEE,
    LANDMARK_INDEX.LEFT_ANKLE,
    LANDMARK_INDEX.RIGHT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.55);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Full body needs to be visible'
    };
  }

  const leftKneeAngle = calculateAngle(
    landmarks[LANDMARK_INDEX.LEFT_HIP],
    landmarks[LANDMARK_INDEX.LEFT_KNEE],
    landmarks[LANDMARK_INDEX.LEFT_ANKLE]
  );
  const rightKneeAngle = calculateAngle(
    landmarks[LANDMARK_INDEX.RIGHT_HIP],
    landmarks[LANDMARK_INDEX.RIGHT_KNEE],
    landmarks[LANDMARK_INDEX.RIGHT_ANKLE]
  );

  const activeKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
  const activeKnee = leftKneeAngle < rightKneeAngle ? landmarks[LANDMARK_INDEX.LEFT_KNEE] : landmarks[LANDMARK_INDEX.RIGHT_KNEE];

  const formFaults: FormFault[] = [];
  let isGoodForm = true;

  if (activeKneeAngle > 105 && currentStage === 'down') {
    formFaults.push({
      joint: 'knee',
      x: activeKnee.x,
      y: activeKnee.y,
      message: 'Drop back knee deeper'
    });
    isGoodForm = false;
  }

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;

  if (activeKneeAngle <= 95) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Hold 90°, step back!';
    }
  } else if (activeKneeAngle >= 155 && currentStage === 'down') {
    newStage = 'up';
    repCompleted = true;
    formCue = 'Strong lunge rep!';
  }

  return {
    inFrame: true,
    angle: activeKneeAngle,
    stage: newStage,
    repCompleted,
    formFaults,
    isGoodForm,
    formCue
  };
};

// 4. PLANK ISOMETRIC ALIGNMENT
export const evaluatePlankLandmarks = (landmarks: LandmarkPoint[]): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.55);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 0,
      stage: 'up',
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Set up plank visible in frame'
    };
  }

  const shoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const hip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const ankle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const straightLineAngle = calculateAngle(shoulder, hip, ankle);
  const deviation = Math.abs(180 - straightLineAngle);

  const formFaults: FormFault[] = [];
  let isGoodForm = true;
  let formCue = 'Solid plank line, hold!';

  if (deviation > 15) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: straightLineAngle < 165 ? 'Lower hips straight!' : 'Lift hips, don\'t sag!'
    });
    isGoodForm = false;
    formCue = straightLineAngle < 165 ? 'Hips too high!' : 'Lower back sagging!';
  }

  return {
    inFrame: true,
    angle: deviation,
    stage: 'down',
    repCompleted: isGoodForm,
    formFaults,
    isGoodForm,
    formCue
  };
};

export const evaluateExerciseLandmarks = (
  exerciseKey: ExerciseKey,
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down'
): TelemetryResult => {
  switch (exerciseKey) {
    case 'squats':
      return evaluateSquatLandmarks(landmarks, currentStage);
    case 'pushups':
      return evaluatePushupLandmarks(landmarks, currentStage);
    case 'lunges':
      return evaluateLungeLandmarks(landmarks, currentStage);
    case 'plank':
      return evaluatePlankLandmarks(landmarks);
    default:
      return evaluateSquatLandmarks(landmarks, currentStage);
  }
};
