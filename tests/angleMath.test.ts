import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPlankAlignmentMetrics, calculateAngle } from '../src/components/AIPoseCoach/AngleMath.ts';

describe('AngleMath Plank Alignment Engine', () => {
  it('correctly assesses a perfectly straight plank (180 degrees)', () => {
    const metrics = getPlankAlignmentMetrics(180);
    assert.equal(metrics.rawAngle, 180);
    assert.equal(metrics.deviation, 0);
    assert.equal(metrics.isGoodAlignment, true);
  });

  it('correctly assesses minor spine deviation (178 degrees, deviation = 2)', () => {
    const metrics = getPlankAlignmentMetrics(178);
    assert.equal(metrics.rawAngle, 178);
    assert.equal(metrics.deviation, 2);
    assert.equal(metrics.isGoodAlignment, true);
  });

  it('accepts deviation right at the 15 degree tolerance threshold (165 degrees)', () => {
    const metrics = getPlankAlignmentMetrics(165);
    assert.equal(metrics.rawAngle, 165);
    assert.equal(metrics.deviation, 15);
    assert.equal(metrics.isGoodAlignment, true);
  });

  it('rejects deviation exceeding tolerance (164 degrees, deviation = 16)', () => {
    const metrics = getPlankAlignmentMetrics(164);
    assert.equal(metrics.rawAngle, 164);
    assert.equal(metrics.deviation, 16);
    assert.equal(metrics.isGoodAlignment, false);
  });

  it('identifies severe hip sagging (140 degrees, deviation = 40)', () => {
    const metrics = getPlankAlignmentMetrics(140);
    assert.equal(metrics.rawAngle, 140);
    assert.equal(metrics.deviation, 40);
    assert.equal(metrics.isGoodAlignment, false);
  });

  it('handles over-extension / hyperextension (195 degrees)', () => {
    const metrics = getPlankAlignmentMetrics(195);
    assert.equal(metrics.rawAngle, 195);
    assert.equal(metrics.deviation, 15);
    assert.equal(metrics.isGoodAlignment, true);

    const excessive = getPlankAlignmentMetrics(200);
    assert.equal(excessive.deviation, 20);
    assert.equal(excessive.isGoodAlignment, false);
  });

  it('supports custom maxDeviation thresholds', () => {
    const strictMetrics = getPlankAlignmentMetrics(172, 5);
    assert.equal(strictMetrics.deviation, 8);
    assert.equal(strictMetrics.isGoodAlignment, false);

    const relaxedMetrics = getPlankAlignmentMetrics(155, 30);
    assert.equal(relaxedMetrics.deviation, 25);
    assert.equal(relaxedMetrics.isGoodAlignment, true);
  });
});

describe('AngleMath calculateAngle', () => {
  it('calculates a 90-degree orthogonal joint angle', () => {
    const pointA = { x: 0, y: 1 };
    const pointB = { x: 0, y: 0 };
    const pointC = { x: 1, y: 0 };
    const angle = calculateAngle(pointA, pointB, pointC);
    assert.equal(Math.round(angle), 90);
  });

  it('calculates a 180-degree straight joint angle', () => {
    const pointA = { x: -1, y: 0 };
    const pointB = { x: 0, y: 0 };
    const pointC = { x: 1, y: 0 };
    const angle = calculateAngle(pointA, pointB, pointC);
    assert.equal(Math.round(angle), 180);
  });
});
