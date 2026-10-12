package com.fitmitra.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.workouts.WorkoutRepository
import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val isActiveToday: Boolean = false,
    val totalWorkouts: Int = 0,
    val totalXp: Int = 0,
    val level: Int = 1
)

class HomeViewModel(
    private val storage: IAppStorage? = null
) : ViewModel() {

    private val repository = storage?.let { WorkoutRepository(it) }

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadStats()
    }

    fun loadStats() {
        if (repository == null) return
        viewModelScope.launch {
            val stats = repository.getLifetimeStats()
            val level = (stats.totalXp / 200) + 1

            _uiState.value = HomeUiState(
                currentStreak = stats.currentStreak,
                longestStreak = stats.longestStreak,
                isActiveToday = stats.isActiveToday,
                totalWorkouts = stats.totalWorkouts,
                totalXp = stats.totalXp,
                level = level
            )
        }
    }
}
