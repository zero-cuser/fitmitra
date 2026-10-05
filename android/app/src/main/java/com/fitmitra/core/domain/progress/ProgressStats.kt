package com.fitmitra.core.domain.progress

import com.fitmitra.core.domain.models.StreakSummary
import com.fitmitra.core.domain.models.WorkoutSummary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max

data class WeeklyProgressTotals(
    val totalWorkouts: Int,
    val totalReps: Int,
    val totalDurationSeconds: Int,
    val totalCalories: Int,
    val totalXp: Int
)

/**
 * Pure calculation rules for streaks and weekly fitness summaries.
 */
object ProgressStats {

    private val DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    fun calculateStreak(
        sessionTimestamps: List<Long>,
        currentDateString: String = DATE_FORMAT.format(Date())
    ): StreakSummary {
        if (sessionTimestamps.isEmpty()) {
            return StreakSummary(
                currentStreakDays = 0,
                longestStreakDays = 0,
                isStreakActiveToday = false,
                lastActiveDate = null
            )
        }

        // Convert timestamps to sorted unique date strings (descending)
        val uniqueDates = sessionTimestamps
            .map { DATE_FORMAT.format(Date(it)) }
            .distinct()
            .sortedDescending()

        val isTodayActive = uniqueDates.contains(currentDateString)
        var currentStreak = 0
        var longestStreak = 0

        // Determine reference date for streak continuity
        var expectedEpochDay = getEpochDay(currentDateString)
        val firstDateEpochDay = getEpochDay(uniqueDates.first())

        if (firstDateEpochDay < expectedEpochDay - 1) {
            // Last workout was before yesterday -> streak is broken
            currentStreak = 0
        } else {
            // Streak is alive either from today or yesterday
            var prevEpochDay = if (isTodayActive) expectedEpochDay else expectedEpochDay - 1
            for (dateStr in uniqueDates) {
                val epochDay = getEpochDay(dateStr)
                if (epochDay == prevEpochDay) {
                    currentStreak++
                    prevEpochDay--
                } else if (epochDay < prevEpochDay) {
                    break
                }
            }
        }

        // Longest streak calculation
        var tempStreak = 0
        var lastDay = -1L
        for (dateStr in uniqueDates.reversed()) {
            val day = getEpochDay(dateStr)
            if (lastDay == -1L || day == lastDay + 1) {
                tempStreak++
            } else if (day > lastDay + 1) {
                tempStreak = 1
            }
            longestStreak = max(longestStreak, tempStreak)
            lastDay = day
        }

        return StreakSummary(
            currentStreakDays = currentStreak,
            longestStreakDays = max(longestStreak, currentStreak),
            isStreakActiveToday = isTodayActive,
            lastActiveDate = uniqueDates.firstOrNull()
        )
    }

    fun calculateWeeklyTotals(summaries: List<WorkoutSummary>): WeeklyProgressTotals {
        return WeeklyProgressTotals(
            totalWorkouts = summaries.size,
            totalReps = summaries.sumOf { it.completedReps },
            totalDurationSeconds = summaries.sumOf { it.durationSeconds },
            totalCalories = summaries.sumOf { it.caloriesBurned },
            totalXp = summaries.sumOf { it.xpEarned }
        )
    }

    private fun getEpochDay(dateStr: String): Long {
        return try {
            val date = DATE_FORMAT.parse(dateStr) ?: return 0L
            date.time / (1000L * 60 * 60 * 24)
        } catch (_: Exception) {
            0L
        }
    }
}
