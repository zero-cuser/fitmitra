/**
 * FitMitra Domain Models: Synchronization & Account Contracts
 * 
 * Platform-neutral, 100% pure TypeScript models.
 * Completely free of DOM, React, Next.js, or backend vendor dependencies.
 */

import type { ChallengeParticipation, WorkoutSessionRecord } from './account.ts';

export type SyncStatusState =
  | 'disabled'   // Opt-in sync is currently disabled (local-only default)
  | 'idle'       // Sync is enabled; waiting for trigger
  | 'syncing'    // In-flight push/pull active
  | 'synced'     // Last sync succeeded
  | 'error'      // Last sync failed (recoverable error)
  | 'offline';   // Device is currently offline; changes queued locally

export interface SyncStatus {
  state: SyncStatusState;
  lastSyncTimestampMs: number | null;
  pendingCount: number;
  lastError?: string;
}

export interface SyncConsent {
  consentedAt: string; // ISO 8601 UTC
  syncWorkouts: boolean;
  syncChallenges: boolean;
  syncPreferences: boolean;
}

export interface SyncConflict {
  entityId: string;
  entityType: 'workout' | 'challenge' | 'profile';
  resolution: 'server_wins' | 'client_wins' | 'merged';
  reason: string;
}

export interface SyncOptions {
  forceFullSync?: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedWorkouts: number;
  syncedChallenges: number;
  processedTombstones: number;
  serverTimestamp: string; // ISO 8601 UTC
  conflicts: SyncConflict[];
  error?: string;
}

export interface TombstoneRecord {
  id: string; // tomb_<timestamp>_<hex>
  accountId: string;
  entityType: 'workout' | 'challenge';
  entityId: string;
  deletedAt: string; // ISO 8601 UTC
}

export interface SyncPayload {
  clientVersion: string;
  schemaVersion: number;
  workouts: WorkoutSessionRecord[];
  challenges: ChallengeParticipation[];
  tombstones: TombstoneRecord[];
}

export interface SyncPullResponse {
  success: boolean;
  serverTimestamp: string;
  hasMore: boolean;
  workouts: WorkoutSessionRecord[];
  challenges: ChallengeParticipation[];
  tombstones: TombstoneRecord[];
}

export interface AuthCredentials {
  email: string;
  password: string;
  displayName?: string;
  username?: string;
}

export interface AuthSession {
  token: string;
  accountId: string;
  email: string;
  displayName: string;
  username: string;
  expiresAt: string; // ISO 8601 UTC
}

export interface AccountDeletionResult {
  success: boolean;
  remoteDataDeleted: boolean;
  localDataDeleted: boolean;
  accountId: string;
}
