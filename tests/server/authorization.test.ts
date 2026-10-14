/**
 * FitMitra Automated Server Tests: Owner-Level Authorization & Isolation
 * 
 * Verifies that Account A cannot read, overwrite, or delete Account B's records.
 * Tests server-side authorization enforcement.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('Server Backend Slice: Owner-Level Authorization & Isolation', () => {
  let instance: ServerInstance;
  let testDb: Database;

  before(async () => {
    testDb = new Database();
    instance = await createServer(testDb);
  });

  after(async () => {
    await instance.close();
  });

  beforeEach(() => {
    testDb.reset();
  });

  test('1. Unauthenticated requests to protected endpoints are rejected with 401', async () => {
    const pushRes = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workouts: [] })
    });
    assert.equal(pushRes.status, 401);

    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`);
    assert.equal(pullRes.status, 401);

    const delRes = await fetch(`${instance.url}/api/v1/auth/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'any' })
    });
    assert.equal(delRes.status, 401);
  });

  test('2. Owner Isolation: Account B cannot read Account A workout records via pull', async () => {
    // Register Account A
    const regA = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@campus.edu.in',
        password: 'alice_secret_pass',
        displayName: 'Alice'
      })
    });
    const { token: tokenA, account: accountA } = await regA.json();

    // Register Account B
    const regB = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob@campus.edu.in',
        password: 'bob_secret_pass',
        displayName: 'Bob'
      })
    });
    const { token: tokenB, account: accountB } = await regB.json();

    // Account A records 2 workouts
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        workouts: [
          {
            id: 'work_alice_squats_1',
            exerciseKey: 'squats',
            exerciseName: 'Bodyweight Squats',
            reps: 25,
            durationSeconds: 120,
            timestamp: new Date().toISOString()
          },
          {
            id: 'work_alice_lunges_2',
            exerciseKey: 'lunges',
            exerciseName: 'Forward Lunges',
            reps: 20,
            durationSeconds: 100,
            timestamp: new Date().toISOString()
          }
        ]
      })
    });

    // Account B records 1 workout
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        workouts: [
          {
            id: 'work_bob_pushups_1',
            exerciseKey: 'pushups',
            exerciseName: 'Push-Ups',
            reps: 15,
            durationSeconds: 60,
            timestamp: new Date().toISOString()
          }
        ]
      })
    });

    // Account B pulls records
    const pullB = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.equal(pullB.status, 200);
    const dataB = await pullB.json();

    // Account B must receive ONLY their own push-ups; ZERO records from Alice!
    assert.equal(dataB.workouts.length, 1);
    assert.equal(dataB.workouts[0].id, 'work_bob_pushups_1');
    assert.equal(dataB.workouts[0].accountId, accountB.id);

    // Account A pulls records
    const pullA = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.equal(pullA.status, 200);
    const dataA = await pullA.json();

    // Account A must receive ONLY their 2 workouts; ZERO from Bob
    assert.equal(dataA.workouts.length, 2);
    assert.ok(dataA.workouts.every((w: any) => w.accountId === accountA.id));
  });

  test('3. Cross-Account Modification: Account B cannot overwrite Account A workout', async () => {
    // Register Account A & B
    const regA = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@campus.edu.in', password: 'password123' })
    });
    const { token: tokenA } = await regA.json();

    const regB = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'attacker@campus.edu.in', password: 'password123' })
    });
    const { token: tokenB } = await regB.json();

    // Owner records a workout
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        workouts: [
          {
            id: 'work_legit_100',
            exerciseKey: 'squats',
            reps: 50,
            durationSeconds: 180,
            timestamp: new Date().toISOString()
          }
        ]
      })
    });

    // Attacker tries to hijack or overwrite work_legit_100
    const attackRes = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        workouts: [
          {
            id: 'work_legit_100',
            exerciseKey: 'squats',
            reps: 0, // malicious wipe
            durationSeconds: 0,
            timestamp: new Date().toISOString()
          }
        ]
      })
    });

    // Server must reject with 403 Forbidden
    assert.equal(attackRes.status, 403);
    const attackData = await attackRes.json();
    assert.ok(attackData.error.includes('PermissionDenied'));

    // Verify original record is unchanged
    const pullA = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const dataA = await pullA.json();
    assert.equal(dataA.workouts[0].reps, 50);
  });
});
