package com.fitmitra.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

sealed interface Screen {
    data object Home : Screen
    data object WorkoutSelection : Screen
    data class WorkoutSetup(val exerciseKey: String, val targetReps: Int = 12) : Screen
    data class PoseCoach(val exerciseKey: String, val targetReps: Int = 12) : Screen
    data class Completion(
        val exerciseKey: String,
        val exerciseName: String,
        val completedReps: Int,
        val targetReps: Int,
        val durationSeconds: Int,
        val caloriesBurned: Double,
        val xpEarned: Int
    ) : Screen
    data object Progress : Screen
    data object Exam : Screen
    data object Challenges : Screen
}

class AppNavigationState(initial: Screen = Screen.Home) {
    var currentScreen by mutableStateOf<Screen>(initial)
        private set

    private val backStack = mutableListOf<Screen>()

    fun navigateTo(screen: Screen) {
        backStack.add(currentScreen)
        currentScreen = screen
    }

    fun popBack(): Boolean {
        if (backStack.isNotEmpty()) {
            currentScreen = backStack.removeAt(backStack.size - 1)
            return true
        }
        return false
    }

    fun navigateHome() {
        backStack.clear()
        currentScreen = Screen.Home
    }
}
