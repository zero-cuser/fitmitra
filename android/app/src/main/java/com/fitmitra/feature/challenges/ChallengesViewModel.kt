package com.fitmitra.feature.challenges

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.challenges.ChallengeRules
import com.fitmitra.core.domain.models.CampusChallenge
import com.fitmitra.core.domain.models.ChallengeParticipation
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

    private val _uiState = MutableStateFlow(ChallengesUiState())
    val uiState: StateFlow<ChallengesUiState> = _uiState.asStateFlow()

    init {
        loadChallenges()
    }

    fun loadChallenges() {
        val baseChallenges = ChallengeRules.ACTIVE_CAMPUS_CHALLENGES
        val initialItems = baseChallenges.mapIndexed { idx, ch ->
            val curr = if (idx == 0) 36 else if (idx == 1) 20 else 2
            val pct = ChallengeRules.calculatePercentage(curr, ch.targetValue)
            ChallengeItemState(
                challenge = ch,
                currentValue = curr,
                percentage = pct,
                isCompleted = curr >= ch.targetValue
            )
        }

        _uiState.value = ChallengesUiState(
            challenges = initialItems,
            totalCompleted = initialItems.count { it.isCompleted }
        )
    }
}
