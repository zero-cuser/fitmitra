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
 * Visibility Gate:
 * Only evaluates angles and rep states when key landmarks (shoulders, hips, knees, ankles)
 * have a confidence score > 0.65. If any joint is below 0.65 or outside frame boundaries [0.02, 0.98],
 * returns false to pause rep counting completely.
 */
export const checkLandmarksInFrame = (
  landmarks: LandmarkPoint[],
  indices: number[],
  minConfidence = 0.65
): boolean => {
  if (!landmarks || landmarks.length < 33) return false;
  return indices.every((idx) => {
    const pt = landmarks[idx];
    if (!pt) return false;
    // Strict confidence score must exceed 0.65
    const vis = pt.visibility !== undefined ? pt.visibility : 1.0;
    if (vis <= minConfidence) return false;
    // Boundary check: joints must be within camera frame
    if (pt.x < 0.02 || pt.x > 0.98 || pt.y < 0.02 || pt.y > 0.98) return false;
    return true;
  });
};

export interface ExerciseTrackerState {
  standingConfirmed: boolean;
  lockoutConfirmed: boolean;
  closedConfirmed: boolean;
  bottomHoldStartTime: number;
  bottomDwellSatisfied: boolean;
  openHoldStartTime: number;
  openDwellSatisfied: boolean;
  lastRepTime: number;
  baselineY: number;
}

