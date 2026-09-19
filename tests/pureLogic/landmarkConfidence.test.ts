import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkLandmarksInFrame,
  LANDMARK_INDEX,
  evaluateSquatLandmarks
} from '../../src/components/AIPoseCoach/AngleMath.ts';
import type { LandmarkPoint } from '../../src/types/fitness.ts';

function createLandmarks(defaultVis = 0.9): LandmarkPoint[] {
  return Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: defaultVis
  }));
}

describe('Pure Logic: Landmark Confidence & Visibility Gate', () => {
  it('passes when landmarks meet exact confidence boundary', () => {
    const lm = createLandmarks();
    lm[LANDMARK_INDEX.LEFT_HIP].visibility = 0.20;
    lm[LANDMARK_INDEX.LEFT_KNEE].visibility = 0.20;

    const inFrame = checkLandmarksInFrame(
      lm,
      [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE],
      0.20,
      2
    );
    assert.equal(inFrame, true);
  });

  it('fails when landmark visibility is just below confidence threshold (0.199 vs 0.20)', () => {
    const lm = createLandmarks();
    lm[LANDMARK_INDEX.LEFT_HIP].visibility = 0.199;
    lm[LANDMARK_INDEX.LEFT_KNEE].visibility = 0.20;

    // Requires 2 visible landmarks
    const inFrame = checkLandmarksInFrame(
      lm,
      [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE],
      0.20,
      2
    );
    assert.equal(inFrame, false);
  });

  it('passes when landmark visibility is just above confidence threshold (0.201 vs 0.20)', () => {
    const lm = createLandmarks();
    lm[LANDMARK_INDEX.LEFT_HIP].visibility = 0.201;
    lm[LANDMARK_INDEX.LEFT_KNEE].visibility = 0.201;

    const inFrame = checkLandmarksInFrame(
      lm,
      [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE],
      0.20,
      2
    );
    assert.equal(inFrame, true);
  });

  it('fails when fewer than required minimum count of joints are visible', () => {
    const lm = createLandmarks();
    lm[LANDMARK_INDEX.LEFT_HIP].visibility = 0.9;
    lm[LANDMARK_INDEX.LEFT_KNEE].visibility = 0.05; // invisible

    const inFrame = checkLandmarksInFrame(
      lm,
      [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE],
      0.20,
      2
    );
    assert.equal(inFrame, false, 'Must have at least 2 visible joints');
  });

  it('treats undefined visibility property as visible fallback', () => {
    const lm = createLandmarks();
    delete lm[LANDMARK_INDEX.LEFT_HIP].visibility;
    delete lm[LANDMARK_INDEX.LEFT_KNEE].visibility;

    const inFrame = checkLandmarksInFrame(
      lm,
      [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE],
      0.20,
      2
    );
    assert.equal(inFrame, true);
  });

  it('rejects truncated landmark arrays (< 33 elements)', () => {
    const shortLm: LandmarkPoint[] = Array.from({ length: 15 }, () => ({
      x: 0.5,
      y: 0.5,
      visibility: 0.9
    }));

    assert.equal(
      checkLandmarksInFrame(shortLm, [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE], 0.20),
      false
    );
  });

  it('rejects null or undefined landmark lists gracefully', () => {
    assert.equal(checkLandmarksInFrame(null as any, [0, 1]), false);
    assert.equal(checkLandmarksInFrame(undefined as any, [0, 1]), false);
    assert.equal(checkLandmarksInFrame([], [0, 1]), false);
  });

  it('dual-side selection picks the leg with the highest joint confidence', () => {
    const lm = createLandmarks();
    // Left side: low confidence (0.25)
    lm[LANDMARK_INDEX.LEFT_HIP].visibility = 0.25;
    lm[LANDMARK_INDEX.LEFT_KNEE].visibility = 0.25;
    lm[LANDMARK_INDEX.LEFT_ANKLE].visibility = 0.25;

    // Right side: high confidence (0.95)
    lm[LANDMARK_INDEX.RIGHT_HIP].visibility = 0.95;
    lm[LANDMARK_INDEX.RIGHT_KNEE].visibility = 0.95;
    lm[LANDMARK_INDEX.RIGHT_ANKLE].visibility = 0.95;

    const result = evaluateSquatLandmarks(lm, 'up');
    assert.equal(result.inFrame, true);
    // When right side is clear, tracking evaluates successfully
    assert.equal(result.isGoodForm, true);
  });
});
