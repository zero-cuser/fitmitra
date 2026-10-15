/**
 * FitMitra Phase 14 Reliability Tests: Performance & Scale
 * 
 * Verifies that:
 * - Accounts with 250+ sessions paginate correctly (50 items/page, hasMore flags)
 * - Incremental synchronization (?since=...) only fetches newly updated records
 * - Memory and response latency remain bounded
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('Phase 14 Reliability: Performance & Scale Tests', () => {
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
      body: JSON.stringify({ email: 'scale@campus.edu.in', password: 'password_scale_14' })
    });
    const data = await reg.json();
    authToken = data.token;
  });

  test('1. Bounded Volume: Handles 250 workout sessions and paginates accurately', async () => {
    // Generate 250 distinct workouts across 5 batches of 50
    const totalCount = 250;
    const batchSize = 50;

    for (let b = 0; b < totalCount / batchSize; b++) {
      const batch = [];
      for (let i = 0; i < batchSize; i++) {
        const idx = b * batchSize + i;
        batch.push({
          id: `work_scale_${String(idx).padStart(4, '0')}`,
          exerciseKey: idx % 2 === 0 ? 'squats' : 'pushups',
          reps: 10 + (idx % 15),
          durationSeconds: 45 + (idx % 30),
          timestamp: new Date(Date.now() - (totalCount - idx) * 3600000).toISOString(),
          schemaVersion: 2
        });
      }

      const res = await fetch(`${instance.url}/api/v1/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ workouts: batch })
      });
      assert.equal(res.status, 200);
    }

    // Verify pagination across pages of 50
    let retrievedCount = 0;
    let offset = 0;
    let hasMore = true;
    let pageCount = 0;

    const startFetch = Date.now();
    while (hasMore) {
      const pageRes = await fetch(`${instance.url}/api/v1/sync/pull?limit=${batchSize}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(pageRes.status, 200);
      const pageData = await pageRes.json();

      retrievedCount += pageData.workouts.length;
      hasMore = pageData.hasMore;
      offset += batchSize;
      pageCount++;

      if (pageCount < 5) {
        assert.equal(pageData.hasMore, true);
        assert.equal(pageData.workouts.length, 50);
      } else {
        // Last page
        assert.equal(pageData.hasMore, false);
        assert.equal(pageData.workouts.length, 50);
      }
    }

    const durationMs = Date.now() - startFetch;
    assert.equal(retrievedCount, totalCount);
    assert.equal(pageCount, 5);
    // Retrieval of all 5 pages should complete swiftly (< 3000ms)
    assert.ok(durationMs < 3000, `Paging 250 items took ${durationMs}ms`);
  });

  test('2. Incremental Sync: ?since= parameter fetches only newly created records', async () => {
    // 1. Create base history (10 workouts)
    const baseWorkouts = [];
    const baseTime = Date.now() - 100000;
    for (let i = 0; i < 10; i++) {
      const itemTimestamp = new Date(baseTime + i * 1000).toISOString();
      baseWorkouts.push({
        id: `work_base_${i}`,
        exerciseKey: 'squats',
        reps: 15,
        timestamp: itemTimestamp,
        updatedAt: itemTimestamp
      });
    }

    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ workouts: baseWorkouts })
    });

    // Ensure timestamp boundary margin
    await new Promise((r) => setTimeout(r, 50));
    const checkpointTimestamp = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 50));

    // 2. Add 2 new workouts
    const nowTimestamp = new Date().toISOString();
    const newWorkouts = [
      { id: 'work_new_1', exerciseKey: 'lunges', reps: 12, timestamp: nowTimestamp, updatedAt: nowTimestamp },
      { id: 'work_new_2', exerciseKey: 'plank', reps: 1, timestamp: nowTimestamp, updatedAt: nowTimestamp }
    ];

    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ workouts: newWorkouts })
    });

    // 3. Incremental pull using checkpoint
    const incrementalRes = await fetch(`${instance.url}/api/v1/sync/pull?since=${encodeURIComponent(checkpointTimestamp)}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert.equal(incrementalRes.status, 200);
    const incData = await incrementalRes.json();

    // Must receive ONLY the 2 new workouts, not the 10 base workouts
    assert.equal(incData.workouts.length, 2);
    const pulledIds = incData.workouts.map((w: any) => w.id).sort();
    assert.deepEqual(pulledIds, ['work_new_1', 'work_new_2']);
  });
});
