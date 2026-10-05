package com.fitmitra.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.progress.ProgressStats
import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val currentStreak: Int = 1,
    val longestStreak: Int = 4,
    val isActiveToday: Boolean = true,
    val totalWorkouts: Int = 6,
    val totalXp: Int = 340,
    val level: Int = 2
)

class HomeViewModel(
    private val storage: IAppStorage? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadStats()
    }

    fun loadStats() {
        storage?.let { store ->
            viewModelScope.launch {
                val workouts = store.getInt("stat_total_workouts", 6)
                val xp = store.getInt("stat_total_xp", 340)
                val streak = store.getInt("stat_current_streak", 1)
                val longest = store.getInt("stat_longest_streak", 4)
                val level = (xp / 200) + 1

                _uiState.value = HomeUiState(
                    currentStreak = streak,
                    longestStreak = longest,
                    isActiveToday = true,
                    totalWorkouts = workouts,
                    totalXp = xp,
                    level = level
                )
            }
        }
    }
}
