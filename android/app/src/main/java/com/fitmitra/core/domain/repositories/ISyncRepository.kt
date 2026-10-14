package com.fitmitra.core.domain.repositories

import com.fitmitra.core.domain.models.SyncConsent
import com.fitmitra.core.domain.models.SyncResult
import com.fitmitra.core.domain.models.SyncStatus
import kotlinx.coroutines.flow.StateFlow

/**
 * Android Domain Contract: Cloud Synchronization Repository
 *
 * Exposes observable sync status and methods to control opt-in data synchronization.
 */
interface ISyncRepository {
    /**
     * Observable stream of sync state (Disabled, Idle, Syncing, Synced, Error, Offline).
     */
    val syncStatus: StateFlow<SyncStatus>

    /**
     * Enables cloud synchronization with explicit user consent.
     */
    suspend fun enableSync(consent: SyncConsent)

    /**
     * Disables synchronization and resets client to local-only mode.
     */
    suspend fun disableSync()

    /**
     * Triggers an immediate synchronization cycle.
     */
    suspend fun syncNow(): SyncResult

    /**
     * Returns the count of pending local workouts awaiting sync.
     */
    suspend fun getPendingCount(): Int
}
