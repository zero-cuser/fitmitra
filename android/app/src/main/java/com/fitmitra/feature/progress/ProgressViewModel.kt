package com.fitmitra.feature.progress

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ProgressUiState(
    val currentStreak: Int = 1,
    val longestStreak: Int = 4,
    val isActiveToday: Boolean = true,
    val totalWorkouts: Int = 6,
    val totalReps: Int = 84,
    val totalCalories: Int = 142,
    val totalXp: Int = 340
)

class ProgressViewModel(
    private val storage: IAppStorage? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProgressUiState())
    val uiState: StateFlow<ProgressUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        storage?.let { store ->
            viewModelScope.launch {
                val workouts = store.getInt("stat_total_workouts", 6)
                val xp = store.getInt("stat_total_xp", 340)
                val streak = store.getInt("stat_current_streak", 1)
                val longest = store.getInt("stat_longest_streak", 4)
                val reps = workouts * 14
                val calories = (reps * 0.35f).toInt()

                _uiState.value = ProgressUiState(
                    currentStreak = streak,
                    longestStreak = longest,
                    isActiveToday = true,
                    totalWorkouts = workouts,
                    totalReps = reps,
                    totalCalories = calories,
                    totalXp = xp
                )
            }
        }
    }
}
