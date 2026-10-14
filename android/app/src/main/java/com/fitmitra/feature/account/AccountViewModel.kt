package com.fitmitra.feature.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.models.AuthSession
import com.fitmitra.core.domain.models.SyncConsent
import com.fitmitra.core.domain.models.SyncStatus
import com.fitmitra.core.domain.models.SyncStatusState
import com.fitmitra.core.domain.repositories.IAuthRepository
import com.fitmitra.core.domain.repositories.ISyncRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AccountUiState(
    val session: AuthSession? = null,
    val syncStatus: SyncStatus = SyncStatus(),
    val isSubmitting: Boolean = false,
    val authError: String? = null,
    val feedbackMessage: String? = null,
    val showDeleteDialog: Boolean = false,
    val deleteRemoteOnly: Boolean = false
)

class AccountViewModel(
    private val authRepository: IAuthRepository,
    private val syncRepository: ISyncRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AccountUiState())
    val uiState: StateFlow<AccountUiState> = _uiState.asStateFlow()

    init {
        loadSession()
        observeSync()
    }

    private fun loadSession() {
        viewModelScope.launch {
            val current = authRepository.getCurrentSession()
            _uiState.value = _uiState.value.copy(session = current)
        }
    }

    private fun observeSync() {
        viewModelScope.launch {
            syncRepository.syncStatus.collect { status ->
                _uiState.value = _uiState.value.copy(syncStatus = status)
            }
        }
    }

    fun login(email: String, pass: String) {
        if (email.isBlank() || pass.isBlank()) {
            _uiState.value = _uiState.value.copy(authError = "Please enter both email and password.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, authError = null)
            val result = authRepository.login(email.trim(), pass)
            _uiState.value = _uiState.value.copy(
                isSubmitting = false,
                session = result.session,
                authError = result.error,
                feedbackMessage = if (result.success) "Logged in successfully." else null
            )
        }
    }

    fun register(email: String, pass: String, name: String) {
        if (email.isBlank() || pass.length < 4 || name.isBlank()) {
            _uiState.value = _uiState.value.copy(authError = "All fields are required. Password must be >= 4 characters.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, authError = null)
            val result = authRepository.register(email.trim(), pass, name.trim())
            _uiState.value = _uiState.value.copy(
                isSubmitting = false,
                session = result.session,
                authError = result.error,
                feedbackMessage = if (result.success) "Account created successfully." else null
            )
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            syncRepository.disableSync()
            _uiState.value = _uiState.value.copy(
                session = null,
                feedbackMessage = "Logged out. Operating in anonymous local-only mode."
            )
        }
    }

    fun toggleSync() {
        viewModelScope.launch {
            val current = _uiState.value.syncStatus.state
            if (current == SyncStatusState.DISABLED) {
                syncRepository.enableSync(
                    SyncConsent(
                        consentedAt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                            timeZone = java.util.TimeZone.getTimeZone("UTC")
                        }.format(java.util.Date()),
                        syncWorkouts = true,
                        syncChallenges = true
                    )
                )
                _uiState.value = _uiState.value.copy(feedbackMessage = "Cloud backup enabled.")
            } else {
                syncRepository.disableSync()
                _uiState.value = _uiState.value.copy(feedbackMessage = "Cloud synchronization disabled. App is local-only.")
            }
        }
    }

    fun syncNow() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true)
            val res = syncRepository.syncNow()
            _uiState.value = _uiState.value.copy(
                isSubmitting = false,
                feedbackMessage = if (res.success) "Synchronized ${res.syncedWorkouts} workouts with cloud." else res.error
            )
        }
    }

    fun openDeleteDialog() {
        _uiState.value = _uiState.value.copy(showDeleteDialog = true)
    }

    fun closeDeleteDialog() {
        _uiState.value = _uiState.value.copy(showDeleteDialog = false)
    }

    fun setDeleteRemoteOnly(remoteOnly: Boolean) {
        _uiState.value = _uiState.value.copy(deleteRemoteOnly = remoteOnly)
    }

    fun confirmDeleteAccount(password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true)
            val res = authRepository.deleteAccount(password, _uiState.value.deleteRemoteOnly)
            if (res.success) {
                syncRepository.disableSync()
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    session = null,
                    showDeleteDialog = false,
                    feedbackMessage = if (_uiState.value.deleteRemoteOnly) {
                        "Remote account deleted. Local workout data preserved on device."
                    } else {
                        "Account and local data wiped permanently."
                    }
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    authError = "Account deletion failed. Verify password."
                )
            }
        }
    }

    fun clearFeedback() {
        _uiState.value = _uiState.value.copy(feedbackMessage = null, authError = null)
    }
}
