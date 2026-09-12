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
 * Friendly Visibility Gate:
 * Verifies that user joints are detected in frame (confidence > 0.45).
 * Allows smooth, forgiving tracking in normal room lighting.
 */
export const checkLandmarksInFrame = (
  landmarks: LandmarkPoint[],
  indices: number[],
  minConfidence = 0.45
): boolean => {
  if (!landmarks || landmarks.length < 33) return false;
  return indices.every((idx) => {
    const pt = landmarks[idx];
    if (!pt) return false;
    const vis = pt.visibility !== undefined ? pt.visibility : 1.0;
    if (vis < minConfidence) return false;
    // Basic boundary check
    if (pt.x < 0.01 || pt.x > 0.99 || pt.y < 0.01 || pt.y > 0.99) return false;
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
}

// 1. FORGIVING SQUAT KINEMATICS
// Accessible thresholds: Down (<125° knee flexion), Up (>145°). Form faults give helpful cues without blocking reps.
export const evaluateSquatLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_KNEE,
    LANDMARK_INDEX.LEFT_ANKLE,
    LANDMARK_INDEX.LEFT_SHOULDER
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.45);
  if (!inFrame) {
    if (tracker) tracker.bottomReached = false;
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'hip', x: 0.5, y: 0.5, message: 'Step into camera view' }],
      isGoodForm: false,
      formCue: 'Step into camera view'
    };
  }

  // Choose the leg with highest visibility
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

  // Gentle guidance cues (do NOT block reps)
  if (kneeAngle > 135 && currentStage === 'down') {
    formFaults.push({ joint: 'knee', x: knee.x, y: knee.y, message: 'Bend knees lower' });
  }
  if (torsoAngle < 55) {
    formFaults.push({ joint: 'hip', x: hip.x, y: hip.y, message: 'Chest up' });
  }

  // Accessible State Machine: Down (<125°) -> Up (>145°)
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (kneeAngle < 125) {
    newStage = 'down';
    if (tracker) tracker.bottomReached = true;
    formCue = 'Good depth, now stand up!';
  } else if (kneeAngle > 145) {
    newStage = 'up';
    const hadBottom = tracker ? tracker.bottomReached : currentStage === 'down';
    const cooldownOk = tracker ? now - tracker.lastRepTime > 600 : true;

    if (hadBottom && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.bottomReached = false;
        tracker.lastRepTime = now;
      }
      formCue = 'Squat counted! Great job!';
    }
  }

  return {
    inFrame: true,
    angle: kneeAngle,
    stage: newStage,
    repCompleted,
    formFaults,
    isGoodForm: true,
    formCue
  };
};

// 2. FORGIVING PUSH-UP KINEMATICS
// Accessible thresholds: Down (<125° elbow flexion), Up (>145°). Lenient prone orientation (supports incline/knees).
export const evaluatePushupLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_ELBOW,
    LANDMARK_INDEX.LEFT_WRIST
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.45);
  if (!inFrame) {
    if (tracker) tracker.bottomReached = false;
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'elbow', x: 0.5, y: 0.5, message: 'Step into camera view' }],
      isGoodForm: false,
      formCue: 'Step into camera view'
    };
  }

  const leftVis = (landmarks[LANDMARK_INDEX.LEFT_ELBOW]?.visibility ?? 0.8);
  const rightVis = (landmarks[LANDMARK_INDEX.RIGHT_ELBOW]?.visibility ?? 0.8);
  const isLeft = leftVis >= rightVis;

  const shoulder = landmarks[isLeft ? LANDMARK_INDEX.LEFT_SHOULDER : LANDMARK_INDEX.RIGHT_SHOULDER];
  const elbow = landmarks[isLeft ? LANDMARK_INDEX.LEFT_ELBOW : LANDMARK_INDEX.RIGHT_ELBOW];
  const wrist = landmarks[isLeft ? LANDMARK_INDEX.LEFT_WRIST : LANDMARK_INDEX.RIGHT_WRIST];

  const elbowAngle = calculateAngle(shoulder, elbow, wrist) || 160;

  // Accessible State Machine: Down (<125°) -> Up (>145°)
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (elbowAngle < 125) {
    newStage = 'down';
    if (tracker) tracker.bottomReached = true;
    formCue = 'Good press, now push up!';
  } else if (elbowAngle > 145) {
    newStage = 'up';
    const hadBottom = tracker ? tracker.bottomReached : currentStage === 'down';
    const cooldownOk = tracker ? now - tracker.lastRepTime > 600 : true;

    if (hadBottom && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.bottomReached = false;
        tracker.lastRepTime = now;
      }
      formCue = 'Push-up counted! Strong!';
    }
  }

  return {
    inFrame: true,
    angle: elbowAngle,
    stage: newStage,
    repCompleted,
    formFaults: [],
    isGoodForm: true,
    formCue
  };
};

