package com.fitmitra.feature.workout.selection

import androidx.lifecycle.ViewModel
import com.fitmitra.core.domain.adaptive.AdaptiveEngine
import com.fitmitra.core.domain.models.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class SelectionUiState(
    val constraints: WorkoutConstraints = WorkoutConstraints(),
    val recommendation: RecommendationResult = AdaptiveEngine.generateWorkout(WorkoutConstraints())
)

class WorkoutSelectionViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(SelectionUiState())
    val uiState: StateFlow<SelectionUiState> = _uiState.asStateFlow()

    fun updateDuration(minutes: Int) {
        val newConstraints = _uiState.value.constraints.copy(durationMinutes = minutes)
        updateConstraints(newConstraints)
    }

    fun updateSpace(space: SpaceRequirement) {
        val newConstraints = _uiState.value.constraints.copy(space = space)
        updateConstraints(newConstraints)
    }

    fun updateNoise(noise: NoiseRating) {
        val newConstraints = _uiState.value.constraints.copy(noiseTolerance = noise)
        updateConstraints(newConstraints)
    }

    fun updateDifficulty(difficulty: ExerciseDifficulty) {
        val newConstraints = _uiState.value.constraints.copy(difficulty = difficulty)
        updateConstraints(newConstraints)
    }

    fun updateGoal(goal: FitnessGoal) {
        val newConstraints = _uiState.value.constraints.copy(goal = goal)
        updateConstraints(newConstraints)
    }

    private fun updateConstraints(constraints: WorkoutConstraints) {
        val result = AdaptiveEngine.generateWorkout(constraints)
        _uiState.value = SelectionUiState(
            constraints = constraints,
            recommendation = result
        )
    }
}
