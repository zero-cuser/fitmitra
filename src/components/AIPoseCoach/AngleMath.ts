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
 * Checks whether user landmarks are visible with confidence > minConfidence (default 0.60)
 * AND inside screen coordinate boundaries [0.02, 0.98] to prevent false triggers from off-screen predictions.
 */
export const checkLandmarksInFrame = (
  landmarks: LandmarkPoint[],
  indices: number[],
  minConfidence = 0.60
): boolean => {
  if (!landmarks || landmarks.length < 33) return false;
  return indices.every((idx) => {
    const pt = landmarks[idx];
    if (!pt) return false;
    const vis = pt.visibility ?? 1;
    if (vis < minConfidence) return false;
    // Strict Screen Boundary Check: Ensure joints are well within the camera frame
    if (pt.x < 0.02 || pt.x > 0.98 || pt.y < 0.02 || pt.y > 0.98) return false;
    return true;
  });
};

export interface ExerciseTrackerState {
  standingConfirmed: boolean;
  lockoutConfirmed: boolean;
  closedConfirmed: boolean;
  bottomReached: boolean;
  openReached: boolean;
  lastRepTime: number;
  baselineY: number;
}

// 1. SQUAT STATE MACHINE & KINEMATICS
// Requires vertical standing start, downward vertical hip displacement, bottom depth (<95°), and return to standing (>155°)
export const evaluateSquatLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.RIGHT_HIP,
    LANDMARK_INDEX.LEFT_KNEE,
    LANDMARK_INDEX.RIGHT_KNEE,
    LANDMARK_INDEX.LEFT_ANKLE,
    LANDMARK_INDEX.RIGHT_ANKLE,
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.RIGHT_SHOULDER
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.60);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'hip', x: 0.5, y: 0.5, message: 'Step back to fit in frame' }],
      isGoodForm: false,
      formCue: 'Step back to fit in frame'
    };
  }

  const leftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const rightHip = landmarks[LANDMARK_INDEX.RIGHT_HIP];
  const leftKnee = landmarks[LANDMARK_INDEX.LEFT_KNEE];
  const rightKnee = landmarks[LANDMARK_INDEX.RIGHT_KNEE];
  const leftAnkle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];
  const rightAnkle = landmarks[LANDMARK_INDEX.RIGHT_ANKLE];

  // Full-body vertical span check: Head-to-ankle must occupy at least 35% of camera frame height
  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  const verticalSpan = avgAnkleY - avgShoulderY;

  if (verticalSpan < 0.35) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'hip', x: 0.5, y: 0.5, message: 'Step back to fit full body in frame' }],
      isGoodForm: false,
      formCue: 'Step back to fit full body in frame'
    };
  }

  // Orientation Check: Squats must be performed standing vertically
  const isVertical =
    avgShoulderY < (leftHip.y + rightHip.y) / 2 &&
    (leftHip.y + rightHip.y) / 2 < (leftKnee.y + rightKnee.y) / 2 &&
    (leftKnee.y + rightKnee.y) / 2 < avgAnkleY;

  if (!isVertical) {
    return {
      inFrame: true,
      angle: 160,
      stage: 'up',
      repCompleted: false,
      formFaults: [{ joint: 'hip', x: leftHip.x, y: leftHip.y, message: 'Stand upright facing camera' }],
      isGoodForm: false,
      formCue: 'Stand upright facing camera'
    };
  }

  // Choose the leg with highest visibility confidence
  const leftVis = (leftKnee?.visibility ?? 0.8) + (leftHip?.visibility ?? 0.8);
  const rightVis = (rightKnee?.visibility ?? 0.8) + (rightHip?.visibility ?? 0.8);
  const isLeft = leftVis >= rightVis;

  const hip = isLeft ? leftHip : rightHip;
  const knee = isLeft ? leftKnee : rightKnee;
  const ankle = isLeft ? leftAnkle : rightAnkle;
  const shoulder = isLeft ? leftShoulder : rightShoulder;

  const kneeAngle = calculateAngle(hip, knee, ankle) || 160;
  const torsoAngle = calculateAngle(shoulder, hip, knee) || 160;

  const formFaults: FormFault[] = [];
  let isGoodForm = true;

  // 1. Standing Calibration Check
  // User MUST be confirmed standing upright first before any descent counts
  if (kneeAngle > 155 && torsoAngle > 135) {
    if (tracker) {
      tracker.standingConfirmed = true;
      tracker.baselineY = hip.y;
    }
  }

  // 2. Depth fault check: "Squat deeper to 90°"
  if (kneeAngle > 95 && currentStage === 'down') {
    formFaults.push({
      joint: 'knee',
      x: knee.x,
      y: knee.y,
      message: 'Squat deeper to 90°'
    });
    isGoodForm = false;
  }

  // 3. Knee valgus collapse check: "Knees inward"
  const kneeDist = Math.abs(leftKnee.x - rightKnee.x);
  const ankleDist = Math.abs(leftAnkle.x - rightAnkle.x);
  if (ankleDist > 0.08 && kneeDist < ankleDist * 0.75 && kneeAngle < 135) {
    formFaults.push({
      joint: 'knee',
      x: (leftKnee.x + rightKnee.x) / 2,
      y: (leftKnee.y + rightKnee.y) / 2,
      message: 'Knees inward'
    });
    isGoodForm = false;
  }

  // 4. Torso collapse check
  if (torsoAngle < 65) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: 'Chest up, spine neutral!'
    });
    isGoodForm = false;
  }

  // State Machine with Physical Hip Displacement Hysteresis
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  const isStandingConfirmed = tracker ? tracker.standingConfirmed : true;
  const hipDropped = tracker ? (hip.y - tracker.baselineY) > 0.04 : true;

  // Descent Phase: Only trigger 'down' if user started standing and hips physically dropped down
  if (isStandingConfirmed && kneeAngle < 95 && hipDropped) {
    newStage = 'down';
    if (tracker) tracker.bottomReached = true;
    formCue = 'Good depth, now drive up!';
  } else if (kneeAngle > 155) {
    newStage = 'up';
    const hadBottom = tracker ? tracker.bottomReached : currentStage === 'down';
    const hipReturned = tracker ? Math.abs(hip.y - tracker.baselineY) < 0.045 : true;
    const cooldownOk = tracker ? now - tracker.lastRepTime > 1100 : true;

    if (hadBottom && hipReturned && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.bottomReached = false;
        tracker.lastRepTime = now;
      }
      formCue = 'Clean squat rep!';
    }
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
// Requires horizontal floor position, lockout calibration (>155°), elbow flexion (<90°), and lockout return
export const evaluatePushupLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_ELBOW,
    LANDMARK_INDEX.LEFT_WRIST,
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.60);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'elbow', x: 0.5, y: 0.5, message: 'Step back to fit in frame' }],
      isGoodForm: false,
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

  // Posture Orientation Gate: Push-ups require horizontal prone floor stance
  const vertDelta = Math.abs(shoulder.y - ankle.y);
  const horizDelta = Math.abs(shoulder.x - ankle.x);
  const isHorizontal = horizDelta > 0.28 && vertDelta < 0.32;

  if (!isHorizontal) {
    return {
      inFrame: true,
      angle: elbowAngle,
      stage: 'up',
      repCompleted: false,
      formFaults: [
        {
          joint: 'hip',
          x: hip.x,
          y: hip.y,
          message: 'Get down into horizontal push-up position'
        }
      ],
      isGoodForm: false,
      formCue: 'Get down into horizontal push-up position'
    };
  }

  const formFaults: FormFault[] = [];
  let isGoodForm = true;

  // Calibrate Lockout Starting Position
  if (elbowAngle > 155) {
    if (tracker) {
      tracker.lockoutConfirmed = true;
      tracker.baselineY = shoulder.y;
    }
  }

  // Hip alignment: Shoulder-Hip-Ankle must remain between 165° and 185°
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

  // Push-up State Machine: Down (<90°) -> Up (>155°) with chest displacement & cooldown
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  const isLockoutConfirmed = tracker ? tracker.lockoutConfirmed : true;
  const chestDescended = tracker ? (shoulder.y - tracker.baselineY) > 0.035 : true;

  if (isLockoutConfirmed && elbowAngle < 90 && chestDescended) {
    newStage = 'down';
    if (tracker) tracker.bottomReached = true;
    formCue = 'Chest down, press up!';
  } else if (elbowAngle > 155) {
    newStage = 'up';
    const hadBottom = tracker ? tracker.bottomReached : currentStage === 'down';
    const chestReturned = tracker ? Math.abs(shoulder.y - tracker.baselineY) < 0.04 : true;
    const cooldownOk = tracker ? now - tracker.lastRepTime > 1000 : true;

    if (hadBottom && chestReturned && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.bottomReached = false;
        tracker.lastRepTime = now;
      }
      formCue = 'Solid push-up rep!';
    }
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
// Requires standing posture, arms overhead (>130° AND wrists above shoulders), feet jumping wide, then return
export const evaluateJumpingJackLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
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

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.60);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 45,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'wrist', x: 0.5, y: 0.5, message: 'Step back to fit in frame' }],
      isGoodForm: false,
      formCue: 'Step back to fit in frame'
    };
  }

  const leftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const rightHip = landmarks[LANDMARK_INDEX.RIGHT_HIP];
  const leftWrist = landmarks[LANDMARK_INDEX.LEFT_WRIST];
  const rightWrist = landmarks[LANDMARK_INDEX.RIGHT_WRIST];
  const leftAnkle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];
  const rightAnkle = landmarks[LANDMARK_INDEX.RIGHT_ANKLE];

  // Full-body vertical span check
  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  if (avgAnkleY - avgShoulderY < 0.35) {
    return {
      inFrame: false,
      angle: 45,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'wrist', x: 0.5, y: 0.5, message: 'Step back to fit full body in frame' }],
      isGoodForm: false,
      formCue: 'Step back to fit full body in frame'
    };
  }

  const armAngle = calculateAngle(leftHip, leftShoulder, leftWrist) || 45;
  const ankleDistance = Math.abs(leftAnkle.x - rightAnkle.x);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) || 0.15;

  // Starting Closed Calibration: Arms at sides (below hips) and feet together
  const isClosedPosture = armAngle < 50 && leftWrist.y > leftHip.y && rightWrist.y > rightHip.y && ankleDistance < shoulderWidth * 1.05;
  if (isClosedPosture && tracker) {
    tracker.closedConfirmed = true;
  }

  // Open phase: Arms overhead (wrists physically higher than shoulders) and feet jumped wide
  const wristsOverhead = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
  const isOpen = armAngle > 130 && wristsOverhead && ankleDistance > shoulderWidth * 1.15;
  const isClosed = armAngle < 55 && leftWrist.y > leftHip.y && ankleDistance < shoulderWidth * 1.05;

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  const isClosedConfirmed = tracker ? tracker.closedConfirmed : true;

  if (isClosedConfirmed && isOpen) {
    newStage = 'up';
    if (tracker) tracker.openReached = true;
    formCue = 'Arms high, feet wide!';
  } else if (isClosed) {
    newStage = 'down';
    const hadOpen = tracker ? tracker.openReached : currentStage === 'up';
    const cooldownOk = tracker ? now - tracker.lastRepTime > 750 : true;

    if (hadOpen && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.openReached = false;
        tracker.lastRepTime = now;
      }
      formCue = 'Jumping jack counted!';
    }
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
// Lead knee flexion: Down (<95°), Up (>150°), with split stance and vertical hip drop
export const evaluateLungeLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
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

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.60);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'knee', x: 0.5, y: 0.5, message: 'Step back to fit in frame' }],
      isGoodForm: false,
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
  const activeHip = isLeftLead ? landmarks[LANDMARK_INDEX.LEFT_HIP] : landmarks[LANDMARK_INDEX.RIGHT_HIP];
  const activeShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];

  const torsoAngle = calculateAngle(activeShoulder, activeHip, isLeftLead ? landmarks[LANDMARK_INDEX.LEFT_KNEE] : landmarks[LANDMARK_INDEX.RIGHT_KNEE]);

  const formFaults: FormFault[] = [];
  let isGoodForm = true;

  // Standing upright calibration
  if (leftKneeAngle > 150 && rightKneeAngle > 150 && torsoAngle > 135) {
    if (tracker) {
      tracker.standingConfirmed = true;
      tracker.baselineY = activeHip.y;
    }
  }

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

  const footSeparation = Math.abs(landmarks[LANDMARK_INDEX.LEFT_ANKLE].x - landmarks[LANDMARK_INDEX.RIGHT_ANKLE].x);
  const hipDropped = tracker ? (activeHip.y - tracker.baselineY) > 0.04 : true;
  const isStandingConfirmed = tracker ? tracker.standingConfirmed : true;

  // Lead knee flexion: Down (<95°), Up (>150°)
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (isStandingConfirmed && activeKneeAngle < 95 && footSeparation > 0.10 && hipDropped) {
    newStage = 'down';
    if (tracker) tracker.bottomReached = true;
    formCue = 'Hold 90°, step back!';
  } else if (activeKneeAngle > 150) {
    newStage = 'up';
    const hadBottom = tracker ? tracker.bottomReached : currentStage === 'down';
    const hipReturned = tracker ? Math.abs(activeHip.y - tracker.baselineY) < 0.04 : true;
    const cooldownOk = tracker ? now - tracker.lastRepTime > 1100 : true;

    if (hadBottom && hipReturned && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.bottomReached = false;
        tracker.lastRepTime = now;
      }
      formCue = 'Strong lunge rep!';
    }
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
// Requires horizontal floor position. Track Shoulder-Hip-Ankle angle: timer increments only while alignment stays between 165° and 185°
export const evaluatePlankLandmarks = (landmarks: LandmarkPoint[]): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.60);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 180,
      stage: 'down',
      repCompleted: false,
      formFaults: [{ joint: 'hip', x: 0.5, y: 0.5, message: 'Step back to fit in frame' }],
      isGoodForm: false,
      formCue: 'Step back to fit in frame'
    };
  }

  const shoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const hip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const ankle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const straightLineAngle = calculateAngle(shoulder, hip, ankle);

  // Orientation Check: Plank MUST be performed horizontally on the floor!
  // A person standing or sitting vertically is NOT doing a plank!
  const vertDelta = Math.abs(shoulder.y - ankle.y);
  const horizDelta = Math.abs(shoulder.x - ankle.x);
  const isHorizontalProne = horizDelta > 0.28 && vertDelta < 0.32;

  if (!isHorizontalProne) {
    return {
      inFrame: true,
      angle: straightLineAngle,
      stage: 'down',
      repCompleted: false,
      formFaults: [
        {
          joint: 'hip',
          x: hip.x,
          y: hip.y,
          message: 'Get down on floor in horizontal plank'
        }
      ],
      isGoodForm: false,
      formCue: 'Get down on floor in horizontal plank'
    };
  }

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
    isGoodForm: isHorizontalProne && isGoodForm,
    formCue
  };
};

