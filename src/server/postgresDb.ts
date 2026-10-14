/**
 * FitMitra Persistent PostgreSQL Database Adapter
 * 
 * Provides production-grade relational persistence using node-postgres (`pg`)
 * with connection pooling, transaction isolation, safe startup checks,
 * and graceful connection teardown.
 * 
 * Strictly adheres to `src/server/schema.sql` tables and RLS principles.
 */

import pg from 'pg';
import crypto from 'node:crypto';
import { logger } from './logger.ts';
import {
  generateRandomCode,
  type IDatabase,
  type DbAccount,
  type DbProfile,
  type DbWorkout,
  type DbChallenge,
  type DbTombstone,
  type DbFriendInvitation,
  type DbFriendship,
  type DbSharedChallenge,
  type DbChallengeParticipant,
  type DbChallengeContribution
} from './db.ts';

const { Pool } = pg;

function toIso(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export interface PostgresConfig {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | object;
  pool?: pg.Pool;
}

export class PostgresDatabase implements IDatabase {
  private pool: pg.Pool;
  private readonly sanitizedEndpoint: string;

  constructor(config?: PostgresConfig | string) {
    if (typeof config === 'object' && config?.pool) {
      this.pool = config.pool;
      this.sanitizedEndpoint = 'injected-pool';
      return;
    }

    let poolConfig: pg.PoolConfig;
    if (typeof config === 'string') {
      poolConfig = { connectionString: config };
    } else if (config) {
      poolConfig = { ...config };
    } else {
      const connStr = process.env.DATABASE_URL;
      if (!connStr) {
        throw new Error('PostgresDatabase requires DATABASE_URL to be set.');
      }
      poolConfig = { connectionString: connStr };
    }

    // Mask connection string credentials for safe logging
    this.sanitizedEndpoint = PostgresDatabase.maskConnectionString(poolConfig.connectionString || '');

    // Configure connection pool limits & timeouts
    poolConfig.max = poolConfig.max || Number(process.env.DB_POOL_MAX) || 10;
    poolConfig.idleTimeoutMillis =
      poolConfig.idleTimeoutMillis || Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000;
    poolConfig.connectionTimeoutMillis =
      poolConfig.connectionTimeoutMillis || Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 5000;

    // SSL configuration for hosted Postgres (Supabase, Neon, AWS RDS, etc.)
    if (
      process.env.DATABASE_SSL === 'true' ||
      (poolConfig.connectionString && poolConfig.connectionString.includes('sslmode=require'))
    ) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    this.pool = new Pool(poolConfig);

    // Suppress unhandled pool error crashes
    this.pool.on('error', (err) => {
      logger.log({
        eventType: 'DATABASE_ERROR',
        statusCode: 500,
        message: `Unexpected PostgreSQL client error: ${err.message}`
      });
    });
  }

  /**
   * Sanitizes a connection string by replacing username and password.
   */
  public static maskConnectionString(connStr?: string): string {
    if (!connStr) return 'undefined';
    try {
      const url = new URL(connStr);
      return `${url.protocol}//***:***@${url.host}${url.pathname}${url.search}`;
    } catch {
      return connStr.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
    }
  }

  isPersistent(): boolean {
    return true;
  }

  getSanitizedEndpoint(): string {
    return this.sanitizedEndpoint;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.pool.query('SELECT 1 as healthy');
      return Array.isArray(res?.rows) && res.rows.length > 0;
    } catch {
      return false;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async getClient(): Promise<pg.PoolClient> {
    return this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async reset(): Promise<void> {
    await this.pool.query(`
      TRUNCATE TABLE 
        accounts, 
        friend_invitations, 
        shared_challenges 
      CASCADE;
    `);
  }

  // ========================================================
  // ACCOUNTS & PROFILES
  // ========================================================

  async createAccount(account: DbAccount, profile: DbProfile): Promise<void> {
    const emailNorm = account.email.trim().toLowerCase();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert Account
      await client.query(
        `INSERT INTO accounts (
          id, email, password_hash, salt, auth_type, provider, email_verified, created_at, updated_at, last_seen_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          account.id,
          emailNorm,
          account.passwordHash,
          account.salt,
          account.authType,
          account.provider,
          account.emailVerified,
          account.createdAt,
          account.updatedAt,
          account.lastSeenAt
        ]
      );

      // 2. Insert Profile
      await client.query(
        `INSERT INTO profiles (
          account_id, display_name, username, avatar_color, hostel_wing, fitness_goal, preferences_json, biometrics_json, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          profile.accountId,
          profile.displayName,
          profile.username,
          profile.avatarColor,
          profile.hostelWing || null,
          profile.fitnessGoal,
          JSON.stringify(profile.preferencesJson || {}),
          JSON.stringify(profile.biometricsJson || {}),
          profile.createdAt,
          profile.updatedAt
        ]
      );

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        if (err.constraint?.includes('email') || err.message?.includes('email')) {
          throw new Error(`Account with email ${emailNorm} already exists.`);
        }
        if (err.constraint?.includes('username') || err.message?.includes('username')) {
          throw new Error(`Username ${profile.username} is already taken.`);
        }
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async getAccountById(id: string): Promise<DbAccount | null> {
    const res = await this.pool.query(
      `SELECT 
        id, email, password_hash as "passwordHash", salt, 
        auth_type as "authType", provider, email_verified as "emailVerified", 
        created_at as "createdAt", updated_at as "updatedAt", last_seen_at as "lastSeenAt"
      FROM accounts WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash || row.password_hash,
      salt: row.salt,
      authType: row.authType || row.auth_type,
      provider: row.provider,
      emailVerified: Boolean(row.emailVerified ?? row.email_verified),
      createdAt: toIso(row.createdAt || row.created_at),
      updatedAt: toIso(row.updatedAt || row.updated_at),
      lastSeenAt: toIso(row.lastSeenAt || row.last_seen_at)
    };
  }

  async getAccountByEmail(email: string): Promise<DbAccount | null> {
    const emailNorm = email.trim().toLowerCase();
    const res = await this.pool.query(
      `SELECT 
        id, email, password_hash as "passwordHash", salt, 
        auth_type as "authType", provider, email_verified as "emailVerified", 
        created_at as "createdAt", updated_at as "updatedAt", last_seen_at as "lastSeenAt"
      FROM accounts WHERE LOWER(email) = $1`,
      [emailNorm]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash || row.password_hash,
      salt: row.salt,
      authType: row.authType || row.auth_type,
      provider: row.provider,
      emailVerified: Boolean(row.emailVerified ?? row.email_verified),
      createdAt: toIso(row.createdAt || row.created_at),
      updatedAt: toIso(row.updatedAt || row.updated_at),
      lastSeenAt: toIso(row.lastSeenAt || row.last_seen_at)
    };
  }

  async updatePassword(accountId: string, passwordHash: string, salt: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE accounts SET password_hash = $2, salt = $3, updated_at = NOW() WHERE id = $1`,
      [accountId, passwordHash, salt]
    );
    return (res.rowCount || 0) > 0;
  }

  async getProfile(accountId: string): Promise<DbProfile | null> {
    const res = await this.pool.query(
      `SELECT 
        account_id as "accountId", display_name as "displayName", username, 
        avatar_color as "avatarColor", hostel_wing as "hostelWing", fitness_goal as "fitnessGoal", 
        preferences_json as "preferencesJson", biometrics_json as "biometricsJson", 
        created_at as "createdAt", updated_at as "updatedAt"
      FROM profiles WHERE account_id = $1`,
      [accountId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      hostelWing: row.hostelWing || undefined,
      preferencesJson:
        typeof row.preferencesJson === 'string'
          ? JSON.parse(row.preferencesJson)
          : row.preferencesJson || {},
      biometricsJson:
        typeof row.biometricsJson === 'string'
          ? JSON.parse(row.biometricsJson)
          : row.biometricsJson || {},
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString()
    };
  }

  async updatePreferences(
    accountId: string,
    preferences: Record<string, unknown>,
    updatedAt?: string
  ): Promise<{ updated: boolean }> {
    const current = await this.getProfile(accountId);
    if (!current) return { updated: false };

    const currentUpdated = current.preferencesUpdatedAt;
    const incomingUpdated = updatedAt || new Date().toISOString();

    if (currentUpdated && new Date(incomingUpdated).getTime() < new Date(currentUpdated).getTime()) {
      return { updated: false };
    }

    const merged = { ...current.preferencesJson, ...preferences };
    const now = new Date().toISOString();
    await this.pool.query(
      `UPDATE profiles SET preferences_json = $2, updated_at = $3 WHERE account_id = $1`,
      [accountId, JSON.stringify(merged), now]
    );
    return { updated: true };
  }

  async deleteAccountCascade(accountId: string): Promise<void> {
    await this.pool.query(`DELETE FROM accounts WHERE id = $1`, [accountId]);
  }

  // ========================================================
  // WORKOUTS & TOMBSTONES
  // ========================================================

  async upsertWorkout(
    accountId: string,
    workout: Omit<DbWorkout, 'accountId' | 'createdAt'>
  ): Promise<{ status: 'created' | 'updated' | 'ignored'; workout: DbWorkout }> {
    // 1. Check if tombstone exists
    const tombRes = await this.pool.query(
      `SELECT 1 FROM sync_tombstones WHERE account_id = $1 AND entity_type = 'workout' AND entity_id = $2`,
      [accountId, workout.id]
    );
    if (tombRes.rows.length > 0) {
      const existingRes = await this.pool.query(`SELECT * FROM workout_records WHERE id = $1`, [workout.id]);
      const existing = existingRes.rows[0] ? this.mapWorkoutRow(existingRes.rows[0]) : null;
      return {
        status: 'ignored',
        workout: existing || {
          ...workout,
          accountId,
          createdAt: new Date().toISOString(),
          updatedAt: workout.updatedAt || new Date().toISOString()
        }
      };
    }

    // 2. Check existing workout
    const existRes = await this.pool.query(
      `SELECT * FROM workout_records WHERE id = $1`,
      [workout.id]
    );

    if (existRes.rows.length > 0) {
      const row = existRes.rows[0];
      if (row.account_id !== accountId) {
        throw new Error(`PermissionDenied: Cannot overwrite workout owned by another account.`);
      }

      const currentUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      const incomingUpdated = workout.updatedAt ? new Date(workout.updatedAt).getTime() : Date.now();

      if (incomingUpdated <= currentUpdated) {
        return { status: 'ignored', workout: this.mapWorkoutRow(row) };
      }

      const updateNow = new Date().toISOString();
      await this.pool.query(
        `UPDATE workout_records SET
          exercise_key = $2, exercise_name = $3, reps = $4, duration_seconds = $5,
          posture_score = $6, timestamp = $7, is_hostel_friendly = $8, completed_fully = $9,
          source = $10, schema_version = $11, updated_at = $12
        WHERE id = $1`,
        [
          workout.id,
          workout.exerciseKey,
          workout.exerciseName,
          workout.reps,
          workout.durationSeconds,
          workout.postureScore !== undefined ? workout.postureScore : null,
          workout.timestamp,
          workout.isHostelFriendly,
          workout.completedFully,
          workout.source,
          workout.schemaVersion,
          updateNow
        ]
      );

      return {
        status: 'updated',
        workout: {
          ...workout,
          accountId,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: updateNow
        }
      };
    }

    // 3. Insert new workout
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO workout_records (
        id, account_id, exercise_key, exercise_name, reps, duration_seconds,
        posture_score, timestamp, is_hostel_friendly, completed_fully, source,
        schema_version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        workout.id,
        accountId,
        workout.exerciseKey,
        workout.exerciseName,
        workout.reps,
        workout.durationSeconds,
        workout.postureScore !== undefined ? workout.postureScore : null,
        workout.timestamp,
        workout.isHostelFriendly,
        workout.completedFully,
        workout.source,
        workout.schemaVersion,
        now,
        workout.updatedAt || now
      ]
    );

    return {
      status: 'created',
      workout: {
        ...workout,
        accountId,
        createdAt: now,
        updatedAt: workout.updatedAt || now
      }
    };
  }

  private mapWorkoutRow(r: any): DbWorkout {
    return {
      id: r.id,
      accountId: r.account_id,
      exerciseKey: r.exercise_key,
      exerciseName: r.exercise_name,
      reps: Number(r.reps),
      durationSeconds: Number(r.duration_seconds),
      postureScore: r.posture_score !== null ? Number(r.posture_score) : undefined,
      timestamp: new Date(r.timestamp).toISOString(),
      isHostelFriendly: Boolean(r.is_hostel_friendly),
      completedFully: Boolean(r.completed_fully),
      source: r.source,
      schemaVersion: Number(r.schema_version),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  }

  async getWorkouts(
    accountId: string,
    since?: string,
    limit = 50,
    offset = 0
  ): Promise<DbWorkout[]> {
    let query = `
      SELECT 
        id, account_id, exercise_key, exercise_name,
        reps, duration_seconds, posture_score, timestamp,
        is_hostel_friendly, completed_fully,
        source, schema_version, created_at, updated_at
      FROM workout_records
      WHERE account_id = $1
    `;
    const params: any[] = [accountId];

    if (since) {
      params.push(since);
      query += ` AND updated_at > $${params.length}`;
    }

    query += ` ORDER BY timestamp DESC`;

    params.push(limit);
    query += ` LIMIT $${params.length}`;

    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const res = await this.pool.query(query, params);
    return res.rows.map((r: any) => this.mapWorkoutRow(r));
  }

  async countWorkouts(accountId: string, since?: string): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM workout_records WHERE account_id = $1`;
    const params: any[] = [accountId];
    if (since) {
      params.push(since);
      query += ` AND updated_at > $2`;
    }
    const res = await this.pool.query(query, params);
    return Number(res.rows[0]?.count) || 0;
  }

  async addTombstone(
    accountId: string,
    entityType: 'workout' | 'challenge',
    entityId: string
  ): Promise<void> {
    const id = `tomb_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO sync_tombstones (id, account_id, entity_type, entity_id, deleted_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, accountId, entityType, entityId, now]
    );

    if (entityType === 'workout') {
      await this.pool.query(`DELETE FROM workout_records WHERE id = $1 AND account_id = $2`, [
        entityId,
        accountId
      ]);
    } else if (entityType === 'challenge') {
      await this.pool.query(
        `DELETE FROM challenge_progress WHERE challenge_id = $1 AND account_id = $2`,
        [entityId, accountId]
      );
    }
  }

  async getTombstones(accountId: string, since?: string): Promise<DbTombstone[]> {
    let query = `
      SELECT id, account_id as "accountId", entity_type as "entityType", entity_id as "entityId", deleted_at as "deletedAt"
      FROM sync_tombstones
      WHERE account_id = $1
    `;
    const params: any[] = [accountId];
    if (since) {
      params.push(since);
      query += ` AND deleted_at > $2`;
    }
    query += ` ORDER BY deleted_at ASC`;
    const res = await this.pool.query(query, params);
    return res.rows.map((r: any) => ({
      ...r,
      deletedAt: new Date(r.deletedAt).toISOString()
    }));
  }

  // ========================================================
  // CHALLENGES
  // ========================================================

  async upsertChallenge(
    accountId: string,
    challenge: Omit<DbChallenge, 'accountId'>
  ): Promise<{ status: 'created' | 'updated'; challenge: DbChallenge }> {
    const existRes = await this.pool.query(
      `SELECT * FROM challenge_progress WHERE id = $1`,
      [challenge.id]
    );

    const now = new Date().toISOString();

    if (existRes.rows.length > 0) {
      const existing = existRes.rows[0];
      if (existing.account_id !== accountId) {
        throw new Error('PermissionDenied: Cannot update challenge progress for another account.');
      }

      const mergedDays = Array.from(
        new Set([...(existing.completed_days || []), ...(challenge.completedDays || [])])
      );
      const mergedActivities = Array.from(
        new Set([...(existing.processed_activity_ids || []), ...(challenge.processedActivityIds || [])])
      );
      const maxValue = Math.max(Number(existing.current_value) || 0, challenge.currentValue);
      const isCompleted =
        challenge.completed || Boolean(existing.completed) || maxValue >= challenge.targetValue;
      const completedAt = isCompleted ? challenge.completedAt || existing.completed_at || now : null;

      await this.pool.query(
        `UPDATE challenge_progress SET
          current_value = $2,
          target_value = $3,
          completed_days = $4,
          completed_sessions = $5,
          processed_activity_ids = $6,
          completed = $7,
          completed_at = $8,
          schema_version = $9,
          updated_at = $10
        WHERE id = $1`,
        [
          challenge.id,
          maxValue,
          challenge.targetValue,
          mergedDays,
          challenge.completedSessions,
          mergedActivities,
          isCompleted,
          completedAt,
          challenge.schemaVersion,
          now
        ]
      );

      return {
        status: 'updated',
        challenge: {
          id: challenge.id,
          accountId,
          challengeId: challenge.challengeId,
          joinedAt: new Date(existing.joined_at).toISOString(),
          currentValue: maxValue,
          targetValue: challenge.targetValue,
          completedDays: mergedDays,
          completedSessions: challenge.completedSessions,
          processedActivityIds: mergedActivities,
          completed: isCompleted,
          completedAt: completedAt ? new Date(completedAt).toISOString() : undefined,
          schemaVersion: challenge.schemaVersion,
          updatedAt: now
        }
      };
    }

    await this.pool.query(
      `INSERT INTO challenge_progress (
        id, account_id, challenge_id, joined_at, current_value, target_value,
        completed_days, completed_sessions, processed_activity_ids, completed,
        completed_at, schema_version, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        challenge.id,
        accountId,
        challenge.challengeId,
        challenge.joinedAt || now,
        challenge.currentValue,
        challenge.targetValue,
        challenge.completedDays || [],
        challenge.completedSessions || 0,
        challenge.processedActivityIds || [],
        challenge.completed || false,
        challenge.completedAt || null,
        challenge.schemaVersion || 1,
        now
      ]
    );

    return {
      status: 'created',
      challenge: {
        ...challenge,
        accountId,
        joinedAt: challenge.joinedAt || now,
        completedDays: challenge.completedDays || [],
        processedActivityIds: challenge.processedActivityIds || [],
        updatedAt: now
      }
    };
  }

  async getChallenges(accountId: string, since?: string): Promise<DbChallenge[]> {
    let query = `
      SELECT 
        id, account_id as "accountId", challenge_id as "challengeId", joined_at as "joinedAt",
        current_value as "currentValue", target_value as "targetValue", completed_days as "completedDays",
        completed_sessions as "completedSessions", processed_activity_ids as "processedActivityIds",
        completed, completed_at as "completedAt", schema_version as "schemaVersion", updated_at as "updatedAt"
      FROM challenge_progress
      WHERE account_id = $1
    `;
    const params: any[] = [accountId];
    if (since) {
      params.push(since);
      query += ` AND updated_at > $2`;
    }
    const res = await this.pool.query(query, params);
    return res.rows.map((r: any) => ({
      ...r,
      currentValue: Number(r.currentValue),
      targetValue: Number(r.targetValue),
      completedDays: r.completedDays || [],
      processedActivityIds: r.processedActivityIds || [],
      joinedAt: new Date(r.joinedAt).toISOString(),
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : undefined,
      updatedAt: new Date(r.updatedAt).toISOString()
    }));
  }

  // ========================================================
  // SOCIAL & FRIEND INVITATIONS
  // ========================================================

  async createFriendInvitation(
    creatorAccountId: string,
    options?: { maxUses?: number; expiryDays?: number }
  ): Promise<DbFriendInvitation> {
    const profile = await this.getProfile(creatorAccountId);
    if (!profile) {
      throw new Error(`Profile not found for account ${creatorAccountId}`);
    }

    const code = generateRandomCode('FIT', 6);
    const expiryDays = options?.expiryDays ?? 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO friend_invitations (id, creator_account_id, invite_code, expires_at, max_uses, uses_count, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, 'active', $6)`,
      [id, creatorAccountId, code, expiresAt, options?.maxUses ?? 5, now]
    );

    return {
      id,
      creatorAccountId,
      inviteCode: code,
      expiresAt,
      maxUses: options?.maxUses ?? 5,
      usesCount: 0,
      status: 'active',
      createdAt: now
    };
  }

  async getFriendInvitationByCode(code: string): Promise<DbFriendInvitation | null> {
    const cleanCode = code.trim().toUpperCase();
    const res = await this.pool.query(
      `SELECT id, creator_account_id as "creatorAccountId", invite_code as "inviteCode",
              expires_at as "expiresAt", max_uses as "maxUses", uses_count as "usesCount",
              status, created_at as "createdAt"
       FROM friend_invitations WHERE UPPER(invite_code) = $1`,
      [cleanCode]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    if (new Date(row.expiresAt).getTime() < Date.now() && row.status === 'active') {
      await this.pool.query(`UPDATE friend_invitations SET status = 'expired' WHERE id = $1`, [row.id]);
      row.status = 'expired';
    }
    return {
      ...row,
      expiresAt: new Date(row.expiresAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString()
    };
  }

  async revokeFriendInvitation(creatorAccountId: string, code: string): Promise<boolean> {
    const cleanCode = code.trim().toUpperCase();
    const inv = await this.getFriendInvitationByCode(cleanCode);
    if (!inv) return false;
    if (inv.creatorAccountId !== creatorAccountId) {
      throw new Error('Unauthorized to revoke this invitation.');
    }
    await this.pool.query(
      `UPDATE friend_invitations SET status = 'revoked' WHERE id = $1`,
      [inv.id]
    );
    return true;
  }

  async requestFriendship(
    requesterAccountId: string,
    inviteCode: string
  ): Promise<{
    friendship: DbFriendship;
    invitationCreator: { displayName: string; avatarColor: string; hostelWing?: string };
  }> {
    const cleanCode = inviteCode.trim().toUpperCase();
    const inv = await this.getFriendInvitationByCode(cleanCode);

    if (!inv || inv.status !== 'active' || new Date(inv.expiresAt).getTime() < Date.now()) {
      throw new Error('Invalid or expired invitation code.');
    }

    if (inv.creatorAccountId === requesterAccountId) {
      throw new Error('Cannot connect with yourself.');
    }

    if (inv.usesCount >= inv.maxUses) {
      throw new Error('Invalid or expired invitation code.');
    }

    const existRes = await this.pool.query(
      `SELECT * FROM friend_relationships 
       WHERE (account_id = $1 AND friend_account_id = $2) 
          OR (account_id = $2 AND friend_account_id = $1)`,
      [requesterAccountId, inv.creatorAccountId]
    );

    if (existRes.rows.length > 0) {
      const f = existRes.rows[0];
      if (f.status === 'accepted') {
        throw new Error('You are already friends with this user.');
      } else if (f.status === 'pending') {
        throw new Error('A friend request between you and this user is already pending.');
      }
    }

    const newUses = inv.usesCount + 1;
    const newStatus = newUses >= inv.maxUses ? 'expired' : 'active';
    await this.pool.query(
      `UPDATE friend_invitations SET uses_count = $1, status = $2 WHERE id = $3`,
      [newUses, newStatus, inv.id]
    );

    const friendshipId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO friend_relationships (id, account_id, friend_account_id, status, initiated_by, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)`,
      [friendshipId, requesterAccountId, inv.creatorAccountId, requesterAccountId, now, now]
    );

    const creatorProfile = await this.getProfile(inv.creatorAccountId);

    return {
      friendship: {
        id: friendshipId,
        accountId: requesterAccountId,
        friendAccountId: inv.creatorAccountId,
        status: 'pending',
        initiatedBy: requesterAccountId,
        createdAt: now,
        updatedAt: now
      },
      invitationCreator: {
        displayName: creatorProfile?.displayName || 'Student',
        avatarColor: creatorProfile?.avatarColor || 'from-cyan-500 to-blue-700',
        hostelWing: creatorProfile?.hostelWing
      }
    };
  }

  async getFriendships(accountId: string) {
    const relRes = await this.pool.query(
      `SELECT id, account_id as "accountId", friend_account_id as "friendAccountId",
              status, initiated_by as "initiatedBy", created_at as "createdAt", updated_at as "updatedAt"
       FROM friend_relationships
       WHERE account_id = $1 OR friend_account_id = $1`,
      [accountId]
    );

    const accepted: any[] = [];
    const pendingIncoming: any[] = [];
    const pendingOutgoing: any[] = [];

    for (const f of relRes.rows) {
      if (f.status === 'accepted') {
        const otherId = f.accountId === accountId ? f.friendAccountId : f.accountId;
        const prof = await this.getProfile(otherId);
        if (prof) {
          accepted.push({
            friendshipId: f.id,
            friend: {
              displayName: prof.displayName,
              avatarColor: prof.avatarColor,
              hostelWing: prof.hostelWing,
              username: prof.username
            },
            since: new Date(f.updatedAt).toISOString()
          });
        }
      } else if (f.status === 'pending') {
        if (f.initiatedBy === accountId) {
          const recipientId = f.accountId === accountId ? f.friendAccountId : f.accountId;
          const prof = await this.getProfile(recipientId);
          if (prof) {
            pendingOutgoing.push({
              friendshipId: f.id,
              recipient: {
                displayName: prof.displayName,
                avatarColor: prof.avatarColor,
                hostelWing: prof.hostelWing
              },
              requestedAt: new Date(f.createdAt).toISOString()
            });
          }
        } else {
          const requesterId = f.initiatedBy;
          const prof = await this.getProfile(requesterId);
          if (prof) {
            pendingIncoming.push({
              friendshipId: f.id,
              requester: {
                displayName: prof.displayName,
                avatarColor: prof.avatarColor,
                hostelWing: prof.hostelWing
              },
              requestedAt: new Date(f.createdAt).toISOString()
            });
          }
        }
      }
    }

    const invRes = await this.pool.query(
      `SELECT id, creator_account_id as "creatorAccountId", invite_code as "inviteCode",
              expires_at as "expiresAt", max_uses as "maxUses", uses_count as "usesCount",
              status, created_at as "createdAt"
       FROM friend_invitations
       WHERE creator_account_id = $1 AND status = 'active' AND expires_at > NOW()`,
      [accountId]
    );

    return {
      accepted,
      pendingIncoming,
      pendingOutgoing,
      activeInvitations: invRes.rows.map((r: any) => ({
        ...r,
        expiresAt: new Date(r.expiresAt).toISOString(),
        createdAt: new Date(r.createdAt).toISOString()
      }))
    };
  }

  async respondToFriendRequest(
    accountId: string,
    friendshipId: string,
    action: 'accept' | 'decline'
  ): Promise<DbFriendship> {
    const res = await this.pool.query(
      `SELECT id, account_id as "accountId", friend_account_id as "friendAccountId",
              status, initiated_by as "initiatedBy", created_at as "createdAt", updated_at as "updatedAt"
       FROM friend_relationships WHERE id = $1`,
      [friendshipId]
    );

    if (res.rows.length === 0) {
      throw new Error('Friend request not found.');
    }

    const friendship = res.rows[0];
    if (friendship.status !== 'pending') {
      throw new Error('This request has already been handled.');
    }

    const isRecipient =
      (friendship.accountId === accountId && friendship.initiatedBy !== accountId) ||
      (friendship.friendAccountId === accountId && friendship.initiatedBy !== accountId);

    if (!isRecipient) {
      throw new Error('Unauthorized: Only the recipient can accept or decline.');
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const now = new Date().toISOString();

    await this.pool.query(
      `UPDATE friend_relationships SET status = $1, updated_at = $2 WHERE id = $3`,
      [newStatus, now, friendshipId]
    );

    return {
      id: friendship.id,
      accountId: friendship.accountId,
      friendAccountId: friendship.friendAccountId,
      status: newStatus,
      initiatedBy: friendship.initiatedBy,
      createdAt: new Date(friendship.createdAt).toISOString(),
      updatedAt: now
    };
  }

  async removeFriendship(accountId: string, friendshipId: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT * FROM friend_relationships WHERE id = $1`,
      [friendshipId]
    );
    if (res.rows.length === 0) {
      throw new Error('Friendship not found.');
    }
    const f = res.rows[0];
    if (f.account_id !== accountId && f.friend_account_id !== accountId) {
      throw new Error('Unauthorized to remove this connection.');
    }
    await this.pool.query(`DELETE FROM friend_relationships WHERE id = $1`, [friendshipId]);
    return true;
  }

  // ========================================================
  // SHARED CHALLENGES
  // ========================================================

  async createSharedChallenge(
    ownerAccountId: string,
    data: {
      title: string;
      description: string;
      category?: 'strength' | 'consistency' | 'cardio' | 'posture' | 'exam';
      type?: 'rep_target' | 'duration_target' | 'session_count' | 'streak';
      targetValue: number;
      unit?: string;
      exerciseKeys?: string[];
      startDate: string;
      endDate: string;
      maxParticipants?: number;
    }
  ): Promise<DbSharedChallenge> {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Challenge title is required.');
    }
    if (data.targetValue <= 0) {
      throw new Error('Target value must be strictly positive.');
    }
    if (new Date(data.endDate).getTime() < new Date(data.startDate).getTime()) {
      throw new Error('End date cannot precede start date.');
    }

    const challengeId = crypto.randomUUID();
    const inviteCode = generateRandomCode('CHAL', 6);
    const now = new Date().toISOString();
    const maxPart = Math.min(50, Math.max(2, data.maxParticipants || 10));

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO shared_challenges (
          id, owner_account_id, title, description, category, type, target_value, unit,
          exercise_keys, start_date, end_date, max_participants, invite_code, status,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', $14, $14)`,
        [
          challengeId,
          ownerAccountId,
          data.title.trim(),
          data.description?.trim() || '',
          data.category || 'strength',
          data.type || 'rep_target',
          data.targetValue,
          data.unit || 'reps',
          data.exerciseKeys || [],
          data.startDate,
          data.endDate,
          maxPart,
          inviteCode,
          now
        ]
      );

      const partId = crypto.randomUUID();
      await client.query(
        `INSERT INTO shared_challenge_participants (id, challenge_id, account_id, role, status, joined_at)
         VALUES ($1, $2, $3, 'owner', 'active', $4)`,
        [partId, challengeId, ownerAccountId, now]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      id: challengeId,
      ownerAccountId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      category: data.category || 'strength',
      type: data.type || 'rep_target',
      targetValue: data.targetValue,
      unit: data.unit || 'reps',
      exerciseKeys: data.exerciseKeys || [],
      startDate: data.startDate,
      endDate: data.endDate,
      maxParticipants: maxPart,
      inviteCode,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
  }

  private mapSharedChallengeRow(row: any): DbSharedChallenge {
    return {
      id: row.id,
      ownerAccountId: row.ownerAccountId,
      title: row.title,
      description: row.description,
      category: row.category,
      type: row.type,
      targetValue: Number(row.targetValue),
      unit: row.unit,
      exerciseKeys: row.exerciseKeys || [],
      startDate: typeof row.startDate === 'string' ? row.startDate : row.startDate.toISOString().split('T')[0],
      endDate: typeof row.endDate === 'string' ? row.endDate : row.endDate.toISOString().split('T')[0],
      maxParticipants: Number(row.maxParticipants),
      inviteCode: row.inviteCode,
      status: row.status,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString()
    };
  }

  async getSharedChallengeById(id: string): Promise<DbSharedChallenge | null> {
    const res = await this.pool.query(
      `SELECT 
        id, owner_account_id as "ownerAccountId", title, description, category,
        type, target_value as "targetValue", unit, exercise_keys as "exerciseKeys",
        start_date as "startDate", end_date as "endDate", max_participants as "maxParticipants",
        invite_code as "inviteCode", status, created_at as "createdAt", updated_at as "updatedAt"
      FROM shared_challenges WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.mapSharedChallengeRow(res.rows[0]);
  }

  async getSharedChallengeByCode(code: string): Promise<DbSharedChallenge | null> {
    const cleanCode = code.trim().toUpperCase();
    const res = await this.pool.query(
      `SELECT 
        id, owner_account_id as "ownerAccountId", title, description, category,
        type, target_value as "targetValue", unit, exercise_keys as "exerciseKeys",
        start_date as "startDate", end_date as "endDate", max_participants as "maxParticipants",
        invite_code as "inviteCode", status, created_at as "createdAt", updated_at as "updatedAt"
      FROM shared_challenges WHERE UPPER(invite_code) = $1`,
      [cleanCode]
    );
    if (res.rows.length === 0) return null;
    return this.mapSharedChallengeRow(res.rows[0]);
  }

  async joinSharedChallenge(
    accountId: string,
    inviteCode: string
  ): Promise<{ challenge: DbSharedChallenge; participant: DbChallengeParticipant }> {
    const challenge = await this.getSharedChallengeByCode(inviteCode);
    if (!challenge || challenge.status !== 'active') {
      throw new Error('Invalid or inactive challenge invitation code.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (challenge.endDate < todayStr) {
      throw new Error('This challenge has already concluded.');
    }

    const partRes = await this.pool.query(
      `SELECT id, challenge_id as "challengeId", account_id as "accountId", role, status, joined_at as "joinedAt"
       FROM shared_challenge_participants WHERE challenge_id = $1`,
      [challenge.id]
    );

    let activeCount = 0;
    let existingPart: any = null;
    for (const p of partRes.rows) {
      if (p.status === 'active') {
        activeCount++;
        if (p.accountId === accountId) {
          existingPart = p;
        }
      } else if (p.accountId === accountId) {
        existingPart = p;
      }
    }

    if (existingPart && existingPart.status === 'active') {
      throw new Error('You are already participating in this challenge.');
    }

    if (activeCount >= challenge.maxParticipants) {
      throw new Error('Challenge has reached maximum participant capacity.');
    }

    const now = new Date().toISOString();
    if (existingPart) {
      await this.pool.query(
        `UPDATE shared_challenge_participants SET status = 'active', joined_at = $1 WHERE id = $2`,
        [now, existingPart.id]
      );
      existingPart.status = 'active';
      existingPart.joinedAt = now;
      return { challenge, participant: existingPart };
    } else {
      const partId = crypto.randomUUID();
      await this.pool.query(
        `INSERT INTO shared_challenge_participants (id, challenge_id, account_id, role, status, joined_at)
         VALUES ($1, $2, $3, 'participant', 'active', $4)`,
        [partId, challenge.id, accountId, now]
      );
      return {
        challenge,
        participant: {
          id: partId,
          challengeId: challenge.id,
          accountId,
          role: 'participant',
          joinedAt: now,
          status: 'active'
        }
      };
    }
  }

  async recordChallengeContribution(
    accountId: string,
    challengeId: string,
    activity: {
      id: string;
      type: string;
      exerciseKey?: string;
      reps?: number;
      durationSeconds: number;
      timestamp?: string;
    }
  ): Promise<{
    contribution: DbChallengeContribution;
    updatedParticipantScore: number;
    challengeCompleted: boolean;
  }> {
    const challenge = await this.getSharedChallengeById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found.');
    }
    if (challenge.status !== 'active') {
      throw new Error('Cannot contribute to an inactive or concluded challenge.');
    }

    const partRes = await this.pool.query(
      `SELECT * FROM shared_challenge_participants 
       WHERE challenge_id = $1 AND account_id = $2 AND status = 'active'`,
      [challengeId, accountId]
    );
    if (partRes.rows.length === 0) {
      throw new Error('You are not an active participant in this challenge.');
    }

    const activityTimestamp = activity.timestamp || new Date().toISOString();
    const activityDate = activityTimestamp.split('T')[0];

    if (activityDate < challenge.startDate || activityDate > challenge.endDate) {
      throw new Error(
        `Activity date (${activityDate}) falls outside challenge window (${challenge.startDate} to ${challenge.endDate}).`
      );
    }

    // Idempotency check:
    const existContrib = await this.pool.query(
      `SELECT id, challenge_id as "challengeId", account_id as "accountId", activity_id as "activityId",
              activity_type as "activityType", exercise_key as "exerciseKey", metric_value as "metricValue",
              activity_timestamp as "activityTimestamp", created_at as "createdAt"
       FROM shared_challenge_contributions
       WHERE challenge_id = $1 AND account_id = $2 AND activity_id = $3`,
      [challengeId, accountId, activity.id]
    );

    if (existContrib.rows.length > 0) {
      const score = await this.calculateParticipantScore(challenge, accountId);
      return {
        contribution: {
          ...existContrib.rows[0],
          metricValue: Number(existContrib.rows[0].metricValue),
          activityTimestamp: new Date(existContrib.rows[0].activityTimestamp).toISOString(),
          createdAt: new Date(existContrib.rows[0].createdAt).toISOString()
        },
        updatedParticipantScore: score,
        challengeCompleted: score >= challenge.targetValue
      };
    }

    let metricValue = 0;
    switch (challenge.type) {
      case 'rep_target': {
        if (activity.type !== 'workout' || !activity.reps || activity.reps <= 0) {
          throw new Error('Only valid workout sessions with reps satisfy rep targets.');
        }
        if (
          challenge.exerciseKeys &&
          challenge.exerciseKeys.length > 0 &&
          activity.exerciseKey &&
          !challenge.exerciseKeys.includes(activity.exerciseKey)
        ) {
          throw new Error(`Exercise ${activity.exerciseKey} does not count toward this challenge.`);
        }
        metricValue = activity.reps;
        break;
      }
      case 'duration_target': {
        metricValue = Math.max(1, Math.round(activity.durationSeconds / 60));
        break;
      }
      case 'session_count':
      case 'streak': {
        metricValue = 1;
        break;
      }
    }

    const contribId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO shared_challenge_contributions (
        id, challenge_id, account_id, activity_id, activity_type, exercise_key,
        metric_value, activity_timestamp, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        contribId,
        challengeId,
        accountId,
        activity.id,
        activity.type,
        activity.exerciseKey || null,
        metricValue,
        activityTimestamp,
        now
      ]
    );

    const updatedScore = await this.calculateParticipantScore(challenge, accountId);
    const isCompleted = updatedScore >= challenge.targetValue;

    return {
      contribution: {
        id: contribId,
        challengeId,
        accountId,
        activityId: activity.id,
        activityType: activity.type,
        exerciseKey: activity.exerciseKey,
        metricValue,
        activityTimestamp,
        createdAt: now
      },
      updatedParticipantScore: updatedScore,
      challengeCompleted: isCompleted
    };
  }

  private async calculateParticipantScore(challenge: DbSharedChallenge, accountId: string): Promise<number> {
    const res = await this.pool.query(
      `SELECT metric_value as "metricValue", activity_timestamp as "activityTimestamp"
       FROM shared_challenge_contributions
       WHERE challenge_id = $1 AND account_id = $2`,
      [challenge.id, accountId]
    );

    if (challenge.type === 'streak') {
      const dates = new Set<string>();
      for (const r of res.rows) {
        dates.add(new Date(r.activityTimestamp).toISOString().split('T')[0]);
      }
      return Math.min(dates.size, challenge.targetValue);
    }

    let total = 0;
    for (const r of res.rows) {
      total += Number(r.metricValue);
    }
    return Math.min(total, challenge.targetValue);
  }

  async getSharedChallengeDetails(accountId: string, challengeId: string) {
    const challenge = await this.getSharedChallengeById(challengeId);
    if (!challenge) return null;

    const isOwner = challenge.ownerAccountId === accountId;
    const partRes = await this.pool.query(
      `SELECT account_id as "accountId", role, status, joined_at as "joinedAt"
       FROM shared_challenge_participants
       WHERE challenge_id = $1 AND status = 'active'`,
      [challengeId]
    );

    const isParticipant = partRes.rows.some((p: any) => p.accountId === accountId);
    if (!isOwner && !isParticipant) return null;

    const participantsList: any[] = [];
    for (const p of partRes.rows) {
      const prof = await this.getProfile(p.accountId);
      const score = await this.calculateParticipantScore(challenge, p.accountId);
      const pct = Math.min(100, Math.round((score / challenge.targetValue) * 100));

      participantsList.push({
        participantId: p.accountId,
        displayName: prof?.displayName || 'Student',
        avatarColor: prof?.avatarColor || 'from-cyan-500 to-blue-700',
        hostelWing: prof?.hostelWing,
        role: p.role,
        currentValue: score,
        percentage: pct,
        completed: score >= challenge.targetValue,
        isCurrentUser: p.accountId === accountId
      });
    }

    participantsList.sort((a, b) => b.currentValue - a.currentValue);
    return { challenge, participants: participantsList, isOwner };
  }

  async getUserSharedChallenges(accountId: string) {
    const res = await this.pool.query(
      `SELECT challenge_id as "challengeId", role
       FROM shared_challenge_participants
       WHERE account_id = $1 AND status = 'active'`,
      [accountId]
    );

    const out: any[] = [];
    for (const row of res.rows) {
      const chal = await this.getSharedChallengeById(row.challengeId);
      if (chal && chal.status === 'active') {
        const score = await this.calculateParticipantScore(chal, accountId);
        out.push({
          challenge: chal,
          participantRole: row.role,
          userProgress: score
        });
      }
    }
    return out;
  }

  async leaveSharedChallenge(accountId: string, challengeId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE shared_challenge_participants SET status = 'left' 
       WHERE challenge_id = $1 AND account_id = $2`,
      [challengeId, accountId]
    );
    return (res.rowCount || 0) > 0;
  }

  async cancelSharedChallenge(ownerAccountId: string, challengeId: string): Promise<boolean> {
    const chal = await this.getSharedChallengeById(challengeId);
    if (!chal) return false;
    if (chal.ownerAccountId !== ownerAccountId) {
      throw new Error('Only the challenge creator can cancel this challenge.');
    }
    await this.pool.query(
      `UPDATE shared_challenges SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [challengeId]
    );
    return true;
  }
}
