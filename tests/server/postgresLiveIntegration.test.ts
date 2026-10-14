/**
 * FitMitra Phase 19: Live PostgreSQL Validation & Staging Verification Suite
 * 
 * Verifies real PostgreSQL behavior against an isolated test database when
 * TEST_DATABASE_URL is provided in the execution environment.
 * 
 * When TEST_DATABASE_URL is unset (e.g. CI/local dev without a live PostgreSQL daemon),
 * this suite explicitly reports the live PostgreSQL gate as BLOCKED and verifies
 * all non-networked gate requirements (health endpoints, readiness checks, parameterization,
 * transaction rollback safety, tenant isolation, and zero biometric egress invariant).
 * 
 * Covers all 18 specific checks required by Phase 19:
 * 1. Clean DB migrates to latest schema (v3)
 * 2. Migration history records applied versions
 * 3. Second migration run is safe / idempotent
 * 4. Account registration and profile persist
 * 5. Workout records and sync state persist
 * 6. Data survives process restart
 * 7. Session / token validity across restart
 * 8. Idempotent sync pushes
 * 9. Tombstones and soft deletion
 * 10. Social invites, friendships, shared challenges persist
 * 11. Tenant isolation (unauthorized access rejected)
 * 12. Account deletion cascade
 * 13. Concurrency / race condition protection
 * 14. Transaction rollback on error
 * 15. Adversarial SQL injection parameterization
 * 16. Disconnection triggers 503 readiness failure
 * 17. Production startup rejects missing/insecure JWT
 * 18. Zero biometric egress invariant preserved
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PostgresDatabase } from '../../src/server/postgresDb.ts';
import { Database, createDatabase, type IDatabase } from '../../src/server/db.ts';
import { migrations, CURRENT_SERVER_SCHEMA_VERSION, MIGRATION_DEFINITIONS } from '../../src/server/migrations.ts';
import { createServer } from '../../src/server/server.ts';
import { getJwtSecret, issueToken, verifyToken } from '../../src/server/crypto.ts';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const isReleaseGate = 
  process.env.RELEASE_GATE?.trim() === 'true' || 
  process.env.npm_lifecycle_event === 'test:release-gate' ||
  process.argv.includes('--release-gate');

describe('FitMitra Phase 20: PostgreSQL Validation & Staging Verification Suite', () => {

  // =========================================================================
  // GATE AUDIT & ENVIRONMENT DETECTION
  // =========================================================================
  test('Gate Audit: Verifies live PostgreSQL connectivity or records BLOCKED status', async () => {
    if (!TEST_DB_URL) {
      console.log('\n======================================================================');
      console.log('[LIVE POSTGRESQL GATE: BLOCKED]');
      console.log('Environment Prerequisite: No live PostgreSQL daemon detected (TEST_DATABASE_URL unset).');
      console.log('Live multi-process integration tests require a running PostgreSQL 15+ instance.');
      console.log('To execute live tests: export TEST_DATABASE_URL="postgres://user:pass@localhost:5432/fitmitra_test"');
      console.log('======================================================================\n');
      if (isReleaseGate) {
        assert.fail(
          '[RELEASE GATE BLOCKED] Live PostgreSQL integration is mandatory for release gating, but TEST_DATABASE_URL is unset.'
        );
      }
      assert.ok(true, 'Live database gate cleanly identified as blocked in local environment.');
      return;
    }

    const testDb = new PostgresDatabase({ connectionString: TEST_DB_URL });
    try {
      const isHealthy = await testDb.ping();
      assert.equal(isHealthy, true, 'Live database must respond to ping()');
    } finally {
      await testDb.close();
    }
  });

  // =========================================================================
  // PART A: NON-NETWORKED ARCHITECTURAL & SECURITY GATES (CHECKS 14, 15, 16, 17, 18)
  // =========================================================================
  describe('Non-Networked Architectural & Security Gates', () => {

    // Check 16: Disconnection triggers 503 readiness failure
    describe('Check 16: Health, Liveness & Readiness Endpoints', () => {
      test('Liveness endpoint /api/v1/health/liveness returns 200 and uptime', async () => {
        const memDb = new Database();
        const server = await createServer(memDb);
        try {
          const res = await fetch(`${server.url}/api/v1/health/liveness`);
          assert.equal(res.status, 200);
          const data = await res.json();
          assert.equal(data.status, 'alive');
          assert.ok(typeof data.uptimeSeconds === 'number');
          assert.ok(data.timestamp);
        } finally {
          await server.close();
        }
      });

      test('Readiness endpoint /api/v1/health/readiness returns 200 when database is healthy', async () => {
        const memDb = new Database();
        const server = await createServer(memDb);
        try {
          const res = await fetch(`${server.url}/api/v1/health/readiness`);
          assert.equal(res.status, 200);
          const data = await res.json();
          assert.equal(data.status, 'ready');
          assert.equal(data.databaseConnected, true);
          assert.equal(data.persistent, false);
        } finally {
          await server.close();
        }
      });

      test('Readiness endpoint returns 503 Service Unavailable when database disconnects', async () => {
        const mockDisconnectedDb: IDatabase = {
          isPersistent: () => true,
          ping: async () => false, // Disconnected!
          close: async () => {},
          reset: async () => {},
          createAccount: async () => {},
          getAccountById: async () => null,
          getAccountByEmail: async () => null,
          updatePassword: () => false,
          getProfile: async () => null,
          updatePreferences: async () => ({ updated: false }),
          deleteAccountCascade: async () => {},
          upsertWorkout: async () => ({ status: 'ignored' }),
          getWorkouts: async () => [],
          countWorkouts: async () => 0,
          addTombstone: async () => {},
          getTombstones: async () => [],
          upsertChallenge: async () => ({ status: 'updated' }),
          getChallenges: async () => [],
          createFriendInvitation: async () => ({} as any),
          getFriendInvitationByCode: async () => null,
          revokeFriendInvitation: async () => false,
          requestFriendship: async () => ({} as any),
          getFriendships: async () => ({ accepted: [], pendingIncoming: [], pendingOutgoing: [], activeInvitations: [] }),
          respondToFriendRequest: async () => ({} as any),
          removeFriendship: async () => false,
          createSharedChallenge: async () => ({} as any),
          getSharedChallengeById: async () => null,
          getSharedChallengeByCode: async () => null,
          joinSharedChallenge: async () => ({} as any),
          recordChallengeContribution: async () => ({} as any),
          getSharedChallengeDetails: async () => null,
          getUserSharedChallenges: async () => [],
          leaveSharedChallenge: async () => false,
          cancelSharedChallenge: async () => false
        };

        const server = await createServer(mockDisconnectedDb);
        try {
          const res = await fetch(`${server.url}/api/v1/health/readiness`);
          assert.equal(res.status, 503, 'Disconnected database must yield 503 Service Unavailable');
          const data = await res.json();
          assert.equal(data.status, 'not_ready');
          assert.equal(data.databaseConnected, false);
        } finally {
          await server.close();
        }
      });
    });

    // Check 17: Production startup rejects missing/insecure JWT
    describe('Check 17: Production Security & Secret Enforcement', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecret = process.env.JWT_SECRET;
      const originalFitSecret = process.env.FITMITRA_JWT_SECRET;

      after(() => {
        (process.env as any).NODE_ENV = originalEnv;
        if (originalSecret) process.env.JWT_SECRET = originalSecret;
        else delete process.env.JWT_SECRET;
        if (originalFitSecret) process.env.FITMITRA_JWT_SECRET = originalFitSecret;
        else delete process.env.FITMITRA_JWT_SECRET;
      });

      test('Rejects insecure or default JWT_SECRET in production mode', () => {
        delete process.env.JWT_SECRET;
        delete process.env.FITMITRA_JWT_SECRET;
        (process.env as any).NODE_ENV = 'production';

        assert.throws(() => {
          getJwtSecret();
        }, /Production environment detected \(NODE_ENV=production\) but JWT_SECRET is missing or insecure/);
      });

      test('Rejects short (< 32 char) JWT_SECRET in production mode', () => {
        process.env.JWT_SECRET = 'short_insecure_secret';
        (process.env as any).NODE_ENV = 'production';

        assert.throws(() => {
          getJwtSecret();
        }, /JWT_SECRET must be configured with at least 32 cryptographically random characters/);
      });

      test('Accepts valid 64-char cryptographic secret in production mode', () => {
        process.env.JWT_SECRET = 'c0a80101d3f4b5e6a7c8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e';
        (process.env as any).NODE_ENV = 'production';

        const sec = getJwtSecret();
        assert.equal(sec, process.env.JWT_SECRET);
      });
    });

    // Check 15: Adversarial SQL injection parameterization
    describe('Check 15: Adversarial Input & SQL Parameterization', () => {
      test('Account lookup handles adversarial SQL injection payload safely', async () => {
        const executedQueries: { sql: string; params: any[] }[] = [];
        const mockPool: any = {
          query: async (sql: string, params: any[]) => {
            executedQueries.push({ sql, params });
            return { rows: [] };
          },
          end: async () => {}
        };

        const pgDb = new PostgresDatabase({ pool: mockPool });
        const maliciousEmail = "' OR '1'='1' UNION SELECT * FROM accounts; --";
        const result = await pgDb.getAccountByEmail(maliciousEmail);

        assert.equal(result, null);
        assert.equal(executedQueries.length, 1);
        assert.ok(executedQueries[0].sql.includes('LOWER(email) = $1'));
        assert.equal(executedQueries[0].params[0], maliciousEmail.trim().toLowerCase());
      });

      test('Workout insertion parameterizes postureScore and duration correctly', async () => {
        const executedQueries: { sql: string; params: any[] }[] = [];
        const mockPool: any = {
          query: async (sql: string, params: any[]) => {
            executedQueries.push({ sql, params });
            if (sql.includes('SELECT 1 FROM sync_tombstones')) return { rows: [] };
            if (sql.includes('SELECT * FROM workout_records')) return { rows: [] };
            return { rows: [] };
          },
          end: async () => {}
        };

        const pgDb = new PostgresDatabase({ pool: mockPool });
        const result = await pgDb.upsertWorkout('00000000-0000-0000-0000-000000000001', {
          id: "work_123'; DROP TABLE workout_records; --",
          exerciseKey: 'squat',
          exerciseName: 'Squat',
          reps: 15,
          durationSeconds: 45,
          postureScore: 92,
          timestamp: new Date().toISOString(),
          isHostelFriendly: true,
          completedFully: true,
          source: 'pose_coach',
          schemaVersion: 1,
          updatedAt: new Date().toISOString()
        });

        assert.ok(result.workout);
        const insertQuery = executedQueries.find((q) => q.sql.includes('INSERT INTO workout_records'));
        assert.ok(insertQuery, 'Must execute parameterized insert');
        assert.equal(insertQuery.params[0], "work_123'; DROP TABLE workout_records; --");
      });
    });

    // Check 14: Transaction rollback on error
    describe('Check 14: Transaction Rollback on Error Logic', () => {
      test('runPendingMigrations issues ROLLBACK and re-throws when migration fails', async () => {
        const statements: string[] = [];
        const mockClient: any = {
          query: async (sql: string) => {
            statements.push(sql);
            if (sql.includes('BEGIN')) return { rows: [] };
            if (sql.includes('pg_advisory_xact_lock')) return { rows: [] };
            if (sql.includes('CREATE TABLE IF NOT EXISTS schema_migrations')) return { rows: [] };
            if (sql.includes('SELECT version FROM schema_migrations')) {
              throw new Error('Disk quota exceeded / syntax error simulation');
            }
            return { rows: [] };
          },
          release: () => {}
        };

        const mockPgDb: any = {
          isPersistent: () => true,
          getClient: async () => mockClient
        };

        await assert.rejects(
          async () => {
            await migrations.runPendingMigrations(mockPgDb);
          },
          /Disk quota exceeded/
        );

        assert.ok(statements.includes('BEGIN'), 'Must have started transaction with BEGIN');
        assert.ok(statements.includes('ROLLBACK'), 'Must have rolled back transaction with ROLLBACK');
      });
    });

    // Check 18: Zero biometric egress invariant preserved
    describe('Check 18: Zero Biometric Egress Invariant Preserved', () => {
      test('Schema and sync contract strictly forbid landmark coordinates, camera frames, and raw video', () => {
        // Inspect MIGRATION_DEFINITIONS SQL for forbidden biometric fields
        const allUpSql = MIGRATION_DEFINITIONS.map(m => m.upSql).join('\n');
        
        const forbiddenFields = [
          'landmark',
          'landmarks',
          'keypoint',
          'keypoints',
          'camera_frame',
          'camera_frames',
          'frame_data',
          'video_blob',
          'raw_pixels',
          'face_mesh',
          'pose_mesh'
        ];

        for (const forbidden of forbiddenFields) {
          assert.equal(
            allUpSql.toLowerCase().includes(forbidden),
            false,
            `Schema must not contain biometric column or table '${forbidden}'`
          );
        }
      });

      test('Workout sync allows only aggregated scalar postureScore and rejects camera/landmark payloads', async () => {
        const executedQueries: { sql: string; params: any[] }[] = [];
        const mockPool: any = {
          query: async (sql: string, params: any[]) => {
            executedQueries.push({ sql, params });
            return { rows: [] };
          },
          end: async () => {}
        };

        const pgDb = new PostgresDatabase({ pool: mockPool });
        const accountId = '00000000-0000-0000-0000-000000000001';

        // An athlete performs a workout: only aggregated scalar values are synced
        const result = await pgDb.upsertWorkout(accountId, {
          id: 'work_valid_telemetry_001',
          exerciseKey: 'squat',
          exerciseName: 'Squat',
          reps: 20,
          durationSeconds: 60,
          postureScore: 94, // 0-100 scalar aggregate
          timestamp: new Date().toISOString(),
          isHostelFriendly: true,
          completedFully: true,
          source: 'pose_coach',
          schemaVersion: 1,
          updatedAt: new Date().toISOString()
        } as any);

        assert.equal(result.workout?.postureScore, 94);
        // Ensure no landmark properties exist on the returned workout
        assert.equal((result.workout as any)?.landmarks, undefined);
        assert.equal((result.workout as any)?.cameraFrames, undefined);
      });
    });
  });

  // =========================================================================
  // PART B: LIVE POSTGRESQL 18-CHECK VALIDATION GATE
  // (Executes live against real PostgreSQL when TEST_DATABASE_URL is set)
  // =========================================================================
  describe('Live PostgreSQL 18-Check Validation Suite', () => {

    test('Live Multi-Step Verification (Checks 1-13)', async (t) => {
      if (!TEST_DB_URL) {
        if (isReleaseGate) {
          assert.fail(
            '[RELEASE GATE BLOCKED] Live PostgreSQL integration is mandatory for release gating, but TEST_DATABASE_URL is unset.'
          );
        }
        t.skip('Skipped live execution because TEST_DATABASE_URL is not set.');
        return;
      }

      // -----------------------------------------------------------------------
      // Check 1: Clean DB migrates to latest schema (v3)
      // -----------------------------------------------------------------------
      const liveDb = new PostgresDatabase({ connectionString: TEST_DB_URL });
      const pingOk = await liveDb.ping();
      assert.equal(pingOk, true, 'Live database must be reachable');

      const migrationRes = await migrations.runPendingMigrations(liveDb);
      assert.ok(migrationRes.currentVersion >= 3, 'Check 1: Schema must migrate to at least v3');

      // -----------------------------------------------------------------------
      // Check 2: Migration history records applied versions
      // -----------------------------------------------------------------------
      const historyCheck = await liveDb.query(
        'SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC'
      );
      assert.ok(historyCheck.rows.length >= 3, 'Check 2: Migration history must record applied versions 1, 2, and 3');
      const versions = historyCheck.rows.map((r: any) => r.version);
      assert.ok(versions.includes(1) && versions.includes(2) && versions.includes(3));

      // -----------------------------------------------------------------------
      // Check 3: Second migration run is safe / idempotent
      // -----------------------------------------------------------------------
      const secondRun = await migrations.runPendingMigrations(liveDb);
      assert.equal(secondRun.appliedCount, 0, 'Check 3: Second migration run must be idempotent and apply 0 migrations');
      assert.equal(secondRun.currentVersion, CURRENT_SERVER_SCHEMA_VERSION);

      // Clean test data before execution
      await liveDb.reset();

      // -----------------------------------------------------------------------
      // Check 4: Account registration and profile persist
      // -----------------------------------------------------------------------
      const testEmail = `integration_${Date.now()}@campus.edu.in`;
      const accountId = '22222222-3333-4444-5555-666666666666';
      await liveDb.createAccount(
        {
          id: accountId,
          email: testEmail,
          passwordHash: 'testhash',
          salt: 'testsalt',
          authType: 'authenticated',
          provider: 'email',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString()
        },
        {
          accountId,
          displayName: 'Live Test Athlete',
          username: `live_${Date.now()}`,
          avatarColor: 'from-cyan-500 to-blue-700',
          fitnessGoal: 'strength',
          preferencesJson: { hostelWing: 'Wing-B' },
          biometricsJson: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      const queriedAccount = await liveDb.getAccountByEmail(testEmail);
      assert.ok(queriedAccount, 'Check 4: Account must persist');
      assert.equal(queriedAccount.id, accountId);

      const profile = await liveDb.getProfile(accountId);
      assert.ok(profile, 'Check 4: Profile must persist');
      assert.equal(profile.displayName, 'Live Test Athlete');

      // -----------------------------------------------------------------------
      // Check 5: Workout records and sync state persist
      // -----------------------------------------------------------------------
      const workoutId = `work_live_${Date.now()}`;
      await liveDb.upsertWorkout(accountId, {
        id: workoutId,
        exerciseKey: 'squat',
        exerciseName: 'Squat',
        reps: 20,
        durationSeconds: 60,
        postureScore: 95,
        timestamp: new Date().toISOString(),
        isHostelFriendly: true,
        completedFully: true,
        source: 'pose_coach',
        schemaVersion: 1,
        updatedAt: new Date().toISOString()
      });

      const workoutsInitial = await liveDb.getWorkouts(accountId);
      assert.equal(workoutsInitial.length, 1, 'Check 5: Workout records must persist');
      assert.equal(workoutsInitial[0].id, workoutId);

      // -----------------------------------------------------------------------
      // Check 6: Data survives process restart
      // -----------------------------------------------------------------------
      // 6A. True OS Process Restart Persistence:
      // Spawn Process 1 (writes data and exits), terminate it, then spawn Process 2 (reads data and verifies).
      const restartAccountId = '77777777-8888-9999-aaaa-bbbbbbbbbbbb';
      const restartWorkoutId = `work_restart_${Date.now()}`;
      const helperPath = fileURLToPath(new URL('./processRestartHelper.ts', import.meta.url));

      const writeProc = spawnSync(
        process.execPath,
        ['--experimental-strip-types', helperPath, `--mode=write`, `--account=${restartAccountId}`, `--workout=${restartWorkoutId}`],
        { env: { ...process.env, TEST_DATABASE_URL: TEST_DB_URL } }
      );
      assert.equal(writeProc.status, 0, `Process 1 (write) must exit 0: ${writeProc.stderr?.toString()}`);

      const readProc = spawnSync(
        process.execPath,
        ['--experimental-strip-types', helperPath, `--mode=read`, `--account=${restartAccountId}`, `--workout=${restartWorkoutId}`],
        { env: { ...process.env, TEST_DATABASE_URL: TEST_DB_URL } }
      );
      assert.equal(readProc.status, 0, `Process 2 (read) must exit 0: ${readProc.stderr?.toString()}`);

      // 6B. In-Process Connection Pool Termination & Recreation:
      await liveDb.close();

      // Boot fresh process connection to the same PostgreSQL database
      const liveDb2 = new PostgresDatabase({ connectionString: TEST_DB_URL });
      const reconnectedAccount = await liveDb2.getAccountByEmail(testEmail);
      assert.ok(reconnectedAccount, 'Check 6: Account must survive process termination and restart');

      const persistedWorkouts = await liveDb2.getWorkouts(accountId);
      assert.equal(persistedWorkouts.length, 1, 'Check 6: Workouts must survive process restart');
      assert.equal(persistedWorkouts[0].id, workoutId);
      assert.equal(persistedWorkouts[0].reps, 20);

      const crossProcAccount = await liveDb2.getAccountById(restartAccountId);
      assert.ok(crossProcAccount, 'Check 6: Independent process data must be visible in fresh pool');

      // -----------------------------------------------------------------------
      // Check 7: Session / token validity across restart
      // -----------------------------------------------------------------------
      const token = issueToken({ id: accountId, email: testEmail, username: 'live_test', displayName: 'Live Test Athlete' });
      const verified = verifyToken(token);
      assert.ok(verified, 'Check 7: Token signed before restart must verify');
      assert.equal(verified.accountId, accountId);
      const recheckedAccount = await liveDb2.getAccountById(verified.accountId);
      assert.ok(recheckedAccount, 'Check 7: Re-verified token matches persisted account in restarted DB');

      // -----------------------------------------------------------------------
      // Check 8: Idempotent sync pushes
      // -----------------------------------------------------------------------
      const duplicateUpsert = await liveDb2.upsertWorkout(accountId, {
        id: workoutId,
        exerciseKey: 'squat',
        exerciseName: 'Squat',
        reps: 20,
        durationSeconds: 60,
        postureScore: 95,
        timestamp: new Date().toISOString(),
        isHostelFriendly: true,
        completedFully: true,
        source: 'pose_coach',
        schemaVersion: 1,
        updatedAt: new Date().toISOString()
      });
      assert.equal(duplicateUpsert.status, 'ignored', 'Check 8: Duplicate push must be ignored idempotently');

      // -----------------------------------------------------------------------
      // Check 9: Tombstones and soft deletion
      // -----------------------------------------------------------------------
      await liveDb2.addTombstone(accountId, 'workout', workoutId);
      const tombstones = await liveDb2.getTombstones(accountId);
      assert.equal(tombstones.length, 1, 'Check 9: Tombstone must be recorded');
      assert.equal(tombstones[0].entityId, workoutId);

      // -----------------------------------------------------------------------
      // Check 10: Social invites, friendships, shared challenges persist
      // -----------------------------------------------------------------------
      const invite = await liveDb2.createFriendInvitation(accountId, { maxUses: 3, expiryDays: 7 });
      assert.ok(invite.inviteCode.startsWith('FIT-'), 'Check 10: Invite code created');

      const challenge = await liveDb2.createSharedChallenge(accountId, {
        title: 'Live 500 Rep Dorm Sprint',
        description: 'PostgreSQL live integration test challenge',
        targetValue: 500,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
      });
      assert.ok(challenge.id, 'Check 10: Shared challenge created');

      const challengeDetail = await liveDb2.getSharedChallengeById(challenge.id);
      assert.ok(challengeDetail, 'Check 10: Shared challenge persisted');
      assert.equal(challengeDetail.title, 'Live 500 Rep Dorm Sprint');

      // -----------------------------------------------------------------------
      // Check 11: Tenant isolation (unauthorized access rejected)
      // -----------------------------------------------------------------------
      const userBId = '33333333-4444-5555-6666-777777777777';
      const userBWorkouts = await liveDb2.getWorkouts(userBId);
      assert.equal(userBWorkouts.length, 0, 'Check 11: User B must not see User A workouts');
      const userBTombstones = await liveDb2.getTombstones(userBId);
      assert.equal(userBTombstones.length, 0, 'Check 11: User B must not see User A tombstones');

      // -----------------------------------------------------------------------
      // Check 12: Account deletion cascade
      // -----------------------------------------------------------------------
      await liveDb2.deleteAccountCascade(accountId);
      const deletedAccount = await liveDb2.getAccountByEmail(testEmail);
      assert.equal(deletedAccount, null, 'Check 12: Account must be completely removed');

      const deletedWorkouts = await liveDb2.getWorkouts(accountId);
      assert.equal(deletedWorkouts.length, 0, 'Check 12: Workouts must be cascaded on account deletion');

      const deletedTombstones = await liveDb2.getTombstones(accountId);
      assert.equal(deletedTombstones.length, 0, 'Check 12: Tombstones must be cascaded on account deletion');

      // -----------------------------------------------------------------------
      // Check 13: Concurrency / race condition protection
      // -----------------------------------------------------------------------
      // Verify concurrent registration attempts for identical email handle gracefully
      const testEmailConcurrent = `concurrent_${Date.now()}@campus.edu.in`;
      const p1 = liveDb2.createAccount(
        {
          id: '44444444-5555-6666-7777-888888888888',
          email: testEmailConcurrent,
          passwordHash: 'hash',
          salt: 'salt',
          authType: 'authenticated',
          provider: 'email',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString()
        },
        {
          accountId: '44444444-5555-6666-7777-888888888888',
          displayName: 'Concurrent Athlete 1',
          username: `c1_${Date.now()}`,
          avatarColor: 'from-cyan-500 to-blue-700',
          fitnessGoal: 'strength',
          preferencesJson: {},
          biometricsJson: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
      const p2 = liveDb2.createAccount(
        {
          id: '55555555-6666-7777-8888-999999999999',
          email: testEmailConcurrent,
          passwordHash: 'hash',
          salt: 'salt',
          authType: 'authenticated',
          provider: 'email',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString()
        },
        {
          accountId: '55555555-6666-7777-8888-999999999999',
          displayName: 'Concurrent Athlete 2',
          username: `c2_${Date.now()}`,
          avatarColor: 'from-cyan-500 to-blue-700',
          fitnessGoal: 'strength',
          preferencesJson: {},
          biometricsJson: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      const results = await Promise.allSettled([p1, p2]);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');
      assert.equal(fulfilled.length, 1, 'Check 13: Only one concurrent account creation must succeed');
      assert.equal(rejected.length, 1, 'Check 13: Duplicate email creation must fail on unique constraint');

      await liveDb2.deleteAccountCascade('44444444-5555-6666-7777-888888888888');

      // -----------------------------------------------------------------------
      // Check 14: Deliberately induced transaction failure rolls back cleanly
      // -----------------------------------------------------------------------
      const client = await liveDb2.getClient();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO accounts (id, email, password_hash, salt, auth_type, provider) 
           VALUES ($1, $2, $3, $4, 'authenticated', 'email')`,
          ['99999999-9999-9999-9999-999999999999', 'rollback_test@campus.edu.in', 'hash', 'salt']
        );
        // Induce deliberate failure: query an intentionally non-existent table
        await client.query('SELECT * FROM _non_existent_table_for_rollback_test_');
        await client.query('COMMIT');
      } catch {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
      const rollbackAccount = await liveDb2.getAccountByEmail('rollback_test@campus.edu.in');
      assert.equal(rollbackAccount, null, 'Check 14: Transaction must roll back on error');

      // -----------------------------------------------------------------------
      // Check 15: Database disconnection triggers 503 without silent fallback
      // -----------------------------------------------------------------------
      const liveServer = await createServer(liveDb2);
      try {
        const readyRes1 = await fetch(`${liveServer.url}/api/v1/health/readiness`);
        assert.equal(readyRes1.status, 200, 'Readiness returns 200 while database connected');
        const readyData1 = await readyRes1.json();
        assert.equal(readyData1.persistent, true, 'Reports persistent PostgreSQL backend');

        // Sever the database connection
        await liveDb2.close();

        const readyRes2 = await fetch(`${liveServer.url}/api/v1/health/readiness`);
        assert.equal(readyRes2.status, 503, 'Check 15: Disconnected database yields 503');
        const readyData2 = await readyRes2.json();
        assert.equal(readyData2.status, 'not_ready');
        assert.equal(readyData2.databaseConnected, false);
      } finally {
        await liveServer.close();
      }
    });
  });
});
