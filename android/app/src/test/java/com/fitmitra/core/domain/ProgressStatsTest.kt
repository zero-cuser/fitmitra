package com.fitmitra.core.domain

import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.WorkoutSummary
import com.fitmitra.core.domain.progress.ProgressStats
import org.junit.Assert.*
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Locale

class ProgressStatsTest {

    private val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    @Test
    fun testEmptyHistoryYieldsZeroStreak() {
        val streak = ProgressStats.calculateStreak(emptyList())
        assertEquals(0, streak.currentStreakDays)
        assertEquals(0, streak.longestStreakDays)
        assertFalse(streak.isStreakActiveToday)
    }

    @Test
    fun testConsecutiveDaysCalculatesStreakCorrectly() {
        val todayMs = sdf.parse("2026-10-05")!!.time
        val yesterdayMs = sdf.parse("2026-10-04")!!.time
        val twoDaysAgoMs = sdf.parse("2026-10-03")!!.time

        val streak = ProgressStats.calculateStreak(
            listOf(twoDaysAgoMs, yesterdayMs, todayMs),
            currentDateString = "2026-10-05"
        )

        assertEquals(3, streak.currentStreakDays)
        assertEquals(3, streak.longestStreakDays)
        assertTrue(streak.isStreakActiveToday)
    }

    @Test
    fun testWeeklyTotalsAggregation() {
        val summaries = listOf(
            WorkoutSummary(
                id = "1", timestamp = 1000L, exerciseKey = ExerciseKey.SQUATS,
                exerciseName = "Squats", completedReps = 12, targetReps = 12,
                durationSeconds = 60, caloriesBurned = 10, xpEarned = 100,
                averagePostureScore = 90, isCompleted = true
            ),
            WorkoutSummary(
                id = "2", timestamp = 2000L, exerciseKey = ExerciseKey.PUSHUPS,
                exerciseName = "Pushups", completedReps = 10, targetReps = 10,
                durationSeconds = 50, caloriesBurned = 15, xpEarned = 120,
                averagePostureScore = 95, isCompleted = true
            )
        )

        val totals = ProgressStats.calculateWeeklyTotals(summaries)
        assertEquals(2, totals.totalWorkouts)
        assertEquals(22, totals.totalReps)
        assertEquals(110, totals.totalDurationSeconds)
        assertEquals(25, totals.totalCalories)
        assertEquals(220, totals.totalXp)
    }
}
