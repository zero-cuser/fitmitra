import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXERCISE_CATALOG,
  validateExerciseConfig,
  resolveExerciseConfig
} from '../../src/data/exercises.ts';
import {
  ExerciseRepEngine,
  LANDMARK_INDEX
} from '../../src/components/AIPoseCoach/AngleMath.ts';
import type { ExerciseConfig, LandmarkPoint } from '../../src/types/fitness.ts';

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

describe('Pure Logic: Threshold Configuration & Validation', () => {
  it('validates all 5 exercises in the single-source-of-truth catalog', () => {
    const keys = ['squats', 'pushups', 'jumpingJacks', 'lunges', 'plank'] as const;
    for (const k of keys) {
      const res = validateExerciseConfig(EXERCISE_CATALOG[k]);
      assert.equal(res.isValid, true, `Validation failed for ${k}: ${res.errors.join('; ')}`);
    }
  });

  it('rejects impossible decreasing_flexion (upThreshold <= downThreshold)', () => {
    const bad = {
      ...EXERCISE_CATALOG.squats,
      repThresholds: { upThreshold: 100, downThreshold: 120 }
    } as ExerciseConfig;
    const res = validateExerciseConfig(bad);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('strictly greater')));
  });

  it('rejects impossible increasing_abduction (upThreshold <= downThreshold)', () => {
    const bad = {
      ...EXERCISE_CATALOG.jumpingJacks,
      repThresholds: { upThreshold: 60, downThreshold: 80 }
    } as ExerciseConfig;
    const res = validateExerciseConfig(bad);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('strictly greater')));
  });

  it('rejects insufficient hysteresis between up and down thresholds', () => {
    const narrow = {
      ...EXERCISE_CATALOG.pushups,
      repThresholds: { upThreshold: 125, downThreshold: 120 }
    } as ExerciseConfig;
    const res = validateExerciseConfig(narrow);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('hysteresis')));
  });

  it('rejects invalid confidence thresholds (<= 0 or > 1.0)', () => {
    const zeroConf = {
      ...EXERCISE_CATALOG.squats,
      confidenceThresholds: { minJointConfidence: 0, minVisibleJoints: 2 }
    } as ExerciseConfig;
    assert.equal(validateExerciseConfig(zeroConf).isValid, false);

    const excessiveConf = {
      ...EXERCISE_CATALOG.squats,
      confidenceThresholds: { minJointConfidence: 1.5, minVisibleJoints: 2 }
    } as ExerciseConfig;
    assert.equal(validateExerciseConfig(excessiveConf).isValid, false);
  });

  it('rejects plank with invalid target angle (< 90 or > 180)', () => {
    const badTarget = {
      ...EXERCISE_CATALOG.plank,
      formThresholds: { targetAngle: 75, maxDeviation: 15 }
    } as ExerciseConfig;
    assert.equal(validateExerciseConfig(badTarget).isValid, false);
  });
});

describe('Pure Logic: Compatibility Adapter (resolveExerciseConfig)', () => {
  it('normalizes flat legacy configurations into structured ExerciseConfig', () => {
    const flatInput = {
      id: 'squats' as const,
      upThreshold: 150,
      downThreshold: 110
    };

    const resolved = resolveExerciseConfig(flatInput);
    assert.equal(resolved.upThreshold, 150);
    assert.equal(resolved.downThreshold, 110);
    assert.equal(resolved.repThresholds.upThreshold, 150);
    assert.equal(resolved.repThresholds.downThreshold, 110);
    assert.equal(resolved.direction, 'decreasing_flexion');
    assert.ok(resolved.confidenceThresholds);
  });

  it('throws an informative error if an impossible config is resolved', () => {
    const impossible = {
      id: 'squats' as const,
      upThreshold: 90,
      downThreshold: 140
    };

    assert.throws(() => resolveExerciseConfig(impossible), /Impossible decreasing_flexion/);
  });
});

describe('Pure Logic: Dynamic Catalog Modification in State Machine', () => {
  it('verifies that reconfiguring thresholds directly shifts rep detection behavior', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('squats');
    const lm = createLandmarks();

    // In default catalog, downThreshold is 125. 115 deg triggers depth.
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    engine.evaluate('squats', lm);
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 115);
    let res = engine.evaluate('squats', lm);
    assert.equal(res.stage, 'down', '115 deg is depth under default 125 threshold');

    // Dynamically set strict downThreshold = 90
    engine.setExerciseConfig('squats', {
      id: 'squats',
      downThreshold: 90,
      upThreshold: 150
    });
    engine.reset('squats');

    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    engine.evaluate('squats', lm);

    // Frame at 115 deg now fails to trigger down stage!
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 115);
    res = engine.evaluate('squats', lm);
    assert.equal(res.stage, 'up', '115 deg must fail depth under strict 90 threshold');

    // Frame at 85 deg triggers down stage!
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 85);
    res = engine.evaluate('squats', lm);
    assert.equal(res.stage, 'down', '85 deg reaches depth under strict 90 threshold');

    // Return to 155 deg lockout triggers rep
    positionAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 155);
    res = engine.evaluate('squats', lm);
    assert.equal(res.repCompleted, true);
  });
});
