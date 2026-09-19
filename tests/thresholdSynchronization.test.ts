import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXERCISE_CATALOG,
  validateExerciseConfig,
  resolveExerciseConfig
} from '../src/data/exercises.ts';
import {
  ExerciseRepEngine,
  calculateAngle,
  LANDMARK_INDEX
} from '../src/components/AIPoseCoach/AngleMath.ts';
import type { LandmarkPoint, ExerciseConfig } from '../src/types/fitness.ts';

/**
 * Creates a synthetic full-body 33-landmark array with specified default confidence.
 */
function createSyntheticLandmarks(visibility = 0.9): LandmarkPoint[] {
  return Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0.0,
    visibility
  }));
}

/**
 * Positions synthetic landmarks to form an exact interior angle for a joint.
 */
function positionJointAngle(
  landmarks: LandmarkPoint[],
  jointAIdx: number,
  jointBIdx: number,
  jointCIdx: number,
  angleDeg: number
) {
  // Place joint B at (0.5, 0.5), Joint A vertically above B at (0.5, 0.2)
  landmarks[jointBIdx] = { x: 0.5, y: 0.5, visibility: 0.95 };
  landmarks[jointAIdx] = { x: 0.5, y: 0.2, visibility: 0.95 }; // Vector B -> A is (0, -0.3) -> -90 deg

  // Place Joint C at angleDeg relative to Vector B -> A
  const rad = ((-90 + angleDeg) * Math.PI) / 180;
  landmarks[jointCIdx] = {
    x: 0.5 + 0.3 * Math.cos(rad),
    y: 0.5 + 0.3 * Math.sin(rad),
    visibility: 0.95
  };
}

describe('1. EXERCISE_CATALOG Integrity & Schema Validation', () => {
  it('contains valid typed configurations for all 5 exercises', () => {
    const exerciseKeys = ['squats', 'pushups', 'jumpingJacks', 'lunges', 'plank'] as const;

    for (const key of exerciseKeys) {
      const config = EXERCISE_CATALOG[key];
      assert.ok(config, `Missing config for exercise ${key}`);
      assert.equal(config.id, key);

      const validation = validateExerciseConfig(config);
      assert.equal(
        validation.isValid,
        true,
        `Exercise ${key} failed validation: ${validation.errors.join(', ')}`
      );

      // Verify top-level and repThresholds synchronization
      assert.equal(config.upThreshold, config.repThresholds.upThreshold);
      assert.equal(config.downThreshold, config.repThresholds.downThreshold);

      // Verify category groups
      assert.ok(config.direction);
      assert.ok(config.repThresholds);
      assert.ok(config.formThresholds || config.isHoldExercise === false);
      assert.ok(config.confidenceThresholds);
    }
  });

  it('correctly categorizes movement directions per biomechanical nature', () => {
    assert.equal(EXERCISE_CATALOG.squats.direction, 'decreasing_flexion');
    assert.equal(EXERCISE_CATALOG.pushups.direction, 'decreasing_flexion');
    assert.equal(EXERCISE_CATALOG.lunges.direction, 'decreasing_flexion');
    assert.equal(EXERCISE_CATALOG.jumpingJacks.direction, 'increasing_abduction');
    assert.equal(EXERCISE_CATALOG.plank.direction, 'isometric_hold');
  });
});

