import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPUS_CHALLENGES_CATALOG,
  validateChallenge,
  getChallengeCatalog,
  getChallengeById,
  loadAllChallengeProgress,
  saveChallengeProgress,
  joinChallenge,
  leaveChallenge,
  recordActivityProgress,
  mapChallengeToWorkoutConstraints
} from '../src/services/campusChallengesService.ts';
import { generateWorkout } from '../src/services/workoutRecommendationEngine.ts';
import { STORAGE_KEYS, clearWorkoutHistory } from '../src/utils/storageSafety.ts';
import { MockLocalStorage } from './mocks/browserMocks.ts';
import type { CampusChallenge, ChallengeProgress, CompletedActivityRecord } from '../src/types/fitness.ts';

describe('Phase 5 — Campus Challenges Engine & Verification', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (global as any).window = {
      localStorage: mockStorage
    };
  });

  // 1. Catalog schema integrity
  it('1. All challenges in CAMPUS_CHALLENGES_CATALOG pass schema validation', () => {
    assert.ok(CAMPUS_CHALLENGES_CATALOG.length >= 6);
    for (const challenge of CAMPUS_CHALLENGES_CATALOG) {
      assert.equal(validateChallenge(challenge), true, `Challenge ${challenge.id} must be valid`);
      assert.ok(challenge.targetValue > 0);
      assert.ok(challenge.durationDays > 0);
      assert.ok(challenge.unit);
      assert.ok(challenge.title);
    }
  });

  // 2. Model validation rejections
  it('2. Rejects invalid challenge objects (invalid target, duration, type, category)', () => {
    const valid = CAMPUS_CHALLENGES_CATALOG[0];

    // Invalid target (0 or negative)
    assert.equal(validateChallenge({ ...valid, targetValue: 0 }), false);
    assert.equal(validateChallenge({ ...valid, targetValue: -5 }), false);

    // Invalid duration
    assert.equal(validateChallenge({ ...valid, durationDays: 0 }), false);

    // Invalid type
    assert.equal(validateChallenge({ ...valid, type: 'fake_type' as any }), false);

    // Invalid category
    assert.equal(validateChallenge({ ...valid, category: 'fake_cat' as any }), false);

    // Null or undefined
    assert.equal(validateChallenge(null), false);
    assert.equal(validateChallenge(undefined), false);
  });

  // 3. Joining a challenge
  it('3. Joining a challenge initializes progress correctly and persists', () => {
    const testId = 'challenge_5_hostel_workouts';
    const progress = joinChallenge(testId, '2026-09-26T10:00:00Z');

    assert.equal(progress.challengeId, testId);
    assert.equal(progress.currentValue, 0);
    assert.equal(progress.completed, false);
    assert.equal(progress.completedSessions, 0);
    assert.deepEqual(progress.completedDays, []);

    // Check persistence
    const saved = loadAllChallengeProgress();
    assert.ok(saved[testId]);
    assert.equal(saved[testId].challengeId, testId);
  });

  // 4. Duplicate join is idempotent
  it('4. Duplicate join is idempotent and does not reset existing progress', () => {
    const testId = 'challenge_100_squats';
    // Initial join
    joinChallenge(testId);

    // Simulate some progress
    const map = loadAllChallengeProgress();
    map[testId].currentValue = 42;
    saveChallengeProgress(map);

    // Second join call
    const secondResult = joinChallenge(testId);
    assert.equal(secondResult.currentValue, 42, 'Must not clobber existing progress');

    const verified = loadAllChallengeProgress();
    assert.equal(verified[testId].currentValue, 42);
  });

  // 5. Leaving a challenge
  it('5. Leaving a challenge removes it from active progress map', () => {
    const testId = 'challenge_50_pushups';
    joinChallenge(testId);
    assert.ok(loadAllChallengeProgress()[testId]);

    leaveChallenge(testId);
    assert.equal(loadAllChallengeProgress()[testId], undefined);
  });

  // 6. Rep target challenge progress
  it('6. Rep target challenge increments progress on matching exercise reps', () => {
    const progressMap: Record<string, ChallengeProgress> = {
      challenge_100_squats: {
        challengeId: 'challenge_100_squats',
        joinedAt: '2026-09-26T10:00:00Z',
        currentValue: 20,
        completedDays: ['2026-09-25'],
        completedSessions: 1,
        processedActivityIds: ['act_prev'],
        completed: false
      }
    };

    const squatWorkout: CompletedActivityRecord = {
      id: 'act_squat_1',
      timestamp: '2026-09-26T15:00:00Z',
      type: 'workout',
      exerciseKey: 'squats',
      reps: 25,
      durationSeconds: 180
    };

    const res = recordActivityProgress(squatWorkout, progressMap);
    assert.ok(res.updatedChallengeIds.includes('challenge_100_squats'));
    assert.equal(res.updatedMap.challenge_100_squats.currentValue, 45); // 20 + 25
  });

  // 7. Rep challenge ignores non-matching exercises
  it('7. Rep target challenge does not increment when a different exercise is performed', () => {
    const progressMap: Record<string, ChallengeProgress> = {
      challenge_100_squats: {
        challengeId: 'challenge_100_squats',
        joinedAt: '2026-09-26T10:00:00Z',
        currentValue: 20,
        completedDays: [],
        completedSessions: 1,
        processedActivityIds: [],
        completed: false
      }
    };

    const pushupWorkout: CompletedActivityRecord = {
      id: 'act_pushup_1',
      timestamp: '2026-09-26T16:00:00Z',
      type: 'workout',
      exerciseKey: 'pushups',
      reps: 20,
      durationSeconds: 120
    };

    const res = recordActivityProgress(pushupWorkout, progressMap);
    assert.equal(res.updatedChallengeIds.length, 0);
    assert.equal(res.updatedMap.challenge_100_squats.currentValue, 20);
  });

  // 8. Duration target challenge progress
  it('8. Duration target challenge accumulates active minutes across workouts and exam sessions', () => {
    const progressMap: Record<string, ChallengeProgress> = {
      challenge_50min_movement: {
        challengeId: 'challenge_50min_movement',
        joinedAt: '2026-09-26T10:00:00Z',
        currentValue: 10,
        completedDays: [],
        completedSessions: 1,
        processedActivityIds: [],
        completed: false
      }
    };

    // 10-minute exam recharge session (600s)
    const examSession: CompletedActivityRecord = {
      id: 'act_exam_1',
      timestamp: '2026-09-26T17:00:00Z',
      type: 'exam_session',
      durationSeconds: 600
    };

    const res = recordActivityProgress(examSession, progressMap);
    assert.ok(res.updatedChallengeIds.includes('challenge_50min_movement'));
    assert.equal(res.updatedMap.challenge_50min_movement.currentValue, 20); // 10 + 10 min
  });

  // 9. Session count challenge progress
  it('9. Session count challenge increments on qualifying session', () => {
    const progressMap: Record<string, ChallengeProgress> = {
      challenge_3day_exam_reset: {
        challengeId: 'challenge_3day_exam_reset',
        joinedAt: '2026-09-26T10:00:00Z',
        currentValue: 1,
        completedDays: ['2026-09-25'],
        completedSessions: 1,
        processedActivityIds: [],
        completed: false
      }
    };

    const examReset: CompletedActivityRecord = {
      id: 'act_reset_1',
      timestamp: '2026-09-26T18:00:00Z',
      type: 'exam_session',
      durationSeconds: 120
    };

    const res = recordActivityProgress(examReset, progressMap);
    assert.ok(res.updatedChallengeIds.includes('challenge_3day_exam_reset'));
    assert.equal(res.updatedMap.challenge_3day_exam_reset.currentValue, 2);
    assert.equal(res.updatedMap.challenge_3day_exam_reset.completedSessions, 2);
  });

  // 10. Streak challenge progress per calendar day
  it('10. Streak challenge tracks consecutive calendar days and ignores multiple workouts on same day', () => {
    const progressMap: Record<string, ChallengeProgress> = {
      challenge_7day_streak: {
        challengeId: 'challenge_7day_streak',
        joinedAt: '2026-09-25T10:00:00Z',
        currentValue: 1,
        completedDays: ['2026-09-25'],
        completedSessions: 1,
        processedActivityIds: ['act_day1'],
        completed: false
      }
    };

    // First workout on Sept 26
    const workoutDay2A: CompletedActivityRecord = {
      id: 'act_day2_a',
      timestamp: '2026-09-26T09:00:00Z',
      type: 'workout',
      exerciseKey: 'squats',
      reps: 15,
      durationSeconds: 120
    };

    const res1 = recordActivityProgress(workoutDay2A, progressMap);
    assert.equal(res1.updatedMap.challenge_7day_streak.currentValue, 2);
    assert.deepEqual(res1.updatedMap.challenge_7day_streak.completedDays, ['2026-09-25', '2026-09-26']);

    // Second workout on SAME day (Sept 26) with different activity ID
    const workoutDay2B: CompletedActivityRecord = {
      id: 'act_day2_b',
      timestamp: '2026-09-26T18:00:00Z',
      type: 'workout',
      exerciseKey: 'pushups',
      reps: 15,
      durationSeconds: 120
    };

    const res2 = recordActivityProgress(workoutDay2B, res1.updatedMap);
    // Streak days should remain 2, not increment to 3
    assert.equal(res2.updatedMap.challenge_7day_streak.currentValue, 2);
  });

  // 11. CRITICAL: Duplicate activity ID protection (Zero double-counting)
  it('11. Processing the exact same activity ID twice is strictly idempotent and does not double count', () => {
    const progressMap: Record<string, ChallengeProgress> = {
      challenge_100_squats: {
        challengeId: 'challenge_100_squats',
        joinedAt: '2026-09-26T10:00:00Z',
        currentValue: 30,
        completedDays: [],
        completedSessions: 1,
        processedActivityIds: [],
        completed: false
      }
    };

    const duplicateWorkout: CompletedActivityRecord = {
      id: 'unique_workout_xyz',
      timestamp: '2026-09-26T14:30:00Z',
      type: 'workout',
      exerciseKey: 'squats',
      reps: 20,
      durationSeconds: 180
    };

    // First processing pass
    const pass1 = recordActivityProgress(duplicateWorkout, progressMap);
    assert.equal(pass1.updatedMap.challenge_100_squats.currentValue, 50);
    assert.ok(pass1.updatedMap.challenge_100_squats.processedActivityIds.includes('unique_workout_xyz'));

    // Second processing pass with identical activity
    const pass2 = recordActivityProgress(duplicateWorkout, pass1.updatedMap);
    assert.equal(pass2.updatedMap.challenge_100_squats.currentValue, 50, 'Must NOT double-count duplicate activity');
    assert.equal(pass2.updatedChallengeIds.length, 0);
  });

  // 12. Progress clamping at targetValue
  it('12. Progress value is clamped at targetValue and does not exceed it', () => {
    const progressMap: Record<string, ChallengeProgress> = {
      challenge_50_pushups: {
        challengeId: 'challenge_50_pushups',
        joinedAt: '2026-09-26T10:00:00Z',
        currentValue: 40,
        completedDays: [],
        completedSessions: 2,
        processedActivityIds: [],
        completed: false
      }
    };

    const bigWorkout: CompletedActivityRecord = {
      id: 'act_massive_pushup',
      timestamp: '2026-09-26T19:00:00Z',
      type: 'workout',
      exerciseKey: 'pushups',
      reps: 30, // 40 + 30 = 70, target is 50
      durationSeconds: 300
    };

    const res = recordActivityProgress(bigWorkout, progressMap);
    assert.equal(res.updatedMap.challenge_50_pushups.currentValue, 50, 'Progress must be clamped to target (50)');
    assert.equal(res.updatedMap.challenge_50_pushups.completed, true);
  });

  // 13. Target reached marks challenge completed
  it('13. Reaching targetValue marks completed: true with timestamp exactly once', () => {
    const progressMap: Record<string, ChallengeProgress> = {
      challenge_3day_exam_reset: {
        challengeId: 'challenge_3day_exam_reset',
        joinedAt: '2026-09-26T10:00:00Z',
        currentValue: 2,
        completedDays: ['2026-09-24', '2026-09-25'],
        completedSessions: 2,
        processedActivityIds: [],
        completed: false
      }
    };

    const completingSession: CompletedActivityRecord = {
      id: 'act_final_reset',
      timestamp: '2026-09-26T20:00:00Z',
      type: 'exam_session',
      durationSeconds: 120
    };

    const res = recordActivityProgress(completingSession, progressMap);
    const updated = res.updatedMap.challenge_3day_exam_reset;
    assert.equal(updated.currentValue, 3);
    assert.equal(updated.completed, true);
    assert.equal(updated.completedAt, '2026-09-26T20:00:00Z');
    assert.ok(res.newlyCompletedChallengeIds.includes('challenge_3day_exam_reset'));
  });

  // 14. Completed challenge remains completed
  it('14. Completed challenge remains completed and does not re-complete on subsequent workouts', () => {
    const progressMap: Record<string, ChallengeProgress> = {
      challenge_100_squats: {
        challengeId: 'challenge_100_squats',
        joinedAt: '2026-09-20T10:00:00Z',
        currentValue: 100,
        completedDays: ['2026-09-20', '2026-09-21'],
        completedSessions: 5,
        processedActivityIds: ['act_old'],
        completed: true,
        completedAt: '2026-09-21T18:00:00Z'
      }
    };

    const anotherWorkout: CompletedActivityRecord = {
      id: 'act_extra_squat',
      timestamp: '2026-09-26T20:30:00Z',
      type: 'workout',
      exerciseKey: 'squats',
      reps: 20,
      durationSeconds: 120
    };

    const res = recordActivityProgress(anotherWorkout, progressMap);
    assert.equal(res.updatedMap.challenge_100_squats.currentValue, 100);
    assert.equal(res.updatedMap.challenge_100_squats.completed, true);
    assert.equal(res.updatedMap.challenge_100_squats.completedAt, '2026-09-21T18:00:00Z');
    assert.equal(res.newlyCompletedChallengeIds.length, 0);
  });

  // 15. Adaptive Hostel Workout Engine mapping
  it('15. mapChallengeToWorkoutConstraints generates valid constraints for Adaptive Workout Engine', () => {
    const hostelChallenge = getChallengeById('challenge_5_hostel_workouts')!;
    const constraints = mapChallengeToWorkoutConstraints(hostelChallenge);

    assert.equal(constraints.space, 'small');
    assert.deepEqual(constraints.equipment, ['none']);
    assert.equal(constraints.noiseTolerance, 'low');

    // Run directly through Adaptive Recommendation Engine!
    const recommendation = generateWorkout(constraints);
    assert.equal(recommendation.success, true);
    assert.ok(recommendation.items.length >= 1);
  });

  // 16. Storage Safety & Fallback Recovery
  it('16. Recovers safely from corrupt LocalStorage without crashing', () => {
    mockStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, 'invalid json {[');
    const loaded = loadAllChallengeProgress();
    assert.ok(loaded);
    assert.ok(typeof loaded === 'object');
  });

  // 17. Storage clearing includes challenge progress
  it('17. clearWorkoutHistory removes CHALLENGE_PROGRESS while preserving user profile', () => {
    mockStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, JSON.stringify({ ch1: { currentValue: 5 } }));
    mockStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ name: 'Student' }));

    const res = clearWorkoutHistory();
    assert.equal(res, true);
    assert.equal(mockStorage.getItem(STORAGE_KEYS.CHALLENGE_PROGRESS), null);
    assert.ok(mockStorage.getItem(STORAGE_KEYS.USER));
  });
});
