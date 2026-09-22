import type { ExerciseConfig, ExerciseKey, FormFault, LandmarkPoint, TelemetryResult } from '../../types/fitness';
import { EXERCISE_CATALOG, resolveExerciseConfig, validateExerciseConfig } from '../../data/exercises.ts';

export { EXERCISE_CATALOG, resolveExerciseConfig, validateExerciseConfig };

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

export const DEFAULT_MIN_JOINT_CONFIDENCE = 0.25;
export const DEFAULT_MIN_REP_CONFIDENCE = 0.30;
export const DEFAULT_MIN_FORM_CONFIDENCE = 0.35;

/**
 * Checks whether an angle's defining landmarks have sufficient confidence
 * to be eligible for rep state transitions.
 */
export const isAngleEligibleForReps = (
  points: (LandmarkPoint | undefined | null)[],
  minConfidence = DEFAULT_MIN_REP_CONFIDENCE
): boolean => {
  if (!points || points.length < 3) return false;
  return points.every((pt) => pt && (pt.visibility === undefined || pt.visibility >= minConfidence));
};

/**
 * Visibility Gate:
 * Verifies that key user joints are detected in frame above minConfidence.
 */
export const checkLandmarksInFrame = (
  landmarks: LandmarkPoint[],
  indices: number[],
  minConfidence = 0.20,
  minVisibleCount = 2
): boolean => {
  if (!landmarks || landmarks.length < 33) return false;
  let visibleCount = 0;
  for (const idx of indices) {
    const pt = landmarks[idx];
    if (pt && (pt.visibility === undefined || pt.visibility >= minConfidence)) {
      visibleCount++;
    }
  }
  return visibleCount >= Math.min(minVisibleCount, indices.length);
};

export interface ExerciseTrackerState {
  standingConfirmed: boolean;
  lockoutConfirmed: boolean;
  closedConfirmed: boolean;
  bottomReached: boolean;
  openReached: boolean;
  lastRepTime: number;
}