describe('2. Impossible Configuration Detection & Prevention', () => {
  it('rejects decreasing flexion where upThreshold <= downThreshold', () => {
    const invalidConfig = {
      ...EXERCISE_CATALOG.squats,
      repThresholds: {
        upThreshold: 90,
        downThreshold: 140
      }
    };
    const validation = validateExerciseConfig(invalidConfig as ExerciseConfig);
    assert.equal(validation.isValid, false);
    assert.ok(
      validation.errors.some((e) => e.includes('upThreshold') && e.includes('strictly greater'))
    );
  });

  it('rejects increasing abduction where upThreshold <= downThreshold', () => {
    const invalidConfig = {
      ...EXERCISE_CATALOG.jumpingJacks,
      repThresholds: {
        upThreshold: 60,
        downThreshold: 100
      }
    };
    const validation = validateExerciseConfig(invalidConfig as ExerciseConfig);
    assert.equal(validation.isValid, false);
    assert.ok(
      validation.errors.some((e) => e.includes('upThreshold') && e.includes('strictly greater'))
    );
  });

  it('rejects configurations with insufficient hysteresis band', () => {
    const narrowSquat = {
      ...EXERCISE_CATALOG.squats,
      repThresholds: {
        upThreshold: 130,
        downThreshold: 125 // only 5 deg hysteresis
      }
    };
    const validation = validateExerciseConfig(narrowSquat as ExerciseConfig);
    assert.equal(validation.isValid, false);
    assert.ok(validation.errors.some((e) => e.includes('hysteresis')));
  });

  it('rejects plank with invalid or non-positive maxDeviation', () => {
    const zeroDeviationPlank = {
      ...EXERCISE_CATALOG.plank,
      formThresholds: {
        maxDeviation: 0
      }
    };
    const validation = validateExerciseConfig(zeroDeviationPlank as ExerciseConfig);
    assert.equal(validation.isValid, false);
    assert.ok(validation.errors.some((e) => e.includes('maxDeviation')));
  });

  it('rejects out-of-bounds joint angles (> 360 or < 0)', () => {
    const crazyAngle = {
      ...EXERCISE_CATALOG.squats,
      repThresholds: {
        upThreshold: 450,
        downThreshold: 120
      }
    };
    const validation = validateExerciseConfig(crazyAngle as ExerciseConfig);
    assert.equal(validation.isValid, false);
    assert.ok(validation.errors.some((e) => e.includes('bounds')));
  });
});

describe('3. Decreasing Flexion Kinematics (Squats, Push-ups, Lunges)', () => {
  it('counts a rep for a full squat cycle: standing -> depth -> lockout', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('squats');
    const lm = createSyntheticLandmarks();

    // Frame 1: Standing upright (160 deg > upThreshold 145)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    let result = engine.evaluate('squats', lm);
    assert.equal(result.stage, 'up');
    assert.equal(result.repCompleted, false);

    // Frame 2: Deep squat (110 deg <= downThreshold 125)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 110);
    result = engine.evaluate('squats', lm);
    assert.equal(result.stage, 'down');
    assert.equal(result.repCompleted, false);

    // Frame 3: Return to standing lockout (155 deg >= upThreshold 145)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 155);
    result = engine.evaluate('squats', lm);
    assert.equal(result.stage, 'up');
    assert.equal(result.repCompleted, true, 'Rep should complete after returning above upThreshold');
  });

  it('does NOT count a squat rep if user does not reach downThreshold (incomplete depth)', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('squats');
    const lm = createSyntheticLandmarks();

    // Standing (160 deg)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    engine.evaluate('squats', lm);

    // Shallow squat (135 deg: above downThreshold 125)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 135);
    let result = engine.evaluate('squats', lm);
    assert.equal(result.stage, 'up'); // Has not entered down stage
    assert.equal(result.repCompleted, false);

    // Return to standing (160 deg)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    result = engine.evaluate('squats', lm);
    assert.equal(result.repCompleted, false, 'Should not count rep without reaching depth');
  });

  it('counts a rep for a full push-up cycle: lockout -> chest down -> press up', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('pushups');
    const lm = createSyntheticLandmarks();

    // Lockout (155 deg > 145)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST, 155);
    let result = engine.evaluate('pushups', lm);
    assert.equal(result.stage, 'up');

    // Bottom of pushup (100 deg <= 125)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST, 100);
    result = engine.evaluate('pushups', lm);
    assert.equal(result.stage, 'down');

    // Return to lockout (150 deg >= 145)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST, 150);
    result = engine.evaluate('pushups', lm);
    assert.equal(result.stage, 'up');
    assert.equal(result.repCompleted, true);
  });

  it('counts a rep for a full lunge cycle: upright -> step down -> rise', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('lunges');
    const lm = createSyntheticLandmarks();

    // Upright (160 deg)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    positionJointAngle(lm, LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_KNEE, LANDMARK_INDEX.RIGHT_ANKLE, 160);
    let result = engine.evaluate('lunges', lm);
    assert.equal(result.stage, 'up');

    // Lunge step down (115 deg <= 125 on left knee)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 115);
    result = engine.evaluate('lunges', lm);
    assert.equal(result.stage, 'down');

    // Rise back up (150 deg >= 145)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 150);
    result = engine.evaluate('lunges', lm);
    assert.equal(result.stage, 'up');
    assert.equal(result.repCompleted, true);
  });
});

