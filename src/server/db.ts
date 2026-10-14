/**
 * FitMitra Relational Database Engine
 * 
 * Provides an isolated, relational data store enforcing the exact constraints,
 * indexes, and owner-isolation policies defined in schema.sql.
 */

import crypto from 'crypto';
import type {
  Account,
  ChallengeParticipation,
  DomainUserProfile,
  WorkoutSessionRecord
} from '../domain/models/account.ts';
import type { TombstoneRecord } from '../domain/models/sync.ts';

export interface DbAccount {
  id: string; // UUIDv4 format
  email: string;
  passwordHash: string;
  salt: string;
  authType: 'authenticated';
  provider: 'email';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export interface DbProfile {
  accountId: string;
  displayName: string;
  username: string;
  avatarColor: string;
  hostelWing?: string;
  fitnessGoal: string;
  preferencesJson: Record<string, unknown>;
  preferencesUpdatedAt?: string;
  biometricsJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DbWorkout {
  id: string;
  accountId: string;
  exerciseKey: string;
  exerciseName: string;
  reps: number;
  durationSeconds: number;
  postureScore?: number;
  timestamp: string;
  isHostelFriendly: boolean;
  completedFully: boolean;
  source: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbChallenge {
  id: string;
  accountId: string;
  challengeId: string;
  joinedAt?: string;
  currentValue: number;
  targetValue: number;
  completedDays: string[];
  completedSessions: number;
  processedActivityIds: string[];
  completed: boolean;
  completedAt?: string;
  schemaVersion: number;
  updatedAt?: string;
}

export interface DbTombstone {
  id: string;
  accountId: string;
  entityType: 'workout' | 'challenge';
  entityId: string;
  deletedAt: string;
}

export interface DbFriendInvitation {
  id: string;
  creatorAccountId: string;
  inviteCode: string;
  expiresAt: string;
  maxUses: number;
  usesCount: number;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
}

export interface DbFriendship {
  id: string;
  accountId: string;
  friendAccountId: string;
  status: 'pending' | 'accepted' | 'declined';
  initiatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbSharedChallenge {
  id: string;
  ownerAccountId: string;
  title: string;
  description: string;
  category: 'strength' | 'consistency' | 'cardio' | 'posture' | 'exam';
  type: 'rep_target' | 'duration_target' | 'session_count' | 'streak';
  targetValue: number;
  unit: string;
  exerciseKeys?: string[];
  startDate: string;
  endDate: string;
  maxParticipants: number;
  inviteCode: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface DbChallengeParticipant {
  id: string;
  challengeId: string;
  accountId: string;
  role: 'owner' | 'participant';
  joinedAt: string;
  status: 'active' | 'left';
}

export interface DbChallengeContribution {
  id: string;
  challengeId: string;
  accountId: string;
  activityId: string;
  activityType: string;
  exerciseKey?: string;
  metricValue: number;
  activityTimestamp: string;
  createdAt: string;
}

export function generateRandomCode(prefix: string, length = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${prefix}-${code}`;
}

export interface IDatabase {
  isPersistent(): boolean;
  ping(): Promise<boolean>;
  reset(): Promise<void> | void;
  close(): Promise<void> | void;

  // ACCOUNTS & PROFILES
  createAccount(account: DbAccount, profile: DbProfile): Promise<void> | void;
  getAccountById(id: string): Promise<DbAccount | null> | DbAccount | null;
  getAccountByEmail(email: string): Promise<DbAccount | null> | DbAccount | null;
  updatePassword(accountId: string, passwordHash: string, salt: string): Promise<boolean> | boolean;
  getProfile(accountId: string): Promise<DbProfile | null> | DbProfile | null;
  updatePreferences(
    accountId: string,
    preferences: Record<string, unknown>,
    updatedAt?: string
  ): Promise<{ updated: boolean }> | { updated: boolean };
  deleteAccountCascade(accountId: string): Promise<boolean | void> | boolean | void;

  // WORKOUTS
  upsertWorkout(
    accountId: string,
    workout: Partial<DbWorkout> & { id: string }
  ):
    | Promise<{ status: string; workout?: DbWorkout }>
    | { status: string; workout?: DbWorkout };
  getWorkouts(
    accountId: string,
    since?: string,
    limit?: number,
    offset?: number
  ): Promise<DbWorkout[]> | DbWorkout[];
  countWorkouts(accountId: string, since?: string): Promise<number> | number;

  // TOMBSTONES
  addTombstone(
    accountId: string,
    entityType: 'workout' | 'challenge',
    entityId: string
  ): Promise<void> | void;
  getTombstones(accountId: string, since?: string): Promise<DbTombstone[]> | DbTombstone[];

  // CHALLENGE PROGRESS
  upsertChallenge(
    accountId: string,
    challenge: Omit<DbChallenge, 'accountId'>
  ): Promise<{ status: 'created' | 'updated'; challenge?: DbChallenge }> | { status: 'created' | 'updated'; challenge?: DbChallenge };
  getChallenges(accountId: string, since?: string): Promise<DbChallenge[]> | DbChallenge[];

  // SOCIAL & FRIEND INVITATIONS
  createFriendInvitation(
    creatorAccountId: string,
    options?: { maxUses?: number; expiryDays?: number }
  ): Promise<DbFriendInvitation> | DbFriendInvitation;
  getFriendInvitationByCode(code: string): Promise<DbFriendInvitation | null> | DbFriendInvitation | null;
  revokeFriendInvitation(creatorAccountId: string, code: string): Promise<boolean> | boolean;
  requestFriendship(
    requesterAccountId: string,
    inviteCode: string
  ):
    | Promise<{
        friendship: DbFriendship;
        invitationCreator: { displayName: string; avatarColor: string; hostelWing?: string };
      }>
    | {
        friendship: DbFriendship;
        invitationCreator: { displayName: string; avatarColor: string; hostelWing?: string };
      };
  getFriendships(accountId: string): Promise<any> | any;
  respondToFriendRequest(
    accountId: string,
    friendshipId: string,
    action: 'accept' | 'decline'
  ): Promise<DbFriendship> | DbFriendship;
  removeFriendship(accountId: string, friendshipId: string): Promise<boolean> | boolean;

  // SHARED CHALLENGES
  createSharedChallenge(
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
  ): Promise<DbSharedChallenge> | DbSharedChallenge;
  getSharedChallengeById(id: string): Promise<DbSharedChallenge | null> | DbSharedChallenge | null;
  getSharedChallengeByCode(code: string): Promise<DbSharedChallenge | null> | DbSharedChallenge | null;
  joinSharedChallenge(
    accountId: string,
    inviteCode: string
  ):
    | Promise<{ challenge: DbSharedChallenge; participant: DbChallengeParticipant }>
    | { challenge: DbSharedChallenge; participant: DbChallengeParticipant };
  recordChallengeContribution(
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
  ):
    | Promise<{
        contribution: DbChallengeContribution;
        updatedParticipantScore: number;
        challengeCompleted: boolean;
      }>
    | {
        contribution: DbChallengeContribution;
        updatedParticipantScore: number;
        challengeCompleted: boolean;
      };
  getSharedChallengeDetails(
    accountId: string,
    challengeId: string
  ):
    | Promise<{
        challenge: DbSharedChallenge;
        participants: Array<{
          participantId: string;
          displayName: string;
          avatarColor: string;
          hostelWing?: string;
          role: string;
          currentValue: number;
          percentage: number;
          completed: boolean;
          isCurrentUser: boolean;
        }>;
        isOwner: boolean;
      } | null>
    | {
        challenge: DbSharedChallenge;
        participants: Array<{
          participantId: string;
          displayName: string;
          avatarColor: string;
          hostelWing?: string;
          role: string;
          currentValue: number;
          percentage: number;
          completed: boolean;
          isCurrentUser: boolean;
        }>;
        isOwner: boolean;
      }
    | null;
  getUserSharedChallenges(
    accountId: string
  ): Promise<any[]> | any[];
  leaveSharedChallenge(accountId: string, challengeId: string): Promise<boolean> | boolean;
  cancelSharedChallenge(ownerAccountId: string, challengeId: string): Promise<boolean> | boolean;
}

export class Database implements IDatabase {
  private accounts = new Map<string, DbAccount>();
  private emailToAccountId = new Map<string, string>();
  private profiles = new Map<string, DbProfile>();
  private workouts = new Map<string, DbWorkout>();
  private challenges = new Map<string, DbChallenge>();
  private tombstones = new Map<string, DbTombstone>();

  // Social & Shared Challenges
  private friendInvitations = new Map<string, DbFriendInvitation>();
  private friendships = new Map<string, DbFriendship>();
  private sharedChallenges = new Map<string, DbSharedChallenge>();
  private challengeParticipants = new Map<string, DbChallengeParticipant>();
  private challengeContributions = new Map<string, DbChallengeContribution>();

  isPersistent(): boolean {
    return false;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.reset();
  }

  /**
   * Resets all tables in memory (for test isolation).
   */
  reset(): void {
    this.accounts.clear();
    this.emailToAccountId.clear();
    this.profiles.clear();
    this.workouts.clear();
    this.challenges.clear();
    this.tombstones.clear();

    this.friendInvitations.clear();
    this.friendships.clear();
    this.sharedChallenges.clear();
    this.challengeParticipants.clear();
    this.challengeContributions.clear();
  }

  // ========================================================
  // ACCOUNTS & PROFILES
  // ========================================================

  createAccount(account: DbAccount, profile: DbProfile): void {
    const emailNorm = account.email.trim().toLowerCase();
    if (this.emailToAccountId.has(emailNorm)) {
      throw new Error(`Account with email ${emailNorm} already exists.`);
    }

    this.accounts.set(account.id, { ...account, email: emailNorm });
    this.emailToAccountId.set(emailNorm, account.id);
    this.profiles.set(account.id, { ...profile, accountId: account.id });
  }

  getAccountById(id: string): DbAccount | null {
    const acc = this.accounts.get(id);
    return acc ? { ...acc } : null;
  }

  getAccountByEmail(email: string): DbAccount | null {
    const emailNorm = email.trim().toLowerCase();
    const id = this.emailToAccountId.get(emailNorm);
    if (!id) return null;
    return this.getAccountById(id);
  }

  updatePassword(accountId: string, passwordHash: string, salt: string): boolean {
    const acc = this.accounts.get(accountId);
    if (!acc) return false;
    acc.passwordHash = passwordHash;
    acc.salt = salt;
    acc.updatedAt = new Date().toISOString();
    return true;
  }

  getProfile(accountId: string): DbProfile | null {
    const prof = this.profiles.get(accountId);
    return prof ? { ...prof } : null;
  }

  updateProfile(accountId: string, updates: Partial<DbProfile>): DbProfile {
    const existing = this.profiles.get(accountId);
    if (!existing) {
      throw new Error(`Profile not found for account ${accountId}`);
    }
    const updated: DbProfile = {
      ...existing,
      ...updates,
      accountId,
      updatedAt: new Date().toISOString()
    };
    this.profiles.set(accountId, updated);
    return { ...updated };
  }

  /**
   * Updates user preferences with deterministic Last-Write-Wins (LWW) conflict handling.
   * If server profile has a strictly newer timestamp, the incoming stale update is rejected.
   */
  updatePreferences(
    accountId: string,
    preferences: Record<string, unknown>,
    updatedAt?: string
  ): { updated: boolean; profile: DbProfile } {
    const existing = this.profiles.get(accountId);
    if (!existing) {
      throw new Error(`Profile not found for account ${accountId}`);
    }

    const incomingTime = updatedAt ? new Date(updatedAt).getTime() : Date.now();
    const existingTime = existing.preferencesUpdatedAt
      ? new Date(existing.preferencesUpdatedAt).getTime()
      : 0;

    // Stale check: Server state is newer -> server wins, do not clobber
    if (existingTime && existingTime > incomingTime) {
      return { updated: false, profile: { ...existing } };
    }

    const updatedProfile: DbProfile = {
      ...existing,
      preferencesJson: { ...existing.preferencesJson, ...preferences },
      preferencesUpdatedAt: updatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.profiles.set(accountId, updatedProfile);
    return { updated: true, profile: { ...updatedProfile } };
  }

  /**
   * Deletes an account and cascades deletions across all user-owned data tables.
   */
  deleteAccountCascade(accountId: string): boolean {
    const acc = this.accounts.get(accountId);
    if (!acc) return false;

    // 1. Delete Account & Email index
    this.emailToAccountId.delete(acc.email);
    this.accounts.delete(accountId);

    // 2. Cascade Profile deletion
    this.profiles.delete(accountId);

    // 3. Cascade Workout deletion
    this.workouts.forEach((w, id) => {
      if (w.accountId === accountId) {
        this.workouts.delete(id);
      }
    });

    // 4. Cascade Challenge deletion
    this.challenges.forEach((c, id) => {
      if (c.accountId === accountId) {
        this.challenges.delete(id);
      }
    });

    // 5. Cascade Tombstone deletion
    this.tombstones.forEach((t, id) => {
      if (t.accountId === accountId) {
        this.tombstones.delete(id);
      }
    });

    // 6. Cascade Friend Invitations
    this.friendInvitations.forEach((inv, code) => {
      if (inv.creatorAccountId === accountId) {
        this.friendInvitations.delete(code);
      }
    });

    // 7. Cascade Friendships (both incoming and outgoing)
    this.friendships.forEach((f, id) => {
      if (f.accountId === accountId || f.friendAccountId === accountId) {
        this.friendships.delete(id);
      }
    });

    // 8. Cascade Challenge Participations & Contributions
    this.challengeContributions.forEach((contrib, id) => {
      if (contrib.accountId === accountId) {
        this.challengeContributions.delete(id);
      }
    });

    this.challengeParticipants.forEach((part, id) => {
      if (part.accountId === accountId) {
        this.challengeParticipants.delete(id);
      }
    });

    // 9. Cascade Shared Challenges owned by account
    this.sharedChallenges.forEach((chal) => {
      if (chal.ownerAccountId === accountId) {
        chal.status = 'cancelled';
        chal.updatedAt = new Date().toISOString();
      }
    });

    return true;
  }

  // ========================================================
  // WORKOUT RECORDS (OWNER-ISOLATED & TOMBSTONE-AWARE)
  // ========================================================

  /**
   * Idempotently saves or updates a workout record for the authenticated owner.
   * Protects against resurrection of deleted records via tombstones,
   * and prevents stale updates from clobbering newer server state.
   */
  upsertWorkout(
    accountId: string,
    workout: Partial<DbWorkout> & { id: string }
  ): { status: 'created' | 'updated' | 'ignored_tombstone' | 'ignored_stale' } {
    const now = new Date().toISOString();

    // 1. Tombstone check: Has this workout been explicitly deleted?
    let hasTombstone = false;
    this.tombstones.forEach((t) => {
      if (
        t.accountId === accountId &&
        t.entityType === 'workout' &&
        t.entityId === workout.id
      ) {
        hasTombstone = true;
      }
    });
    if (hasTombstone) {
      return { status: 'ignored_tombstone' };
    }

    const existing = this.workouts.get(workout.id);

    if (existing) {
      // Owner Verification Guard: Account A cannot overwrite Account B's workout!
      if (existing.accountId !== accountId) {
        throw new Error('PermissionDenied: Cross-account modification forbidden.');
      }

      // Stale update protection
      if (workout.updatedAt && existing.updatedAt) {
        const incomingTime = new Date(workout.updatedAt).getTime();
        const existingTime = new Date(existing.updatedAt).getTime();
        if (existingTime > incomingTime) {
          return { status: 'ignored_stale' };
        }
      }

      // If already exists for the owner, preserve canonical fields
      this.workouts.set(workout.id, {
        ...existing,
        ...workout,
        exerciseKey: existing.exerciseKey,
        reps: workout.reps !== undefined ? workout.reps : existing.reps,
        accountId,
        updatedAt: now
      });
      return { status: 'updated' };
    }

    // Insert new workout record
    this.workouts.set(workout.id, {
      id: workout.id,
      accountId,
      exerciseKey: workout.exerciseKey || 'squats',
      exerciseName: workout.exerciseName || 'Squats',
      reps: workout.reps ?? 0,
      durationSeconds: workout.durationSeconds ?? 0,
      postureScore: workout.postureScore,
      timestamp: workout.timestamp || now,
      isHostelFriendly: workout.isHostelFriendly ?? true,
      completedFully: workout.completedFully ?? true,
      source: workout.source || 'pose_coach',
      schemaVersion: workout.schemaVersion ?? 1,
      createdAt: workout.createdAt || now,
      updatedAt: workout.updatedAt || now
    });
    return { status: 'created' };
  }

  getWorkouts(accountId: string, since?: string, limit = 50, offset = 0): DbWorkout[] {
    const result: DbWorkout[] = [];
    const sinceTime = since ? new Date(since).getTime() : 0;

    this.workouts.forEach((w) => {
      if (w.accountId === accountId) {
        const itemTime = new Date(w.updatedAt || w.timestamp).getTime();
        if (itemTime >= sinceTime) {
          result.push({ ...w });
        }
      }
    });

    // Sort descending by timestamp
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result.slice(offset, offset + limit);
  }

  countWorkouts(accountId: string, since?: string): number {
    let count = 0;
    const sinceTime = since ? new Date(since).getTime() : 0;

    this.workouts.forEach((w) => {
      if (w.accountId === accountId) {
        const itemTime = new Date(w.updatedAt || w.timestamp).getTime();
        if (itemTime >= sinceTime) {
          count++;
        }
      }
    });

    return count;
  }

  deleteWorkout(accountId: string, workoutId: string): boolean {
    const existing = this.workouts.get(workoutId);
    if (!existing) return false;
    if (existing.accountId !== accountId) {
      throw new Error('PermissionDenied: Cannot delete another account record.');
    }
    this.workouts.delete(workoutId);
    return true;
  }

  // ========================================================
  // CHALLENGES (OWNER-ISOLATED & ACTIVITY DEDUPLICATION)
  // ========================================================

  upsertChallenge(
    accountId: string,
    challenge: Partial<DbChallenge> & { id: string }
  ): { status: 'created' | 'updated' } {
    const now = new Date().toISOString();
    const existing = this.challenges.get(challenge.id);

    if (existing) {
      if (existing.accountId !== accountId) {
        throw new Error('PermissionDenied: Cross-account modification forbidden.');
      }

      // Deduplicate processedActivityIds (Set union)
      const existingActivities = new Set(existing.processedActivityIds || []);
      const newActivities = (challenge.processedActivityIds || []).filter(
        (id) => !existingActivities.has(id)
      );
      const mergedActivities = [...(existing.processedActivityIds || []), ...newActivities];

      this.challenges.set(challenge.id, {
        ...existing,
        ...challenge,
        accountId,
        processedActivityIds: mergedActivities,
        updatedAt: now
      });
      return { status: 'updated' };
    }

    const uniqueActivities = Array.from(new Set(challenge.processedActivityIds || []));
    this.challenges.set(challenge.id, {
      id: challenge.id,
      accountId,
      challengeId: challenge.challengeId || 'unknown',
      joinedAt: challenge.joinedAt || now,
      currentValue: challenge.currentValue ?? 0,
      targetValue: challenge.targetValue ?? 100,
      completedDays: challenge.completedDays || [],
      completedSessions: challenge.completedSessions ?? 0,
      processedActivityIds: uniqueActivities,
      completed: challenge.completed ?? false,
      completedAt: challenge.completedAt,
      schemaVersion: challenge.schemaVersion ?? 1,
      updatedAt: now
    });
    return { status: 'created' };
  }

  getChallenges(accountId: string, since?: string): DbChallenge[] {
    const result: DbChallenge[] = [];
    const sinceTime = since ? new Date(since).getTime() : 0;

    this.challenges.forEach((c) => {
      if (c.accountId === accountId) {
        const itemTime = new Date(c.updatedAt).getTime();
        if (itemTime >= sinceTime) {
          result.push({ ...c });
        }
      }
    });

    return result;
  }

  // ========================================================
  // TOMBSTONES (DELETION PROPAGATION)
  // ========================================================

  addTombstone(accountId: string, entityType: 'workout' | 'challenge', entityId: string): void {
    const id = `tomb_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    this.tombstones.set(id, {
      id,
      accountId,
      entityType,
      entityId,
      deletedAt: new Date().toISOString()
    });

    // Also delete active record if present
    if (entityType === 'workout') {
      const w = this.workouts.get(entityId);
      if (w && w.accountId === accountId) {
        this.workouts.delete(entityId);
      }
    } else if (entityType === 'challenge') {
      const c = this.challenges.get(entityId);
      if (c && c.accountId === accountId) {
        this.challenges.delete(entityId);
      }
    }
  }

  getTombstones(accountId: string, since?: string): DbTombstone[] {
    const result: DbTombstone[] = [];
    const sinceTime = since ? new Date(since).getTime() : 0;

    this.tombstones.forEach((t) => {
      if (t.accountId === accountId) {
        const itemTime = new Date(t.deletedAt).getTime();
        if (itemTime >= sinceTime) {
          result.push({ ...t });
        }
      }
    });

    return result;
  }

  // ========================================================
  // FRIEND INVITATIONS & RELATIONSHIPS
  // ========================================================

  createFriendInvitation(
    creatorAccountId: string,
    options?: { maxUses?: number; expiryDays?: number }
  ): DbFriendInvitation {
    const creator = this.profiles.get(creatorAccountId);
    if (!creator) {
      throw new Error(`Profile not found for account ${creatorAccountId}`);
    }

    const code = generateRandomCode('FIT', 6);
    const expiryDays = options?.expiryDays ?? 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const id = `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    const invitation: DbFriendInvitation = {
      id,
      creatorAccountId,
      inviteCode: code,
      expiresAt,
      maxUses: options?.maxUses ?? 5,
      usesCount: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.friendInvitations.set(code, invitation);
    return { ...invitation };
  }

  getFriendInvitationByCode(code: string): DbFriendInvitation | null {
    const cleanCode = code.trim().toUpperCase();
    const inv = this.friendInvitations.get(cleanCode);
    if (!inv) return null;

    if (new Date(inv.expiresAt).getTime() < Date.now() && inv.status === 'active') {
      inv.status = 'expired';
    }
    return { ...inv };
  }

  revokeFriendInvitation(creatorAccountId: string, code: string): boolean {
    const cleanCode = code.trim().toUpperCase();
    const inv = this.friendInvitations.get(cleanCode);
    if (!inv) return false;
    if (inv.creatorAccountId !== creatorAccountId) {
      throw new Error('Unauthorized to revoke this invitation.');
    }
    inv.status = 'revoked';
    return true;
  }

  requestFriendship(
    requesterAccountId: string,
    inviteCode: string
  ): {
    friendship: DbFriendship;
    invitationCreator: { displayName: string; avatarColor: string; hostelWing?: string };
  } {
    const cleanCode = inviteCode.trim().toUpperCase();
    const inv = this.friendInvitations.get(cleanCode);

    if (!inv || inv.status !== 'active' || new Date(inv.expiresAt).getTime() < Date.now()) {
      if (inv && new Date(inv.expiresAt).getTime() < Date.now()) {
        inv.status = 'expired';
      }
      throw new Error('Invalid or expired invitation code.');
    }

    if (inv.creatorAccountId === requesterAccountId) {
      throw new Error('Cannot connect with yourself.');
    }

    if (inv.usesCount >= inv.maxUses) {
      inv.status = 'expired';
      throw new Error('Invalid or expired invitation code.');
    }

    // Check existing friendship
    for (const f of Array.from(this.friendships.values())) {
      const isMatch =
        (f.accountId === requesterAccountId && f.friendAccountId === inv.creatorAccountId) ||
        (f.accountId === inv.creatorAccountId && f.friendAccountId === requesterAccountId);

      if (isMatch) {
        if (f.status === 'accepted') {
          throw new Error('You are already friends with this user.');
        } else if (f.status === 'pending') {
          throw new Error('A friend request between you and this user is already pending.');
        }
      }
    }

    inv.usesCount += 1;
    if (inv.usesCount >= inv.maxUses) {
      inv.status = 'expired';
    }

    const friendshipId = `fr_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const now = new Date().toISOString();
    const friendship: DbFriendship = {
      id: friendshipId,
      accountId: requesterAccountId,
      friendAccountId: inv.creatorAccountId,
      status: 'pending',
      initiatedBy: requesterAccountId,
      createdAt: now,
      updatedAt: now
    };

    this.friendships.set(friendshipId, friendship);

    const creatorProfile = this.profiles.get(inv.creatorAccountId);
    return {
      friendship: { ...friendship },
      invitationCreator: {
        displayName: creatorProfile?.displayName || 'Fellow Student',
        avatarColor: creatorProfile?.avatarColor || 'from-cyan-500 to-blue-700',
        hostelWing: creatorProfile?.hostelWing
      }
    };
  }

  respondToFriendRequest(
    accountId: string,
    friendshipId: string,
    action: 'accept' | 'decline'
  ): DbFriendship {
    const friendship = this.friendships.get(friendshipId);
    if (!friendship) {
      throw new Error('Friend request not found.');
    }

    const isRecipient =
      (friendship.accountId === accountId || friendship.friendAccountId === accountId) &&
      friendship.initiatedBy !== accountId;

    if (!isRecipient) {
      throw new Error('Unauthorized to respond to this request.');
    }

    if (friendship.status !== 'pending') {
      throw new Error(`Friend request is already ${friendship.status}.`);
    }

    friendship.status = action === 'accept' ? 'accepted' : 'declined';
    friendship.updatedAt = new Date().toISOString();

    return { ...friendship };
  }

  getFriendships(accountId: string): {
    accepted: Array<{
      friendshipId: string;
      friend: { displayName: string; avatarColor: string; hostelWing?: string; username: string };
      since: string;
    }>;
    pendingIncoming: Array<{
      friendshipId: string;
      requester: { displayName: string; avatarColor: string; hostelWing?: string };
      requestedAt: string;
    }>;
    pendingOutgoing: Array<{
      friendshipId: string;
      recipient: { displayName: string; avatarColor: string; hostelWing?: string };
      requestedAt: string;
    }>;
    activeInvitations: DbFriendInvitation[];
  } {
    const accepted: any[] = [];
    const pendingIncoming: any[] = [];
    const pendingOutgoing: any[] = [];

    for (const f of Array.from(this.friendships.values())) {
      if (f.status === 'accepted') {
        if (f.accountId === accountId || f.friendAccountId === accountId) {
          const otherId = f.accountId === accountId ? f.friendAccountId : f.accountId;
          const prof = this.profiles.get(otherId);
          if (prof) {
            accepted.push({
              friendshipId: f.id,
              friend: {
                displayName: prof.displayName,
                avatarColor: prof.avatarColor,
                hostelWing: prof.hostelWing,
                username: prof.username
              },
              since: f.updatedAt
            });
          }
        }
      } else if (f.status === 'pending') {
        if (f.initiatedBy === accountId) {
          const recipientId = f.accountId === accountId ? f.friendAccountId : f.accountId;
          const prof = this.profiles.get(recipientId);
          if (prof) {
            pendingOutgoing.push({
              friendshipId: f.id,
              recipient: {
                displayName: prof.displayName,
                avatarColor: prof.avatarColor,
                hostelWing: prof.hostelWing
              },
              requestedAt: f.createdAt
            });
          }
        } else if (f.accountId === accountId || f.friendAccountId === accountId) {
          const requesterId = f.initiatedBy;
          const prof = this.profiles.get(requesterId);
          if (prof) {
            pendingIncoming.push({
              friendshipId: f.id,
              requester: {
                displayName: prof.displayName,
                avatarColor: prof.avatarColor,
                hostelWing: prof.hostelWing
              },
              requestedAt: f.createdAt
            });
          }
        }
      }
    }

    const activeInvitations: DbFriendInvitation[] = [];
    const now = Date.now();
    for (const inv of Array.from(this.friendInvitations.values())) {
      if (inv.creatorAccountId === accountId && inv.status === 'active') {
        if (new Date(inv.expiresAt).getTime() > now && inv.usesCount < inv.maxUses) {
          activeInvitations.push({ ...inv });
        }
      }
    }

    return { accepted, pendingIncoming, pendingOutgoing, activeInvitations };
  }

  removeFriendship(accountId: string, friendshipId: string): boolean {
    const friendship = this.friendships.get(friendshipId);
    if (!friendship) return false;

    if (friendship.accountId !== accountId && friendship.friendAccountId !== accountId) {
      throw new Error('Unauthorized to remove this connection.');
    }

    this.friendships.delete(friendshipId);
    return true;
  }

  // ========================================================
  // SHARED CHALLENGES & PRIVATE SPRINTS
  // ========================================================

  createSharedChallenge(
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
  ): DbSharedChallenge {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Challenge title is required.');
    }
    if (data.targetValue <= 0) {
      throw new Error('Target value must be strictly positive.');
    }
    if (new Date(data.endDate).getTime() < new Date(data.startDate).getTime()) {
      throw new Error('End date cannot precede start date.');
    }

    const challengeId = `chal_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const inviteCode = generateRandomCode('CHAL', 6);
    const now = new Date().toISOString();

    const challenge: DbSharedChallenge = {
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
      maxParticipants: Math.min(50, Math.max(2, data.maxParticipants || 10)),
      inviteCode,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    this.sharedChallenges.set(challengeId, challenge);

    const participantId = `part_${challengeId}_${ownerAccountId}`;
    this.challengeParticipants.set(participantId, {
      id: participantId,
      challengeId,
      accountId: ownerAccountId,
      role: 'owner',
      joinedAt: now,
      status: 'active'
    });

    return { ...challenge };
  }

  getSharedChallengeById(id: string): DbSharedChallenge | null {
    const chal = this.sharedChallenges.get(id);
    return chal ? { ...chal } : null;
  }

  getSharedChallengeByCode(code: string): DbSharedChallenge | null {
    const cleanCode = code.trim().toUpperCase();
    for (const c of Array.from(this.sharedChallenges.values())) {
      if (c.inviteCode === cleanCode) {
        return { ...c };
      }
    }
    return null;
  }

  joinSharedChallenge(
    accountId: string,
    inviteCode: string
  ): { challenge: DbSharedChallenge; participant: DbChallengeParticipant } {
    const cleanCode = inviteCode.trim().toUpperCase();
    let challenge: DbSharedChallenge | null = null;
    for (const c of Array.from(this.sharedChallenges.values())) {
      if (c.inviteCode === cleanCode) {
        challenge = c;
        break;
      }
    }

    if (!challenge || challenge.status !== 'active') {
      throw new Error('Invalid or inactive challenge invitation code.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (challenge.endDate < todayStr) {
      throw new Error('This challenge has already concluded.');
    }

    let activeCount = 0;
    let existingPart: DbChallengeParticipant | null = null;
    for (const p of Array.from(this.challengeParticipants.values())) {
      if (p.challengeId === challenge.id && p.status === 'active') {
        activeCount++;
        if (p.accountId === accountId) {
          existingPart = p;
        }
      } else if (p.challengeId === challenge.id && p.accountId === accountId) {
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
    let participant: DbChallengeParticipant;
    if (existingPart) {
      existingPart.status = 'active';
      existingPart.joinedAt = now;
      participant = existingPart;
    } else {
      const participantId = `part_${challenge.id}_${accountId}`;
      participant = {
        id: participantId,
        challengeId: challenge.id,
        accountId,
        role: 'participant',
        joinedAt: now,
        status: 'active'
      };
      this.challengeParticipants.set(participantId, participant);
    }

    return { challenge: { ...challenge }, participant: { ...participant } };
  }

  recordChallengeContribution(
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
  ): {
    contribution: DbChallengeContribution;
    updatedParticipantScore: number;
    challengeCompleted: boolean;
  } {
    const challenge = this.sharedChallenges.get(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found.');
    }
    if (challenge.status !== 'active') {
      throw new Error('Cannot contribute to an inactive or concluded challenge.');
    }

    const participantId = `part_${challengeId}_${accountId}`;
    const participant = this.challengeParticipants.get(participantId);
    if (!participant || participant.status !== 'active') {
      throw new Error('You are not an active participant in this challenge.');
    }

    const activityTimestamp = activity.timestamp || new Date().toISOString();
    const activityDate = activityTimestamp.split('T')[0];

    if (activityDate < challenge.startDate || activityDate > challenge.endDate) {
      throw new Error(
        `Activity date (${activityDate}) falls outside challenge window (${challenge.startDate} to ${challenge.endDate}).`
      );
    }

    const contribKey = `${challengeId}_${accountId}_${activity.id}`;
    const existingContrib = this.challengeContributions.get(contribKey);
    if (existingContrib) {
      const currentScore = this.calculateParticipantScore(challenge, accountId);
      return {
        contribution: { ...existingContrib },
        updatedParticipantScore: currentScore,
        challengeCompleted: currentScore >= challenge.targetValue
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
      case 'session_count': {
        metricValue = 1;
        break;
      }
      case 'streak': {
        metricValue = 1;
        break;
      }
    }

    const newContrib: DbChallengeContribution = {
      id: contribKey,
      challengeId,
      accountId,
      activityId: activity.id,
      activityType: activity.type,
      exerciseKey: activity.exerciseKey,
      metricValue,
      activityTimestamp,
      createdAt: new Date().toISOString()
    };

    this.challengeContributions.set(contribKey, newContrib);

    const updatedScore = this.calculateParticipantScore(challenge, accountId);
    const isCompleted = updatedScore >= challenge.targetValue;

    return {
      contribution: { ...newContrib },
      updatedParticipantScore: updatedScore,
      challengeCompleted: isCompleted
    };
  }

  private calculateParticipantScore(challenge: DbSharedChallenge, accountId: string): number {
    let score = 0;
    const streakDates = new Set<string>();

    for (const contrib of Array.from(this.challengeContributions.values())) {
      if (contrib.challengeId === challenge.id && contrib.accountId === accountId) {
        if (challenge.type === 'streak') {
          const date = contrib.activityTimestamp.split('T')[0];
          streakDates.add(date);
        } else {
          score += contrib.metricValue;
        }
      }
    }

    if (challenge.type === 'streak') {
      score = streakDates.size;
    }

    return Math.min(score, challenge.targetValue);
  }

  getSharedChallengeDetails(
    accountId: string,
    challengeId: string
  ): {
    challenge: DbSharedChallenge;
    participants: Array<{
      participantId: string;
      displayName: string;
      avatarColor: string;
      hostelWing?: string;
      role: string;
      currentValue: number;
      percentage: number;
      completed: boolean;
      isCurrentUser: boolean;
    }>;
    isOwner: boolean;
  } | null {
    const challenge = this.sharedChallenges.get(challengeId);
    if (!challenge) return null;

    const isOwner = challenge.ownerAccountId === accountId;
    let isParticipant = false;

    for (const p of Array.from(this.challengeParticipants.values())) {
      if (p.challengeId === challengeId && p.accountId === accountId && p.status === 'active') {
        isParticipant = true;
        break;
      }
    }

    if (!isOwner && !isParticipant) {
      return null;
    }

    const participants: any[] = [];
    for (const p of Array.from(this.challengeParticipants.values())) {
      if (p.challengeId === challengeId && p.status === 'active') {
        const prof = this.profiles.get(p.accountId);
        const score = this.calculateParticipantScore(challenge, p.accountId);
        const percentage = Math.min(100, Math.round((score / challenge.targetValue) * 100));
        const completed = score >= challenge.targetValue;

        participants.push({
          participantId: p.accountId,
          displayName: prof?.displayName || 'Fellow Student',
          avatarColor: prof?.avatarColor || 'from-cyan-500 to-blue-700',
          hostelWing: prof?.hostelWing,
          role: p.role,
          currentValue: score,
          percentage,
          completed,
          isCurrentUser: p.accountId === accountId
        });
      }
    }

    participants.sort((a, b) => b.currentValue - a.currentValue);

    return {
      challenge: { ...challenge },
      participants,
      isOwner
    };
  }

  getUserSharedChallenges(accountId: string): Array<
    DbSharedChallenge & {
      userProgress: number;
      userPercentage: number;
      isOwner: boolean;
      activeParticipantsCount: number;
    }
  > {
    const userChallenges: any[] = [];

    for (const chal of Array.from(this.sharedChallenges.values())) {
      const isOwner = chal.ownerAccountId === accountId;
      let isParticipant = false;
      let activeCount = 0;

      for (const p of Array.from(this.challengeParticipants.values())) {
        if (p.challengeId === chal.id && p.status === 'active') {
          activeCount++;
          if (p.accountId === accountId) {
            isParticipant = true;
          }
        }
      }

      if (isOwner || isParticipant) {
        const score = this.calculateParticipantScore(chal, accountId);
        const percentage = Math.min(100, Math.round((score / chal.targetValue) * 100));
        userChallenges.push({
          ...chal,
          userProgress: score,
          userPercentage: percentage,
          isOwner,
          activeParticipantsCount: activeCount
        });
      }
    }

    return userChallenges;
  }

  leaveSharedChallenge(accountId: string, challengeId: string): boolean {
    const participantId = `part_${challengeId}_${accountId}`;
    const participant = this.challengeParticipants.get(participantId);
    if (!participant) return false;

    participant.status = 'left';
    return true;
  }

  cancelSharedChallenge(ownerAccountId: string, challengeId: string): boolean {
    const challenge = this.sharedChallenges.get(challengeId);
    if (!challenge) return false;

    if (challenge.ownerAccountId !== ownerAccountId) {
      throw new Error('Only the challenge creator can cancel this challenge.');
    }

    challenge.status = 'cancelled';
    challenge.updatedAt = new Date().toISOString();
    return true;
  }
}

export { Database as InMemoryDatabase };
export { PostgresDatabase } from './postgresDb.ts';

import { PostgresDatabase } from './postgresDb.ts';

/**
 * Creates the appropriate database instance based on environment configuration.
 * 
 * Rules:
 * 1. If DATABASE_URL is provided, instantiates PostgresDatabase with connection pooling.
 * 2. If NODE_ENV === 'production' and DATABASE_URL is missing, throws a fatal error
 *    (FitMitra refuses to run with in-memory storage in production to prevent data loss).
 * 3. Otherwise, instantiates InMemoryDatabase for local development and test isolation.
 */
export function createDatabase(connectionString?: string): IDatabase {
  const connStr = connectionString || process.env.DATABASE_URL;

  if (connStr) {
    return new PostgresDatabase({ connectionString: connStr });
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[FitMitra Backend] FATAL: Production environment detected (NODE_ENV=production) but DATABASE_URL is missing. ' +
      'FitMitra refuses to run with in-memory storage in production to prevent data loss.'
    );
  }

  return new Database();
}

// Global database instance for runtime / development
export const db: IDatabase = createDatabase();

