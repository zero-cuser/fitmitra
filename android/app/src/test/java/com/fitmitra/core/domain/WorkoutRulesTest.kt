package com.fitmitra.core.domain

import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.workouts.WorkoutRules
import org.junit.Assert.*
import org.junit.Test

class WorkoutRulesTest {

    @Test
    fun testCaloriesCalculation() {
        val squatCalories = WorkoutRules.calculateCaloriesBurned(ExerciseKey.SQUATS, 20)
        assertTrue(squatCalories > 0)

        val pushupCalories = WorkoutRules.calculateCaloriesBurned(ExerciseKey.PUSHUPS, 20)
        assertTrue(pushupCalories > squatCalories) // Push-ups have higher cal/rep
    }

    @Test
    fun testXpProgressionAndLevel() {
        val xp = WorkoutRules.calculateXpEarned(reps = 10, isCompleted = true, perfectForm = true)
        // 10*10 = 100 + 50 (completed) + 25 (perfect) = 175
        assertEquals(175, xp)

        val levelInfo = WorkoutRules.calculateLevelFromXp(250)
        assertEquals(3, levelInfo.level)
        assertEquals(50, levelInfo.currentLevelXp)
        assertEquals(50, levelInfo.levelProgressPercent)
    }

    @Test
    fun testSessionSummaryCreation() {
        val summary = WorkoutRules.createSessionSummary(
            exerciseKey = ExerciseKey.SQUATS,
            completedReps = 15,
            targetReps = 12,
            durationSeconds = 65
        )

        assertTrue(summary.isCompleted)
        assertEquals(15, summary.completedReps)
        assertEquals(12, summary.targetReps)
        assertEquals(65, summary.durationSeconds)
        assertTrue(summary.caloriesBurned > 0)
        assertTrue(summary.xpEarned > 0)
    }
}