describe('4. Increasing Abduction Kinematics (Jumping Jacks)', () => {
  it('counts a rep for jumping jack: arms closed -> arms overhead -> arms returned', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('jumpingJacks');
    const lm = createSyntheticLandmarks();

    // Frame 1: Starting stance, arms by sides (45 deg <= downThreshold 70)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 45);
    let result = engine.evaluate('jumpingJacks', lm);
    assert.equal(result.stage, 'down');
    assert.equal(result.repCompleted, false);

    // Frame 2: Arms raised overhead in wide V (110 deg >= upThreshold 95)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 110);
    result = engine.evaluate('jumpingJacks', lm);
    assert.equal(result.stage, 'up');
    assert.equal(result.repCompleted, false);

    // Frame 3: Arms returned to sides (50 deg <= downThreshold 70)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 50);
    result = engine.evaluate('jumpingJacks', lm);
    assert.equal(result.stage, 'down');
    assert.equal(result.repCompleted, true, 'Rep should complete after returning arms down');
  });

  it('does NOT count jumping jack if arms do not reach upThreshold', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('jumpingJacks');
    const lm = createSyntheticLandmarks();

    // Start closed (45 deg)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 45);
    engine.evaluate('jumpingJacks', lm);

    // Partial abduction (80 deg: below upThreshold 95)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 80);
    let result = engine.evaluate('jumpingJacks', lm);
    assert.equal(result.stage, 'down');

    // Return to sides (45 deg)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 45);
    result = engine.evaluate('jumpingJacks', lm);
    assert.equal(result.repCompleted, false);
  });
});

describe('5. Isometric Hold Alignment (Plank)', () => {
  it('reports good alignment for horizontal straight plank (180 deg)', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('plank');
    const lm = createSyntheticLandmarks();

    // Place shoulder at (0.2, 0.7), hip at (0.5, 0.7), ankle at (0.8, 0.7) -> perfectly horizontal straight line (180 deg)
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.2, y: 0.7, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.7, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.8, y: 0.7, visibility: 0.95 };

    const result = engine.evaluate('plank', lm);
    assert.equal(result.inFrame, true);
    assert.equal(result.isGoodForm, true);
    assert.equal(result.formFaults.length, 0);
  });

  it('flags form fault when hip deviation exceeds maxDeviation (> 15 deg from 180)', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('plank');
    const lm = createSyntheticLandmarks();

    // Sagging hip: shoulder (0.2, 0.6), hip sagging to (0.5, 0.85), ankle (0.8, 0.6)
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.2, y: 0.6, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.85, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.8, y: 0.6, visibility: 0.95 };

    const result = engine.evaluate('plank', lm);
    assert.equal(result.isGoodForm, false);
    assert.ok(result.formFaults.some((f) => f.message.includes('straight')));
  });

  it('detects when user is not horizontal and cues floor positioning', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('plank');
    const lm = createSyntheticLandmarks();

    // Standing vertically: shoulder (0.5, 0.2), hip (0.5, 0.5), ankle (0.5, 0.8)
    lm[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.5, y: 0.2, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_HIP] = { x: 0.5, y: 0.5, visibility: 0.95 };
    lm[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.5, y: 0.8, visibility: 0.95 };

    const result = engine.evaluate('plank', lm);
    assert.equal(result.isGoodForm, false);
    assert.ok(result.formFaults.some((f) => f.message.includes('horizontal')));
  });
});