// 3. FORGIVING JUMPING JACKS KINEMATICS
// Accessible thresholds: Open (>95° arm abduction), Closed (<70°).
export const evaluateJumpingJackLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_WRIST,
    LANDMARK_INDEX.LEFT_HIP
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.45);
  if (!inFrame) {
    if (tracker) tracker.openReached = false;
    return {
      inFrame: false,
      angle: 45,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'wrist', x: 0.5, y: 0.5, message: 'Step into camera view' }],
      isGoodForm: false,
      formCue: 'Step into camera view'
    };
  }

  const leftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const leftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const leftWrist = landmarks[LANDMARK_INDEX.LEFT_WRIST];

  const armAngle = calculateAngle(leftHip, leftShoulder, leftWrist) || 45;

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  // Open: Arms raised out (>95°)
  if (armAngle > 95) {
    newStage = 'up';
    if (tracker) tracker.openReached = true;
    formCue = 'Arms out wide!';
  } else if (armAngle < 70) {
    // Closed: Arms returned to sides (<70°)
    newStage = 'down';
    const hadOpen = tracker ? tracker.openReached : currentStage === 'up';
    const cooldownOk = tracker ? now - tracker.lastRepTime > 500 : true;

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

// 4. FORGIVING LUNGE KINEMATICS
// Accessible thresholds: Down (<125° knee flexion), Up (>145°).
export const evaluateLungeLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_KNEE,
    LANDMARK_INDEX.LEFT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.45);
  if (!inFrame) {
    if (tracker) tracker.bottomReached = false;
    return {
      inFrame: false,
      angle: 160,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'knee', x: 0.5, y: 0.5, message: 'Step into camera view' }],
      isGoodForm: false,
      formCue: 'Step into camera view'
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

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (activeKneeAngle < 125) {
    newStage = 'down';
    if (tracker) tracker.bottomReached = true;
    formCue = 'Good lunge step, now rise!';
  } else if (activeKneeAngle > 145) {
    newStage = 'up';
    const hadBottom = tracker ? tracker.bottomReached : currentStage === 'down';
    const cooldownOk = tracker ? now - tracker.lastRepTime > 600 : true;

    if (hadBottom && cooldownOk) {
      repCompleted = true;
      if (tracker) {
        tracker.bottomReached = false;
        tracker.lastRepTime = now;
      }
      formCue = 'Lunge counted! Excellent!';
    }
  }

  return {
    inFrame: true,
    angle: activeKneeAngle,
    stage: newStage,
    repCompleted,
    formFaults: [],
    isGoodForm: true,
    formCue
  };
};

// 5. FORGIVING PLANK STATIC HOLD ENGINE
// Wide alignment range: 135° to 205°. As long as user is on floor in plank position, timer counts smoothly.
export const evaluatePlankLandmarks = (landmarks: LandmarkPoint[]): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.45);
  if (!inFrame) {
    return {
      inFrame: false,
      angle: 180,
      stage: 'down',
      repCompleted: false,
      formFaults: [{ joint: 'hip', x: 0.5, y: 0.5, message: 'Step into camera view' }],
      isGoodForm: false,
      formCue: 'Step into camera view'
    };
  }

  const shoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const hip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const ankle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const straightLineAngle = calculateAngle(shoulder, hip, ankle);

  // Lenient horizontal prone orientation (supports forearms, hands, knees)
  const vertDelta = Math.abs(shoulder.y - ankle.y);
  const horizDelta = Math.abs(shoulder.x - ankle.x);
  const isHorizontalProne = horizDelta > 0.18 || vertDelta < 0.40;

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
          message: 'Get into horizontal plank on floor'
        }
      ],
      isGoodForm: false,
      formCue: 'Get into horizontal plank on floor'
    };
  }

  const formFaults: FormFault[] = [];
  let isGoodForm = true;
  let formCue = 'Plank holding strong!';

  // Wide forgiving range: 135° to 205°
  if (straightLineAngle < 135 || straightLineAngle > 205) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: 'Keep body straight'
    });
    // Gentle warning without breaking the hold
  }

  return {
    inFrame: true,
    angle: straightLineAngle,
    stage: 'down',
    repCompleted: false,
    formFaults,
    isGoodForm: isHorizontalProne,
    formCue
  };
};

