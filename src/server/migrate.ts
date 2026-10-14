/**
 * FitMitra CLI Database Migration Runner
 * 
 * Usage:
 *   npx tsx src/server/migrate.ts
 *   npm run db:migrate
 * 
 * Applies pending SQL migrations safely using PostgreSQL transactional advisory locking.
 */

import { createDatabase, PostgresDatabase } from './db.ts';
import { migrations } from './migrations.ts';

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[FitMitra Migrator] ERROR: DATABASE_URL environment variable must be set.');
    process.exit(1);
  }

  console.log(`[FitMitra Migrator] Connecting to database: ${PostgresDatabase.maskConnectionString(dbUrl)}`);

  let db: PostgresDatabase;
  try {
    db = new PostgresDatabase({ connectionString: dbUrl });
    const isHealthy = await db.ping();
    if (!isHealthy) {
      console.error('[FitMitra Migrator] ERROR: Could not ping database at provided DATABASE_URL.');
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`[FitMitra Migrator] ERROR: Connection failed: ${err.message}`);
    process.exit(1);
  }

  try {
    console.log('[FitMitra Migrator] Running pending migrations with advisory locking...');
    const result = await migrations.runPendingMigrations(db);
    console.log(
      `[FitMitra Migrator] SUCCESS: Migrations completed. Applied: ${result.appliedCount}, Current Version: v${result.currentVersion}.`
    );
    await db.close();
    process.exit(0);
  } catch (err: any) {
    console.error(`[FitMitra Migrator] FATAL: Migration execution failed: ${err.message}`);
    await db.close();
    process.exit(1);
  }
}

main();