/**
 * Stateful Biomechanical Kinematic Engine
 * Maintains internal stages synchronously to prevent race conditions and duplicate rep counting.
 */
export class ExerciseRepEngine {
  private currentExercise: ExerciseKey = 'squats';
  private stage: 'up' | 'down' = 'up';
  private tracker: ExerciseTrackerState = {
    standingConfirmed: false,
    lockoutConfirmed: false,
    closedConfirmed: false,
    bottomReached: false,
    openReached: false,
    lastRepTime: 0,
    baselineY: 0
  };

  reset(exercise?: ExerciseKey) {
    if (exercise) this.currentExercise = exercise;
    this.stage = this.currentExercise === 'plank' || this.currentExercise === 'jumpingJacks' ? 'down' : 'up';
    this.tracker = {
      standingConfirmed: false,
      lockoutConfirmed: false,
      closedConfirmed: false,
      bottomReached: false,
      openReached: false,
      lastRepTime: 0,
      baselineY: 0
    };
  }

  evaluate(exerciseKey: ExerciseKey, landmarks: LandmarkPoint[]): TelemetryResult {
    if (exerciseKey !== this.currentExercise) {
      this.reset(exerciseKey);
    }

    let result: TelemetryResult;

    switch (exerciseKey) {
      case 'squats':
        result = evaluateSquatLandmarks(landmarks, this.stage, this.tracker);
        break;
      case 'pushups':
        result = evaluatePushupLandmarks(landmarks, this.stage, this.tracker);
        break;
      case 'jumpingJacks':
        result = evaluateJumpingJackLandmarks(landmarks, this.stage, this.tracker);
        break;
      case 'lunges':
        result = evaluateLungeLandmarks(landmarks, this.stage, this.tracker);
        break;
      case 'plank':
        result = evaluatePlankLandmarks(landmarks);
        break;
      default:
        result = evaluateSquatLandmarks(landmarks, this.stage, this.tracker);
    }

    // Synchronously update internal stage
    this.stage = result.stage;
    return result;
  }
}

export const repEngine = new ExerciseRepEngine();

export const evaluateExerciseLandmarks = (
  exerciseKey: ExerciseKey,
  landmarks: LandmarkPoint[],
  _currentStage?: 'up' | 'down'
): TelemetryResult => {
  return repEngine.evaluate(exerciseKey, landmarks);
};
