package com.fitmitra.feature.challenges

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.challenges.ChallengeRules
import com.fitmitra.core.domain.models.CampusChallenge
import com.fitmitra.core.domain.workouts.WorkoutRepository
import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ChallengeItemState(
    val challenge: CampusChallenge,
    val currentValue: Int,
    val percentage: Int,
    val isCompleted: Boolean
)

data class ChallengesUiState(
    val challenges: List<ChallengeItemState> = emptyList(),
    val totalCompleted: Int = 0
)

class ChallengesViewModel(
    private val storage: IAppStorage? = null
) : ViewModel() {

    private val repository = storage?.let { WorkoutRepository(it) }

    private val _uiState = MutableStateFlow(ChallengesUiState())
    val uiState: StateFlow<ChallengesUiState> = _uiState.asStateFlow()

    init {
        loadChallenges()
    }

    fun loadChallenges() {
        if (repository == null) {
            val baseChallenges = ChallengeRules.ACTIVE_CAMPUS_CHALLENGES
            val items = baseChallenges.map { ch ->
                ChallengeItemState(
                    challenge = ch,
                    currentValue = 0,
                    percentage = 0,
                    isCompleted = false
                )
            }
            _uiState.value = ChallengesUiState(challenges = items, totalCompleted = 0)
            return
        }

        viewModelScope.launch {
            val participations = repository.getChallengeParticipations().associateBy { it.challengeId }
            val baseChallenges = ChallengeRules.ACTIVE_CAMPUS_CHALLENGES

            val items = baseChallenges.map { ch ->
                val part = participations[ch.id]
                val curr = part?.currentValue ?: 0
                val pct = ChallengeRules.calculatePercentage(curr, ch.targetValue)
                val completed = part?.isCompleted ?: (curr >= ch.targetValue)

                ChallengeItemState(
                    challenge = ch,
                    currentValue = curr,
                    percentage = pct,
                    isCompleted = completed
                )
            }

            _uiState.value = ChallengesUiState(
                challenges = items,
                totalCompleted = items.count { it.isCompleted }
            )
        }
    }
}