// 1. SQUAT KINEMATICS - Decreasing flexion
export const evaluateSquatLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState,
  config: ExerciseConfig = EXERCISE_CATALOG.squats
): TelemetryResult => {
  const minConf = config.confidenceThresholds?.minJointConfidence ?? DEFAULT_MIN_JOINT_CONFIDENCE;
  const minJoints = config.confidenceThresholds?.minVisibleJoints ?? 2;
  const minRepConf = config.confidenceThresholds?.minRepConfidence ?? DEFAULT_MIN_REP_CONFIDENCE;
  const minFormConf = config.confidenceThresholds?.minFormGuardConfidence ?? DEFAULT_MIN_FORM_CONFIDENCE;

  const leftIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE], minConf, minJoints);
  const rightIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_KNEE], minConf, minJoints);

  const inFrame = leftIn || rightIn;
  if (!inFrame) {
    if (tracker) tracker.bottomReached = false;
    return {
      inFrame: false,
      angle: config.repThresholds.upThreshold,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Camera active • Move into frame'
    };
  }

  // Choose leg with best visibility
  const leftVis = (landmarks[LANDMARK_INDEX.LEFT_KNEE]?.visibility ?? 0.8) + (landmarks[LANDMARK_INDEX.LEFT_HIP]?.visibility ?? 0.8);
  const rightVis = (landmarks[LANDMARK_INDEX.RIGHT_KNEE]?.visibility ?? 0.8) + (landmarks[LANDMARK_INDEX.RIGHT_HIP]?.visibility ?? 0.8);
  const isLeft = leftVis >= rightVis;

  const hip = landmarks[isLeft ? LANDMARK_INDEX.LEFT_HIP : LANDMARK_INDEX.RIGHT_HIP];
  const knee = landmarks[isLeft ? LANDMARK_INDEX.LEFT_KNEE : LANDMARK_INDEX.RIGHT_KNEE];
  let ankle = landmarks[isLeft ? LANDMARK_INDEX.LEFT_ANKLE : LANDMARK_INDEX.RIGHT_ANKLE];
  const shoulder = landmarks[isLeft ? LANDMARK_INDEX.LEFT_SHOULDER : LANDMARK_INDEX.RIGHT_SHOULDER];

  // If ankle is cropped out of bottom of camera, extrapolate straight down from knee
  if (!ankle || (ankle.visibility ?? 0) < minConf) {
    ankle = { x: knee.x, y: Math.min(1.0, knee.y + 0.35), visibility: 0.5 };
  }

  const kneeAngle = calculateAngle(hip, knee, ankle) || config.repThresholds.upThreshold;
  const torsoAngle = calculateAngle(shoulder, hip, knee) || config.repThresholds.upThreshold;

  const formFaults: FormFault[] = [];

  const earlyCue = config.formThresholds?.earlyCueAngle ?? 135;
  const minTorso = config.formThresholds?.minTorsoAngle ?? 55;

  if (kneeAngle > earlyCue && currentStage === 'down') {
    formFaults.push({ joint: 'knee', x: knee.x, y: knee.y, message: 'Bend knees lower' });
  }

  // Guard torso feedback: only issue cue if shoulder landmark has sufficient confidence
  const shoulderConfident = shoulder && (shoulder.visibility === undefined || shoulder.visibility >= minFormConf);
  if (shoulderConfident && torsoAngle < minTorso) {
    formFaults.push({ joint: 'hip', x: hip.x, y: hip.y, message: 'Chest up' });
  }

  const downThreshold = config.repThresholds.downThreshold;
  const upThreshold = config.repThresholds.upThreshold;
  const cooldownMs = config.repThresholds.repCooldownMs ?? 600;

  // Rep counting eligibility check: active knee angle must have valid joint confidence
  const repEligible = isAngleEligibleForReps([hip, knee, ankle], minRepConf);

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (repEligible) {
    if (kneeAngle <= downThreshold) {
      newStage = 'down';
      if (tracker) tracker.bottomReached = true;
      formCue = 'Good depth, now stand up!';
    } else if (kneeAngle >= upThreshold) {
      newStage = 'up';
      const hadBottom = tracker ? tracker.bottomReached : currentStage === 'down';
      const cooldownOk = tracker ? now - tracker.lastRepTime > cooldownMs : true;

      if (hadBottom && cooldownOk) {
        repCompleted = true;
        if (tracker) {
          tracker.bottomReached = false;
          tracker.lastRepTime = now;
        }
        formCue = 'Squat counted! Great job!';
      }
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

// 2. PUSH-UP KINEMATICS - Decreasing flexion
export const evaluatePushupLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState,
  config: ExerciseConfig = EXERCISE_CATALOG.pushups
): TelemetryResult => {
  const minConf = config.confidenceThresholds?.minJointConfidence ?? DEFAULT_MIN_JOINT_CONFIDENCE;
  const minJoints = config.confidenceThresholds?.minVisibleJoints ?? 2;
  const minRepConf = config.confidenceThresholds?.minRepConfidence ?? DEFAULT_MIN_REP_CONFIDENCE;

  const leftIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW], minConf, minJoints);
  const rightIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_ELBOW], minConf, minJoints);

  const inFrame = leftIn || rightIn;
  if (!inFrame) {
    if (tracker) tracker.bottomReached = false;
    return {
      inFrame: false,
      angle: config.repThresholds.upThreshold,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Camera active • Move into frame'
    };
  }

  const leftVis = (landmarks[LANDMARK_INDEX.LEFT_ELBOW]?.visibility ?? 0.8) + (landmarks[LANDMARK_INDEX.LEFT_SHOULDER]?.visibility ?? 0.8);
  const rightVis = (landmarks[LANDMARK_INDEX.RIGHT_ELBOW]?.visibility ?? 0.8) + (landmarks[LANDMARK_INDEX.RIGHT_SHOULDER]?.visibility ?? 0.8);
  const isLeft = leftVis >= rightVis;

  const shoulder = landmarks[isLeft ? LANDMARK_INDEX.LEFT_SHOULDER : LANDMARK_INDEX.RIGHT_SHOULDER];
  const elbow = landmarks[isLeft ? LANDMARK_INDEX.LEFT_ELBOW : LANDMARK_INDEX.RIGHT_ELBOW];
  const wrist = landmarks[isLeft ? LANDMARK_INDEX.LEFT_WRIST : LANDMARK_INDEX.RIGHT_WRIST];

  const elbowAngle = calculateAngle(shoulder, elbow, wrist) || config.repThresholds.upThreshold;

  // Rep counting eligibility check: shoulder, elbow, and wrist must be sufficiently visible
  const repEligible = isAngleEligibleForReps([shoulder, elbow, wrist], minRepConf);

  const downThreshold = config.repThresholds.downThreshold;
  const upThreshold = config.repThresholds.upThreshold;
  const cooldownMs = config.repThresholds.repCooldownMs ?? 600;

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (repEligible) {
    if (elbowAngle <= downThreshold) {
      newStage = 'down';
      if (tracker) tracker.bottomReached = true;
      formCue = 'Good press, now push up!';
    } else if (elbowAngle >= upThreshold) {
      newStage = 'up';
      const hadBottom = tracker ? tracker.bottomReached : currentStage === 'down';
      const cooldownOk = tracker ? now - tracker.lastRepTime > cooldownMs : true;

      if (hadBottom && cooldownOk) {
        repCompleted = true;
        if (tracker) {
          tracker.bottomReached = false;
          tracker.lastRepTime = now;
        }
        formCue = 'Push-up counted! Strong!';
      }
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

// 3. JUMPING JACKS KINEMATICS - Increasing abduction
export const evaluateJumpingJackLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState,
  config: ExerciseConfig = EXERCISE_CATALOG.jumpingJacks
): TelemetryResult => {
  const minConf = config.confidenceThresholds?.minJointConfidence ?? DEFAULT_MIN_JOINT_CONFIDENCE;
  const minJoints = config.confidenceThresholds?.minVisibleJoints ?? 2;
  const minRepConf = config.confidenceThresholds?.minRepConfidence ?? DEFAULT_MIN_REP_CONFIDENCE;

  const leftIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_HIP], minConf, minJoints);
  const rightIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_HIP], minConf, minJoints);

  const inFrame = leftIn || rightIn;
  if (!inFrame) {
    if (tracker) tracker.openReached = false;
    return {
      inFrame: false,
      angle: config.repThresholds.downThreshold,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Camera active • Move into frame'
    };
  }

  const leftAngle = calculateAngle(landmarks[LANDMARK_INDEX.LEFT_HIP], landmarks[LANDMARK_INDEX.LEFT_SHOULDER], landmarks[LANDMARK_INDEX.LEFT_WRIST]) || config.repThresholds.downThreshold;
  const rightAngle = calculateAngle(landmarks[LANDMARK_INDEX.RIGHT_HIP], landmarks[LANDMARK_INDEX.RIGHT_SHOULDER], landmarks[LANDMARK_INDEX.RIGHT_WRIST]) || config.repThresholds.downThreshold;

  const isLeft = leftAngle >= rightAngle;
  const armAngle = isLeft ? leftAngle : rightAngle;

  // Determine if active arm meets minRepConfidence for rep counting
  const repEligible = isLeft
    ? (landmarks[LANDMARK_INDEX.LEFT_HIP]?.visibility ?? 1) >= minRepConf &&
      (landmarks[LANDMARK_INDEX.LEFT_SHOULDER]?.visibility ?? 1) >= minRepConf &&
      (landmarks[LANDMARK_INDEX.LEFT_WRIST]?.visibility ?? 1) >= minRepConf
    : (landmarks[LANDMARK_INDEX.RIGHT_HIP]?.visibility ?? 1) >= minRepConf &&
      (landmarks[LANDMARK_INDEX.RIGHT_SHOULDER]?.visibility ?? 1) >= minRepConf &&
      (landmarks[LANDMARK_INDEX.RIGHT_WRIST]?.visibility ?? 1) >= minRepConf;

  const upThreshold = config.repThresholds.upThreshold; // Open / wide V threshold
  const downThreshold = config.repThresholds.downThreshold; // Closed / returned threshold
  const cooldownMs = config.repThresholds.repCooldownMs ?? 500;

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (repEligible) {
    // Open: Arms raised out past upThreshold
    if (armAngle >= upThreshold) {
      newStage = 'up';
      if (tracker) tracker.openReached = true;
      formCue = 'Arms out wide!';
    } else if (armAngle <= downThreshold) {
      // Closed: Arms returned to sides below downThreshold
      newStage = 'down';
      const hadOpen = tracker ? tracker.openReached : currentStage === 'up';
      const cooldownOk = tracker ? now - tracker.lastRepTime > cooldownMs : true;

      if (hadOpen && cooldownOk) {
        repCompleted = true;
        if (tracker) {
          tracker.openReached = false;
          tracker.lastRepTime = now;
        }
        formCue = 'Jumping jack counted!';
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

// 4. LUNGE KINEMATICS - Decreasing flexion
export const evaluateLungeLandmarks = (
  landmarks: LandmarkPoint[],
  currentStage: 'up' | 'down',
  tracker?: ExerciseTrackerState,
  config: ExerciseConfig = EXERCISE_CATALOG.lunges
): TelemetryResult => {
  const minConf = config.confidenceThresholds?.minJointConfidence ?? DEFAULT_MIN_JOINT_CONFIDENCE;
  const minJoints = config.confidenceThresholds?.minVisibleJoints ?? 2;
  const minRepConf = config.confidenceThresholds?.minRepConfidence ?? DEFAULT_MIN_REP_CONFIDENCE;

  const leftIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE], minConf, minJoints);
  const rightIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_KNEE], minConf, minJoints);

  const inFrame = leftIn || rightIn;
  if (!inFrame) {
    if (tracker) tracker.bottomReached = false;
    return {
      inFrame: false,
      angle: config.repThresholds.upThreshold,
      stage: currentStage,
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Camera active • Move into frame'
    };
  }

  const leftKneeAngle = calculateAngle(
    landmarks[LANDMARK_INDEX.LEFT_HIP],
    landmarks[LANDMARK_INDEX.LEFT_KNEE],
    landmarks[LANDMARK_INDEX.LEFT_ANKLE]
  ) || config.repThresholds.upThreshold;
  const rightKneeAngle = calculateAngle(
    landmarks[LANDMARK_INDEX.RIGHT_HIP],
    landmarks[LANDMARK_INDEX.RIGHT_KNEE],
    landmarks[LANDMARK_INDEX.RIGHT_ANKLE]
  ) || config.repThresholds.upThreshold;

  const activeKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
  const isLeft = leftKneeAngle <= rightKneeAngle;

  const hip = landmarks[isLeft ? LANDMARK_INDEX.LEFT_HIP : LANDMARK_INDEX.RIGHT_HIP];
  const knee = landmarks[isLeft ? LANDMARK_INDEX.LEFT_KNEE : LANDMARK_INDEX.RIGHT_KNEE];
  const ankle = landmarks[isLeft ? LANDMARK_INDEX.LEFT_ANKLE : LANDMARK_INDEX.RIGHT_ANKLE];

  // Rep counting eligibility: active leg joints must meet minRepConfidence
  const repEligible = isAngleEligibleForReps([hip, knee, ankle], minRepConf);

  const downThreshold = config.repThresholds.downThreshold;
  const upThreshold = config.repThresholds.upThreshold;
  const cooldownMs = config.repThresholds.repCooldownMs ?? 600;

  let newStage = currentStage;
  let repCompleted = false;
  let formCue: string | null = null;
  const now = Date.now();

  if (repEligible) {
    if (activeKneeAngle <= downThreshold) {
      newStage = 'down';
      if (tracker) tracker.bottomReached = true;
      formCue = 'Good lunge step, now rise!';
    } else if (activeKneeAngle >= upThreshold) {
      newStage = 'up';
      const hadBottom = tracker ? tracker.bottomReached : currentStage === 'down';
      const cooldownOk = tracker ? now - tracker.lastRepTime > cooldownMs : true;

      if (hadBottom && cooldownOk) {
        repCompleted = true;
        if (tracker) {
          tracker.bottomReached = false;
          tracker.lastRepTime = now;
        }
        formCue = 'Lunge counted! Excellent!';
      }
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

// 5. PLANK STATIC HOLD ENGINE - Isometric hold
export const evaluatePlankLandmarks = (
  landmarks: LandmarkPoint[],
  config: ExerciseConfig = EXERCISE_CATALOG.plank
): TelemetryResult => {
  const minConf = config.confidenceThresholds?.minJointConfidence ?? DEFAULT_MIN_JOINT_CONFIDENCE;
  const minJoints = config.confidenceThresholds?.minVisibleJoints ?? 2;
  const minFormConf = config.confidenceThresholds?.minFormGuardConfidence ?? DEFAULT_MIN_FORM_CONFIDENCE;

  const leftIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_HIP], minConf, minJoints);
  const rightIn = checkLandmarksInFrame(landmarks, [LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_HIP], minConf, minJoints);

  const inFrame = leftIn || rightIn;
  if (!inFrame) {
    return {
      inFrame: false,
      angle: config.formThresholds?.targetAngle ?? 180,
      stage: 'down',
      repCompleted: false,
      formFaults: [],
      isGoodForm: true,
      formCue: 'Camera active • Move into frame'
    };
  }

  const isLeft = (landmarks[LANDMARK_INDEX.LEFT_SHOULDER]?.visibility ?? 0) >= (landmarks[LANDMARK_INDEX.RIGHT_SHOULDER]?.visibility ?? 0);
  const shoulder = landmarks[isLeft ? LANDMARK_INDEX.LEFT_SHOULDER : LANDMARK_INDEX.RIGHT_SHOULDER];
  const hip = landmarks[isLeft ? LANDMARK_INDEX.LEFT_HIP : LANDMARK_INDEX.RIGHT_HIP];
  const ankle = landmarks[isLeft ? LANDMARK_INDEX.LEFT_ANKLE : LANDMARK_INDEX.RIGHT_ANKLE] || { x: hip.x, y: hip.y, visibility: 0.5 };

  const straightLineAngle = calculateAngle(shoulder, hip, ankle) || 180;

  const minHoriz = config.formThresholds?.minHorizontalSpan ?? 0.18;
  const maxVert = config.formThresholds?.maxVerticalDelta ?? 0.40;
  const vertDelta = Math.abs(shoulder.y - ankle.y);
  const horizDelta = Math.abs(shoulder.x - ankle.x);
  const isHorizontalProne = horizDelta > minHoriz || vertDelta < maxVert;

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
  const targetAngle = config.formThresholds?.targetAngle ?? 180;
  const maxDeviation = config.formThresholds?.maxDeviation ?? 15;
  const deviation = Math.abs(targetAngle - straightLineAngle);
  const isAligned = deviation <= maxDeviation;

  // Form check: only issue form fault if key joints meet minFormConf
  const canIssueFormFault =
    (shoulder && (shoulder.visibility === undefined || shoulder.visibility >= minFormConf)) &&
    (hip && (hip.visibility === undefined || hip.visibility >= minFormConf));

  let formCue = 'Plank holding strong!';
  if (!isAligned && canIssueFormFault) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: 'Keep body straight'
    });
    formCue = 'Align hips with shoulders and heels';
  }

  return {
    inFrame: true,
    angle: straightLineAngle,
    stage: 'down',
    repCompleted: false,
    formFaults,
    isGoodForm: isHorizontalProne && isAligned,
    formCue
  };
};

