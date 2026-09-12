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
 * Calculates 2D planar interior angle at joint B given points A, B, and C in degrees [0, 180].
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

/**
 * Exponential Moving Average (EMA) Landmark Smoothing to prevent camera/joint visual jitter.
 * S_t = alpha * X_t + (1 - alpha) * S_{t-1}
 */
export const smoothLandmarksEMA = (
  currentLandmarks: LandmarkPoint[],
  previousLandmarks: LandmarkPoint[] | null,
  alpha = 0.6
): LandmarkPoint[] => {
  if (!previousLandmarks || previousLandmarks.length !== currentLandmarks.length) {
    return currentLandmarks.map((pt) => ({ ...pt }));
  }

  return currentLandmarks.map((curr, idx) => {
    const prev = previousLandmarks[idx];
    if (!prev) return { ...curr };

    const smoothedX = alpha * curr.x + (1 - alpha) * prev.x;
    const smoothedY = alpha * curr.y + (1 - alpha) * prev.y;
    const smoothedZ =
      curr.z !== undefined && prev.z !== undefined
        ? alpha * curr.z + (1 - alpha) * prev.z
        : curr.z;

    return {
      x: smoothedX,
      y: smoothedY,
      z: smoothedZ,
      visibility: curr.visibility
    };
  });
};

/**
 * Checks whether user landmarks are visible with confidence > minConfidence (default 0.65).
 * Only activates tracking when all required key joints meet confidence > 0.65.
 */
export const checkLandmarksInFrame = (
  landmarks: LandmarkPoint[],
  indices: number[],
  minConfidence = 0.65
): boolean => {
  if (!landmarks || landmarks.length < 33) return false;
  return indices.every((idx) => {
    const pt = landmarks[idx];
    return pt && (pt.visibility === undefined || pt.visibility > minConfidence);
  });
};

// 1. SQUAT STATE MACHINE & KINEMATICS
// Standing (>160°) -> Deep Squat (<95°) -> Standing (>160°)
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

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.65);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Step back to fit in frame'
    };
  }

  // Choose the leg with highest visibility confidence
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

  // 1. Depth fault check: "Squat deeper to 90°"
  if (kneeAngle > 95 && currentStage === 'down') {
    formFaults.push({
      joint: 'knee',
      x: knee.x,
      y: knee.y,
      message: 'Squat deeper to 90°'
    });
    isGoodForm = false;
  }

  // 2. Knee valgus collapse check: "Knees inward"
  const leftKnee = landmarks[LANDMARK_INDEX.LEFT_KNEE];
  const rightKnee = landmarks[LANDMARK_INDEX.RIGHT_KNEE];
  const leftAnkle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];
  const rightAnkle = landmarks[LANDMARK_INDEX.RIGHT_ANKLE];

  if (leftKnee && rightKnee && leftAnkle && rightAnkle) {
    const kneeDist = Math.abs(leftKnee.x - rightKnee.x);
    const ankleDist = Math.abs(leftAnkle.x - rightAnkle.x);
    // If knees caving inside ankles by more than 22% while flexing
    if (ankleDist > 0.08 && kneeDist < ankleDist * 0.78 && kneeAngle < 135) {
      formFaults.push({
        joint: 'knee',
        x: (leftKnee.x + rightKnee.x) / 2,
        y: (leftKnee.y + rightKnee.y) / 2,
        message: 'Knees inward'
      });
      isGoodForm = false;
    }
  }

  // 3. Torso collapse check
  if (torsoAngle < 65) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: 'Chest up, spine neutral!'
    });
    isGoodForm = false;
  }

  // Squat State Machine: Standing (>160°) -> Deep Squat (<95°) -> Standing (>160°)
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;

  if (kneeAngle < 95) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Good depth, now drive up!';
    }
  } else if (kneeAngle > 160 && currentStage === 'down') {
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

// 2. PUSH-UP STATE MACHINE & KINEMATICS
// Elbow flexion: Down (<90°), Up (>160°)
// Hip alignment: Shoulder-Hip-Ankle (165° - 180°)
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

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.65);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Step back to fit in frame'
    };
  }

  const shoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const elbow = landmarks[LANDMARK_INDEX.LEFT_ELBOW];
  const wrist = landmarks[LANDMARK_INDEX.LEFT_WRIST];
  const hip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const ankle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const elbowAngle = calculateAngle(shoulder, elbow, wrist) || 160;
  const hipLineAngle = calculateAngle(shoulder, hip, ankle) || 175;

  const formFaults: FormFault[] = [];
  let isGoodForm = true;

  // Hip alignment: Shoulder-Hip-Ankle must remain between 165° and 180°
  if (hipLineAngle < 165 || hipLineAngle > 185) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: 'Hips sagging - engage core'
    });
    isGoodForm = false;
  }

  // Chest depth fault when descending
  if (elbowAngle > 90 && currentStage === 'down') {
    formFaults.push({
      joint: 'elbow',
      x: elbow.x,
      y: elbow.y,
      message: 'Lower chest'
    });
    isGoodForm = false;
  }

  // Push-up State Machine: Down (<90°) -> Up (>160°)
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;

  if (elbowAngle < 90) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Chest down, press up!';
    }
  } else if (elbowAngle > 160 && currentStage === 'down') {
    newStage = 'up';
    repCompleted = true;
    formCue = 'Solid push-up rep!';
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

// 3. JUMPING JACKS STATE MACHINE & KINEMATICS
// Shoulder abduction angle (>135° overhead) combined with ankle distance
// Rep counts on Open -> Closed transition
export const evaluateJumpingJackLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down'
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.RIGHT_SHOULDER,
    LANDMARK_INDEX.LEFT_WRIST,
    LANDMARK_INDEX.RIGHT_WRIST,
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.RIGHT_HIP,
    LANDMARK_INDEX.LEFT_ANKLE,
    LANDMARK_INDEX.RIGHT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.65);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 45,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Step back to fit in frame'
    };
  }

  const leftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const leftWrist = landmarks[LANDMARK_INDEX.LEFT_WRIST];
  const leftAnkle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];
  const rightAnkle = landmarks[LANDMARK_INDEX.RIGHT_ANKLE];

  const armAngle = calculateAngle(leftHip, leftShoulder, leftWrist) || 45;
  const ankleDistance = Math.abs(leftAnkle.x - rightAnkle.x);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) || 0.15;

  const isOpen = armAngle > 135 && ankleDistance > shoulderWidth * 1.15;
  const isClosed = armAngle < 50 && ankleDistance < shoulderWidth * 0.95;

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;

  if (isOpen) {
    if (currentStage !== 'up') {
      newStage = 'up';
      formCue = 'Arms high, feet wide!';
    }
  } else if (isClosed && currentStage === 'up') {
    newStage = 'down';
    repCompleted = true;
    formCue = 'Jumping jack counted!';
  }

  return {
    inFrame: true,
    angle: armAngle,
    stage: newStage,
    repCompleted,
    formFaults: [],
    isGoodForm: true,
    formCue
  };
};

