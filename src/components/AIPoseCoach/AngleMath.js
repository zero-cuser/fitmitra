// Vector kinematics & joint angle calculation
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

// Squat Repetition State Machine
export const processSquatRep = (kneeAngle, currentStage) => {
  let newStage = currentStage;
  let repCompleted = false;
  let formCue = null;

  if (kneeAngle < 95) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Great depth, now drive up!';
    }
  } else if (kneeAngle > 155 && currentStage === 'down') {
    newStage = 'up';
    repCompleted = true;
    formCue = 'Rep counted!';
  } else if (kneeAngle < 130 && kneeAngle >= 95 && currentStage === 'up') {
    formCue = 'Lower your hips a bit more!';
  }

  return { newStage, repCompleted, formCue };
};

// Push-up Repetition State Machine
export const processPushupRep = (elbowAngle, currentStage) => {
  let newStage = currentStage;
  let repCompleted = false;
  let formCue = null;

  if (elbowAngle < 90) {
    if (currentStage !== 'down') {
      newStage = 'down';
      formCue = 'Chest down, good! Push!';
    }
  } else if (elbowAngle > 150 && currentStage === 'down') {
    newStage = 'up';
    repCompleted = true;
    formCue = 'Push-up complete!';
  }

  return { newStage, repCompleted, formCue };
};

// Jumping Jack Repetition State Machine
export const processJumpingJackRep = (armAngle, currentStage) => {
  let newStage = currentStage;
  let repCompleted = false;
  let formCue = null;

  if (armAngle > 130) {
    if (currentStage !== 'up') {
      newStage = 'up';
    }
  } else if (armAngle < 50 && currentStage === 'up') {
    newStage = 'down';
    repCompleted = true;
    formCue = 'Good rhythm, keep jumping!';
  }

  return { newStage, repCompleted, formCue };
};

// Study Slouch & Forward-Head Tilt Detection
export const evaluateStudyPosture = (earPoint, shoulderPoint) => {
  if (!earPoint || !shoulderPoint) return { isSlouching: false, angle: 90 };

  // Angle with vertical axis
  const dx = Math.abs(earPoint.x - shoulderPoint.x);
  const dy = Math.abs(earPoint.y - shoulderPoint.y);
  const angle = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);

  // If head is shifted forward by more than 28 degrees relative to shoulder vertical
  const isSlouching = angle > 28;

  return { isSlouching, angle };
};