export interface PlankAlignmentMetrics {
  rawAngle: number;
  deviation: number;
  isGoodAlignment: boolean;
}

/**
 * Calculates plank alignment metrics by measuring angular deviation from 180°.
 */
export const getPlankAlignmentMetrics = (
  rawAngle: number,
  maxDeviationThreshold: number = EXERCISE_CATALOG.plank.formThresholds?.maxDeviation ?? 15
): PlankAlignmentMetrics => {
  const deviation = Math.abs(180 - rawAngle);
  return {
    rawAngle,
    deviation,
    isGoodAlignment: deviation <= maxDeviationThreshold
  };
};

/**
 * Stateful Biomechanical Kinematic Engine
 * Driven dynamically by EXERCISE_CATALOG.
 */
export class ExerciseRepEngine {
  private currentExercise: ExerciseKey = 'squats';
  private stage: 'up' | 'down' = 'up';
  private catalog: Record<ExerciseKey, ExerciseConfig>;
  private tracker: ExerciseTrackerState = {
    standingConfirmed: false,
    lockoutConfirmed: false,
    closedConfirmed: false,
    bottomReached: false,
    openReached: false,
    lastRepTime: 0
  };

  constructor(catalog: Record<ExerciseKey, ExerciseConfig> = EXERCISE_CATALOG) {
    this.catalog = { ...catalog };
  }

