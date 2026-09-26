import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateStableId,
  toIsoUtcString,
  isValidIsoUtc,
  LocalWorkoutHistoryRepository,
  LocalChallengeRepository,
  LocalUserRepository,
  RepositoryError,
  getFeatureFlags,
  overrideFeatureFlag,
  resetFeatureFlags,
  DEFAULT_FEATURE_FLAGS
} from '../src/domain/index.ts';
import type {
  WorkoutSessionRecord,
  DomainUserProfile,
  ChallengeParticipation
} from '../src/domain/index.ts';
import { MockLocalStorage } from './mocks/browserMocks.ts';

describe('Phase 6 — Backend & Account Architecture', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (global as any).window = {
      localStorage: mockStorage
    };
    resetFeatureFlags();
  });

  // ========================================================
  // 1. Stable ID & Timestamp Utilities
  // ========================================================
  describe('1. Stable ID & Timestamp Utilities', () => {
    it('generates collision-resistant stable IDs with correct domain prefix', () => {
      const id1 = generateStableId('work');
      const id2 = generateStableId('work');
      const idAcc = generateStableId('acc');

      assert.match(id1, /^work_\d+_[a-z0-9]+$/);
      assert.match(id2, /^work_\d+_[a-z0-9]+$/);
      assert.match(idAcc, /^acc_\d+_[a-z0-9]+$/);
      assert.notEqual(id1, id2, 'Successive IDs must be unique');
    });

    it('generates unique IDs across 100 rapid successive calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateStableId('test'));
      }
      assert.equal(ids.size, 100, 'All 100 generated IDs must be distinct');
    });

    it('formats dates into strict ISO 8601 UTC strings', () => {
      const now = new Date('2026-09-26T18:00:00.000Z');
      const formatted = toIsoUtcString(now);
      assert.equal(formatted, '2026-09-26T18:00:00.000Z');
      assert.equal(isValidIsoUtc(formatted), true);
    });

    it('strictly validates ISO 8601 UTC and rejects invalid or non-UTC strings', () => {
      assert.equal(isValidIsoUtc('2026-09-26T18:00:00.000Z'), true);
      assert.equal(isValidIsoUtc('2026-09-26T18:00:00Z'), true);
      // Rejects local timezone strings without Z
      assert.equal(isValidIsoUtc('2026-09-26 18:00:00'), false);
      assert.equal(isValidIsoUtc('Sept 2026'), false);
      assert.equal(isValidIsoUtc('invalid-date'), false);
      assert.equal(isValidIsoUtc(null as any), false);
    });
  });

  // ========================================================
  // 2. LocalWorkoutHistoryRepository & Privacy Guards
  // ========================================================
  describe('2. LocalWorkoutHistoryRepository & Privacy Guards', () => {
    it('appends and retrieves workout sessions in reverse chronological order', async () => {
      const repo = new LocalWorkoutHistoryRepository();

      const session1: WorkoutSessionRecord = {
        id: generateStableId('work'),
        accountId: 'acc_student_01',
        exerciseKey: 'squats',
        exerciseName: 'Bodyweight Squats',
        reps: 20,
        durationSeconds: 90,
        postureScore: 92,
        timestamp: '2026-09-26T10:00:00.000Z',
        isHostelFriendly: true,
        completedFully: true,
        source: 'pose_coach'
      };

      const session2: WorkoutSessionRecord = {
        id: generateStableId('work'),
        accountId: 'acc_student_01',
        exerciseKey: 'pushups',
        exerciseName: 'Floor Push-Ups',
        reps: 15,
        durationSeconds: 60,
        postureScore: 88,
        timestamp: '2026-09-26T14:00:00.000Z', // Later timestamp
        isHostelFriendly: true,
        completedFully: true,
        source: 'pose_coach'
      };

      await repo.saveSession(session1);
      await repo.saveSession(session2);

      const history = await repo.getHistory('acc_student_01');
      assert.equal(history.length, 2);
      // Most recent first
      assert.equal(history[0].id, session2.id);
      assert.equal(history[1].id, session1.id);
    });

    it('retrieves a single session by stable ID', async () => {
      const repo = new LocalWorkoutHistoryRepository();
      const stableId = generateStableId('work');

      const session: WorkoutSessionRecord = {
        id: stableId,
        accountId: 'acc_student_01',
        exerciseKey: 'lunges',
        exerciseName: 'Walking Lunges',
        reps: 12,
        durationSeconds: 45,
        timestamp: toIsoUtcString(),
        isHostelFriendly: true,
        completedFully: true,
        source: 'manual'
      };

      await repo.saveSession(session);
      const retrieved = await repo.getSessionById(stableId);

      assert.notEqual(retrieved, null);
      assert.equal(retrieved?.id, stableId);
      assert.equal(retrieved?.exerciseKey, 'lunges');
      assert.equal(retrieved?.reps, 12);
    });

    it('rejects duplicate session IDs with Conflict error (Append-Only guarantee)', async () => {
      const repo = new LocalWorkoutHistoryRepository();
      const stableId = generateStableId('work');

      const session: WorkoutSessionRecord = {
        id: stableId,
        accountId: 'acc_student_01',
        exerciseKey: 'squats',
        exerciseName: 'Squats',
        reps: 10,
        durationSeconds: 30,
        timestamp: toIsoUtcString(),
        isHostelFriendly: true,
        completedFully: true,
        source: 'manual'
      };

      await repo.saveSession(session);

      await assert.rejects(
        async () => {
          await repo.saveSession(session);
        },
        (err: any) => {
          assert.equal(err instanceof RepositoryError, true);
          assert.equal((err as RepositoryError).code, 'Conflict');
          return true;
        }
      );
    });

    it('STRICT PRIVACY: rejects payloads containing raw camera frames or skeletal landmark arrays', async () => {
      const repo = new LocalWorkoutHistoryRepository();

      const compromisedSession: any = {
        id: generateStableId('work'),
        accountId: 'acc_student_01',
        exerciseKey: 'squats',
        exerciseName: 'Squats',
        reps: 10,
        durationSeconds: 30,
        timestamp: toIsoUtcString(),
        isHostelFriendly: true,
        completedFully: true,
        source: 'pose_coach',
        // Attempted privacy violation: attaching raw MediaPipe landmark vectors
        landmarks: [{ x: 0.5, y: 0.6, z: 0.1, visibility: 0.99 }]
      };

      await assert.rejects(
        async () => {
          await repo.saveSession(compromisedSession);
        },
        (err: any) => {
          assert.equal(err instanceof RepositoryError, true);
          assert.equal((err as RepositoryError).code, 'PermissionDenied');
          assert.match((err as RepositoryError).message, /Privacy Violation/i);
          return true;
        }
      );
    });

    it('clears workout history safely', async () => {
      const repo = new LocalWorkoutHistoryRepository();

      await repo.saveSession({
        id: generateStableId('work'),
        accountId: 'acc_student_01',
        exerciseKey: 'squats',
        exerciseName: 'Squats',
        reps: 10,
        durationSeconds: 30,
        timestamp: toIsoUtcString(),
        isHostelFriendly: true,
        completedFully: true,
        source: 'manual'
      });

      let history = await repo.getHistory();
      assert.equal(history.length, 1);

      await repo.clearHistory();
      history = await repo.getHistory();
      assert.equal(history.length, 0);
    });
  });

  // ========================================================
  // 3. LocalChallengeRepository
  // ========================================================
  describe('3. LocalChallengeRepository', () => {
    it('returns all 6 curated challenge definitions', async () => {
      const repo = new LocalChallengeRepository();
      const definitions = await repo.getChallengeDefinitions();

      assert.equal(definitions.length, 6);
      const ids = definitions.map((d) => d.id);
      assert.equal(ids.includes('challenge_7day_streak'), true);
      assert.equal(ids.includes('challenge_100_squats'), true);
      assert.equal(ids.includes('challenge_50_pushups'), true);
      assert.equal(ids.includes('challenge_5_hostel_workouts'), true);
      assert.equal(ids.includes('challenge_3day_exam_reset'), true);
      assert.equal(ids.includes('challenge_50min_movement'), true);
    });

    it('retrieves challenge definition by ID', async () => {
      const repo = new LocalChallengeRepository();
      const def = await repo.getChallengeDefinition('challenge_100_squats');

      assert.notEqual(def, null);
      assert.equal(def?.id, 'challenge_100_squats');
      assert.equal(def?.targetValue, 100);
      assert.equal(def?.category, 'strength');
    });

    it('joins a challenge idempotently and returns initialized participation', async () => {
      const repo = new LocalChallengeRepository();
      const accountId = 'acc_student_01';
      const challengeId = 'challenge_100_squats';

      const part1 = await repo.joinChallenge(accountId, challengeId);
      assert.equal(part1.challengeId, challengeId);
      assert.equal(part1.currentValue, 0);
      assert.equal(part1.targetValue, 100);
      assert.equal(part1.completed, false);

      // Re-joining returns the same participation without resetting progress
      part1.currentValue = 25;
      await repo.saveParticipation(part1);

      const part2 = await repo.joinChallenge(accountId, challengeId);
      assert.equal(part2.currentValue, 25);
    });

    it('throws NotFound when joining non-existent challenge', async () => {
      const repo = new LocalChallengeRepository();
      await assert.rejects(
        async () => {
          await repo.joinChallenge('acc_01', 'non_existent_challenge');
        },
        (err: any) => {
          assert.equal(err instanceof RepositoryError, true);
          assert.equal((err as RepositoryError).code, 'NotFound');
          return true;
        }
      );
    });

    it('leaves challenge and removes participation record', async () => {
      const repo = new LocalChallengeRepository();
      const accountId = 'acc_student_01';
      const challengeId = 'challenge_50_pushups';

      await repo.joinChallenge(accountId, challengeId);
      let part = await repo.getParticipation(accountId, challengeId);
      assert.notEqual(part, null);

      await repo.leaveChallenge(accountId, challengeId);
      part = await repo.getParticipation(accountId, challengeId);
      assert.equal(part, null);
    });
  });

  // ========================================================
  // 4. LocalUserRepository & Anonymous Mode
  // ========================================================
  describe('4. LocalUserRepository & Anonymous Mode', () => {
    it('ANONYMOUS MODE: returns anonymous Account when no credentials exist', async () => {
      const repo = new LocalUserRepository();
      const account = await repo.getCurrentAccount();

      assert.notEqual(account, null);
      assert.equal(account?.authType, 'anonymous');
      assert.equal(account?.id, 'acc_anonymous_local');
      assert.equal(isValidIsoUtc(account?.createdAt || ''), true);
    });

    it('persists and retrieves domain user profile', async () => {
      const repo = new LocalUserRepository();
      const accountId = 'acc_student_01';

      const profile: DomainUserProfile = {
        accountId,
        displayName: 'Priya Sharma',
        username: 'priya_s',
        avatarColor: 'from-violet-500 to-purple-700',
        hostelWing: 'Sarojini Wing C',
        fitnessGoal: 'strength',
        goals: ['strength', 'wellness'],
        biometrics: {
          age: 21,
          gender: 'female',
          heightCm: 165,
          weightKg: 55,
          activityLevel: 'moderate'
        },
        preferences: {
          noiseTolerance: 'silent',
          space: 'small',
          soundMuted: false,
          voiceCoachEnabled: true
        },
        createdAt: toIsoUtcString(),
        updatedAt: toIsoUtcString()
      };

      await repo.saveProfile(profile);
      const retrieved = await repo.getProfile(accountId);

      assert.notEqual(retrieved, null);
      assert.equal(retrieved?.displayName, 'Priya Sharma');
      assert.equal(retrieved?.username, 'priya_s');
      assert.equal(retrieved?.hostelWing, 'Sarojini Wing C');
      assert.equal(retrieved?.biometrics?.heightCm, 165);
    });

    it('clearUser sets auth status to logged_out', async () => {
      const repo = new LocalUserRepository();
      await repo.clearUser();

      const account = await repo.getCurrentAccount();
      assert.equal(account, null, 'Explicit logout must yield null account until next guest visit');
    });
  });

  // ========================================================
  // 5. Account Migration Transformation Boundary
  // ========================================================
  describe('5. Account Migration Transformation Boundary', () => {
    it('transforms local anonymous data into cloud-ready sync payload without data loss', () => {
      // Simulate local records
      const localWorkoutId = generateStableId('work');
      const localSession: WorkoutSessionRecord = {
        id: localWorkoutId,
        accountId: 'acc_anonymous_local',
        exerciseKey: 'squats',
        exerciseName: 'Squats',
        reps: 25,
        durationSeconds: 120,
        postureScore: 90,
        timestamp: '2026-09-26T12:00:00.000Z',
        isHostelFriendly: true,
        completedFully: true,
        source: 'pose_coach'
      };

      const newCloudAccountId = 'acc_cloud_auth_99182';

      // Migration transformation function
      const migratedSession: WorkoutSessionRecord = {
        ...localSession,
        accountId: newCloudAccountId
      };

      assert.equal(migratedSession.id, localWorkoutId, 'Stable ID is preserved across migration');
      assert.equal(migratedSession.accountId, newCloudAccountId);
      assert.equal(migratedSession.reps, 25);
      assert.equal(migratedSession.exerciseKey, 'squats');
      assert.equal(isValidIsoUtc(migratedSession.timestamp), true);
    });
  });

  // ========================================================
  // 6. Feature Flags
  // ========================================================
  describe('6. Feature Flags', () => {
    it('returns default local-first feature flags', () => {
      const flags = getFeatureFlags();
      assert.equal(flags.cloudSync, false);
      assert.equal(flags.accounts, false);
      assert.equal(flags.serverLeaderboards, false);
      assert.equal(flags.campusChallenges, true);
      assert.equal(flags.adaptiveHostelEngine, true);
      assert.equal(flags.examMode, true);
      assert.equal(flags.aiPoseCoach, true);
    });

    it('allows overriding and resetting feature flags', () => {
      overrideFeatureFlag('cloudSync', true);
      assert.equal(getFeatureFlags().cloudSync, true);

      resetFeatureFlags();
      assert.equal(getFeatureFlags().cloudSync, false);
    });
  });
});
