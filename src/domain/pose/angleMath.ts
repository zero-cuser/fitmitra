/**
 * FitMitra Platform-Neutral Kinematic Angle Math & Landmark Smoothing
 * 
 * Pure Euclidean geometric functions.
 * Operates on normalized landmark coordinates without any browser or rendering dependencies.
 */

import type { PoseLandmark } from './poseContracts.ts';

/**
 * Calculates 2D planar interior angle at joint B given points A, B, and C in degrees [0, 180].
 */
export function calculateAngle(
  a?: PoseLandmark,
  b?: PoseLandmark,
  c?: PoseLandmark
): number {
  if (!a || !b || !c) return 180;

  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return Math.round(angle);
}

/**
 * Exponential Moving Average (EMA) Landmark Smoothing to prevent visual jitter.
 * S_t = alpha * X_t + (1 - alpha) * S_{t-1}
 */
export function smoothLandmarksEMA(
  currentLandmarks: PoseLandmark[],
  previousLandmarks: PoseLandmark[] | null,
  alpha = 0.6
): PoseLandmark[] {
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
}

/**
 * Checks whether an angle's defining landmarks have sufficient tracking confidence.
 */
export function hasMinimumJointConfidence(
  landmarks: PoseLandmark[],
  indices: number[],
  minConfidence = 0.25
): boolean {
  if (!landmarks || indices.length === 0) return false;
  return indices.every((idx) => {
    const pt = landmarks[idx];
    if (!pt) return false;
    return typeof pt.visibility === 'number' ? pt.visibility >= minConfidence : true;
  });
}