// 1. SQUAT STATE MACHINE & KINEMATICS
// Visibility Gate: >0.65 on shoulders, hips, knees, ankles.
// State Machine Hysteresis: UP (>160°) -> DOWN (<90° held for at least 300ms) -> UP (>160°)
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

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.65);
  if (!inFrame) {
    if (tracker) {
      // Pause counting and reset bottom dwell timers when out of frame
      tracker.bottomHoldStartTime = 0;
      tracker.bottomDwellSatisfied = false;
    }
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'hip', x: 0.5, y: 0.5, message: 'Step back to fit in frame (Confidence > 65%)' }],
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
    if (tracker) {
      tracker.bottomHoldStartTime = 0;
      tracker.bottomDwellSatisfied = false;
    }
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
    if (tracker) {
      tracker.bottomHoldStartTime = 0;
      tracker.bottomDwellSatisfied = false;
    }
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

  // 1. Standing Upright Calibration Check
  if (kneeAngle > 155 && torsoAngle > 135) {
    if (tracker) {
      tracker.standingConfirmed = true;
      tracker.baselineY = hip.y;
    }
  }

  // 2. Depth fault check: "Squat deeper to 90°"
  if (kneeAngle > 90 && currentStage === 'down') {
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

  // Hysteresis State Machine with 300ms Bottom Dwell Requirement
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  const isStandingConfirmed = tracker ? tracker.standingConfirmed : true;
  const hipDropped = tracker ? (hip.y - tracker.baselineY) > 0.035 : true;

  // DOWN Phase: Depth must be below 90°
  if (isStandingConfirmed && kneeAngle < 90 && hipDropped) {
    newStage = 'down';
    if (tracker) {
      if (tracker.bottomHoldStartTime === 0) {
        tracker.bottomHoldStartTime = now;
      }
      // Must hold depth below 90° for at least 300ms
      const dwellDuration = now - tracker.bottomHoldStartTime;
      if (dwellDuration >= 300) {
        tracker.bottomDwellSatisfied = true;
        formCue = 'Solid 90° depth held! Now drive up!';
      } else {
        formCue = `Hold depth (${dwellDuration}/300ms)...`;
      }
    } else {
      formCue = 'Good depth, now drive up!';
    }
  } else if (kneeAngle >= 90 && kneeAngle < 160) {
    // If user rises or jitters before reaching 300ms, reset dwell timer
    if (tracker && !tracker.bottomDwellSatisfied && currentStage !== 'down') {
      tracker.bottomHoldStartTime = 0;
    }
  } else if (kneeAngle > 160) {
    // UP Phase: User returned past 160°
    newStage = 'up';
    const hadDwell = tracker ? tracker.bottomDwellSatisfied : currentStage === 'down';
    const hipReturned = tracker ? Math.abs(hip.y - tracker.baselineY) < 0.045 : true;
    const cooldownOk = tracker ? now - tracker.lastRepTime > 1000 : true;

    if (hadDwell && hipReturned && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.bottomDwellSatisfied = false;
        tracker.bottomHoldStartTime = 0;
        tracker.lastRepTime = now;
      }
      formCue = 'Clean squat rep!';
    } else {
      // Incomplete cycle or premature ascent without 300ms hold
      if (tracker) {
        tracker.bottomDwellSatisfied = false;
        tracker.bottomHoldStartTime = 0;
      }
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
// Visibility Gate: >0.65 on shoulders, elbows, wrists, hips, ankles.
// State Machine Hysteresis: UP (>160°) -> DOWN (<90° held for at least 300ms) -> UP (>160°)
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

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.65);
  if (!inFrame) {
    if (tracker) {
      tracker.bottomHoldStartTime = 0;
      tracker.bottomDwellSatisfied = false;
    }
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'elbow', x: 0.5, y: 0.5, message: 'Step back to fit in frame (Confidence > 65%)' }],
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
    if (tracker) {
      tracker.bottomHoldStartTime = 0;
      tracker.bottomDwellSatisfied = false;
    }
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
      message: 'Lower chest to 90°'
    });
    isGoodForm = false;
  }

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  const isLockoutConfirmed = tracker ? tracker.lockoutConfirmed : true;
  const chestDescended = tracker ? (shoulder.y - tracker.baselineY) > 0.03 : true;

  // DOWN Phase: Elbow flexion must be below 90° and held for >= 300ms
  if (isLockoutConfirmed && elbowAngle < 90 && chestDescended) {
    newStage = 'down';
    if (tracker) {
      if (tracker.bottomHoldStartTime === 0) {
        tracker.bottomHoldStartTime = now;
      }
      const dwellDuration = now - tracker.bottomHoldStartTime;
      if (dwellDuration >= 300) {
        tracker.bottomDwellSatisfied = true;
        formCue = 'Chest down held! Press up strong!';
      } else {
        formCue = `Hold depth (${dwellDuration}/300ms)...`;
      }
    } else {
      formCue = 'Chest down, press up!';
    }
  } else if (elbowAngle >= 90 && elbowAngle < 160) {
    if (tracker && !tracker.bottomDwellSatisfied && currentStage !== 'down') {
      tracker.bottomHoldStartTime = 0;
    }
  } else if (elbowAngle > 160) {
    // UP Phase: Lockout past 160°
    newStage = 'up';
    const hadDwell = tracker ? tracker.bottomDwellSatisfied : currentStage === 'down';
    const chestReturned = tracker ? Math.abs(shoulder.y - tracker.baselineY) < 0.04 : true;
    const cooldownOk = tracker ? now - tracker.lastRepTime > 900 : true;

    if (hadDwell && chestReturned && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.bottomDwellSatisfied = false;
        tracker.bottomHoldStartTime = 0;
        tracker.lastRepTime = now;
      }
      formCue = 'Solid push-up rep!';
    } else {
      if (tracker) {
        tracker.bottomDwellSatisfied = false;
        tracker.bottomHoldStartTime = 0;
      }
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
// Visibility Gate: >0.65 on shoulders, wrists, hips, ankles.
// State Machine Hysteresis: Closed (<50°) -> Open (>130° overhead held for >=250ms) -> Closed (<50°)
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

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.65);
  if (!inFrame) {
    if (tracker) {
      tracker.openHoldStartTime = 0;
      tracker.openDwellSatisfied = false;
    }
    return {
      inFrame: false,
      angle: 45,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'wrist', x: 0.5, y: 0.5, message: 'Step back to fit in frame (Confidence > 65%)' }],
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

  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  if (avgAnkleY - avgShoulderY < 0.35) {
    if (tracker) {
      tracker.openHoldStartTime = 0;
      tracker.openDwellSatisfied = false;
    }
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

  // Closed starting calibration
  const isClosedPosture = armAngle < 50 && leftWrist.y > leftHip.y && rightWrist.y > rightHip.y && ankleDistance < shoulderWidth * 1.05;
  if (isClosedPosture && tracker) {
    tracker.closedConfirmed = true;
  }

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
    if (tracker) {
      if (tracker.openHoldStartTime === 0) {
        tracker.openHoldStartTime = now;
      }
      if (now - tracker.openHoldStartTime >= 250) {
        tracker.openDwellSatisfied = true;
        formCue = 'Arms high, feet wide!';
      }
    } else {
      formCue = 'Arms high, feet wide!';
    }
  } else if (isClosed) {
    newStage = 'down';
    const hadOpen = tracker ? tracker.openDwellSatisfied : currentStage === 'up';
    const cooldownOk = tracker ? now - tracker.lastRepTime > 700 : true;

    if (hadOpen && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.openDwellSatisfied = false;
        tracker.openHoldStartTime = 0;
        tracker.lastRepTime = now;
      }
      formCue = 'Jumping jack counted!';
    } else {
      if (tracker) {
        tracker.openDwellSatisfied = false;
        tracker.openHoldStartTime = 0;
      }
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
// Visibility Gate: >0.65. Hysteresis: Standing (>155°) -> Lunge (<90° held for 300ms) -> Standing (>155°)
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

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.65);
  if (!inFrame) {
    if (tracker) {
      tracker.bottomHoldStartTime = 0;
      tracker.bottomDwellSatisfied = false;
    }
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'knee', x: 0.5, y: 0.5, message: 'Step back to fit in frame (Confidence > 65%)' }],
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

  if (leftKneeAngle > 150 && rightKneeAngle > 150 && torsoAngle > 135) {
    if (tracker) {
      tracker.standingConfirmed = true;
      tracker.baselineY = activeHip.y;
    }
  }

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
  const hipDropped = tracker ? (activeHip.y - tracker.baselineY) > 0.035 : true;
  const isStandingConfirmed = tracker ? tracker.standingConfirmed : true;

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  // DOWN Phase: Lead knee < 90° held for at least 300ms
  if (isStandingConfirmed && activeKneeAngle < 90 && footSeparation > 0.10 && hipDropped) {
    newStage = 'down';
    if (tracker) {
      if (tracker.bottomHoldStartTime === 0) {
        tracker.bottomHoldStartTime = now;
      }
      const dwellDuration = now - tracker.bottomHoldStartTime;
      if (dwellDuration >= 300) {
        tracker.bottomDwellSatisfied = true;
        formCue = 'Solid lunge depth held! Return upright!';
      } else {
        formCue = `Hold 90° depth (${dwellDuration}/300ms)...`;
      }
    } else {
      formCue = 'Hold 90°, step back!';
    }
  } else if (activeKneeAngle >= 90 && activeKneeAngle < 155) {
    if (tracker && !tracker.bottomDwellSatisfied && currentStage !== 'down') {
      tracker.bottomHoldStartTime = 0;
    }
  } else if (activeKneeAngle > 155) {
    // UP Phase: Return past 155°
    newStage = 'up';
    const hadDwell = tracker ? tracker.bottomDwellSatisfied : currentStage === 'down';
    const hipReturned = tracker ? Math.abs(activeHip.y - tracker.baselineY) < 0.045 : true;
    const cooldownOk = tracker ? now - tracker.lastRepTime > 1000 : true;

    if (hadDwell && hipReturned && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.bottomDwellSatisfied = false;
        tracker.bottomHoldStartTime = 0;
        tracker.lastRepTime = now;
      }
      formCue = 'Strong lunge rep!';
    } else {
      if (tracker) {
        tracker.bottomDwellSatisfied = false;
        tracker.bottomHoldStartTime = 0;
      }
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
// Visibility Gate: >0.65. Floor horizontal orientation required. Timer only increments while alignment is 165°-185°.
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
      formFaults: [{ joint: 'hip', x: 0.5, y: 0.5, message: 'Step back to fit in frame (Confidence > 65%)' }],
      isGoodForm: false,
      formCue: 'Step back to fit in frame'
    };
  }

  const shoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const hip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const ankle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const straightLineAngle = calculateAngle(shoulder, hip, ankle);

  // Orientation Check: Plank MUST be performed horizontally on the floor!
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
    repCompleted: false, // Isometric hold: seconds are accumulated by hold timer in WorkoutContext
    formFaults,
    isGoodForm: isHorizontalProne && isGoodForm,
    formCue
  };
};

/**
 * Stateful Biomechanical Kinematic Engine
 * Maintains internal stages and dwell states synchronously to eliminate race conditions and phantom reps.
 */
export class ExerciseRepEngine {
  private currentExercise: ExerciseKey = 'squats';
  private stage: 'up' | 'down' = 'up';
  private tracker: ExerciseTrackerState = {
    standingConfirmed: false,
    lockoutConfirmed: false,
    closedConfirmed: false,
    bottomHoldStartTime: 0,
    bottomDwellSatisfied: false,
    openHoldStartTime: 0,
    openDwellSatisfied: false,
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
      bottomHoldStartTime: 0,
      bottomDwellSatisfied: false,
      openHoldStartTime: 0,
      openDwellSatisfied: false,
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
