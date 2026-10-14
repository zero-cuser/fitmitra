/**
 * Process Restart Helper for PostgreSQL Persistence Verification
 * 
 * Invoked as distinct operating system processes to verify cross-process persistence:
 * 1. write: Inserts an account and workout into PostgreSQL and exits cleanly (exit code 0).
 * 2. read: Fresh process queries the database, asserts persistence, and exits cleanly (exit code 0).
 */

import { PostgresDatabase } from '../../src/server/postgresDb.ts';

const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) {
  console.error('[PROCESS_RESTART_HELPER] ERROR: TEST_DATABASE_URL is not set.');
  process.exit(1);
}

const mode = process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1];
const accountId = process.argv.find(arg => arg.startsWith('--account='))?.split('=')[1];
const email = process.argv.find(arg => arg.startsWith('--email='))?.split('=')[1];
const workoutId = process.argv.find(arg => arg.startsWith('--workout='))?.split('=')[1];

if (!mode || !accountId) {
  console.error('Usage: node processRestartHelper.ts --mode=write|read --account=<id> [--email=<email>] [--workout=<id>]');
  process.exit(1);
}

const db = new PostgresDatabase({ connectionString: dbUrl });

async function run() {
  try {
    if (mode === 'write') {
      const now = new Date().toISOString();
      await db.createAccount(
        {
          id: accountId!,
          email: email || `restart_${Date.now()}@campus.edu.in`,
          passwordHash: 'testhash_restart',
          salt: 'testsalt_restart',
          authType: 'authenticated',
          provider: 'email',
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
          lastSeenAt: now
        },
        {
          accountId: accountId!,
          displayName: 'Process Restart Athlete',
          username: `restart_${Date.now().toString().slice(-6)}`,
          avatarColor: 'from-amber-500 to-orange-700',
          fitnessGoal: 'strength',
          preferencesJson: { hostelWing: 'Wing-A' },
          biometricsJson: {},
          createdAt: now,
          updatedAt: now
        }
      );

      if (workoutId) {
        await db.upsertWorkout(accountId!, {
          id: workoutId,
          exerciseKey: 'pushup',
          exerciseName: 'Push-up',
          reps: 25,
          durationSeconds: 45,
          postureScore: 90,
          timestamp: now,
          isHostelFriendly: true,
          completedFully: true,
          source: 'pose_coach',
          schemaVersion: 1,
          updatedAt: now
        });
      }

      console.log(`[PROCESS_WRITE_SUCCESS] PID=${process.pid} account=${accountId} workout=${workoutId}`);
    } else if (mode === 'read') {
      const acc = await db.getAccountById(accountId!);
      if (!acc) {
        console.error(`[PROCESS_READ_FAILED] PID=${process.pid} Account ${accountId} not found in database.`);
        process.exit(2);
      }
      const workouts = await db.getWorkouts(accountId!);
      if (workoutId && !workouts.some(w => w.id === workoutId)) {
        console.error(`[PROCESS_READ_FAILED] PID=${process.pid} Workout ${workoutId} not found for account ${accountId}.`);
        process.exit(3);
      }
      console.log(`[PROCESS_READ_SUCCESS] PID=${process.pid} account=${accountId} workoutsCount=${workouts.length}`);
    } else {
      console.error(`[PROCESS_RESTART_HELPER] Unknown mode: ${mode}`);
      process.exit(1);
    }
  } finally {
    await db.close();
  }
}

run().catch(err => {
  console.error('[PROCESS_RESTART_HELPER] Fatal error:', err.message);
  process.exit(1);
});
