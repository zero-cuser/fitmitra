/**
 * FitMitra Phase 14 Reliability Tests: Conflict Resolution
 * 
 * Verifies deterministic, entity-appropriate conflict rules:
 * - Preferences: Last-Write-Wins (LWW) based on ISO 8601 UTC timestamp
 * - Stale client data never overwrites newer server state
 * - Tombstones take precedence over resurrection of deleted entities
 * - Schema version mismatches are safely detected and rejected
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('Phase 14 Reliability: Conflict Resolution Policies', () => {
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
      body: JSON.stringify({ email: 'conflict@campus.edu.in', password: 'password_14_conflict' })
    });
    const data = await reg.json();
    authToken = data.token;
  });

  test('1. Preferences LWW: Newer update replaces older server preferences', async () => {
    const base = Date.now();
    const tOlder = new Date(base - 60000).toISOString();
    const tNewer = new Date(base).toISOString();

    // Initial preferences
    const res1 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        preferences: { soundMuted: false, noiseTolerance: 'medium' },
        preferencesUpdatedAt: tOlder
      })
    });
    assert.equal(res1.status, 200);

    // Newer update from Device 2
    const res2 = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        preferences: { soundMuted: true, noiseTolerance: 'silent' },
        preferencesUpdatedAt: tNewer
      })
    });
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.preferencesUpdated, true);

    // Verify pull returns newer preferences
    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const pullData = await pullRes.json();
    assert.equal(pullData.profile.preferencesJson.soundMuted, true);
    assert.equal(pullData.profile.preferencesJson.noiseTolerance, 'silent');
  });

  test('2. Preferences LWW: Stale update (older timestamp) does NOT overwrite newer server state', async () => {
    const base = Date.now();
    const tModern = new Date(base).toISOString();
    const tStale = new Date(base - 120000).toISOString();

    // Set modern state on server
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        preferences: { theme: 'dark', soundMuted: true },
        preferencesUpdatedAt: tModern
      })
    });

    // Reconnecting offline device sends older state
    const staleRes = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        preferences: { theme: 'light', soundMuted: false },
        preferencesUpdatedAt: tStale // Stale!
      })
    });
    assert.equal(staleRes.status, 200);
    const staleData = await staleRes.json();
    assert.equal(staleData.preferencesUpdated, false); // Stale rejected

    // Verify server state preserved
    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const pullData = await pullRes.json();
    assert.equal(pullData.profile.preferencesJson.theme, 'dark');
    assert.equal(pullData.profile.preferencesJson.soundMuted, true);
  });

  test('3. Tombstone Precedence: A tombstone prevents resurrection by a stale queued upload', async () => {
    // Step 1: Create workout
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        workouts: [{ id: 'work_to_purge', exerciseKey: 'squats', reps: 15, timestamp: '2026-10-14T09:00:00Z' }]
      })
    });

    // Step 2: Delete workout via tombstone
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        tombstones: [{ entityType: 'workout', entityId: 'work_to_purge' }]
      })
    });

    // Step 3: Device 2 reconnects and attempts to re-upload the deleted workout
    const resurrectRes = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        workouts: [{ id: 'work_to_purge', exerciseKey: 'squats', reps: 15, timestamp: '2026-10-14T09:00:00Z' }]
      })
    });
    assert.equal(resurrectRes.status, 200);
    const resData = await resurrectRes.json();
    assert.equal(resData.ignoredWorkouts, 1);

    // Step 4: Verify workout remains deleted and tombstone remains active
    const pullRes = await fetch(`${instance.url}/api/v1/sync/pull`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const pullData = await pullRes.json();
    assert.equal(pullData.workouts.length, 0);
    assert.equal(pullData.tombstones.length, 1);
  });

  test('4. Schema Version Mismatch: Unsupported client schema version receives 400 Bad Request', async () => {
    const incompatibleRes = await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        schemaVersion: 99, // Incompatible future schema
        workouts: []
      })
    });

    assert.equal(incompatibleRes.status, 400);
    const data = await incompatibleRes.json();
    assert.ok(data.error.includes('Incompatible client schema version'));
  });
});
