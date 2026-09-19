import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAngle, smoothLandmarksEMA } from '../../src/components/AIPoseCoach/AngleMath.ts';
import type { LandmarkPoint } from '../../src/types/fitness.ts';

describe('Pure Logic: calculateAngle()', () => {
  it('calculates exact 90-degree right angle', () => {
    const a = { x: 0, y: 1 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };
    assert.equal(calculateAngle(a, b, c), 90);
  });

  it('calculates exact 180-degree collinear straight line', () => {
    const a = { x: -1, y: 0 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };
    assert.equal(calculateAngle(a, b, c), 180);
  });

  it('calculates exact 45-degree acute angle', () => {
    const a = { x: 1, y: 0 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 1 };
    assert.equal(calculateAngle(a, b, c), 45);
  });

  it('calculates exact 135-degree obtuse angle', () => {
    const a = { x: 1, y: 0 };
    const b = { x: 0, y: 0 };
    const c = { x: -1, y: 1 };
    assert.equal(calculateAngle(a, b, c), 135);
  });

  it('handles 0-degree overlapping rays (collinear folded joint)', () => {
    const a = { x: 1, y: 0 };
    const b = { x: 0, y: 0 };
    const c = { x: 2, y: 0 };
    assert.equal(calculateAngle(a, b, c), 0);
  });

  it('is symmetric with respect to end points A and C', () => {
    const a = { x: 0.2, y: 0.8 };
    const b = { x: 0.5, y: 0.5 };
    const c = { x: 0.7, y: 0.9 };
    const angleABC = calculateAngle(a, b, c);
    const angleCBA = calculateAngle(c, b, a);
    assert.equal(angleABC, angleCBA);
  });

  it('is invariant to global translation in 2D space', () => {
    const a = { x: 0, y: 1 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };
    const baseAngle = calculateAngle(a, b, c);

    const shiftX = 5.25;
    const shiftY = -3.75;
    const shiftedAngle = calculateAngle(
      { x: a.x + shiftX, y: a.y + shiftY },
      { x: b.x + shiftX, y: b.y + shiftY },
      { x: c.x + shiftX, y: c.y + shiftY }
    );
    assert.equal(baseAngle, shiftedAngle);
  });

  it('returns fallback 180 degrees when points are missing or undefined', () => {
    assert.equal(calculateAngle(undefined, { x: 0, y: 0 }, { x: 1, y: 0 }), 180);
    assert.equal(calculateAngle({ x: 0, y: 1 }, undefined, { x: 1, y: 0 }), 180);
    assert.equal(calculateAngle({ x: 0, y: 1 }, { x: 0, y: 0 }, undefined), 180);
    assert.equal(calculateAngle(undefined, undefined, undefined), 180);
  });
});

describe('Pure Logic: smoothLandmarksEMA()', () => {
  it('returns copy of current landmarks when previous landmarks are null', () => {
    const current: LandmarkPoint[] = [
      { x: 0.5, y: 0.5, z: 0.1, visibility: 0.9 },
      { x: 0.6, y: 0.7, z: 0.2, visibility: 0.8 }
    ];
    const smoothed = smoothLandmarksEMA(current, null, 0.6);
    assert.deepEqual(smoothed, current);
    assert.notEqual(smoothed, current); // verifies new array
  });

  it('correctly applies exponential moving average weighting', () => {
    const prev: LandmarkPoint[] = [{ x: 1.0, y: 1.0, z: 0.0, visibility: 0.9 }];
    const curr: LandmarkPoint[] = [{ x: 0.0, y: 0.0, z: 1.0, visibility: 0.9 }];
    const alpha = 0.6; // 60% current, 40% previous

    const smoothed = smoothLandmarksEMA(curr, prev, alpha);
    // x = 0.6 * 0.0 + 0.4 * 1.0 = 0.4
    assert.equal(Math.round(smoothed[0].x * 100) / 100, 0.4);
    assert.equal(Math.round(smoothed[0].y * 100) / 100, 0.4);
    assert.equal(Math.round(smoothed[0].z! * 100) / 100, 0.6);
  });

  it('safely falls back when landmark counts mismatch', () => {
    const current: LandmarkPoint[] = [{ x: 0.5, y: 0.5 }];
    const prev: LandmarkPoint[] = [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }];
    const smoothed = smoothLandmarksEMA(current, prev, 0.5);
    assert.equal(smoothed.length, 1);
    assert.equal(smoothed[0].x, 0.5);
  });
});
