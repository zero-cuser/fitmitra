import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkLandmarksInFrame,
  isAngleEligibleForReps,
  LANDMARK_INDEX,
  evaluateSquatLandmarks,
  evaluatePushupLandmarks,
  evaluateJumpingJackLandmarks,
  evaluateLungeLandmarks,
  evaluatePlankLandmarks,
  DEFAULT_MIN_JOINT_CONFIDENCE,
  DEFAULT_MIN_REP_CONFIDENCE,
  DEFAULT_MIN_FORM_CONFIDENCE
} from '../../src/components/AIPoseCoach/AngleMath.ts';
import type { ExerciseTrackerState } from '../../src/components/AIPoseCoach/AngleMath.ts';
import { EXERCISE_CATALOG } from '../../src/data/exercises.ts';
import type { LandmarkPoint } from '../../src/types/fitness.ts';

function createLandmarks(defaultVis = 0.9): LandmarkPoint[] {
  return Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: defaultVis
  }));
}

describe('Pure Logic: Landmark Confidence & Multi-Tier Visibility Gating', () => {
  // Scenario 1: All required landmarks above configured threshold
  it('1. All required landmarks above configured threshold allows full tracking and rep counting', () => {
    const lm = createLandmarks(0.95);
    const tracker: ExerciseTrackerState = {
      standingConfirmed: true,
      lockoutConfirmed: true,
      closedConfirmed: false,
      bottomReached: false,
      openReached: false,
      lastRepTime: 0
    };

    // Frame 1: Standing upright
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.5, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.5, y: 0.7, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.5, y: 0.9, visibility: 0.95 };
    const r1 = evaluateSquatLandmarks(lm, 'up', tracker);
    assert.equal(r1.inFrame, true);

    // Frame 2: Descend to depth (angle ~90°)
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.65, y: 0.65, visibility: 0.95 };
    const r2 = evaluateSquatLandmarks(lm, r1.stage, tracker);
    assert.equal(r2.stage, 'down');
    assert.equal(tracker.bottomReached, true);

    // Frame 3: Rise back to lockout
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.5, y: 0.7, visibility: 0.95 };
    const r3 = evaluateSquatLandmarks(lm, r2.stage, tracker);
    assert.equal(r3.stage, 'up');
    assert.equal(r3.repCompleted, true);
  });

  // Scenario 2: One required landmark below threshold
  it('2. One required landmark below threshold suppresses rep transition', () => {
    const lm = createLandmarks(0.95);
    const tracker: ExerciseTrackerState = {
      standingConfirmed: true,
      lockoutConfirmed: true,
      closedConfirmed: false,
      bottomReached: false,
      openReached: false,
      lastRepTime: 0
    };

    // Push-up: Shoulder and elbow valid, but wrist below minRepConfidence
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.3, y: 0.5, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.5, y: 0.5, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_WRIST] = { x: 0.7, y: 0.5, visibility: 0.15 }; // below 0.30

    const r = evaluatePushupLandmarks(lm, 'up', tracker);
    assert.equal(r.inFrame, true); // 2 joints meet inFrame
    assert.equal(r.repCompleted, false);
    assert.equal(tracker.bottomReached, false, 'Should not confirm bottom with unreliable wrist');
  });

  // Scenario 3: Unrelated landmark below threshold
  it('3. Unrelated landmark below threshold does NOT reject tracking or rep counting', () => {
    const lm = createLandmarks(0.95);
    // Severely degrade unrelated facial & opposite arm landmarks
    lm[LANDMARK_INDEX.NOSE].visibility = 0.01;
    lm[LANDMARK_INDEX.LEFT_EAR].visibility = 0.0;
    lm[LANDMARK_INDEX.RIGHT_WRIST].visibility = 0.05;

    // Squat leg landmarks remain crystal clear
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.5, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.5, y: 0.7, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.5, y: 0.9, visibility: 0.95 };

    const tracker: ExerciseTrackerState = {
      standingConfirmed: true,
      lockoutConfirmed: true,
      closedConfirmed: false,
      bottomReached: true, // already at depth
      openReached: false,
      lastRepTime: 0
    };

    const r = evaluateSquatLandmarks(lm, 'down', tracker);
    assert.equal(r.inFrame, true, 'Squat must remain in frame despite noisy nose/wrist');
    assert.equal(r.repCompleted, true, 'Rep must count normally');
  });

  // Scenario 4: Missing landmarks
  it('4. Missing landmarks and malformed inputs are handled gracefully without throwing', () => {
    assert.equal(checkLandmarksInFrame(null as any, [0, 1]), false);
    assert.equal(checkLandmarksInFrame(undefined as any, [0, 1]), false);
    assert.equal(checkLandmarksInFrame([], [0, 1]), false);
    assert.equal(isAngleEligibleForReps([]), false);
    assert.equal(isAngleEligibleForReps([null, null, null] as any), false);

    const shortLm: LandmarkPoint[] = Array.from({ length: 10 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
    assert.equal(checkLandmarksInFrame(shortLm, [23, 25]), false);
  });

  // Scenario 5: Boundary values exactly at the threshold
  it('5. Boundary values behave strictly at configured thresholds', () => {
    const lm = createLandmarks(0.9);

    // inFrame check with threshold 0.25
    lm[LANDMARK_INDEX.LEFT_HIP].visibility = 0.250;
    lm[LANDMARK_INDEX.LEFT_KNEE].visibility = 0.250;
    assert.equal(checkLandmarksInFrame(lm, [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE], 0.25, 2), true);

    lm[LANDMARK_INDEX.LEFT_HIP].visibility = 0.249;
    assert.equal(checkLandmarksInFrame(lm, [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE], 0.25, 2), false);

    lm[LANDMARK_INDEX.LEFT_HIP].visibility = 0.251;
    assert.equal(checkLandmarksInFrame(lm, [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE], 0.25, 2), true);

    // rep eligibility with threshold 0.30
    const ptA = { x: 0.1, y: 0.1, visibility: 0.300 };
    const ptB = { x: 0.2, y: 0.2, visibility: 0.300 };
    const ptC = { x: 0.3, y: 0.3, visibility: 0.300 };
    assert.equal(isAngleEligibleForReps([ptA, ptB, ptC], 0.30), true);

    ptA.visibility = 0.299;
    assert.equal(isAngleEligibleForReps([ptA, ptB, ptC], 0.30), false);
  });

  // Scenario 6: Squat-specific required joints & form guard confidence
  it('6. Squat-specific required joints and guarded torso feedback', () => {
    const lm = createLandmarks(0.95);
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.5, visibility: 0.9 };
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.5, y: 0.7, visibility: 0.9 };
    // Low confidence shoulder (0.15 < minFormConf 0.35)
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.3, y: 0.4, visibility: 0.15 };

    const r = evaluateSquatLandmarks(lm, 'down');
    assert.equal(r.inFrame, true);
    // Should NOT issue "Chest up" fault because shoulder visibility is too low
    const chestFault = r.formFaults.find((f) => f.message === 'Chest up');
    assert.equal(chestFault, undefined, 'Form fault must not trigger with unreliable shoulder');
  });

  // Scenario 7: Push-up-specific required joints
  it('7. Push-up-specific required joints validate arm kinematic chain', () => {
    const lm = createLandmarks(0.20); // default low on other joints
    // Left arm clear and active
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.3, y: 0.3, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.5, y: 0.3, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_WRIST] = { x: 0.7, y: 0.3, visibility: 0.95 };

    const tracker: ExerciseTrackerState = {
      standingConfirmed: false,
      lockoutConfirmed: false,
      closedConfirmed: false,
      bottomReached: false,
      openReached: false,
      lastRepTime: 0
    };

    // Elbow bent below 125° -> bottomReached
    lm[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.5, y: 0.45, visibility: 0.95 };
    const r1 = evaluatePushupLandmarks(lm, 'up', tracker);
    assert.equal(r1.stage, 'down');
    assert.equal(tracker.bottomReached, true);
  });

  // Scenario 8: Jumping-jack-specific required joints
  it('8. Jumping-jack-specific required joints require hip, shoulder, and wrist', () => {
    const lm = createLandmarks(0.20);
    // Left arm in overhead V angle (> 95°), but wrist is low confidence (0.15 < minRepConf 0.30)
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.45, y: 0.6, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.45, y: 0.3, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_WRIST] = { x: 0.20, y: 0.1, visibility: 0.15 }; // unconfident wrist

    const tracker: ExerciseTrackerState = {
      standingConfirmed: false,
      lockoutConfirmed: false,
      closedConfirmed: false,
      bottomReached: false,
      openReached: false,
      lastRepTime: 0
    };

    const r = evaluateJumpingJackLandmarks(lm, 'down', tracker);
    assert.equal(tracker.openReached, false, 'Unreliable wrist must not trigger open stage');
  });

  // Scenario 9: Lunge-specific required joints
  it('9. Lunge-specific required joints require hip, knee, and ankle', () => {
    const lm = createLandmarks(0.20);
    // Left leg clear except ankle
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.5, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.5, y: 0.7, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.5, y: 0.9, visibility: 0.10 }; // missing ankle

    const tracker: ExerciseTrackerState = {
      standingConfirmed: false,
      lockoutConfirmed: false,
      closedConfirmed: false,
      bottomReached: false,
      openReached: false,
      lastRepTime: 0
    };

    const r = evaluateLungeLandmarks(lm, 'up', tracker);
    assert.equal(tracker.bottomReached, false, 'Lunge must not confirm depth when ankle is unreliable');
  });

  // Scenario 10: Plank-specific required joints & form guard
  it('10. Plank-specific required joints gate posture faults on landmark confidence', () => {
    const lm = createLandmarks(0.20);
    // Horizontal prone orientation on left side
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.2, y: 0.6, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.6, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.8, y: 0.6, visibility: 0.95 };

    const rGood = evaluatePlankLandmarks(lm);
    assert.equal(rGood.inFrame, true);
    assert.equal(rGood.isGoodForm, true);

    // Sagging hip (angle deviation > 15°), but hip confidence is low (< 0.35)
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.8, visibility: 0.20 };
    const rLowConfFault = evaluatePlankLandmarks(lm);
    const fault = rLowConfFault.formFaults.find((f) => f.message === 'Keep body straight');
    assert.equal(fault, undefined, 'Must not issue posture fault when hip confidence is low');
  });

  // Scenario 11: Temporary confidence drop followed by recovery
  it('11. Temporary confidence drop followed by recovery prevents phantom reps and recovers cleanly', () => {
    const lm = createLandmarks(0.10); // right side low so left leg is active
    const tracker: ExerciseTrackerState = {
      standingConfirmed: true,
      lockoutConfirmed: true,
      closedConfirmed: false,
      bottomReached: false,
      openReached: false,
      lastRepTime: 0
    };

    // Frame 1: Clear standing frame on left leg
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.5, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.5, y: 0.7, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.5, y: 0.9, visibility: 0.95 };
    evaluateSquatLandmarks(lm, 'up', tracker);

    // Frame 2: User descends, but camera suffers temporary blur/drop (vis = 0.10)
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.65, y: 0.65, visibility: 0.10 };
    const rDrop = evaluateSquatLandmarks(lm, 'up', tracker);
    assert.equal(tracker.bottomReached, false, 'Bottom must not register during confidence drop');
    assert.equal(rDrop.repCompleted, false);

    // Frame 3: Confidence recovers while at depth (vis = 0.95)
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.65, y: 0.65, visibility: 0.95 };
    const rRecover = evaluateSquatLandmarks(lm, 'up', tracker);
    assert.equal(tracker.bottomReached, true, 'Bottom confirmed upon confidence recovery');
    assert.equal(rRecover.stage, 'down');

    // Frame 4: Rise to top
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.5, y: 0.7, visibility: 0.95 };
    const rFinish = evaluateSquatLandmarks(lm, 'down', tracker);
    assert.equal(rFinish.repCompleted, true, 'Rep completes cleanly after recovery');
  });

  // Scenario 12: Rep counting when tracking quality is insufficient
  it('12. Rep counting is completely withheld when tracking quality is below threshold despite geometric angle shifts', () => {
    const lm = createLandmarks(0.20); // all joints below minRepConfidence 0.30
    const tracker: ExerciseTrackerState = {
      standingConfirmed: false,
      lockoutConfirmed: false,
      closedConfirmed: false,
      bottomReached: false,
      openReached: false,
      lastRepTime: 0
    };

    // Cycle through deep squat angle (90°) and lockout angle (180°)
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.5, visibility: 0.20 };
    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.65, y: 0.65, visibility: 0.20 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.5, y: 0.9, visibility: 0.20 };

    const rDown = evaluateSquatLandmarks(lm, 'up', tracker);
    assert.equal(rDown.repCompleted, false);
    assert.equal(tracker.bottomReached, false);

    lm[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.5, y: 0.7, visibility: 0.20 };
    const rUp = evaluateSquatLandmarks(lm, 'down', tracker);
    assert.equal(rUp.repCompleted, false, 'No reps counted under insufficient tracking quality');
  });
});