// 4. LUNGE STATE MACHINE & KINEMATICS
// Lead knee flexion: Down (<95°), Up (>155°)
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
    LANDMARK_INDEX.RIGHT_ANKLE,
    LANDMARK_INDEX.LEFT_SHOULDER
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.65);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Step back to fit in frame'
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
  const isLeftLead = leftKneeAngle < rightKneeAngle;
  const activeKnee = isLeftLead ? landmarks[LANDMARK_INDEX.LEFT_KNEE] : landmarks[LANDMARK_INDEX.RIGHT_KNEE];
  const activeHip = isLeftLead ? landmarks[LANDMARK_INDEX.LEFT_HIP] : landmarks[LANDMARK_INDEX.RIGHT_HIP];
  const activeShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];

  const torsoAngle = calculateAngle(activeShoulder, activeHip, activeKnee);

  const formFaults: FormFault[] = [];
  let isGoodForm = true;

  // Torso upright check: "Keep chest tall"
  if (torsoAngle < 75) {
    formFaults.push({
      joint: 'hip',
      x: activeHip.x,
      y: activeHip.y,
      message: 'Keep chest tall'
    });
    isGoodForm = false;
  }

  // Lead knee flexion: Down (<95°), Up (>155°)
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;

  if (activeKneeAngle < 95) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Hold 90°, step back!';
    }
  } else if (activeKneeAngle > 155 && currentStage === 'down') {
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

// 5. PLANK STATIC HOLD ENGINE
// Track Shoulder-Hip-Ankle angle: timer increments only while alignment stays between 165° and 185°
export const evaluatePlankLandmarks = (landmarks: LandmarkPoint[]): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.65);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 180,
      stage: 'down',
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Step back to fit in frame'
    };
  }

  const shoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const hip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const ankle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const straightLineAngle = calculateAngle(shoulder, hip, ankle);

  const formFaults: FormFault[] = [];
  let isGoodForm = true;
  let formCue = 'Solid plank line, hold!';

  // Alignment stays between 165° and 185°
  if (straightLineAngle < 165 || straightLineAngle > 185) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: 'Hips sagging - engage core'
    });
    isGoodForm = false;
    formCue = 'Hips sagging - engage core';
  }

  return {
    inFrame: true,
    angle: straightLineAngle,
    stage: 'down',
    repCompleted: false, // Isometric hold: seconds are accumulated by hold timer
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
    case 'jumpingJacks':
      return evaluateJumpingJackLandmarks(landmarks, currentStage);
    case 'lunges':
      return evaluateLungeLandmarks(landmarks, currentStage);
    case 'plank':
      return evaluatePlankLandmarks(landmarks);
    default:
      return evaluateSquatLandmarks(landmarks, currentStage);
  }
};
