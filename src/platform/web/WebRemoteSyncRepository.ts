/**
 * FitMitra Web Remote Sync Repository
 * 
 * Implements ISyncRepository over HTTPS REST with:
 * - Persistent offline queue
 * - Bounded exponential backoff and retry management
 * - Idempotent upsert verification
 * - User preferences synchronization (LWW)
 * - Pagination handling for remote history
 */

import type { ISyncRepository } from '../../domain/repositories/interfaces.ts';
import type {
  SyncConsent,
  SyncOptions,
  SyncPullResponse,
  SyncResult,
  SyncStatus,
  TombstoneRecord
} from '../../domain/models/sync.ts';
import type { ChallengeParticipation, WorkoutSessionRecord } from '../../domain/models/account.ts';
import { safeGetItem, safeSetItem, safeRemoveItem, STORAGE_KEYS } from '../../utils/storageSafety.ts';

const STORAGE_KEY_AUTH_TOKEN = 'fitmitra_auth_token_v1';
const STORAGE_KEY_SYNC_CONSENT = 'fitmitra_sync_consent_v1';
const STORAGE_KEY_LAST_SYNC_TS = 'fitmitra_last_sync_ts_v1';
const STORAGE_KEY_WORKOUT_SESSIONS = 'fitmitra_workout_sessions_v1';
const STORAGE_KEY_SYNC_RETRY_COUNT = 'fitmitra_sync_retry_count_v1';
const STORAGE_KEY_PENDING_QUEUE = 'fitmitra_pending_sync_queue_v1';

export const MAX_SYNC_RETRIES = 5;
export const MAX_BACKOFF_DELAY_MS = 30000;

export function calculateBackoffDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, Math.max(0, retryCount)), MAX_BACKOFF_DELAY_MS);
}

export class WebRemoteSyncRepository implements ISyncRepository {
  private baseUrl: string;
  private status: SyncStatus = {
    state: 'disabled',
    lastSyncTimestampMs: null,
    pendingCount: 0
  };

  constructor(baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.hydrate();
  }

  private hydrate(): void {
    const consent = safeGetItem<SyncConsent>(STORAGE_KEY_SYNC_CONSENT);
    const lastTs = safeGetItem<number>(STORAGE_KEY_LAST_SYNC_TS);
    const token = safeGetItem<string>(STORAGE_KEY_AUTH_TOKEN);
    const pendingQueue = safeGetItem<string[]>(STORAGE_KEY_PENDING_QUEUE) || [];

    if (consent && token) {
      this.status = {
        state: 'idle',
        lastSyncTimestampMs: lastTs || null,
        pendingCount: pendingQueue.length
      };
    } else {
      this.status = {
        state: 'disabled',
        lastSyncTimestampMs: null,
        pendingCount: 0
      };
    }
  }

