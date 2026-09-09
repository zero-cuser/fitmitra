// Vector kinematics, confidence checking, and biomechanical form analysis

// MediaPipe 33 landmark index mappings:
export const LANDMARK_INDEX = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Calculate 2D angle at vertex B between points A and C
export const calculateAngle = (pointA, pointB, pointC) => {
  if (!pointA || !pointB || !pointC) return null;

  const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
                  Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return Math.round(angle);
};

// Check if critical landmarks meet confidence threshold
export const checkLandmarksInFrame = (landmarks, requiredIndices = [], minConfidence = 0.65) => {
  if (!landmarks || landmarks.length === 0) return false;
  for (const idx of requiredIndices) {
    const pt = landmarks[idx];
    if (!pt) return false;
    const conf = pt.visibility !== undefined ? pt.visibility : (pt.score !== undefined ? pt.score : 1);
    if (conf < minConfidence) return false;
  }
  return true;
};

// 1. SQUAT KINEMATICS
export const evaluateSquatLandmarks = (landmarks, currentStage) => {
  const req = [
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_KNEE,
    LANDMARK_INDEX.LEFT_ANKLE,
    LANDMARK_INDEX.RIGHT_HIP,
    LANDMARK_INDEX.RIGHT_KNEE,
    LANDMARK_INDEX.RIGHT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.60);
  if (!inFrame) {
    return { inFrame: false, angle: 160, stage: currentStage, repCompleted: false, formFaults: [], isGoodForm: true };
  }

  // Choose side with higher visibility
  const leftVis = (landmarks[LANDMARK_INDEX.LEFT_KNEE].visibility || 1) + (landmarks[LANDMARK_INDEX.LEFT_HIP].visibility || 1);
  const rightVis = (landmarks[LANDMARK_INDEX.RIGHT_KNEE].visibility || 1) + (landmarks[LANDMARK_INDEX.RIGHT_HIP].visibility || 1);
  const isLeft = leftVis >= rightVis;

  const hip = landmarks[isLeft ? LANDMARK_INDEX.LEFT_HIP : LANDMARK_INDEX.RIGHT_HIP];
  const knee = landmarks[isLeft ? LANDMARK_INDEX.LEFT_KNEE : LANDMARK_INDEX.RIGHT_KNEE];
  const ankle = landmarks[isLeft ? LANDMARK_INDEX.LEFT_ANKLE : LANDMARK_INDEX.RIGHT_ANKLE];
  const shoulder = landmarks[isLeft ? LANDMARK_INDEX.LEFT_SHOULDER : LANDMARK_INDEX.RIGHT_SHOULDER];

  const kneeAngle = calculateAngle(hip, knee, ankle) || 160;
  const torsoAngle = calculateAngle(shoulder, hip, knee) || 160;

  const formFaults = [];
  let isGoodForm = true;

  // Depth fault
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
      message: 'Chest up, back straight!'
    });
    isGoodForm = false;
  }

  let newStage = currentStage;
  let repCompleted = false;
  let formCue = null;

  if (kneeAngle <= 90) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Good depth, now push up!';
    }
  } else if (kneeAngle >= 160 && currentStage === 'down') {
    newStage = 'up';
    repCompleted = true;
    formCue = 'Squat rep completed!';
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

// 2. PUSH-UP KINEMATICS
export const evaluatePushupLandmarks = (landmarks, currentStage) => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_ELBOW,
    LANDMARK_INDEX.LEFT_WRIST,
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.55);
  if (!inFrame) {
    return { inFrame: false, angle: 160, stage: currentStage, repCompleted: false, formFaults: [], isGoodForm: true };
  }

  const shoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const elbow = landmarks[LANDMARK_INDEX.LEFT_ELBOW];
  const wrist = landmarks[LANDMARK_INDEX.LEFT_WRIST];
  const hip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const ankle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const elbowAngle = calculateAngle(shoulder, elbow, wrist) || 160;
  const bodyLineAngle = calculateAngle(shoulder, hip, ankle) || 180;
  const bodyDeviation = Math.abs(180 - bodyLineAngle);

  const formFaults = [];
  let isGoodForm = true;

  // Hip sagging / piking fault
  if (bodyDeviation > 18) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: bodyLineAngle < 162 ? 'Lift hips up!' : 'Lower hips straight!'
    });
    isGoodForm = false;
  }

  // Depth fault when in bottom
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
  let formCue = null;

  if (elbowAngle <= 90) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Chest down, hold tight!';
    }
  } else if (elbowAngle >= 155 && currentStage === 'down') {
    newStage = 'up';
    repCompleted = true;
    formCue = 'Clean push-up rep!';
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

// 3. JUMPING JACK KINEMATICS
export const evaluateJumpingJackLandmarks = (landmarks, currentStage) => {
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

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.55);
  if (!inFrame) {
    return { inFrame: false, angle: 40, stage: currentStage, repCompleted: false, formFaults: [], isGoodForm: true };
  }

  const leftShoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const leftHip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const leftWrist = landmarks[LANDMARK_INDEX.LEFT_WRIST];

  // Arm abduction angle
  const armAngle = calculateAngle(leftHip, leftShoulder, leftWrist) || 40;

  // Ankle spread distance
  const ankleDist = Math.abs(landmarks[LANDMARK_INDEX.LEFT_ANKLE].x - landmarks[LANDMARK_INDEX.RIGHT_ANKLE].x);

  const formFaults = [];
  let isGoodForm = true;

  if (armAngle < 120 && currentStage === 'up') {
    formFaults.push({
      joint: 'wrist',
      x: leftWrist.x,
      y: leftWrist.y,
      message: 'Raise arms overhead!'
    });
    isGoodForm = false;
  }

  let newStage = currentStage;
  let repCompleted = false;
  let formCue = null;

  if (armAngle >= 130) {
    if (currentStage !== 'up') {
      newStage = 'up';
    }
  } else if (armAngle <= 45 && currentStage === 'up') {
    newStage = 'down';
    repCompleted = true;
    formCue = 'Great rhythm, keep jumping!';
  }

  return {
    inFrame: true,
    angle: armAngle,
    stage: newStage,
    repCompleted,
    formFaults,
    isGoodForm,
    formCue
  };
};

