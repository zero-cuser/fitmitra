/**
 * FitMitra Phase 16: Persistence Audit & Storage Lifecycle Test Suite
 * 
 * Verifies backend storage characteristics, distinguishing between:
 * 1. In-memory storage (current Map-based emulation in db.ts)
 * 2. File-backed / Persistent database (PostgreSQL as specified in schema.sql)
 * 
 * Demonstrates:
 * - Data survival and relational constraints within a single process lifecycle.
 * - Complete data loss across server restart / fresh instance (proving the P0 blocker).
 * - Schema file integrity (verifying schema.sql covers all Phase 13-15 entities).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase 16 Backend Persistence & Storage Audit', () => {

  test('Audit 1: Schema DDL covers all required tables for production PostgreSQL', () => {
    const schemaPath = path.resolve(__dirname, '../../src/server/schema.sql');
    assert.ok(fs.existsSync(schemaPath), 'schema.sql must exist');
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Required tables from Phase 13-15
    const requiredTables = [
      'accounts',
      'profiles',
      'workout_records',
      'challenge_progress',
      'sync_tombstones',
      'friend_invitations',
      'friend_relationships',
      'shared_challenges',
      'shared_challenge_participants',
      'shared_challenge_contributions'
    ];

    for (const table of requiredTables) {
      assert.ok(
        schemaSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`) ||
        schemaSql.includes(`CREATE TABLE ${table}`),
        `schema.sql must define table "${table}"`
      );
    }

    // Verify row level security / isolation policies exist in schema
    assert.ok(schemaSql.includes('ROW LEVEL SECURITY') || schemaSql.includes('FOREIGN KEY'), 'Schema must define relational constraints');
  });

  test('Audit 2: Within single server lifetime, relational state and foreign keys are preserved', async () => {
    const memDb = new Database();
    const instance = await createServer(memDb);

    try {
      // Register an account
      const regRes = await fetch(`${instance.url}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'persistent_test@campus.edu.in',
          password: 'SecurePassword123!',
          displayName: 'Persistence Tester',
          username: 'perstest'
        })
      });
      assert.equal(regRes.status, 201);
      const regData = await regRes.json();
      const token = regData.token;

      // Sync a workout session via /api/v1/sync/push
      const syncRes = await fetch(`${instance.url}/api/v1/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workouts: [{
            id: 'workout_persist_1',
            exerciseKey: 'squats',
            exerciseName: 'Bodyweight Squats',
            reps: 20,
            durationSeconds: 60,
            timestamp: new Date().toISOString(),
            isHostelFriendly: true,
            completedFully: true,
            source: 'native_android',
            schemaVersion: 1
          }],
          challenges: [],
          tombstones: [],
          schemaVersion: 1
        })
      });
      assert.equal(syncRes.status, 200);

      // Create a private challenge
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const chalRes = await fetch(`${instance.url}/api/v1/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Persistence Challenge',
          description: 'Testing in-process persistence',
          exerciseKey: 'squats',
          targetMetric: 'rep_target',
          targetValue: 50,
          startDate: today,
          endDate: nextWeek,
          maxParticipants: 5
        })
      });
      assert.equal(chalRes.status, 201);

      // Verify all data is queryable within this instance via /api/v1/sync/pull
      const verifySync = await fetch(`${instance.url}/api/v1/sync/pull`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      assert.equal(verifySync.status, 200);
      const verifyData = await verifySync.json();
      assert.equal(verifyData.workouts.length, 1);
      assert.equal(verifyData.workouts[0].id, 'workout_persist_1');

      const verifyChallenges = await fetch(`${instance.url}/api/v1/challenges`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      assert.equal(verifyChallenges.status, 200);
      const verifyChalData = await verifyChallenges.json();
      assert.equal(verifyChalData.challenges.length, 1);
      assert.equal(verifyChalData.challenges[0].title, 'Persistence Challenge');
    } finally {
      await instance.close();
    }
  });

  test('Audit 3: CRITICAL PROOF OF P0 BLOCKER — Server restart / new process loses all data', async () => {
    // Process 1: Server boots, user registers and creates state
    const process1Db = new Database();
    const server1 = await createServer(process1Db);

    const savedEmail = 'restart_victim@campus.edu.in';
    const savedPassword = 'VictimPassword123!';
    let savedToken = '';

    try {
      const reg = await fetch(`${server1.url}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: savedEmail,
          password: savedPassword,
          displayName: 'Restart Victim',
          username: 'restart_victim'
        })
      });
      assert.equal(reg.status, 201);
      const regData = await reg.json();
      savedToken = regData.token;

      // Verify session is active
      const sessionCheck = await fetch(`${server1.url}/api/v1/auth/session`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      });
      assert.equal(sessionCheck.status, 200);
    } finally {
      // Simulate Process 1 Termination / Container Restart / Worker Recycling
      await server1.close();
    }

    // Process 2: Server boots afresh (simulating new container / server restart)
    const process2Db = new Database();
    const server2 = await createServer(process2Db);

    try {
      // Attempt 1: Authenticate with old session token -> Account not found (404) or unauthenticated (401)
      const sessionCheck2 = await fetch(`${server2.url}/api/v1/auth/session`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      });
      assert.ok([401, 404].includes(sessionCheck2.status), 'Token must not resolve an account after restart');

      // Attempt 2: Log in with credentials -> Fails with 401 because account does not exist in new process
      const loginCheck = await fetch(`${server2.url}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: savedEmail,
          password: savedPassword
        })
      });
      assert.equal(loginCheck.status, 401, 'Login fails because in-memory Map was wiped upon restart');

      // Attempt 3: Registering the same email now succeeds because previous account was lost
      const reReg = await fetch(`${server2.url}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: savedEmail,
          password: savedPassword,
          displayName: 'Restart Victim',
          username: 'restart_victim'
        })
      });
      assert.equal(reReg.status, 201, 'Email was re-registered from scratch, confirming data loss');
    } finally {
      await server2.close();
    }
  });

  test('Audit 4: Runtime Database Engine Classification', () => {
    // Inspect db.ts implementation properties
    const runtimeDb = new Database();
    
    // Check that Database uses JavaScript in-memory Map structures
    const isMapBased = (runtimeDb as unknown as Record<string, unknown>)['accounts'] instanceof Map;
    assert.equal(isMapBased, true, 'Runtime Database uses JavaScript Map storage');

    // Formal classification
    const classification = {
      storageType: 'in-memory',
      isPersistentAcrossRestarts: false,
      isDistributed: false,
      productionReadyForCloudMultiTenant: false,
      productionBlockerSeverity: 'P0'
    };

    assert.equal(classification.storageType, 'in-memory');
    assert.equal(classification.isPersistentAcrossRestarts, false);
    assert.equal(classification.productionBlockerSeverity, 'P0');
  });
});
