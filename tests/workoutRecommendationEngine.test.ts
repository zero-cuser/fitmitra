import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateWorkout } from '../src/services/workoutRecommendationEngine.ts';
import { EXERCISE_CONSTRAINTS } from '../src/data/exercises.ts';
import type { WorkoutConstraints } from '../src/types/fitness.ts';

describe('Adaptive Hostel Workout Recommendation Engine', () => {
  // Base default constraints for tests
  const baseConstraints: WorkoutConstraints = {
    durationMinutes: 7,
    space: 'small',
    equipment: ['none'],
    noiseTolerance: 'low',
    goal: 'strength',
    difficulty: 'beginner'
  };

  it('1. Generates a valid 5-minute silent workout with no noisy exercises', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      durationMinutes: 5,
      noiseTolerance: 'silent'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.ok(result.items.length >= 1 && result.items.length <= 2);
    // Every exercise must be silent
    result.items.forEach((item) => {
      const meta = EXERCISE_CONSTRAINTS[item.exerciseKey];
      assert.equal(meta.noise, 'silent', `${item.name} must be silent`);
    });
  });

  it('2. Generates a valid 10-minute silent workout scaling volume and exercises', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      durationMinutes: 10,
      noiseTolerance: 'silent'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.ok(result.items.length >= 2, 'Should recommend at least 2 distinct exercises for 10 min');
    result.items.forEach((item) => {
      const meta = EXERCISE_CONSTRAINTS[item.exerciseKey];
      assert.equal(meta.noise, 'silent');
    });
  });

  it('3. Generates a 7-minute lower-body strength workout prioritizing squats/lunges', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      durationMinutes: 7,
      goal: 'strength',
      space: 'medium'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    const keys = result.items.map((i) => i.exerciseKey);
    // Squats or lunges must be present for lower body strength
    assert.ok(keys.includes('squats') || keys.includes('lunges'), 'Expected squats or lunges for strength');
  });

  it('4. Strictly respects no-equipment constraint without asking for external gear', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      equipment: ['none']
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    result.items.forEach((item) => {
      const meta = EXERCISE_CONSTRAINTS[item.exerciseKey];
      assert.deepEqual(meta.equipment, ['none']);
    });
  });

  it('5. Strictly restricts exercises to tiny (bedside) space (only stationary squats fit)', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      space: 'tiny',
      noiseTolerance: 'silent'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    result.items.forEach((item) => {
      const meta = EXERCISE_CONSTRAINTS[item.exerciseKey];
      assert.equal(meta.space, 'tiny', 'Exercise must fit in tiny space');
      assert.equal(item.exerciseKey, 'squats');
    });
  });

  it('6. Correctly prioritizes strength goal exercises', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      goal: 'strength',
      space: 'medium',
      noiseTolerance: 'low'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    const topItem = result.items[0];
    const meta = EXERCISE_CONSTRAINTS[topItem.exerciseKey];
    assert.ok(
      meta.primaryGoals.includes('strength') || meta.secondaryGoals.includes('strength'),
      'Top exercise should align with strength goal'
    );
  });

  it('7. Recommends cardio jumping jacks when cardio goal and large space are provided', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      goal: 'cardio',
      space: 'large',
      noiseTolerance: 'high'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    const keys = result.items.map((i) => i.exerciseKey);
    assert.ok(keys.includes('jumpingJacks'), 'Jumping jacks must be included for high-energy cardio');
  });

  it('8. Supports posture and wellness goals with isometric plank and pushups', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      goal: 'posture',
      space: 'small',
      noiseTolerance: 'silent'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    const keys = result.items.map((i) => i.exerciseKey);
    assert.ok(keys.includes('plank'), 'Plank must be prioritized for posture');
  });

  it('9. Beginner difficulty protects user from advanced volume and adjusts reps', () => {
    const beginnerConstraints: WorkoutConstraints = {
      ...baseConstraints,
      difficulty: 'beginner'
    };
    const advancedConstraints: WorkoutConstraints = {
      ...baseConstraints,
      difficulty: 'advanced'
    };

    const beginnerResult = generateWorkout(beginnerConstraints);
    const advancedResult = generateWorkout(advancedConstraints);

    assert.equal(beginnerResult.success, true);
    assert.equal(advancedResult.success, true);

    if (beginnerResult.success && advancedResult.success) {
      const begSquats = beginnerResult.items.find((i) => i.exerciseKey === 'squats');
      const advSquats = advancedResult.items.find((i) => i.exerciseKey === 'squats');
      if (begSquats && advSquats) {
        assert.ok(
          begSquats.repsOrSeconds <= advSquats.repsOrSeconds,
          'Beginner reps should be lower or equal to advanced reps'
        );
      }
    }
  });

  it('10. Excluded exercises are NEVER recommended under any circumstances', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      space: 'large',
      noiseTolerance: 'high',
      excludedExerciseIds: ['squats', 'plank', 'jumpingJacks']
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    const keys = result.items.map((i) => i.exerciseKey);
    assert.equal(keys.includes('squats'), false, 'Squats must not appear');
    assert.equal(keys.includes('plank'), false, 'Plank must not appear');
    assert.equal(keys.includes('jumpingJacks'), false, 'Jumping jacks must not appear');
  });

  it('11. Noise constraint strictly rejects jumping jacks when noiseTolerance is silent or low', () => {
    const silentConstraints: WorkoutConstraints = {
      ...baseConstraints,
      space: 'large',
      noiseTolerance: 'silent'
    };
    const lowConstraints: WorkoutConstraints = {
      ...baseConstraints,
      space: 'large',
      noiseTolerance: 'low'
    };

    const resSilent = generateWorkout(silentConstraints);
    const resLow = generateWorkout(lowConstraints);

    if (resSilent.success) {
      assert.equal(
        resSilent.items.some((i) => i.exerciseKey === 'jumpingJacks'),
        false,
        'Jumping jacks must never appear in silent'
      );
    }

    if (resLow.success) {
      assert.equal(
        resLow.items.some((i) => i.exerciseKey === 'jumpingJacks'),
        false,
        'Jumping jacks must never appear in low noise'
      );
    }
  });

  it('12. Space constraint strictly rejects prone/mat exercises when space is tiny', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      space: 'tiny'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    const keys = result.items.map((i) => i.exerciseKey);
    assert.equal(keys.includes('pushups'), false, 'Pushups cannot fit in tiny space');
    assert.equal(keys.includes('plank'), false, 'Plank cannot fit in tiny space');
    assert.equal(keys.includes('jumpingJacks'), false, 'Jumping jacks cannot fit in tiny space');
    assert.equal(keys.includes('lunges'), false, 'Lunges cannot fit in tiny space');
  });

  it('13. Duration bounds are respected and scaled appropriately', () => {
    const short = generateWorkout({ ...baseConstraints, durationMinutes: 2 });
    const long = generateWorkout({ ...baseConstraints, durationMinutes: 15, space: 'medium' });

    assert.equal(short.success, true);
    assert.equal(long.success, true);

    if (short.success && long.success) {
      assert.equal(short.items.length, 1, '2-minute workout should have 1 focused exercise');
      assert.ok(long.items.length >= 2, '15-minute workout should have multiple exercises');
      assert.ok(short.totalDurationMinutes < long.totalDurationMinutes);
    }
  });

  it('14. Preferred exercises receive a strong priority boost', () => {
    const normal = generateWorkout({ ...baseConstraints, space: 'medium' });
    const preferred = generateWorkout({
      ...baseConstraints,
      space: 'medium',
      preferredExerciseIds: ['lunges']
    });

    assert.equal(preferred.success, true);
    if (preferred.success) {
      assert.equal(preferred.items[0].exerciseKey, 'lunges', 'Preferred exercise should be ranked first');
    }
  });

  it('15. Impossible constraint combination triggers clear no-solution state with relaxation suggestions', () => {
    // Exclude all 5 exercises
    const impossibleConstraints: WorkoutConstraints = {
      ...baseConstraints,
      excludedExerciseIds: ['squats', 'pushups', 'jumpingJacks', 'lunges', 'plank']
    };

    const result = generateWorkout(impossibleConstraints);
    assert.equal(result.success, false);
    if (result.success) return;

    assert.ok(result.blockingConstraints.length > 0);
    assert.ok(result.relaxationOptions.length > 0);
    assert.ok(
      result.relaxationOptions.some((o) => o.field === 'excludedExerciseIds'),
      'Should suggest clearing exclusions'
    );
  });

  it('16. Generates 100% deterministic output for identical constraints', () => {
    const c: WorkoutConstraints = {
      durationMinutes: 7,
      space: 'medium',
      equipment: ['none'],
      noiseTolerance: 'low',
      goal: 'strength',
      difficulty: 'intermediate'
    };

    const run1 = generateWorkout(c);
    const run2 = generateWorkout(c);
    const run3 = generateWorkout(c);

    assert.deepEqual(run1, run2, 'Run 1 and Run 2 must be identical');
    assert.deepEqual(run2, run3, 'Run 2 and Run 3 must be identical');
  });

  it('17. Guarantees no duplicate exercises in the generated routine', () => {
    const constraints: WorkoutConstraints = {
      ...baseConstraints,
      durationMinutes: 15,
      space: 'large',
      noiseTolerance: 'high'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    const keys = result.items.map((i) => i.exerciseKey);
    const uniqueKeys = new Set(keys);
    assert.equal(keys.length, uniqueKeys.size, 'No duplicate exercises allowed in routine');
  });

  it('18. Generates truthful and comprehensive explanation points', () => {
    const constraints: WorkoutConstraints = {
      durationMinutes: 7,
      space: 'small',
      equipment: ['none'],
      noiseTolerance: 'silent',
      goal: 'strength',
      difficulty: 'beginner'
    };

    const result = generateWorkout(constraints);
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.ok(result.explanation.length >= 4);
    assert.ok(result.explanation.some((e) => e.includes('Fits your 7-minute target')));
    assert.ok(result.explanation.some((e) => e.includes('zero equipment')));
    assert.ok(result.explanation.some((e) => e.includes('silent')));
    assert.ok(result.explanation.some((e) => e.includes('dorm room floor')));
  });
});