  private getAuthHeader(): Record<string, string> {
    const token = safeGetItem<string>(STORAGE_KEY_AUTH_TOKEN);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  getSyncStatus(): SyncStatus {
    return { ...this.status };
  }

  async enableSync(consent: SyncConsent): Promise<void> {
    safeSetItem(STORAGE_KEY_SYNC_CONSENT, consent);
    safeSetItem(STORAGE_KEY_SYNC_RETRY_COUNT, 0);
    this.status = {
      state: 'idle',
      lastSyncTimestampMs: this.status.lastSyncTimestampMs,
      pendingCount: await this.getPendingCount()
    };
  }

  async disableSync(): Promise<void> {
    safeRemoveItem(STORAGE_KEY_SYNC_CONSENT);
    safeRemoveItem(STORAGE_KEY_SYNC_RETRY_COUNT);
    safeRemoveItem(STORAGE_KEY_PENDING_QUEUE);
    this.status = {
      state: 'disabled',
      lastSyncTimestampMs: null,
      pendingCount: 0
    };
  }

  async getPendingCount(): Promise<number> {
    const workouts = safeGetItem<WorkoutSessionRecord[]>(STORAGE_KEY_WORKOUT_SESSIONS) || [];
    const pendingQueue = safeGetItem<string[]>(STORAGE_KEY_PENDING_QUEUE);
    if (pendingQueue !== null) {
      return pendingQueue.length;
    }
    return workouts.length;
  }

  async syncNow(_options?: SyncOptions): Promise<SyncResult> {
    const consent = safeGetItem<SyncConsent>(STORAGE_KEY_SYNC_CONSENT);
    const token = safeGetItem<string>(STORAGE_KEY_AUTH_TOKEN);

    if (!consent || !token) {
      this.status.state = 'disabled';
      return {
        success: false,
        syncedWorkouts: 0,
        syncedChallenges: 0,
        processedTombstones: 0,
        serverTimestamp: new Date().toISOString(),
        conflicts: [],
        error: 'Sync is disabled or user is not authenticated.'
      };
    }

    this.status.state = 'syncing';
    let currentRetries = safeGetItem<number>(STORAGE_KEY_SYNC_RETRY_COUNT) || 0;

    try {
      // 1. Gather local workouts and challenges
      const localWorkouts = safeGetItem<WorkoutSessionRecord[]>(STORAGE_KEY_WORKOUT_SESSIONS) || [];
      const localChallengesRaw = safeGetItem<Record<string, any>>(STORAGE_KEYS.CHALLENGE_PROGRESS) || {};
      const localChallenges: ChallengeParticipation[] = Object.values(localChallengesRaw).map((c: any) => ({
        id: `part_${c.userId || 'usr'}_${c.challengeId}`,
        accountId: c.userId || 'usr',
        challengeId: c.challengeId,
        joinedAt: c.joinedAt || new Date().toISOString(),
        currentValue: c.currentValue || 0,
        targetValue: c.targetValue || 100,
        completedDays: c.completedDays || [],
        completedSessions: c.completedSessions || 0,
        processedActivityIds: c.processedActivityIds || [],
        completed: Boolean(c.completed),
        completedAt: c.completedAt
      }));

      // Gather user preferences
      const userProfile = safeGetItem<any>(STORAGE_KEYS.USER) || {};
      const preferences = userProfile.preferences || {};
      const preferencesUpdatedAt = userProfile.updatedAt || new Date().toISOString();

      // Record pending queue before sending
      const pendingIds = localWorkouts.map((w) => w.id);
      safeSetItem(STORAGE_KEY_PENDING_QUEUE, pendingIds);

      // 2. Push Local Changes to Server
      const pushRes = await fetch(`${this.baseUrl}/api/v1/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({
          clientVersion: '1.0.0',
          schemaVersion: 2,
          workouts: consent.syncWorkouts ? localWorkouts : [],
          challenges: consent.syncChallenges ? localChallenges : [],
          preferences,
          preferencesUpdatedAt,
          tombstones: []
        })
      });

      if (!pushRes.ok) {
        throw new Error(`Push failed with HTTP ${pushRes.status}`);
      }

      const pushData = await pushRes.json();

      // 3. Pull Remote Changes (Paginated)
      let offset = 0;
      const limit = 50;
      let hasMore = true;
      const allRemoteWorkouts: WorkoutSessionRecord[] = [];
      let latestProfile: any = null;

      while (hasMore) {
        const sinceParam = this.status.lastSyncTimestampMs
          ? `since=${new Date(this.status.lastSyncTimestampMs).toISOString()}&`
          : '';
        const pullRes = await fetch(
          `${this.baseUrl}/api/v1/sync/pull?${sinceParam}limit=${limit}&offset=${offset}`,
          {
            method: 'GET',
            headers: {
              ...this.getAuthHeader()
            }
          }
        );

        if (!pullRes.ok) {
          throw new Error(`Pull failed with HTTP ${pullRes.status}`);
        }

        const pullData: SyncPullResponse & { profile?: any; hasMore?: boolean } =
          await pullRes.json();

        if (Array.isArray(pullData.workouts)) {
          allRemoteWorkouts.push(...pullData.workouts);
        }
        if (pullData.profile) {
          latestProfile = pullData.profile;
        }

        hasMore = Boolean(pullData.hasMore);
        offset += limit;

        // Safety break against runaway pagination
        if (offset > 1000) break;
      }

      // 4. Merge Remote Workouts (Append-Only with Stable UUIDs)
      if (allRemoteWorkouts.length > 0) {
        const mergedWorkouts = [...localWorkouts];
        for (const remoteW of allRemoteWorkouts) {
          if (!mergedWorkouts.some((lw) => lw.id === remoteW.id)) {
            mergedWorkouts.push(remoteW);
          }
        }
        safeSetItem(STORAGE_KEY_WORKOUT_SESSIONS, mergedWorkouts);
      }

      // 5. Merge User Preferences if remote has newer timestamp
      if (latestProfile && latestProfile.preferencesJson) {
        const currentProfile = safeGetItem<any>(STORAGE_KEYS.USER) || {};
        const localTime = new Date(currentProfile.updatedAt || 0).getTime();
        const remoteTime = new Date(
          latestProfile.preferencesUpdatedAt || latestProfile.updatedAt || 0
        ).getTime();

        if (remoteTime > localTime) {
          currentProfile.preferences = {
            ...currentProfile.preferences,
            ...latestProfile.preferencesJson
          };
          currentProfile.updatedAt = latestProfile.updatedAt;
          safeSetItem(STORAGE_KEYS.USER, currentProfile);
        }
      }

      const now = Date.now();
      safeSetItem(STORAGE_KEY_LAST_SYNC_TS, now);
      safeSetItem(STORAGE_KEY_SYNC_RETRY_COUNT, 0);
      safeSetItem(STORAGE_KEY_PENDING_QUEUE, []);

      this.status = {
        state: 'synced',
        lastSyncTimestampMs: now,
        pendingCount: 0
      };

      return {
        success: true,
        syncedWorkouts: pushData.syncedWorkouts ?? localWorkouts.length,
        syncedChallenges: pushData.syncedChallenges ?? localChallenges.length,
        processedTombstones: pushData.processedTombstones ?? 0,
        serverTimestamp: pushData.serverTimestamp || new Date(now).toISOString(),
        conflicts: []
      };
    } catch (err: any) {
      currentRetries = Math.min(currentRetries + 1, MAX_SYNC_RETRIES);
      safeSetItem(STORAGE_KEY_SYNC_RETRY_COUNT, currentRetries);

      this.status = {
        state: 'offline',
        lastSyncTimestampMs: this.status.lastSyncTimestampMs,
        pendingCount: await this.getPendingCount(),
        lastError: err.message || 'Network request failed'
      };

      return {
        success: false,
        syncedWorkouts: 0,
        syncedChallenges: 0,
        processedTombstones: 0,
        serverTimestamp: new Date().toISOString(),
        conflicts: [],
        error: `Sync error: ${err.message || 'Network unavailable'}`
      };
    }
  }
}
