/**
 * FitMitra Backend API Routes & Request Handlers
 * 
 * Implements strict authentication, owner isolation, input validation,
 * payload size limits, rate limiting, and sanitized operational logging.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import crypto from 'node:crypto';
import { hashPassword, issueToken, verifyPassword, verifyToken, type TokenPayload } from './crypto.ts';
import { db, type Database, type IDatabase } from './db.ts';
import { logger } from './logger.ts';
import { migrations, MIN_SUPPORTED_CLIENT_SCHEMA_VERSION, MAX_SUPPORTED_CLIENT_SCHEMA_VERSION } from './migrations.ts';

const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB limit

// Rate limiting: tracks failed attempts per key within window
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = failedAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    return true; // Not rate limited
  }
  return entry.count < MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    failedAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearRateLimit(key: string): void {
  failedAttempts.delete(key);
}

export function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'X-XSS-Protection': '1; mode=block'
  });
  res.end(json);
}

export function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_PAYLOAD_BYTES) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (e) {
        reject(new Error('INVALID_JSON'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

export function extractBearerToken(req: IncomingMessage): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function authenticateRequest(req: IncomingMessage): TokenPayload | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Main request router handling all API endpoints.
 */
export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  database: IDatabase = db
): Promise<void> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  const host = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url || '/', `http://${host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method?.toUpperCase();

  try {
    // ----------------------------------------------------
    // 0. HEALTH, LIVENESS & READINESS CHECKS
    // ----------------------------------------------------
    if (pathname === '/api/v1/health/liveness' && method === 'GET') {
      sendJson(res, 200, {
        status: 'alive',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (pathname === '/api/v1/health/readiness' && method === 'GET') {
      const isDbReady = await database.ping();
      const statusCode = isDbReady ? 200 : 503;
      sendJson(res, statusCode, {
        status: isDbReady ? 'ready' : 'not_ready',
        databaseConnected: isDbReady,
        storage: database.isPersistent() ? 'postgresql' : 'in-memory',
        persistent: database.isPersistent(),
        schemaVersion: migrations.getCurrentVersion(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (pathname === '/api/v1/health' && method === 'GET') {
      const isDbReady = await database.ping();
      sendJson(res, 200, {
        status: 'ok',
        version: '1.0.0',
        ready: isDbReady,
        schemaVersion: migrations.getCurrentVersion(),
        storage: database.isPersistent() ? 'postgresql' : 'in-memory',
        persistent: database.isPersistent(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    // ----------------------------------------------------
    // 1. AUTH: REGISTER
    // ----------------------------------------------------
    if (pathname === '/api/v1/auth/register' && method === 'POST') {
      const body = await parseBody(req);
      const { email, password, displayName, username, fitnessGoal } = body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        sendJson(res, 400, { error: 'A valid email address is required.' });
        return;
      }
      if (!password || typeof password !== 'string' || password.length < 4) {
        sendJson(res, 400, { error: 'Password must be at least 4 characters.' });
        return;
      }

      const emailNorm = email.trim().toLowerCase();
      if (await database.getAccountByEmail(emailNorm)) {
        sendJson(res, 409, { error: 'An account with this email already exists.' });
        return;
      }

      const accountId = crypto.randomUUID();
      const cleanUsername = username
        ? String(username).trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
        : emailNorm.split('@')[0].replace(/[^a-z0-9_]/g, '');
      const cleanName = displayName ? String(displayName).trim() : cleanUsername;

      const { hash, salt } = hashPassword(password);
      const now = new Date().toISOString();

      await database.createAccount(
        {
          id: accountId,
          email: emailNorm,
          passwordHash: hash,
          salt,
          authType: 'authenticated',
          provider: 'email',
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
          lastSeenAt: now
        },
        {
          accountId,
          displayName: cleanName,
          username: cleanUsername,
          avatarColor: 'from-cyan-500 to-blue-700',
          hostelWing: 'Campus Hostel',
          fitnessGoal: fitnessGoal || 'strength',
          preferencesJson: {},
          biometricsJson: {},
          createdAt: now,
          updatedAt: now
        }
      );

      const token = issueToken({
        id: accountId,
        email: emailNorm,
        username: cleanUsername,
        displayName: cleanName
      });

      logger.log({
        eventType: 'AUTH_REGISTER',
        accountId,
        statusCode: 201,
        message: 'Account registered successfully.'
      });

      sendJson(res, 201, {
        success: true,
        token,
        account: {
          id: accountId,
          email: emailNorm,
          authType: 'authenticated',
          createdAt: now
        },
        profile: await database.getProfile(accountId)
      });
      return;
    }

    // ----------------------------------------------------
    // 2. AUTH: LOGIN
    // ----------------------------------------------------
    if (pathname === '/api/v1/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;

      if (!email || !password) {
        sendJson(res, 400, { error: 'Email and password are required.' });
        return;
      }

      const emailNorm = String(email).trim().toLowerCase();
      if (!checkRateLimit(emailNorm)) {
        logger.log({
          eventType: 'RATE_LIMITED',
          statusCode: 429,
          errorCategory: 'RateLimitExceeded',
          message: 'Too many failed login attempts.'
        });
        sendJson(res, 429, { error: 'Too many failed login attempts. Please wait 60 seconds.' });
        return;
      }

      const account = await database.getAccountByEmail(emailNorm);
      if (!account || !verifyPassword(password, account.passwordHash, account.salt)) {
        recordFailedAttempt(emailNorm);
        logger.log({
          eventType: 'AUTH_LOGIN',
          statusCode: 401,
          errorCategory: 'InvalidCredentials',
          message: 'Login failed due to invalid credentials.'
        });
        sendJson(res, 401, { error: 'Invalid email or password.' });
        return;
      }

      clearRateLimit(emailNorm);
      const profile = await database.getProfile(account.id);
      const token = issueToken({
        id: account.id,
        email: account.email,
        username: profile?.username || account.email.split('@')[0],
        displayName: profile?.displayName || 'Student'
      });

      logger.log({
        eventType: 'AUTH_LOGIN',
        accountId: account.id,
        statusCode: 200,
        message: 'Login successful.'
      });

      sendJson(res, 200, {
        success: true,
        token,
        account: {
          id: account.id,
          email: account.email,
          authType: account.authType,
          createdAt: account.createdAt
        },
        profile
      });
      return;
    }

    // ----------------------------------------------------
    // 3. AUTH: GET SESSION
    // ----------------------------------------------------
    if (pathname === '/api/v1/auth/session' && method === 'GET') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required or session expired.' });
        return;
      }

      const account = await database.getAccountById(session.accountId);
      if (!account) {
        sendJson(res, 404, { error: 'Account not found.' });
        return;
      }

      const profile = await database.getProfile(session.accountId);
      sendJson(res, 200, {
        success: true,
        account: {
          id: account.id,
          email: account.email,
          authType: account.authType,
          createdAt: account.createdAt
        },
        profile
      });
      return;
    }

    // ----------------------------------------------------
    // 4. AUTH: LOGOUT
    // ----------------------------------------------------
    if (pathname === '/api/v1/auth/logout' && method === 'POST') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      logger.log({
        eventType: 'AUTH_LOGOUT',
        accountId: session.accountId,
        statusCode: 200,
        message: 'Logged out successfully.'
      });

      sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
      return;
    }

    // ----------------------------------------------------
    // 5. AUTH: DELETE ACCOUNT (CASCADING PURGE)
    // ----------------------------------------------------
    if (pathname === '/api/v1/auth/delete' && method === 'DELETE') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      const body = await parseBody(req);
      const { password } = body;
      const account = await database.getAccountById(session.accountId);

      if (!account) {
        sendJson(res, 404, { error: 'Account not found.' });
        return;
      }

      if (password && !verifyPassword(password, account.passwordHash, account.salt)) {
        sendJson(res, 403, { error: 'Password verification failed. Account deletion aborted.' });
        return;
      }

      // Cascade delete account and all user-owned records
      await database.deleteAccountCascade(session.accountId);

      logger.log({
        eventType: 'AUTH_DELETE',
        accountId: session.accountId,
        statusCode: 200,
        message: 'Account and all associated records permanently purged.'
      });

      sendJson(res, 200, {
        success: true,
        deletedAccountId: session.accountId,
        remoteDataDeleted: true
      });
      return;
    }

    // ----------------------------------------------------
    // 6. SYNC: PUSH (IDEMPOTENT, ZERO-EGRESS ENFORCED, LWW)
    // ----------------------------------------------------
    if (pathname === '/api/v1/sync/push' && method === 'POST') {
      const startTime = Date.now();
      const session = authenticateRequest(req);
      if (!session) {
        logger.log({ eventType: 'UNAUTHORIZED', statusCode: 401, message: 'Unauthenticated push attempt.' });
        sendJson(res, 401, { error: 'Authentication required to synchronize data.' });
        return;
      }

      const body = await parseBody(req);
      const {
        workouts = [],
        challenges = [],
        tombstones = [],
        preferences,
        preferencesUpdatedAt,
        schemaVersion
      } = body;

      // 1. Schema Version Compatibility Validation
      if (schemaVersion !== undefined && !migrations.isClientCompatible(Number(schemaVersion))) {
        sendJson(res, 400, {
          error: `Incompatible client schema version ${schemaVersion}. Server supports versions ${MIN_SUPPORTED_CLIENT_SCHEMA_VERSION} to ${MAX_SUPPORTED_CLIENT_SCHEMA_VERSION}.`
        });
        return;
      }

      // 2. Strict Zero-Egress Privacy Invariant
      for (const w of workouts) {
        if (w.landmarks || w.frames || w.coordinates || w.rawVideo || w.keypoints) {
          logger.log({
            eventType: 'PRIVACY_VIOLATION',
            accountId: session.accountId,
            statusCode: 422,
            message: 'Rejected payload containing prohibited pose landmarks or camera frames.'
          });
          sendJson(res, 422, {
            error: 'Privacy Violation: Raw skeletal landmarks or video frames cannot be uploaded.'
          });
          return;
        }
      }

      let syncedWorkouts = 0;
      let ignoredWorkouts = 0;
      let syncedChallenges = 0;
      let processedTombstones = 0;

      // 3. Upsert Workouts (Owner Enforced & Tombstone Checked)
      for (const w of workouts) {
        if (!w.id || !w.exerciseKey || !w.timestamp) continue;
        const result = await database.upsertWorkout(session.accountId, {
          id: w.id,
          exerciseKey: w.exerciseKey,
          exerciseName: w.exerciseName || w.exerciseKey,
          reps: Number(w.reps) || 0,
          durationSeconds: Number(w.durationSeconds) || 0,
          postureScore: w.postureScore !== undefined ? Number(w.postureScore) : undefined,
          timestamp: w.timestamp,
          isHostelFriendly: Boolean(w.isHostelFriendly ?? true),
          completedFully: Boolean(w.completedFully ?? true),
          source: w.source || 'pose_coach',
          schemaVersion: Number(w.schemaVersion) || 1,
          updatedAt: w.updatedAt
        });

        if (result.status === 'created' || result.status === 'updated') {
          syncedWorkouts++;
        } else {
          ignoredWorkouts++;
        }
      }

      // 4. Upsert Challenges (Owner Enforced & Activity Deduplicated)
      for (const c of challenges) {
        if (!c.id || !c.challengeId) continue;
        await database.upsertChallenge(session.accountId, {
          id: c.id,
          challengeId: c.challengeId,
          currentValue: Number(c.currentValue) || 0,
          targetValue: Number(c.targetValue) || 100,
          completedDays: Array.isArray(c.completedDays) ? c.completedDays : [],
          completedSessions: Number(c.completedSessions) || 0,
          processedActivityIds: Array.isArray(c.processedActivityIds) ? c.processedActivityIds : [],
          completed: Boolean(c.completed),
          completedAt: c.completedAt,
          schemaVersion: Number(c.schemaVersion) || 1
        });
        syncedChallenges++;
      }

      // 5. Process Tombstones
      for (const t of tombstones) {
        if (!t.entityId || !t.entityType) continue;
        await database.addTombstone(session.accountId, t.entityType, t.entityId);
        processedTombstones++;
      }

      // 6. User Preferences Synchronization (LWW Conflict Resolution)
      let preferencesUpdated = false;
      if (preferences && typeof preferences === 'object') {
        const prefResult = await database.updatePreferences(
          session.accountId,
          preferences,
          preferencesUpdatedAt
        );
        preferencesUpdated = prefResult.updated;
      }

      logger.log({
        eventType: 'SYNC_PUSH',
        accountId: session.accountId,
        statusCode: 200,
        itemCount: syncedWorkouts + syncedChallenges,
        durationMs: Date.now() - startTime,
        message: `Pushed ${syncedWorkouts} workouts, ${syncedChallenges} challenges, ${processedTombstones} tombstones.`
      });

      sendJson(res, 200, {
        success: true,
        syncedWorkouts,
        ignoredWorkouts,
        syncedChallenges,
        processedTombstones,
        preferencesUpdated,
        serverTimestamp: new Date().toISOString()
      });
      return;
    }

    // ----------------------------------------------------
    // 7. SYNC: PULL (PAGINATED, INCREMENTAL, PROFILE SYNC)
    // ----------------------------------------------------
    if (pathname === '/api/v1/sync/pull' && method === 'GET') {
      const startTime = Date.now();
      const session = authenticateRequest(req);
      if (!session) {
        logger.log({ eventType: 'UNAUTHORIZED', statusCode: 401, message: 'Unauthenticated pull attempt.' });
        sendJson(res, 401, { error: 'Authentication required to pull synchronized data.' });
        return;
      }

      const since = parsedUrl.searchParams.get('since') || undefined;
      const limit = Math.min(Number(parsedUrl.searchParams.get('limit')) || 50, 200);
      const offset = Number(parsedUrl.searchParams.get('offset')) || 0;

      const totalWorkouts = await database.countWorkouts(session.accountId, since);
      const workouts = await database.getWorkouts(session.accountId, since, limit, offset);
      const challenges = await database.getChallenges(session.accountId, since);
      const tombstones = await database.getTombstones(session.accountId, since);
      const profile = await database.getProfile(session.accountId);

      logger.log({
        eventType: 'SYNC_PULL',
        accountId: session.accountId,
        statusCode: 200,
        itemCount: workouts.length,
        durationMs: Date.now() - startTime
      });

      sendJson(res, 200, {
        success: true,
        serverTimestamp: new Date().toISOString(),
        totalWorkouts,
        hasMore: offset + workouts.length < totalWorkouts,
        limit,
        offset,
        workouts,
        challenges,
        tombstones,
        profile
      });
      return;
    }

    // ========================================================
    // 8. CAMPUS SOCIAL: FRIEND INVITATIONS & RELATIONSHIPS
    // ========================================================

    // POST /api/v1/friends/invite - Generate shareable invite code
    if (pathname === '/api/v1/friends/invite' && method === 'POST') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required to create friend invitations.' });
        return;
      }

      const body = await parseBody(req);
      try {
        const invitation = await database.createFriendInvitation(session.accountId, body);
        logger.log({
          eventType: 'FRIEND_INVITE',
          accountId: session.accountId,
          statusCode: 201,
          message: 'Created friend invitation code.'
        });
        sendJson(res, 201, { success: true, invitation });
      } catch (err: any) {
        sendJson(res, 400, { error: err.message || 'Failed to create friend invitation.' });
      }
      return;
    }

    // POST /api/v1/friends/request - Redeem invite code / Send request
    if (pathname === '/api/v1/friends/request' && method === 'POST') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required to send friend request.' });
        return;
      }

      const body = await parseBody(req);
      const inviteCode = body.inviteCode || body.code;
      if (!inviteCode || typeof inviteCode !== 'string') {
        sendJson(res, 400, { error: 'Invite code is required.' });
        return;
      }

      try {
        const result = await database.requestFriendship(session.accountId, inviteCode);
        logger.log({
          eventType: 'FRIEND_REQUEST',
          accountId: session.accountId,
          statusCode: 201,
          message: 'Friend request submitted via invite code.'
        });
        sendJson(res, 201, {
          success: true,
          friendship: result.friendship,
          invitationCreator: result.invitationCreator
        });
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('Invalid or expired')) {
          sendJson(res, 404, { error: msg });
        } else if (msg.includes('already')) {
          sendJson(res, 409, { error: msg });
        } else {
          sendJson(res, 400, { error: msg });
        }
      }
      return;
    }

    // GET /api/v1/friends - List friends and requests
    if (pathname === '/api/v1/friends' && method === 'GET') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required to view friends.' });
        return;
      }

      const friendships = await database.getFriendships(session.accountId);
      sendJson(res, 200, {
        success: true,
        ...friendships
      });
      return;
    }

    // POST /api/v1/friends/:id/respond - Accept or Decline request
    const friendRespondMatch = pathname.match(/^\/api\/v1\/friends\/([^/]+)\/respond$/);
    if (friendRespondMatch && method === 'POST') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      const friendshipId = friendRespondMatch[1];
      const body = await parseBody(req);
      const { action } = body;

      if (action !== 'accept' && action !== 'decline') {
        sendJson(res, 400, { error: "Action must be 'accept' or 'decline'." });
        return;
      }

      try {
        const updated = await database.respondToFriendRequest(session.accountId, friendshipId, action);
        logger.log({
          eventType: 'FRIEND_RESPOND',
          accountId: session.accountId,
          statusCode: 200,
          message: `Responded to friend request: ${action}`
        });
        sendJson(res, 200, { success: true, friendship: updated });
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('Unauthorized')) {
          sendJson(res, 403, { error: msg });
        } else if (msg.includes('not found')) {
          sendJson(res, 404, { error: msg });
        } else {
          sendJson(res, 400, { error: msg });
        }
      }
      return;
    }

    // DELETE /api/v1/friends/invite/:code - Revoke invitation
    const inviteRevokeMatch = pathname.match(/^\/api\/v1\/friends\/invite\/([^/]+)$/);
    if (inviteRevokeMatch && method === 'DELETE') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      const code = inviteRevokeMatch[1];
      try {
        const revoked = await database.revokeFriendInvitation(session.accountId, code);
        sendJson(res, 200, { success: true, revoked });
      } catch (err: any) {
        sendJson(res, 403, { error: err.message || 'Cannot revoke invitation.' });
      }
      return;
    }

    // DELETE /api/v1/friends/:id - Remove friend connection
    const friendDeleteMatch = pathname.match(/^\/api\/v1\/friends\/([^/]+)$/);
    if (friendDeleteMatch && method === 'DELETE') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      const friendshipId = friendDeleteMatch[1];
      try {
        const removed = await database.removeFriendship(session.accountId, friendshipId);
        logger.log({
          eventType: 'FRIEND_REMOVE',
          accountId: session.accountId,
          statusCode: 200,
          message: 'Removed friend connection.'
        });
        sendJson(res, 200, { success: true, removed });
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('Unauthorized')) {
          sendJson(res, 403, { error: msg });
        } else {
          sendJson(res, 404, { error: msg });
        }
      }
      return;
    }

    // ========================================================
    // 9. PRIVATE SHARED CHALLENGES & CAMPUS SPRINTS
    // ========================================================

    // POST /api/v1/challenges - Create private shared challenge
    if (pathname === '/api/v1/challenges' && method === 'POST') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required to create shared challenges.' });
        return;
      }

      const body = await parseBody(req);
      try {
        const challenge = await database.createSharedChallenge(session.accountId, body);
        logger.log({
          eventType: 'CHALLENGE_CREATE',
          accountId: session.accountId,
          statusCode: 201,
          message: `Created shared challenge: ${challenge.title}`
        });
        sendJson(res, 201, { success: true, challenge });
      } catch (err: any) {
        sendJson(res, 400, { error: err.message || 'Failed to create challenge.' });
      }
      return;
    }

    // GET /api/v1/challenges - List challenges for authenticated user
    if (pathname === '/api/v1/challenges' && method === 'GET') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      const challenges = await database.getUserSharedChallenges(session.accountId);
      sendJson(res, 200, { success: true, challenges });
      return;
    }

    // POST /api/v1/challenges/join - Join challenge via invite code
    if (pathname === '/api/v1/challenges/join' && method === 'POST') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required to join challenge.' });
        return;
      }

      const body = await parseBody(req);
      const { inviteCode } = body;
      if (!inviteCode || typeof inviteCode !== 'string') {
        sendJson(res, 400, { error: 'Challenge invite code is required.' });
        return;
      }

      try {
        const result = await database.joinSharedChallenge(session.accountId, inviteCode);
        logger.log({
          eventType: 'CHALLENGE_JOIN',
          accountId: session.accountId,
          statusCode: 200,
          message: `Joined shared challenge: ${result.challenge.title}`
        });
        sendJson(res, 200, {
          success: true,
          challenge: result.challenge,
          participant: result.participant
        });
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('already participating')) {
          sendJson(res, 409, { error: msg });
        } else if (msg.includes('Invalid or inactive')) {
          sendJson(res, 404, { error: msg });
        } else {
          sendJson(res, 400, { error: msg });
        }
      }
      return;
    }

    // POST /api/v1/challenges/:id/contribute - Record verified workout contribution
    const challengeContribMatch = pathname.match(/^\/api\/v1\/challenges\/([^/]+)\/contribute$/);
    if (challengeContribMatch && method === 'POST') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      const challengeId = challengeContribMatch[1];
      const body = await parseBody(req);
      const { activity } = body;

      if (!activity || !activity.id) {
        sendJson(res, 400, { error: 'Valid activity object with id is required.' });
        return;
      }

      // Zero-Egress biometric guard
      if (activity.landmarks || activity.frames || activity.coordinates || activity.keypoints || activity.rawVideo) {
        logger.log({
          eventType: 'PRIVACY_VIOLATION',
          accountId: session.accountId,
          statusCode: 422,
          message: 'Rejected challenge contribution containing prohibited pose telemetry.'
        });
        sendJson(res, 422, {
          error: 'Privacy Violation: Raw pose landmarks and video frames cannot be submitted.'
        });
        return;
      }

      try {
        const result = await database.recordChallengeContribution(session.accountId, challengeId, activity);
        logger.log({
          eventType: 'CHALLENGE_CONTRIBUTE',
          accountId: session.accountId,
          statusCode: 200,
          itemCount: 1,
          message: `Contributed to challenge ${challengeId}`
        });
        sendJson(res, 200, {
          success: true,
          contribution: result.contribution,
          updatedParticipantScore: result.updatedParticipantScore,
          challengeCompleted: result.challengeCompleted
        });
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('not an active participant')) {
          sendJson(res, 403, { error: msg });
        } else if (msg.includes('not found')) {
          sendJson(res, 404, { error: msg });
        } else {
          sendJson(res, 400, { error: msg });
        }
      }
      return;
    }

    // POST /api/v1/challenges/:id/leave - Leave challenge
    const challengeLeaveMatch = pathname.match(/^\/api\/v1\/challenges\/([^/]+)\/leave$/);
    if (challengeLeaveMatch && method === 'POST') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      const challengeId = challengeLeaveMatch[1];
      const left = await database.leaveSharedChallenge(session.accountId, challengeId);
      logger.log({
        eventType: 'CHALLENGE_LEAVE',
        accountId: session.accountId,
        statusCode: 200,
        message: `Left challenge ${challengeId}`
      });
      sendJson(res, 200, { success: true, left });
      return;
    }

    // POST /api/v1/challenges/:id/cancel - Owner cancels challenge
    const challengeCancelMatch = pathname.match(/^\/api\/v1\/challenges\/([^/]+)\/cancel$/);
    if (challengeCancelMatch && method === 'POST') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      const challengeId = challengeCancelMatch[1];
      try {
        const cancelled = await database.cancelSharedChallenge(session.accountId, challengeId);
        logger.log({
          eventType: 'CHALLENGE_CANCEL',
          accountId: session.accountId,
          statusCode: 200,
          message: `Cancelled challenge ${challengeId}`
        });
        sendJson(res, 200, { success: true, cancelled });
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('creator')) {
          sendJson(res, 403, { error: msg });
        } else {
          sendJson(res, 404, { error: msg });
        }
      }
      return;
    }

    // GET /api/v1/challenges/:id - Get challenge details & standings
    const challengeGetMatch = pathname.match(/^\/api\/v1\/challenges\/([^/]+)$/);
    if (challengeGetMatch && method === 'GET' && challengeGetMatch[1] !== 'join') {
      const session = authenticateRequest(req);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return;
      }

      const challengeId = challengeGetMatch[1];
      const details = await database.getSharedChallengeDetails(session.accountId, challengeId);
      if (!details) {
        const chal = await database.getSharedChallengeById(challengeId);
        if (chal) {
          sendJson(res, 403, { error: 'You are not a participant in this private challenge.' });
        } else {
          sendJson(res, 404, { error: 'Challenge not found.' });
        }
        return;
      }

      sendJson(res, 200, { success: true, ...details });
      return;
    }

    // 404 Route Not Found
    sendJson(res, 404, { error: `Endpoint ${method} ${pathname} not found.` });
  } catch (err: any) {
    if (err.message === 'PAYLOAD_TOO_LARGE') {
      sendJson(res, 413, { error: 'Payload exceeds 1 MB limit.' });
      return;
    }
    if (err.message === 'INVALID_JSON') {
      sendJson(res, 400, { error: 'Invalid JSON payload.' });
      return;
    }
    if (err.message?.startsWith('PermissionDenied')) {
      sendJson(res, 403, { error: err.message });
      return;
    }

    sendJson(res, 500, { error: 'Internal server error.' });
  }
}
