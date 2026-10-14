package com.fitmitra.feature.account

import com.fitmitra.core.domain.models.*
import com.fitmitra.core.domain.repositories.IAuthRepository
import com.fitmitra.core.domain.repositories.ISyncRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class FakeAuthRepository : IAuthRepository {
    var session: AuthSession? = null
    var shouldFailLogin = false
    var registeredUsers = mutableMapOf<String, String>()

    override suspend fun getCurrentSession(): AuthSession? = session

    override suspend fun register(
        email: String,
        password: String,
        displayName: String,
        username: String
    ): AuthResult {
        if (registeredUsers.containsKey(email)) {
            return AuthResult(success = false, error = "Account already exists with this email")
        }
        registeredUsers[email] = password
        val s = AuthSession(
            token = "fake_jwt_token_123",
            accountId = "acc_fake_1",
            email = email,
            displayName = displayName,
            username = username,
            expiresAt = "2026-10-21T12:00:00.000Z"
        )
        session = s
        return AuthResult(success = true, session = s)
    }

    override suspend fun login(email: String, password: String): AuthResult {
        if (shouldFailLogin) {
            return AuthResult(success = false, error = "Invalid credentials")
        }
        val s = AuthSession(
            token = "fake_jwt_token_123",
            accountId = "acc_fake_1",
            email = email,
            displayName = "Test User",
            username = "testuser",
            expiresAt = "2026-10-21T12:00:00.000Z"
        )
        session = s
        return AuthResult(success = true, session = s)
    }

    override suspend fun logout() {
        session = null
    }

    override suspend fun deleteAccount(password: String, deleteRemoteDataOnly: Boolean): AccountDeletionResult {
        if (password != "correct_pass") {
            return AccountDeletionResult(
                success = false,
                remoteDataDeleted = false,
                localDataDeleted = false,
                accountId = session?.accountId ?: ""
            )
        }
        val accId = session?.accountId ?: "acc_fake_1"
        session = null
        return AccountDeletionResult(
            success = true,
            remoteDataDeleted = true,
            localDataDeleted = !deleteRemoteDataOnly,
            accountId = accId
        )
    }
}

class FakeSyncRepository : ISyncRepository {
    private val _syncStatus = MutableStateFlow(SyncStatus(state = SyncStatusState.DISABLED))
    override val syncStatus: StateFlow<SyncStatus> = _syncStatus.asStateFlow()

    var syncNowCalled = false

    override suspend fun enableSync(consent: SyncConsent) {
        _syncStatus.value = SyncStatus(state = SyncStatusState.IDLE, pendingCount = 2)
    }

    override suspend fun disableSync() {
        _syncStatus.value = SyncStatus(state = SyncStatusState.DISABLED)
    }

    override suspend fun syncNow(): SyncResult {
        syncNowCalled = true
        _syncStatus.value = SyncStatus(state = SyncStatusState.SYNCED, pendingCount = 0)
        return SyncResult(success = true, syncedWorkouts = 2)
    }

    override suspend fun getPendingCount(): Int = 2
}

@OptIn(ExperimentalCoroutinesApi::class)
class AccountViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authRepo: FakeAuthRepository
    private lateinit var syncRepo: FakeSyncRepository
    private lateinit var viewModel: AccountViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        authRepo = FakeAuthRepository()
        syncRepo = FakeSyncRepository()
        viewModel = AccountViewModel(authRepo, syncRepo)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testInitialGuestStateIsAnonymousAndSyncDisabled() {
        testDispatcher.scheduler.advanceUntilIdle()
        val state = viewModel.uiState.value
        assertNull(state.session)
        assertEquals(SyncStatusState.DISABLED, state.syncStatus.state)
        assertFalse(state.isSubmitting)
        assertNull(state.authError)
    }

    @Test
    fun testRegisterSuccessUpdatesSessionAndSyncRemainsOptInDisabled() = runBlocking {
        viewModel.register("student@campus.edu", "pass1234", "Campus Runner")
        testDispatcher.scheduler.advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNotNull(state.session)
        assertEquals("student@campus.edu", state.session?.email)
        assertEquals("Campus Runner", state.session?.displayName)
        assertFalse(state.isSubmitting)
        assertNull(state.authError)
        assertEquals("Account created successfully.", state.feedbackMessage)
        assertEquals(SyncStatusState.DISABLED, state.syncStatus.state)
    }

    @Test
    fun testLoginFailureSurfacesError() = runBlocking {
        authRepo.shouldFailLogin = true
        viewModel.login("student@campus.edu", "wrongpass")
        testDispatcher.scheduler.advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.session)
        assertEquals("Invalid credentials", state.authError)
    }

    @Test
    fun testSignOutPreservesLocalOnlyMode() = runBlocking {
        viewModel.register("student@campus.edu", "pass1234", "Campus Runner")
        testDispatcher.scheduler.advanceUntilIdle()
        assertNotNull(viewModel.uiState.value.session)

        viewModel.logout()
        testDispatcher.scheduler.advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.session)
        assertEquals(SyncStatusState.DISABLED, state.syncStatus.state)
        assertEquals("Logged out. Operating in anonymous local-only mode.", state.feedbackMessage)
    }

    @Test
    fun testToggleSyncChangesConsent() = runBlocking {
        viewModel.register("student@campus.edu", "pass1234", "Campus Runner")
        testDispatcher.scheduler.advanceUntilIdle()

        // Sync starts DISABLED -> toggle enables it
        viewModel.toggleSync()
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals(SyncStatusState.IDLE, viewModel.uiState.value.syncStatus.state)
        assertEquals("Cloud backup enabled.", viewModel.uiState.value.feedbackMessage)

        // Toggle again -> disables it
        viewModel.toggleSync()
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals(SyncStatusState.DISABLED, viewModel.uiState.value.syncStatus.state)
        assertEquals("Cloud synchronization disabled. App is local-only.", viewModel.uiState.value.feedbackMessage)
    }

    @Test
    fun testDeleteAccountWrongPasswordFails() = runBlocking {
        viewModel.register("student@campus.edu", "pass1234", "Campus Runner")
        testDispatcher.scheduler.advanceUntilIdle()

        viewModel.openDeleteDialog()
        assertTrue(viewModel.uiState.value.showDeleteDialog)

        viewModel.confirmDeleteAccount("wrong_pass")
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("Account deletion failed. Verify password.", viewModel.uiState.value.authError)
        assertNotNull(viewModel.uiState.value.session)
    }

    @Test
    fun testDeleteAccountCorrectPasswordSucceeds() = runBlocking {
        viewModel.register("student@campus.edu", "pass1234", "Campus Runner")
        testDispatcher.scheduler.advanceUntilIdle()

        viewModel.openDeleteDialog()
        viewModel.setDeleteRemoteOnly(true)
        viewModel.confirmDeleteAccount("correct_pass")
        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(viewModel.uiState.value.session)
        assertFalse(viewModel.uiState.value.showDeleteDialog)
        assertEquals("Remote account deleted. Local workout data preserved on device.", viewModel.uiState.value.feedbackMessage)
    }
}
