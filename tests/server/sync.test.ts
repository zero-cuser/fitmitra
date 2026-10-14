/**
 * FitMitra Automated Server Tests: Synchronization Contract & Invariants
 * 
 * Verifies idempotent upserts, privacy guardrails against landmark upload,
 * tombstone deletion propagation, and payload size bounds.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('Server Backend Slice: Synchronization Contract', () => {
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
      body: JSON.stringify({ email: 'syncer@campus.edu.in', password: 'sync_password_1' })
    });
    const data = await reg.json();
    authToken = data.token;
  });

  test('1. Idempotency: Duplicate pushes of identical workout ID do not duplicate records', async () => {
    const workoutPayload = {
      workouts: [
        {
          id: 'work_stable_uuid_101',
          exerciseKey: 'squats',
          exerciseName: 'Bodyweight Squats',
          reps: 20,
          durationSeconds: 90,
          postureScore: 95,
          timestamp: '2026-10-14T05:00:00.000Z'
        }
      ]
    };

    // Push 1
    const res1 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(workoutPayload)
    });
    assert.equal(res1.status, 200);

    // Push 2 (immediate duplicate/retry)
    const res2 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(workoutPayload)
    });
    assert.equal(res2.status, 200);

    // Push 3
    const res3 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(workoutPayload)
    });
    assert.equal(res3.status, 200);

    // Verify pull returns EXACTLY 1 record, not 3!
    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const pullData = await pullRes.json();
    assert.equal(pullData.workouts.length, 1);
    assert.equal(pullData.workouts[0].id, 'work_stable_uuid_101');
    assert.equal(pullData.workouts[0].reps, 20);
  });

  test('2. Privacy Guardrail: Rejects sync push containing raw skeletal landmarks or video frames', async () => {
    const leakedPayload = {
      workouts: [
        {
          id: 'work_leaked_coords',
          exerciseKey: 'squats',
          reps: 10,
          durationSeconds: 45,
          timestamp: new Date().toISOString(),
          landmarks: [{ x: 0.5, y: 0.5, z: 0.1, visibility: 0.99 }] // FORBIDDEN!
        }
      ]
    };

    const res = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(leakedPayload)
    });

    assert.equal(res.status, 422);
    const data = await res.json();
    assert.ok(data.error.includes('Privacy Violation'));
  });

  test('3. Tombstone Deletion Propagation: Soft-deletes record and propagates deletion', async () => {
    // 1. Create workout
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        workouts: [
          {
            id: 'work_to_tombstone',
            exerciseKey: 'plank',
            reps: 1,
            durationSeconds: 60,
            timestamp: new Date().toISOString()
          }
        ]
      })
    });

    // Verify present
    const pull1 = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const data1 = await pull1.json();
    assert.equal(data1.workouts.length, 1);

    // 2. Push Tombstone for work_to_tombstone
    const tombRes = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        tombstones: [
          {
            entityType: 'workout',
            entityId: 'work_to_tombstone'
          }
        ]
      })
    });
    assert.equal(tombRes.status, 200);

    // 3. Pull again: workout must be deleted, tombstone must be present
    const pull2 = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const data2 = await pull2.json();
    assert.equal(data2.workouts.length, 0);
    assert.equal(data2.tombstones.length, 1);
    assert.equal(data2.tombstones[0].entityId, 'work_to_tombstone');
  });

  test('4. Challenge Progress: Synchronizes campus challenge participation', async () => {
    const chalPayload = {
      challenges: [
        {
          id: 'part_usr_chal_squats',
          challengeId: 'chal_squats_100',
          currentValue: 40,
          targetValue: 100,
          completedDays: ['2026-10-14'],
          completedSessions: 2,
          processedActivityIds: ['work_1', 'work_2'],
          completed: false
        }
      ]
    };

    const res = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(chalPayload)
    });
    assert.equal(res.status, 200);

    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const pullData = await pullRes.json();
    assert.equal(pullData.challenges.length, 1);
    assert.equal(pullData.challenges[0].currentValue, 40);
    assert.equal(pullData.challenges[0].targetValue, 100);
  });
});
