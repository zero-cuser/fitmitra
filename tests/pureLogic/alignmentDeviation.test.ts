import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPlankAlignmentMetrics,
  evaluatePlankLandmarks,
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

describe('Pure Logic: Alignment Deviation Engine', () => {
  it('correctly assesses a perfectly collinear plank (180 degrees)', () => {
    const metrics = getPlankAlignmentMetrics(180);
    assert.equal(metrics.rawAngle, 180);
    assert.equal(metrics.deviation, 0);
    assert.equal(metrics.isGoodAlignment, true);
  });

  it('accepts deviation exactly at the 15-degree tolerance boundary (165 degrees)', () => {
    const metrics = getPlankAlignmentMetrics(165, 15);
    assert.equal(metrics.deviation, 15);
    assert.equal(metrics.isGoodAlignment, true);
  });

  it('rejects deviation exceeding tolerance by 1 degree (164 degrees)', () => {
    const metrics = getPlankAlignmentMetrics(164, 15);
    assert.equal(metrics.deviation, 16);
    assert.equal(metrics.isGoodAlignment, false);
  });

  it('handles hyper-extension past 180 degrees (195 vs 200 degrees)', () => {
    const withinTolerance = getPlankAlignmentMetrics(195, 15);
    assert.equal(withinTolerance.deviation, 15);
    assert.equal(withinTolerance.isGoodAlignment, true);

    const outOfTolerance = getPlankAlignmentMetrics(200, 15);
    assert.equal(outOfTolerance.deviation, 20);
    assert.equal(outOfTolerance.isGoodAlignment, false);
  });

  it('supports custom strict and relaxed deviation thresholds', () => {
    // Strict 5-degree tolerance
    const strictMetrics = getPlankAlignmentMetrics(172, 5);
    assert.equal(strictMetrics.deviation, 8);
    assert.equal(strictMetrics.isGoodAlignment, false);

    // Relaxed 25-degree tolerance
    const relaxedMetrics = getPlankAlignmentMetrics(158, 25);
    assert.equal(relaxedMetrics.deviation, 22);
    assert.equal(relaxedMetrics.isGoodAlignment, true);
  });
});

describe('Pure Logic: Prone Orientation & Form Fault Detection', () => {
  it('identifies valid horizontal prone alignment', () => {
    const lm = createLandmarks();
    // Shoulder (0.2, 0.7), Hip (0.5, 0.7), Ankle (0.8, 0.7)
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.2, y: 0.7, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.7, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.8, y: 0.7, visibility: 0.95 };

    const result = evaluatePlankLandmarks(lm);
    assert.equal(result.inFrame, true);
    assert.equal(result.isGoodForm, true);
    assert.equal(result.formFaults.length, 0);
  });

  it('detects standing posture when trying to do a plank', () => {
    const lm = createLandmarks();
    // Vertical alignment: Shoulder (0.5, 0.2), Hip (0.5, 0.5), Ankle (0.5, 0.8)
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.5, y: 0.2, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.5, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.5, y: 0.8, visibility: 0.95 };

    const result = evaluatePlankLandmarks(lm);
    assert.equal(result.isGoodForm, false);
    assert.ok(result.formFaults.some((f) => f.message.includes('horizontal')));
  });

  it('flags sagging hip fault when deviation exceeds maxDeviation in prone pose', () => {
    const lm = createLandmarks();
    // Horizontal span is good, but hip sags down
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.2, y: 0.6, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.88, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.8, y: 0.6, visibility: 0.95 };

    const result = evaluatePlankLandmarks(lm);
    assert.equal(result.isGoodForm, false);
    assert.ok(result.formFaults.some((f) => f.message.includes('straight')));
  });
});
