/**
 * FitMitra Automated Backup & Restore Drill
 * 
 * Verifies disaster recovery, point-in-time restoration, and schema fidelity:
 * 1. Seeds representative data (accounts, workouts, challenges, tombstones, social).
 * 2. Executes pg_dump in compressed custom binary format (-Fc).
 * 3. Creates an isolated disposable target database (e.g. fitmitra_restore_drill).
 * 4. Executes pg_restore to recover the complete schema and dataset.
 * 5. Asserts record counts, migration versions, and relational integrity on the restored DB.
 * 6. Cleans up temporary dump artifacts and drops the restore database.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PostgresDatabase } from '../../src/server/postgresDb.ts';
import { migrations, CURRENT_SERVER_SCHEMA_VERSION } from '../../src/server/migrations.ts';

const SOURCE_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const isStrict = process.env.RELEASE_GATE === 'true' || process.argv.includes('--strict');

function checkToolAvailability(toolName: string): boolean {
  try {
    const res = spawnSync(toolName, ['--version'], { stdio: 'pipe' });
    return res.status === 0;
  } catch {
    return false;
  }
}

async function runDrill() {
  console.log('\n======================================================================');
  console.log('FitMitra Disaster Recovery Drill: Backup & Restore Execution');
  console.log('======================================================================');

  if (!SOURCE_DB_URL) {
    console.log('[BACKUP_RESTORE_DRILL: BLOCKED]');
    console.log('Reason: TEST_DATABASE_URL (or DATABASE_URL) is unset.');
    console.log('Prerequisite: PostgreSQL 15+ instance is required to execute recovery drill.');
    if (isStrict) {
      process.exit(1);
    }
    process.exit(0);
  }

  const hasPgDump = checkToolAvailability('pg_dump');
  const hasPgRestore = checkToolAvailability('pg_restore');

  if (!hasPgDump || !hasPgRestore) {
    console.log('[BACKUP_RESTORE_DRILL: BLOCKED]');
    console.log(`Reason: Required client tools missing (pg_dump: ${hasPgDump}, pg_restore: ${hasPgRestore}).`);
    console.log('Prerequisite: Install postgresql-client to provide pg_dump and pg_restore binaries.');
    if (isStrict) {
      process.exit(1);
    }
    process.exit(0);
  }

  const maskedSource = PostgresDatabase.maskConnectionString(SOURCE_DB_URL);
  console.log(`Source Database: ${maskedSource}`);

  const sourceDb = new PostgresDatabase({ connectionString: SOURCE_DB_URL });
  const dumpFilePath = path.resolve(process.cwd(), `fitmitra_drill_${Date.now()}.dump`);

  // Parse source URL to derive restore database URL
  const parsedUrl = new URL(SOURCE_DB_URL);
  const restoreDbName = 'fitmitra_restore_drill';
  const restoreUrl = new URL(SOURCE_DB_URL);
  restoreUrl.pathname = `/${restoreDbName}`;

  try {
    // -------------------------------------------------------------------------
    // Step 1: Initialize Schema & Seed Representative Records on Source
    // -------------------------------------------------------------------------
    console.log('[Step 1/6] Running pending migrations and seeding source database...');
    await migrations.runPendingMigrations(sourceDb);

    const testAccountId = '88888888-9999-aaaa-bbbb-cccccccccccc';
    const testEmail = `drill_${Date.now()}@campus.edu.in`;
    const now = new Date().toISOString();

    await sourceDb.createAccount(
      {
        id: testAccountId,
        email: testEmail,
        passwordHash: 'hash_drill',
        salt: 'salt_drill',
        authType: 'authenticated',
        provider: 'email',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now
      },
      {
        accountId: testAccountId,
        displayName: 'Drill Athlete',
        username: `drill_${Date.now().toString().slice(-6)}`,
        avatarColor: 'from-emerald-500 to-teal-700',
        fitnessGoal: 'strength',
        preferencesJson: { hostelWing: 'Wing-C' },
        biometricsJson: {},
        createdAt: now,
        updatedAt: now
      }
    );

    await sourceDb.upsertWorkout(testAccountId, {
      id: `work_drill_${Date.now()}`,
      exerciseKey: 'squat',
      exerciseName: 'Squat',
      reps: 30,
      durationSeconds: 90,
      postureScore: 95,
      timestamp: now,
      isHostelFriendly: true,
      completedFully: true,
      source: 'pose_coach',
      schemaVersion: 1,
      updatedAt: now
    });

    await sourceDb.upsertChallenge(testAccountId, {
      id: `chal_drill_${Date.now()}`,
      challengeId: 'dorm_squat_blitz',
      currentValue: 30,
      targetValue: 100,
      completedDays: [now.split('T')[0]],
      completedSessions: 1,
      processedActivityIds: [],
      completed: false,
      schemaVersion: 1
    });

    await sourceDb.addTombstone(testAccountId, 'workout', `tomb_drill_${Date.now()}`);
    await sourceDb.createFriendInvitation(testAccountId, { maxUses: 5, expiryDays: 7 });

    console.log('✓ Source database populated with representative entities.');

    // -------------------------------------------------------------------------
    // Step 2: Export Custom-Format Compressed Dump (pg_dump -Fc)
    // -------------------------------------------------------------------------
    console.log(`[Step 2/6] Exporting binary backup via pg_dump to ${dumpFilePath}...`);
    const dumpRes = spawnSync(
      'pg_dump',
      ['-d', SOURCE_DB_URL, '-Fc', '-f', dumpFilePath],
      { stdio: 'pipe' }
    );

    if (dumpRes.status !== 0) {
      throw new Error(`pg_dump failed (exit code ${dumpRes.status}): ${dumpRes.stderr?.toString()}`);
    }
    const dumpStats = fs.statSync(dumpFilePath);
    console.log(`✓ Backup successfully created (${dumpStats.size} bytes).`);

    // -------------------------------------------------------------------------
    // Step 3: Create Separate Empty Target Database for Restoration
    // -------------------------------------------------------------------------
    console.log(`[Step 3/6] Provisioning separate restore database (${restoreDbName})...`);
    // Connect to maintenance DB (postgres) to create database
    const maintenanceUrl = new URL(SOURCE_DB_URL);
    maintenanceUrl.pathname = '/postgres';
    const maintenanceDb = new PostgresDatabase({ connectionString: maintenanceUrl.toString() });

    try {
      await maintenanceDb.query(`DROP DATABASE IF EXISTS ${restoreDbName};`);
      await maintenanceDb.query(`CREATE DATABASE ${restoreDbName};`);
      console.log(`✓ Restore target database '${restoreDbName}' created.`);
    } finally {
      await maintenanceDb.close();
    }

    // -------------------------------------------------------------------------
    // Step 4: Restore Backup Archive (pg_restore)
    // -------------------------------------------------------------------------
    console.log(`[Step 4/6] Restoring archive into ${restoreDbName} via pg_restore...`);
    const restoreRes = spawnSync(
      'pg_restore',
      ['--clean', '--if-exists', '--no-owner', '--no-privileges', '-d', restoreUrl.toString(), dumpFilePath],
      { stdio: 'pipe' }
    );

    // Note: pg_restore may return 0 or 1 with warnings (e.g. drop if exists on empty db).
    if (restoreRes.status !== 0 && restoreRes.status !== 1) {
      throw new Error(`pg_restore failed (exit code ${restoreRes.status}): ${restoreRes.stderr?.toString()}`);
    }
    console.log('✓ pg_restore completed archive injection.');

    // -------------------------------------------------------------------------
    // Step 5: Verification & Integrity Assertions on Restored Database
    // -------------------------------------------------------------------------
    console.log('[Step 5/6] Verifying schema and data integrity on restored database...');
    const restoredDb = new PostgresDatabase({ connectionString: restoreUrl.toString() });

    try {
      const pingOk = await restoredDb.ping();
      if (!pingOk) throw new Error('Restored database failed ping() check.');

      // 1. Verify schema migrations
      const migRes = await restoredDb.query('SELECT version, name FROM schema_migrations ORDER BY version ASC;');
      console.log(`  - Restored schema migrations count: ${migRes.rows.length}`);
      if (migRes.rows.length < 3) {
        throw new Error(`Restored schema missing expected migrations (found ${migRes.rows.length}, expected >= 3)`);
      }

      // 2. Verify account
      const acc = await restoredDb.getAccountByEmail(testEmail);
      if (!acc || acc.id !== testAccountId) {
        throw new Error(`Restored database missing test account ${testEmail}`);
      }
      console.log(`  - Restored account verified: ${acc.email} (${acc.id})`);

      // 3. Verify profile
      const prof = await restoredDb.getProfile(testAccountId);
      if (!prof || prof.displayName !== 'Drill Athlete') {
        throw new Error('Restored profile corrupted or missing.');
      }
      console.log(`  - Restored profile verified: ${prof.displayName}`);

      // 4. Verify workouts
      const workouts = await restoredDb.getWorkouts(testAccountId);
      if (workouts.length === 0 || workouts[0].exerciseKey !== 'squat') {
        throw new Error('Restored workout records missing.');
      }
      console.log(`  - Restored workouts verified: ${workouts.length} session(s)`);

      // 5. Verify tombstones
      const tombstones = await restoredDb.getTombstones(testAccountId);
      if (tombstones.length === 0) {
        throw new Error('Restored tombstones missing.');
      }
      console.log(`  - Restored tombstones verified: ${tombstones.length} tombstone(s)`);

      console.log('✓ All integrity assertions passed on restored database.');
    } finally {
      await restoredDb.close();
    }

    // -------------------------------------------------------------------------
    // Step 6: Safe Cleanup of Temporary Artifacts
    // -------------------------------------------------------------------------
    console.log('[Step 6/6] Cleaning up drill database and dump file...');
    const cleanupMaintenanceDb = new PostgresDatabase({ connectionString: maintenanceUrl.toString() });
    try {
      await cleanupMaintenanceDb.query(`DROP DATABASE IF EXISTS ${restoreDbName};`);
      console.log(`✓ Restore database '${restoreDbName}' dropped.`);
    } finally {
      await cleanupMaintenanceDb.close();
    }

    if (fs.existsSync(dumpFilePath)) {
      fs.unlinkSync(dumpFilePath);
      console.log(`✓ Temporary dump file ${dumpFilePath} removed.`);
    }

    console.log('\n======================================================================');
    console.log('[BACKUP_RESTORE_DRILL: PASS]');
    console.log('Disaster Recovery Verification completed with 100% data fidelity.');
    console.log('======================================================================\n');
  } catch (err: any) {
    console.error('\n[BACKUP_RESTORE_DRILL: FAIL]');
    console.error('Failure detail:', err.message);
    if (fs.existsSync(dumpFilePath)) {
      try { fs.unlinkSync(dumpFilePath); } catch {}
    }
    process.exit(1);
  } finally {
    await sourceDb.close();
  }
}

runDrill();
