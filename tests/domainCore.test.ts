import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DOMAIN_EXERCISE_CATALOG,
  validateExerciseConfig,
  resolveExerciseConfig,
  calculateWorkoutProgress,
  calculateCaloriesBurned,
  calculateXpEarned,
  calculateLevelFromXp,
  calculateSessionSummary,
  generateWorkout,
  createExamSession,
  getExamModeConstraints,
  ElapsedTimerController,
  isChallengeComplete,
  calculateChallengePercentage,
  initializeChallengeParticipation,
  recordActivityProgress,
  calculateStreak,
  calculateNutritionSummary,
  calculateWeeklyProgress,
  calculateAngle,
  smoothLandmarksEMA,
  hasMinimumJointConfidence
} from '../src/domain/index.ts';

describe('Phase 7 — Android Architecture Extraction: Domain Core', () => {
  // ========================================================
  // 1. Exercise Catalog & Biomechanical Validation
  // ========================================================
  describe('1. Exercise Catalog & Biomechanical Validation', () => {
    it('contains all 5 core exercises with valid thresholds and hysteresis', () => {
      const keys = Object.keys(DOMAIN_EXERCISE_CATALOG) as (keyof typeof DOMAIN_EXERCISE_CATALOG)[];
      assert.equal(keys.length, 5);

      for (const key of keys) {
        const config = DOMAIN_EXERCISE_CATALOG[key];
        const validation = validateExerciseConfig(config);
        assert.equal(validation.valid, true, `Exercise "${key}" failed validation: ${validation.errors.join(', ')}`);
        assert.ok(Math.abs(config.upThreshold - config.downThreshold) >= 10, 'Hysteresis must be >= 10 degrees');
      }
    });

    it('rejects impossible decreasing flexion thresholds (up <= down)', () => {
      const badConfig = {
        ...DOMAIN_EXERCISE_CATALOG.squats,
        direction: 'decreasing_flexion' as const,
        upThreshold: 110,
        downThreshold: 125,
        repThresholds: { upThreshold: 110, downThreshold: 125, repCooldownMs: 500 }
      };
      const validation = validateExerciseConfig(badConfig);
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some((e) => e.includes('impossible thresholds')));
    });

    it('resolves legacy configurations cleanly via compatibility adapter', () => {
      const resolved = resolveExerciseConfig({
        id: 'pushups',
        upThreshold: 150,
        downThreshold: 120
      });
      assert.equal(resolved.id, 'pushups');
      assert.equal(resolved.upThreshold, 150);
      assert.equal(resolved.downThreshold, 120);
      assert.equal(resolved.repThresholds.upThreshold, 150);
    });
  });

  // ========================================================
  // 2. Workout Rules & Calculations
  // ========================================================
  describe('2. Workout Rules & Calculations', () => {
    it('calculates workout progress percentage and completion status', () => {
      const p1 = calculateWorkoutProgress(5, 10);
      assert.equal(p1.progressPercentage, 50);
      assert.equal(p1.isCompleted, false);
      assert.equal(p1.remainingReps, 5);

      const p2 = calculateWorkoutProgress(12, 10);
      assert.equal(p2.progressPercentage, 100);
      assert.equal(p2.isCompleted, true);
      assert.equal(p2.remainingReps, 0);
    });

    it('calculates calories burned accurately from rate per rep', () => {
      const caloriesSquats = calculateCaloriesBurned('squats', 30);
      // 30 * 0.32 = 9.6 -> round to 10
      assert.equal(caloriesSquats, 10);

      const caloriesPushups = calculateCaloriesBurned('pushups', 20);
      // 20 * 0.45 = 9
      assert.equal(caloriesPushups, 9);
    });

    it('calculates XP and user level progress deterministically', () => {
      // 10 reps of squats completed = 10 * 10 + 50 bonus = 150 XP
      const xp = calculateXpEarned(10, true, false);
      assert.equal(xp, 150);

      const levelInfo = calculateLevelFromXp(280);
      assert.equal(levelInfo.level, 3);
      assert.equal(levelInfo.currentLevelXp, 80);
      assert.equal(levelInfo.nextLevelXp, 100);
      assert.equal(levelInfo.levelProgressPercent, 80);
    });

    it('generates a complete, immutable session summary', () => {
      const summary = calculateSessionSummary({
        exerciseKey: 'squats',
        completedReps: 15,
        targetReps: 15,
        durationSeconds: 75,
        postureScore: 94
      });

      assert.equal(summary.exerciseKey, 'squats');
      assert.equal(summary.completedReps, 15);
      assert.equal(summary.isCompleted, true);
      assert.equal(summary.durationSeconds, 75);
      assert.equal(summary.averagePostureScore, 94);
      assert.ok(summary.caloriesBurned > 0);
      assert.ok(summary.xpEarned > 0);
    });
  });

  // ========================================================
  // 3. Adaptive Hostel Workout Engine
  // ========================================================
  describe('3. Adaptive Hostel Workout Engine (Domain Bridge)', () => {
    it('produces deterministic workout recommendations for hostel constraints', () => {
      const result = generateWorkout({
        durationMinutes: 7,
        space: 'small',
        equipment: ['none'],
        noiseTolerance: 'silent',
        goal: 'strength',
        difficulty: 'beginner'
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.items.length > 0);
        assert.equal(result.noise, 'silent');
        assert.equal(result.space, 'small');
        // Jumping jacks must not be present when noise is silent
        assert.equal(result.items.some((r) => r.exerciseKey === 'jumpingJacks'), false);
      }
    });
  });

  // ========================================================
  // 4. Exam Mode Session Generator & Elapsed Timer
  // ========================================================
  describe('4. Exam Mode Session Generator & Elapsed Timer', () => {
    it('generates a 2-minute reset session totaling exactly 120 seconds', () => {
      const session = createExamSession('reset');
      assert.equal(session.totalDurationSeconds, 120);
      assert.ok(session.activities.length >= 3);
      assert.equal(session.constraintsUsed.noiseTolerance, 'silent');
    });

    it('ElapsedTimerController accurately tracks elapsed time without browser APIs', () => {
      const timer = new ElapsedTimerController([
        { id: 'act_1', name: 'Eye Break', durationSeconds: 30 },
        { id: 'act_2', name: 'Neck Stretch', durationSeconds: 45 }
      ]);

      const t0 = 1000000;
      timer.start(t0);

      // Advance by 10 seconds
      timer.step(t0 + 10000);
      let snapshot = timer.getSnapshot(t0 + 10000);
      assert.equal(snapshot.activityElapsedSeconds, 10);
      assert.equal(snapshot.activityRemainingSeconds, 20);
      assert.equal(snapshot.totalSessionElapsedSeconds, 10);
      assert.equal(snapshot.activityIndex, 0);

      // Complete first activity (30s)
      timer.step(t0 + 30000);
      // Check 5s into second activity (35s)
      snapshot = timer.getSnapshot(t0 + 35000);
      assert.equal(snapshot.activityIndex, 1);
      assert.equal(snapshot.currentActivityId, 'act_2');
      assert.equal(snapshot.activityElapsedSeconds, 5);
      assert.equal(snapshot.totalSessionElapsedSeconds, 35);
    });
  });

  // ========================================================
  // 5. Campus Challenge Rules & Duplicate Prevention
  // ========================================================
  describe('5. Campus Challenge Rules & Duplicate Prevention', () => {
    it('evaluates challenge target completion and percentage accurately', () => {
      assert.equal(isChallengeComplete(100, 100), true);
      assert.equal(isChallengeComplete(105, 100), true);
      assert.equal(isChallengeComplete(99, 100), false);

      assert.equal(calculateChallengePercentage(25, 100), 25);
      assert.equal(calculateChallengePercentage(150, 100), 100);
    });

    it('prevents double counting duplicate activities in challenge progress', () => {
      const initialProgress = initializeChallengeParticipation('challenge_100_squats');
      const progressMap = { challenge_100_squats: initialProgress };

      const activity = {
        id: 'act_workout_unique_01',
        timestamp: '2026-10-05T10:00:00.000Z',
        type: 'workout' as const,
        exerciseKey: 'squats' as const,
        reps: 20,
        durationSeconds: 90
      };

      // First run: processes activity
      const res1 = recordActivityProgress(activity, progressMap);
      assert.equal(res1.updatedMap.challenge_100_squats.currentValue, 20);
      assert.ok(res1.updatedMap.challenge_100_squats.processedActivityIds.includes(activity.id));

      // Second run: duplicate activity ID must be discarded
      const res2 = recordActivityProgress(activity, res1.updatedMap);
      assert.equal(res2.updatedMap.challenge_100_squats.currentValue, 20, 'Duplicate activity must not increment reps');
      assert.equal(res2.updatedChallengeIds.length, 0);
    });
  });

  // ========================================================
  // 6. Progress, Streaks & Nutrition Calculations
  // ========================================================
  describe('6. Progress, Streaks & Nutrition Calculations', () => {
    it('calculates active workout streaks across calendar days', () => {
      const dates = [
        '2026-10-05T12:00:00.000Z', // Today
        '2026-10-04T15:30:00.000Z', // Yesterday
        '2026-10-03T09:00:00.000Z', // 2 days ago
        '2026-10-01T18:00:00.000Z'  // Break in streak
      ];

      const streak = calculateStreak(dates, '2026-10-05');
      assert.equal(streak.currentStreakDays, 3);
      assert.equal(streak.longestStreakDays, 3);
      assert.equal(streak.isStreakActiveToday, true);
    });

    it('identifies broken streak when last activity was before yesterday', () => {
      const dates = [
        '2026-10-01T12:00:00.000Z',
        '2026-09-30T12:00:00.000Z'
      ];

      const streak = calculateStreak(dates, '2026-10-05');
      assert.equal(streak.currentStreakDays, 0, 'Streak is broken if inactive for > 1 day');
      assert.equal(streak.longestStreakDays, 2);
      assert.equal(streak.isStreakActiveToday, false);
    });

    it('calculates aggregated nutrition totals from logged meal records', () => {
      const meals = [
        { id: '1', itemId: 'm1', name: 'Dal Tadka', timestamp: '12:30', calories: 160, protein: 7, icon: '🥣' },
        { id: '2', itemId: 'm2', name: 'Roti (2x)', timestamp: '12:30', calories: 190, protein: 6, icon: '🫓' },
        { id: '3', itemId: 'm7', name: 'Boiled Eggs', timestamp: '17:00', calories: 140, protein: 13, icon: '🥚' }
      ];

      const summary = calculateNutritionSummary(meals);
      assert.equal(summary.totalCalories, 490);
      assert.equal(summary.totalProtein, 26);
      assert.equal(summary.mealCount, 3);
    });

    it('computes weekly progress totals from daily calorie records', () => {
      const weekly = [
        { day: 'Mon', date: 'Oct 1', caloriesBurned: 250, caloriesGained: 1800, netBalance: 1550 },
        { day: 'Tue', date: 'Oct 2', caloriesBurned: 300, caloriesGained: 1900, netBalance: 1600 },
        { day: 'Wed', date: 'Oct 3', caloriesBurned: 50, caloriesGained: 1700, netBalance: 1650 }
      ];

      const progress = calculateWeeklyProgress(weekly, 250, 4);
      assert.equal(progress.weeklyCaloriesBurned, 600);
      assert.equal(progress.weeklyCaloriesGained, 5400);
      assert.equal(progress.weeklyWorkoutsCount, 2); // 2 days with > 100 cal
      assert.equal(progress.currentLevel, 3);
    });
  });

  // ========================================================
  // 7. Kinematic Angle Math & Landmark Smoothing
  // ========================================================
  describe('7. Kinematic Angle Math & Landmark Smoothing', () => {
    it('calculates 2D planar joint angles accurately', () => {
      // 90 degree right angle: A(0, 1) -> B(0, 0) -> C(1, 0)
      const angle90 = calculateAngle(
        { x: 0, y: 1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      );
      assert.equal(angle90, 90);

      // 180 degree collinear line: A(-1, 0) -> B(0, 0) -> C(1, 0)
      const angle180 = calculateAngle(
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      );
      assert.equal(angle180, 180);
    });

    it('smooths landmark coordinates using Exponential Moving Average', () => {
      const prev = [{ x: 10, y: 10, visibility: 0.9 }];
      const curr = [{ x: 20, y: 20, visibility: 0.9 }];

      // alpha = 0.6: 0.6 * 20 + 0.4 * 10 = 12 + 4 = 16
      const smoothed = smoothLandmarksEMA(curr, prev, 0.6);
      assert.equal(smoothed[0].x, 16);
      assert.equal(smoothed[0].y, 16);
    });

    it('checks minimum joint confidence across required vertex indices', () => {
      const landmarks = [
        { x: 0.5, y: 0.5, visibility: 0.95 },
        { x: 0.5, y: 0.7, visibility: 0.80 },
        { x: 0.5, y: 0.9, visibility: 0.15 } // Low visibility
      ];

      assert.equal(hasMinimumJointConfidence(landmarks, [0, 1], 0.25), true);
      assert.equal(hasMinimumJointConfidence(landmarks, [0, 1, 2], 0.25), false);
    });
  });
});