// 4. LUNGE KINEMATICS
export const evaluateLungeLandmarks = (landmarks, currentStage) => {
  const req = [
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_KNEE,
    LANDMARK_INDEX.LEFT_ANKLE,
    LANDMARK_INDEX.RIGHT_HIP,
    LANDMARK_INDEX.RIGHT_KNEE,
    LANDMARK_INDEX.RIGHT_ANKLE,
    LANDMARK_INDEX.LEFT_SHOULDER
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.60);
  if (!inFrame) {
    return { inFrame: false, angle: 160, stage: currentStage, repCompleted: false, formFaults: [], isGoodForm: true };
  }

  // Front knee usually has larger flexion in lunge bottom
  const leftKneeAngle = calculateAngle(landmarks[LANDMARK_INDEX.LEFT_HIP], landmarks[LANDMARK_INDEX.LEFT_KNEE], landmarks[LANDMARK_INDEX.LEFT_ANKLE]) || 160;
  const rightKneeAngle = calculateAngle(landmarks[LANDMARK_INDEX.RIGHT_HIP], landmarks[LANDMARK_INDEX.RIGHT_KNEE], landmarks[LANDMARK_INDEX.RIGHT_ANKLE]) || 160;

  const activeKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
  const activeKneePt = leftKneeAngle < rightKneeAngle ? landmarks[LANDMARK_INDEX.LEFT_KNEE] : landmarks[LANDMARK_INDEX.RIGHT_KNEE];

  const formFaults = [];
  let isGoodForm = true;

  if (activeKneeAngle > 105 && currentStage === 'down') {
    formFaults.push({
      joint: 'knee',
      x: activeKneePt.x,
      y: activeKneePt.y,
      message: 'Lower front knee to 90°'
    });
    isGoodForm = false;
  }

  let newStage = currentStage;
  let repCompleted = false;
  let formCue = null;

  if (activeKneeAngle <= 92) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Solid 90° lunge, now stand tall!';
    }
  } else if (activeKneeAngle >= 155 && currentStage === 'down') {
    newStage = 'up';
    repCompleted = true;
    formCue = 'Clean lunge rep!';
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

// 5. PLANK ISOMETRIC KINEMATICS
export const evaluatePlankLandmarks = (landmarks) => {
  const req = [
    LANDMARK_INDEX.LEFT_SHOULDER,
    LANDMARK_INDEX.LEFT_HIP,
    LANDMARK_INDEX.LEFT_ANKLE
  ];

  const inFrame = checkLandmarksInFrame(landmarks, req, 0.60);
  if (!inFrame) {
    return { inFrame: false, angle: 0, stage: 'hold', repCompleted: false, formFaults: [], isGoodForm: true };
  }

  const shoulder = landmarks[LANDMARK_INDEX.LEFT_SHOULDER];
  const hip = landmarks[LANDMARK_INDEX.LEFT_HIP];
  const ankle = landmarks[LANDMARK_INDEX.LEFT_ANKLE];

  const angle = calculateAngle(shoulder, hip, ankle) || 180;
  const deviation = Math.abs(180 - angle);

  const formFaults = [];
  const isGoodForm = deviation <= 15;

  if (!isGoodForm) {
    formFaults.push({
      joint: 'hip',
      x: hip.x,
      y: hip.y,
      message: angle < 165 ? 'Lift hips up!' : 'Lower hips to straight line!'
    });
  }

  return {
    inFrame: true,
    angle: deviation,
    stage: isGoodForm ? 'aligned' : 'fault',
    repCompleted: false,
    formFaults,
    isGoodForm,
    formCue: isGoodForm ? 'Solid core alignment, keep holding!' : 'Adjust hip height!'
  };
};

// Dispatcher for any exercise
export const evaluateExerciseLandmarks = (exerciseKey, landmarks, currentStage) => {
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
