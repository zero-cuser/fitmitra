/**
 * FitMitra Phase 14 Reliability Tests: Cross-Device Synchronization & Account Isolation
 * 
 * Verifies two isolated clients belonging to the same account:
 * - Client A: Android simulator
 * - Client B: Web simulator
 * 
 * And verifies strict isolation against a second test account (Account 2).
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('Phase 14 Reliability: Cross-Device Validation & Multi-Tenant Isolation', () => {
  let instance: ServerInstance;
  let testDb: Database;
  let account1TokenClientA: string;
  let account1TokenClientB: string;
  let account2Token: string;

  before(async () => {
    testDb = new Database();
    instance = await createServer(testDb);
  });

  after(async () => {
    await instance.close();
  });

  beforeEach(async () => {
    testDb.reset();

    // 1. Account 1 Registration (Client A)
    const reg1 = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student1@campus.edu.in', password: 'password_student_1' })
    });
    const data1 = await reg1.json();
    account1TokenClientA = data1.token;

    // 2. Account 1 Sign-In on Client B (Web)
    const login1 = await fetch(`${instance.url}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student1@campus.edu.in', password: 'password_student_1' })
    });
    const dataLogin1 = await login1.json();
    account1TokenClientB = dataLogin1.token;

    // 3. Account 2 Registration
    const reg2 = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student2@campus.edu.in', password: 'password_student_2' })
    });
    const data2 = await reg2.json();
    account2Token = data2.token;
  });

  test('1. Cross-Device Propagation: Client A (Android) pushes workout -> Client B (Web) pulls identical data', async () => {
    const androidWorkout = {
      id: 'work_android_session_001',
      exerciseKey: 'squats',
      exerciseName: 'Bodyweight Squats',
      reps: 20,
      durationSeconds: 85,
      postureScore: 92,
      timestamp: '2026-10-14T09:30:00.000Z',
      schemaVersion: 2
    };

    // Client A (Android) completes workout and pushes
    const pushRes = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account1TokenClientA}` },
      body: JSON.stringify({ workouts: [androidWorkout] })
    });
    assert.equal(pushRes.status, 200);

    // Client B (Web) pulls synchronized history
    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${account1TokenClientB}` }
    });
    assert.equal(pullRes.status, 200);
    const pullData = await pullRes.json();

    assert.equal(pullData.workouts.length, 1);
    const pulledWorkout = pullData.workouts[0];
    assert.equal(pulledWorkout.id, 'work_android_session_001');
    assert.equal(pulledWorkout.exerciseKey, 'squats');
    assert.equal(pulledWorkout.reps, 20);
    assert.equal(pulledWorkout.durationSeconds, 85);
    assert.equal(pulledWorkout.postureScore, 92);

    // Derive XP and calories on Client B from canonical session history
    const derivedXp = pulledWorkout.reps * 5;
    const derivedCalories = Math.round(pulledWorkout.reps * 0.45);
    assert.equal(derivedXp, 100);
    assert.equal(derivedCalories, 9);
  });

  test('2. Multi-Tenant Isolation: Account 2 cannot read or modify Account 1 records', async () => {
    // Account 1 creates a workout
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account1TokenClientA}` },
      body: JSON.stringify({
        workouts: [{ id: 'work_acc1_private', exerciseKey: 'plank', reps: 1, durationSeconds: 60, timestamp: '2026-10-14T10:00:00Z' }]
      })
    });

    // Account 2 pulls their own history -> must be empty
    const pullAcc2 = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${account2Token}` }
    });
    const dataAcc2 = await pullAcc2.json();
    assert.equal(dataAcc2.workouts.length, 0);

    // Account 2 attempts to overwrite Account 1's workout -> must be 403 Forbidden
    const breachAttempt = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account2Token}` },
      body: JSON.stringify({
        workouts: [{ id: 'work_acc1_private', exerciseKey: 'plank', reps: 999, durationSeconds: 10, timestamp: '2026-10-14T10:00:00Z' }]
      })
    });
    assert.equal(breachAttempt.status, 403);
    const breachData = await breachAttempt.json();
    assert.ok(breachData.error.includes('PermissionDenied'));
  });

  test('3. Cross-Device Deletion: Deletion on Device 1 propagates tombstones to Device 2', async () => {
    // Create workout
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account1TokenClientA}` },
      body: JSON.stringify({
        workouts: [{ id: 'work_to_delete_cross', exerciseKey: 'lunges', reps: 12, durationSeconds: 50, timestamp: '2026-10-14T10:10:00Z' }]
      })
    });

    // Device 1 deletes workout via tombstone
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account1TokenClientA}` },
      body: JSON.stringify({
        tombstones: [{ entityType: 'workout', entityId: 'work_to_delete_cross' }]
      })
    });

    // Device 2 pulls -> receives empty workouts and tombstone record
    const pullDevice2 = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${account1TokenClientB}` }
    });
    const dataDevice2 = await pullDevice2.json();
    assert.equal(dataDevice2.workouts.length, 0);
    assert.equal(dataDevice2.tombstones.length, 1);
    assert.equal(dataDevice2.tombstones[0].entityId, 'work_to_delete_cross');
  });
});
