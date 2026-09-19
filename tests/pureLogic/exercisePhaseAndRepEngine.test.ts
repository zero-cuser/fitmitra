import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ExerciseRepEngine,
  LANDMARK_INDEX
} from '../../src/components/AIPoseCoach/AngleMath.ts';
import type { LandmarkPoint } from '../../src/types/fitness.ts';

function createLandmarks(): LandmarkPoint[] {
  return Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.95
  }));
}

function positionAngle(
  landmarks: LandmarkPoint[],
  jointA: number,
  jointB: number,
  jointC: number,
  angleDeg: number
) {
  landmarks[jointB] = { x: 0.5, y: 0.5, visibility: 0.95 };
  landmarks[jointA] = { x: 0.5, y: 0.2, visibility: 0.95 };
  const rad = ((-90 + angleDeg) * Math.PI) / 180;
  landmarks[jointC] = {
    x: 0.5 + 0.3 * Math.cos(rad),
    y: 0.5 + 0.3 * Math.sin(rad),
    visibility: 0.95
  };
}

describe('Pure Logic: Exercise Phase Transitions & Rep Engine', () => {
  it('triggers squat depth at exactly 125 degrees and lockout at 145 degrees', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('squats');
    const lm = createLandmarks();

    // Standing (160 deg)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    let res = engine.evaluate('squats', lm);
    assert.equal(res.stage, 'up');

    // 126 deg (1 deg shy of depth threshold 125)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 126);
    res = engine.evaluate('squats', lm);
    assert.equal(res.stage, 'up', '126 deg should not trigger down stage');

    // Exactly 125 deg (boundary depth threshold)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 125);
    res = engine.evaluate('squats', lm);
    assert.equal(res.stage, 'down', '125 deg should trigger down stage');

    // Ascending to 144 deg (1 deg shy of lockout threshold 145)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 144);
    res = engine.evaluate('squats', lm);
    assert.equal(res.repCompleted, false, '144 deg should not trigger rep completion');

    // Exactly 145 deg (boundary lockout threshold)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 145);
    res = engine.evaluate('squats', lm);
    assert.equal(res.repCompleted, true, '145 deg should trigger rep completion');
    assert.equal(res.stage, 'up');
  });

  it('triggers jumping jack open at exactly 95 degrees and closed at 70 degrees', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('jumpingJacks');
    const lm = createLandmarks();

    // Start closed (45 deg)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 45);
    let res = engine.evaluate('jumpingJacks', lm);
    assert.equal(res.stage, 'down');

    // 94 deg (1 deg shy of open threshold 95)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 94);
    res = engine.evaluate('jumpingJacks', lm);
    assert.equal(res.stage, 'down', '94 deg should not trigger up stage');

    // Exactly 95 deg (boundary open threshold)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 95);
    res = engine.evaluate('jumpingJacks', lm);
    assert.equal(res.stage, 'up', '95 deg should trigger up stage');

    // Returning to 71 deg (1 deg shy of return threshold 70)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 71);
    res = engine.evaluate('jumpingJacks', lm);
    assert.equal(res.repCompleted, false, '71 deg should not trigger rep completion');

    // Exactly 70 deg (boundary return threshold)
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 70);
    res = engine.evaluate('jumpingJacks', lm);
    assert.equal(res.repCompleted, true, '70 deg should trigger rep completion');
  });

  it('debounces rapid duplicate reps within the 600ms cooldown window', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('pushups');
    const lm = createLandmarks();

    // First complete rep
    positionAngle(lm, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST, 155);
    engine.evaluate('pushups', lm);
    positionAngle(lm, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST, 110);
    engine.evaluate('pushups', lm);
    positionAngle(lm, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST, 150);
    let res = engine.evaluate('pushups', lm);
    assert.equal(res.repCompleted, true, 'First rep counts');

    // Immediate next cycle within < 10ms (sensor noise bounce)
    positionAngle(lm, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST, 110);
    engine.evaluate('pushups', lm);
    positionAngle(lm, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST, 150);
    res = engine.evaluate('pushups', lm);
    assert.equal(res.repCompleted, false, 'Immediate bounce must be rejected by cooldown debouncer');
  });

  it('resets internal tracker cleanly when switching exercises', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('squats');
    const lm = createLandmarks();

    // Reach bottom of squat
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 110);
    engine.evaluate('squats', lm);

    // Switch to lunges before standing up
    engine.reset('lunges');

    // Immediately at lockout for lunges without having reached bottom in lunges
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    positionAngle(lm, LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_KNEE, LANDMARK_INDEX.RIGHT_ANKLE, 160);
    const res = engine.evaluate('lunges', lm);
    assert.equal(res.repCompleted, false, 'Should not carry over bottomReached state across exercises');
  });
});