describe('6. Dynamic Catalog Modification Verifications', () => {
  it('modifying catalog thresholds immediately alters state machine rep triggering', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('squats');
    const lm = createSyntheticLandmarks();

    // Baseline: In default config, downThreshold is 125. An angle of 115 deg triggers down stage.
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    engine.evaluate('squats', lm);

    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 115);
    let result = engine.evaluate('squats', lm);
    assert.equal(result.stage, 'down', '115 deg reaches depth under default 125 threshold');

    // NOW: Reconfigure engine with strict gym squat threshold (downThreshold = 90)
    engine.setExerciseConfig('squats', {
      ...EXERCISE_CATALOG.squats,
      downThreshold: 90,
      repThresholds: {
        ...EXERCISE_CATALOG.squats.repThresholds,
        downThreshold: 90
      }
    });
    engine.reset('squats');

    // Standing (160 deg)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 160);
    engine.evaluate('squats', lm);

    // Frame at 115 deg: Under strict 90 deg rule, 115 deg is INCOMPLETE depth!
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 115);
    result = engine.evaluate('squats', lm);
    assert.equal(result.stage, 'up', 'Under strict threshold (90 deg), 115 deg does NOT trigger down');

    // Descend all the way to 85 deg: Under strict rule, this reaches depth!
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 85);
    result = engine.evaluate('squats', lm);
    assert.equal(result.stage, 'down', '85 deg triggers depth under strict 90 deg threshold');

    // Return to lockout
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE, 155);
    result = engine.evaluate('squats', lm);
    assert.equal(result.repCompleted, true, 'Rep completes under modified threshold');
  });

  it('supports passing one-off custom configurations to evaluate', () => {
    const engine = new ExerciseRepEngine();
    engine.reset('jumpingJacks');
    const lm = createSyntheticLandmarks();

    // Closed start (45 deg)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 45);
    engine.evaluate('jumpingJacks', lm);

    // High custom threshold: upThreshold = 140
    const customJackConfig: Partial<ExerciseConfig> = {
      id: 'jumpingJacks',
      upThreshold: 140,
      downThreshold: 60
    };

    // Frame at 105 deg (would pass default 95, but fails custom 140)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 105);
    let result = engine.evaluate('jumpingJacks', lm, customJackConfig);
    assert.equal(result.stage, 'down', '105 deg fails custom upThreshold of 140');

    // Frame at 145 deg (exceeds custom 140)
    positionJointAngle(lm, LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_WRIST, 145);
    result = engine.evaluate('jumpingJacks', lm, customJackConfig);
    assert.equal(result.stage, 'up', '145 deg triggers open under custom upThreshold of 140');
  });
});

describe('7. Compatibility Adapter (resolveExerciseConfig)', () => {
  it('adapts a flat partial config into a complete structured ExerciseConfig', () => {
    const flatInput = {
      id: 'squats' as const,
      upThreshold: 155,
      downThreshold: 105
    };

    const resolved = resolveExerciseConfig(flatInput);
    assert.equal(resolved.upThreshold, 155);
    assert.equal(resolved.downThreshold, 105);
    assert.equal(resolved.repThresholds.upThreshold, 155);
    assert.equal(resolved.repThresholds.downThreshold, 105);
    assert.equal(resolved.direction, 'decreasing_flexion');
    assert.ok(resolved.confidenceThresholds);
    assert.ok(resolved.instructions.length > 0);
  });

  it('throws an informative error if an impossible config is resolved', () => {
    const impossibleInput = {
      id: 'squats' as const,
      upThreshold: 80,
      downThreshold: 130
    };

    assert.throws(
      () => resolveExerciseConfig(impossibleInput),
      /Impossible decreasing_flexion configuration/
    );
  });
});
