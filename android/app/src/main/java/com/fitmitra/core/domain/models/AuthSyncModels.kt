package com.fitmitra.core.domain.models

/**
 * FitMitra Android Domain Models: Authentication & Cloud Synchronization
 *
 * 100% pure Kotlin models representing platform-neutral contracts.
 */

data class AuthSession(
    val token: String,
    val accountId: String,
    val email: String,
    val displayName: String,
    val username: String,
    val expiresAt: String
)

data class AuthResult(
    val success: Boolean,
    val session: AuthSession? = null,
    val error: String? = null
)

enum class SyncStatusState {
    DISABLED,  // Opt-in sync is currently disabled (local-only default)
    IDLE,      // Sync enabled, awaiting trigger
    SYNCING,   // Active network transmission in progress
    SYNCED,    // Last sync completed successfully
    ERROR,     // Last sync failed
    OFFLINE    // Network unavailable; changes queued locally
}

data class SyncStatus(
    val state: SyncStatusState = SyncStatusState.DISABLED,
    val lastSyncTimestampMs: Long? = null,
    val pendingCount: Int = 0,
    val lastError: String? = null
)

data class SyncConsent(
    val consentedAt: String,
    val syncWorkouts: Boolean = true,
    val syncChallenges: Boolean = true
)

data class SyncResult(
    val success: Boolean,
    val syncedWorkouts: Int = 0,
    val syncedChallenges: Int = 0,
    val serverTimestamp: String = "",
    val error: String? = null
)

data class AccountDeletionResult(
    val success: Boolean,
    val remoteDataDeleted: Boolean,
    val localDataDeleted: Boolean,
    val accountId: String
)