// 6. MOBILE POSTURE: CERVICAL RETRACTION (CHIN TUCK)
export const evaluateCervicalRetractionLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.NOSE,
    LANDMARK_INDEX.LEFT_EAR,
    LANDMARK_INDEX.LEFT_SHOULDER
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.40);
  if (!inFrame) {
    if (tracker) tracker.bottomReached = false;
    return {
      inFrame: false,
      angle: 120,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'nose', x: 0.5, y: 0.5, message: 'Position head in front of phone' }],
      isGoodForm: false,
      formCue: 'Face camera at eye level'
    };
  }

  const nose = landmarks[LANDMARK_INDEX.NOSE];
  const ear = (landmarks[LANDMARK_INDEX.LEFT_EAR]?.visibility ?? 0.8) >= (landmarks[LANDMARK_INDEX.RIGHT_EAR]?.visibility ?? 0.8)
    ? landmarks[LANDMARK_INDEX.LEFT_EAR]
    : landmarks[LANDMARK_INDEX.RIGHT_EAR];
  const shoulder = (landmarks[LANDMARK_INDEX.LEFT_SHOULDER]?.visibility ?? 0.8) >= (landmarks[LANDMARK_INDEX.RIGHT_SHOULDER]?.visibility ?? 0.8)
    ? landmarks[LANDMARK_INDEX.LEFT_SHOULDER]
    : landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];

  const alignmentAngle = calculateAngle(nose, ear, shoulder) || 115;
  const formFaults: FormFault[] = [];

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (alignmentAngle < 110) {
    newStage = 'down';
    if (tracker) tracker.bottomReached = true;
    formCue = 'Good chin tuck! Now slowly release';
  } else if (alignmentAngle > 125) {
    newStage = 'up';
    if (tracker && tracker.bottomReached) {
      if (now - tracker.lastRepTime > 400) {
        repCompleted = true;
        tracker.lastRepTime = now;
      }
      tracker.bottomReached = false;
    }
  }

  return {
    inFrame: true,
    angle: alignmentAngle,
    stage: newStage,
    repCompleted,
    formFaults,
    isGoodForm: alignmentAngle < 115,
    formCue
  };
};

// 7. MOBILE POSTURE: STANDING SCAPULAR & CHEST OPENER
export const evaluateChestOpenerLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState
): TelemetryResult => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.RIGHT_SHOULDER,
    LANDMARK_INDEX.LEFT_ELBOW,
    LANDMARK_INDEX.RIGHT_ELBOW
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.40);
  if (!inFrame) {
    if (tracker) tracker.openReached = false;
    return {
      inFrame: false,
      angle: 60,
      stage: currentStage,
      repCompleted: false,
      formFaults: [{ joint: 'shoulder', x: 0.5, y: 0.5, message: 'Position upper body in frame' }],
      isGoodForm: false,
      formCue: 'Show shoulders and arms to camera'
    };
  }

  const leftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK_INDEX.RIGHT_SHOULDER];
  const leftElbow = landmarks[LANDMARK_INDEX.LEFT_ELBOW];
  const rightElbow = landmarks[LANDMARK_INDEX.RIGHT_ELBOW];

  const leftChestAngle = calculateAngle(leftElbow, leftShoulder, rightShoulder);
  const rightChestAngle = calculateAngle(rightElbow, rightShoulder, leftShoulder);
  const chestSpreadAngle = Math.round((leftChestAngle + rightChestAngle) / 2) || 80;

  const formFaults: FormFault[] = [];
  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (chestSpreadAngle > 105) {
    newStage = 'down';
    if (tracker) tracker.openReached = true;
    formCue = 'Shoulder blades pinched! Return to center';
  } else if (chestSpreadAngle < 80) {
    newStage = 'up';
    if (tracker && tracker.openReached) {
      if (now - tracker.lastRepTime > 400) {
        repCompleted = true;
        tracker.lastRepTime = now;
      }
      tracker.openReached = false;
    }
  }

  return {
    inFrame: true,
    angle: chestSpreadAngle,
    stage: newStage,
    repCompleted,
    formFaults,
    isGoodForm: chestSpreadAngle > 100,
    formCue
  };
};

/**
 * Stateful Biomechanical Kinematic Engine
 * Smooth, forgiving, and responsive.
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
    lastRepTime: 0
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
      lastRepTime: 0
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
      case 'cervicalRetraction':
        result = evaluateCervicalRetractionLandmarks(landmarks, this.stage, this.tracker);
        break;
      case 'chestOpener':
        result = evaluateChestOpenerLandmarks(landmarks, this.stage, this.tracker);
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