  setExerciseConfig(exerciseKey: ExerciseKey, config: Partial<ExerciseConfig>) {
    this.catalog[exerciseKey] = resolveExerciseConfig({ ...config, id: exerciseKey });
  }

  getExerciseConfig(exerciseKey: ExerciseKey): ExerciseConfig {
    return this.catalog[exerciseKey];
  }

  reset(exercise?: ExerciseKey) {
    if (exercise) this.currentExercise = exercise;
    const config = this.catalog[this.currentExercise] || EXERCISE_CATALOG[this.currentExercise];
    this.stage = config.direction === 'increasing_abduction' || config.direction === 'isometric_hold' ? 'down' : 'up';
    this.tracker = {
      standingConfirmed: false,
      lockoutConfirmed: false,
      closedConfirmed: false,
      bottomReached: false,
      openReached: false,
      lastRepTime: 0
    };
  }

  evaluate(
    exerciseKey: ExerciseKey,
    landmarks: LandmarkPoint[],
    customConfig?: Partial<ExerciseConfig>
  ): TelemetryResult {
    if (exerciseKey !== this.currentExercise) {
      this.reset(exerciseKey);
    }

    const config = customConfig
      ? resolveExerciseConfig({ ...customConfig, id: exerciseKey })
      : this.catalog[exerciseKey];

    let result: TelemetryResult;

    switch (exerciseKey) {
      case 'squats':
        result = evaluateSquatLandmarks(landmarks, this.stage, this.tracker, config);
        break;
      case 'pushups':
        result = evaluatePushupLandmarks(landmarks, this.stage, this.tracker, config);
        break;
      case 'jumpingJacks':
        result = evaluateJumpingJackLandmarks(landmarks, this.stage, this.tracker, config);
        break;
      case 'lunges':
        result = evaluateLungeLandmarks(landmarks, this.stage, this.tracker, config);
        break;
      case 'plank':
        result = evaluatePlankLandmarks(landmarks, config);
        break;
      default:
        result = evaluateSquatLandmarks(landmarks, this.stage, this.tracker, config);
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
