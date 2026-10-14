/**
 * FitMitra Phase 14 Reliability Tests: Schema Migrations
 * 
 * Verifies that:
 * - Migrations are versioned and sequential
 * - Client version compatibility checks function reliably
 * - Existing data survives migration execution
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MigrationManager } from '../../src/server/migrations.ts';
import { Database } from '../../src/server/db.ts';

describe('Phase 14 Reliability: Schema Migrations & Compatibility', () => {
  let mgr: MigrationManager;
  let testDb: Database;

  beforeEach(() => {
    mgr = new MigrationManager();
    testDb = new Database();
  });

  test('1. Version Tracking: Correctly tracks sequential migrations', () => {
    const list = mgr.getAppliedMigrations();
    assert.ok(list.length >= 3);
    assert.equal(list[0].version, 1);
    assert.equal(list[1].version, 2);
    assert.equal(list[2].version, 3);
    assert.equal(mgr.getCurrentVersion(), 3);
  });

  test('2. Client Compatibility: Accepts versions 1 to 3, rejects unsupported versions', () => {
    assert.equal(mgr.isClientCompatible(1), true);
    assert.equal(mgr.isClientCompatible(2), true);
    assert.equal(mgr.isClientCompatible(3), true);
    assert.equal(mgr.isClientCompatible(0), false);
    assert.equal(mgr.isClientCompatible(4), false);
    assert.equal(mgr.isClientCompatible(-1), false);
  });

  test('3. Non-Destructive Migration: Existing database records survive migration check', () => {
    // Seed account and workout in database
    testDb.createAccount(
      {
        id: 'acc_migr_test',
        email: 'migr@campus.edu.in',
        passwordHash: 'hash',
        salt: 'salt',
        authType: 'authenticated',
        provider: 'email',
        emailVerified: false,
        createdAt: '2026-10-14T00:00:00Z',
        updatedAt: '2026-10-14T00:00:00Z',
        lastSeenAt: '2026-10-14T00:00:00Z'
      },
      {
        accountId: 'acc_migr_test',
        displayName: 'Migration Student',
        username: 'migr_student',
        avatarColor: 'blue',
        fitnessGoal: 'strength',
        preferencesJson: { theme: 'dark' },
        biometricsJson: {},
        createdAt: '2026-10-14T00:00:00Z',
        updatedAt: '2026-10-14T00:00:00Z'
      }
    );

    testDb.upsertWorkout('acc_migr_test', {
      id: 'work_pre_migration',
      exerciseKey: 'squats',
      reps: 20
    });

    // Run migration
    const ver = mgr.applyPendingMigrations(testDb);
    assert.equal(ver, 3);

    // Verify data intact
    const acc = testDb.getAccountById('acc_migr_test');
    assert.ok(acc);
    assert.equal(acc?.email, 'migr@campus.edu.in');

    const workouts = testDb.getWorkouts('acc_migr_test');
    assert.equal(workouts.length, 1);
    assert.equal(workouts[0].id, 'work_pre_migration');
    assert.equal(workouts[0].reps, 20);
  });
});
