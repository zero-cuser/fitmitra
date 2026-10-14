package com.fitmitra.feature.social

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.models.Friendship
import com.fitmitra.core.domain.models.SharedChallenge
import com.fitmitra.core.domain.repositories.ISocialRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SocialUiState(
    val isLoading: Boolean = false,
    val activeInviteCode: String? = null,
    val codeCopied: Boolean = false,
    val friends: List<Friendship> = emptyList(),
    val pendingIncoming: List<Friendship> = emptyList(),
    val challenges: List<SharedChallenge> = emptyList(),
    val feedbackMessage: String? = null,
    val isSuccessFeedback: Boolean = true
)

class SocialViewModel(
    private val repository: ISocialRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SocialUiState())
    val uiState: StateFlow<SocialUiState> = _uiState.asStateFlow()

    init {
        loadSocialData()
    }

    fun loadSocialData(clearFeedback: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                feedbackMessage = if (clearFeedback) null else _uiState.value.feedbackMessage
            )
            val friendsResult = repository.getFriendships()
            val challengesResult = repository.getUserChallenges()

            if (friendsResult.isSuccess) {
                val list = friendsResult.getOrThrow()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    friends = list.friends,
                    pendingIncoming = list.pendingIncoming
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    feedbackMessage = _uiState.value.feedbackMessage ?: (friendsResult.exceptionOrNull()?.message ?: "Failed to load social data."),
                    isSuccessFeedback = _uiState.value.feedbackMessage?.let { _uiState.value.isSuccessFeedback } ?: false
                )
            }

            if (challengesResult.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    challenges = challengesResult.getOrThrow()
                )
            }
        }
    }

    fun generateInviteCode() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, feedbackMessage = null)
            val result = repository.createFriendInvitation()
            if (result.isSuccess) {
                val inv = result.getOrThrow()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    activeInviteCode = inv.code,
                    feedbackMessage = "Invite code generated: ${inv.code}",
                    isSuccessFeedback = true
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    feedbackMessage = result.exceptionOrNull()?.message ?: "Failed to generate invite code.",
                    isSuccessFeedback = false
                )
            }
        }
    }

    fun sendFriendRequest(code: String) {
        val trimmed = code.trim().uppercase()
        if (trimmed.isEmpty()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, feedbackMessage = null)
            val result = repository.sendFriendRequest(trimmed)
            if (result.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    feedbackMessage = "Friend request sent successfully!",
                    isSuccessFeedback = true
                )
                loadSocialData()
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    feedbackMessage = result.exceptionOrNull()?.message ?: "Invalid or expired invitation code.",
                    isSuccessFeedback = false
                )
            }
        }
    }

    fun respondToRequest(friendshipId: String, accept: Boolean) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, feedbackMessage = null)
            val result = repository.respondToFriendRequest(friendshipId, accept)
            if (result.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    feedbackMessage = if (accept) "Friend request accepted!" else "Friend request declined.",
                    isSuccessFeedback = true
                )
                loadSocialData()
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    feedbackMessage = result.exceptionOrNull()?.message ?: "Failed to process request.",
                    isSuccessFeedback = false
                )
            }
        }
    }

    fun joinChallenge(code: String) {
        val trimmed = code.trim().uppercase()
        if (trimmed.isEmpty()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, feedbackMessage = null)
            val result = repository.joinSharedChallenge(trimmed)
            if (result.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    feedbackMessage = "Joined challenge: ${result.getOrThrow().title}!",
                    isSuccessFeedback = true
                )
                loadSocialData()
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    feedbackMessage = result.exceptionOrNull()?.message ?: "Failed to join challenge.",
                    isSuccessFeedback = false
                )
            }
        }
    }

    fun clearFeedback() {
        _uiState.value = _uiState.value.copy(feedbackMessage = null)
    }
}
