/**
 * FitMitra Local Sync Repository Implementation
 * 
 * Implements ISyncRepository for local-only, offline operation.
 * Manages local opt-in consent and pending change counters with zero network egress.
 */

import type { ISyncRepository } from './interfaces.ts';
import type { SyncConsent, SyncOptions, SyncResult, SyncStatus } from '../models/sync.ts';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../../utils/storageSafety.ts';

const STORAGE_KEY_SYNC_CONSENT = 'fitmitra_sync_consent_v1';
const STORAGE_KEY_LAST_SYNC_TS = 'fitmitra_last_sync_ts_v1';

export class LocalSyncRepository implements ISyncRepository {
  private syncStatus: SyncStatus = {
    state: 'disabled',
    lastSyncTimestampMs: null,
    pendingCount: 0
  };

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    const consent = safeGetItem<SyncConsent>(STORAGE_KEY_SYNC_CONSENT);
    const lastTs = safeGetItem<number>(STORAGE_KEY_LAST_SYNC_TS);

    if (consent) {
      this.syncStatus = {
        state: 'idle',
        lastSyncTimestampMs: lastTs || null,
        pendingCount: 0
      };
    } else {
      this.syncStatus = {
        state: 'disabled',
        lastSyncTimestampMs: null,
        pendingCount: 0
      };
    }
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  async enableSync(consent: SyncConsent): Promise<void> {
    safeSetItem(STORAGE_KEY_SYNC_CONSENT, consent);
    this.syncStatus = {
      state: 'idle',
      lastSyncTimestampMs: this.syncStatus.lastSyncTimestampMs,
      pendingCount: 0
    };
  }

  async disableSync(): Promise<void> {
    safeRemoveItem(STORAGE_KEY_SYNC_CONSENT);
    this.syncStatus = {
      state: 'disabled',
      lastSyncTimestampMs: null,
      pendingCount: 0
    };
  }

  async syncNow(_options?: SyncOptions): Promise<SyncResult> {
    if (this.syncStatus.state === 'disabled') {
      return {
        success: false,
        syncedWorkouts: 0,
        syncedChallenges: 0,
        processedTombstones: 0,
        serverTimestamp: new Date().toISOString(),
        conflicts: [],
        error: 'Sync is disabled. User consent required.'
      };
    }

    const now = Date.now();
    safeSetItem(STORAGE_KEY_LAST_SYNC_TS, now);
    this.syncStatus = {
      state: 'synced',
      lastSyncTimestampMs: now,
      pendingCount: 0
    };

    return {
      success: true,
      syncedWorkouts: 0,
      syncedChallenges: 0,
      processedTombstones: 0,
      serverTimestamp: new Date(now).toISOString(),
      conflicts: []
    };
  }

  async getPendingCount(): Promise<number> {
    return this.syncStatus.pendingCount;
  }
}
