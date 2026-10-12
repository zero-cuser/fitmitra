package com.fitmitra.feature.progress

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.workouts.WorkoutRepository
import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ProgressUiState(
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val isActiveToday: Boolean = false,
    val totalWorkouts: Int = 0,
    val totalReps: Int = 0,
    val totalCalories: Int = 0,
    val totalXp: Int = 0
)

class ProgressViewModel(
    private val storage: IAppStorage? = null
) : ViewModel() {

    private val repository = storage?.let { WorkoutRepository(it) }

    private val _uiState = MutableStateFlow(ProgressUiState())
    val uiState: StateFlow<ProgressUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        if (repository == null) return
        viewModelScope.launch {
            val stats = repository.getLifetimeStats()

            _uiState.value = ProgressUiState(
                currentStreak = stats.currentStreak,
                longestStreak = stats.longestStreak,
                isActiveToday = stats.isActiveToday,
                totalWorkouts = stats.totalWorkouts,
                totalReps = stats.totalReps,
                totalCalories = stats.totalCalories,
                totalXp = stats.totalXp
            )
        }
    }
}
