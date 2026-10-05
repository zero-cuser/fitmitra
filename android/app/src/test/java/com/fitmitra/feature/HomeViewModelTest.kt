package com.fitmitra.feature

import com.fitmitra.feature.home.HomeViewModel
import org.junit.Assert.*
import org.junit.Test

class HomeViewModelTest {

    @Test
    fun testDefaultUiState() {
        val viewModel = HomeViewModel()
        val state = viewModel.uiState.value

        assertTrue(state.currentStreak >= 0)
        assertTrue(state.totalWorkouts >= 0)
        assertTrue(state.totalXp >= 0)
        assertTrue(state.level >= 1)
    }
}
