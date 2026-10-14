/**
 * FitMitra Phase 14 Reliability Tests: Idempotency & Deduplication
 * 
 * Verifies that:
 * - Each workout has a stable session ID
 * - Retrying an upload cannot create a second logical workout
 * - Repeated sync requests are safe
 * - Challenge progress cannot be incremented repeatedly by the same session
 * - Duplicate completion events are rejected or deduplicated
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('Phase 14 Reliability: Idempotent Writes & Deduplication', () => {
  let instance: ServerInstance;
  let testDb: Database;
  let authToken: string;

  before(async () => {
    testDb = new Database();
    instance = await createServer(testDb);
  });

  after(async () => {
    await instance.close();
  });

  beforeEach(async () => {
    testDb.reset();
    const reg = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'idempotent@campus.edu.in', password: 'test_password_14' })
    });
    const data = await reg.json();
    authToken = data.token;
  });

  test('1. Stable Session ID: Repeated upload of identical session ID never creates second workout', async () => {
    const workoutSession = {
      id: 'work_stable_id_14001',
      exerciseKey: 'squats',
      exerciseName: 'Bodyweight Squats',
      reps: 25,
      durationSeconds: 110,
      postureScore: 94,
      timestamp: '2026-10-14T08:00:00.000Z',
      schemaVersion: 2
    };

    // Attempt 1: Initial upload
    const res1 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ workouts: [workoutSession] })
    });
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.syncedWorkouts, 1);

    // Attempt 2: Simulated network retry (identical payload)
    const res2 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ workouts: [workoutSession] })
    });
    assert.equal(res2.status, 200);

    // Attempt 3: Another retry after reconnect
    const res3 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ workouts: [workoutSession] })
    });
    assert.equal(res3.status, 200);

    // Query database to verify exactly 1 record exists
    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const pullData = await pullRes.json();
    assert.equal(pullData.workouts.length, 1);
    assert.equal(pullData.totalWorkouts, 1);
    assert.equal(pullData.workouts[0].id, 'work_stable_id_14001');
    assert.equal(pullData.workouts[0].reps, 25);
  });

  test('2. Challenge Progress: Re-uploading with same activity ID cannot duplicate challenge progress', async () => {
    // Session 1 completes 20 squats and updates challenge
    const chal1 = {
      id: 'part_chal_squat_blitz',
      challengeId: 'chal_squats_100',
      currentValue: 20,
      targetValue: 100,
      completedDays: ['2026-10-14'],
      completedSessions: 1,
      processedActivityIds: ['work_session_A'],
      completed: false
    };

    const res1 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ challenges: [chal1] })
    });
    assert.equal(res1.status, 200);

    // Re-push same challenge state with same activity ID
    const res2 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ challenges: [chal1] })
    });
    assert.equal(res2.status, 200);

    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const pullData = await pullRes.json();
    assert.equal(pullData.challenges.length, 1);
    // processedActivityIds has exactly 1 entry ('work_session_A'), not duplicated
    assert.equal(pullData.challenges[0].processedActivityIds.length, 1);
    assert.equal(pullData.challenges[0].processedActivityIds[0], 'work_session_A');
  });

  test('3. Batch Idempotency: Multiple distinct workouts and duplicates in same push', async () => {
    const workouts = [
      { id: 'work_batch_1', exerciseKey: 'squats', reps: 15, durationSeconds: 60, timestamp: '2026-10-14T08:10:00Z' },
      { id: 'work_batch_2', exerciseKey: 'pushups', reps: 10, durationSeconds: 45, timestamp: '2026-10-14T08:15:00Z' },
      { id: 'work_batch_1', exerciseKey: 'squats', reps: 15, durationSeconds: 60, timestamp: '2026-10-14T08:10:00Z' } // Duplicate inside batch
    ];

    const res = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ workouts })
    });
    assert.equal(res.status, 200);

    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const pullData = await pullRes.json();
    assert.equal(pullData.workouts.length, 2);
    const ids = pullData.workouts.map((w: any) => w.id).sort();
    assert.deepEqual(ids, ['work_batch_1', 'work_batch_2']);
  });
});
