package com.fitmitra.core.domain.repositories

import com.fitmitra.core.domain.models.AccountDeletionResult
import com.fitmitra.core.domain.models.AuthResult
import com.fitmitra.core.domain.models.AuthSession

/**
 * Android Domain Contract: Authentication Repository
 *
 * Mediates between presentation and identity management.
 * Implementations may be Local (anonymous guest) or Remote (HTTPS REST backend).
 */
interface IAuthRepository {
    /**
     * Registers a new account with email, password, and display name.
     */
    suspend fun register(
        email: String,
        password: String,
        displayName: String,
        username: String = ""
    ): AuthResult

    /**
     * Authenticates an existing user and restores an active session.
     */
    suspend fun login(email: String, password: String): AuthResult

    /**
     * Terminates active session and clears locally stored tokens.
     */
    suspend fun logout()

    /**
     * Retrieves the active authenticated session, or null if unauthenticated.
     */
    suspend fun getCurrentSession(): AuthSession?

    /**
     * Permanently purges user account with choice to delete remote records only or wipe local data too.
     */
    suspend fun deleteAccount(password: String, deleteRemoteDataOnly: Boolean): AccountDeletionResult
}
