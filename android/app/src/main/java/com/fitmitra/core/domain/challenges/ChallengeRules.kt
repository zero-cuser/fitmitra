package com.fitmitra.core.domain.challenges

import com.fitmitra.core.domain.models.CampusChallenge
import com.fitmitra.core.domain.models.ChallengeParticipation
import com.fitmitra.core.domain.models.ExerciseKey
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Pure challenge calculations and deduplication rules for FitMitra.
 */
object ChallengeRules {

    val ACTIVE_CAMPUS_CHALLENGES = listOf(
        CampusChallenge(
            id = "chal_squats_100",
            title = "Hostel 100 Squat Sprint",
            description = "Complete 100 clean bodyweight squats across your study breaks this week.",
            targetValue = 100,
            unit = "reps",
            daysRemaining = 5,
            targetExercise = ExerciseKey.SQUATS
        ),
        CampusChallenge(
            id = "chal_desk_reset_50",
            title = "Midnight Desk Reset",
            description = "Complete 50 reps of movement during late-night study sessions.",
            targetValue = 50,
            unit = "reps",
            daysRemaining = 3,
            targetExercise = ExerciseKey.SQUATS
        ),
        CampusChallenge(
            id = "chal_streak_7",
            title = "7-Day Exam Mode Streak",
            description = "Log at least one Exam Mode or workout session each day for 7 days.",
            targetValue = 7,
            unit = "days",
            daysRemaining = 7,
            targetExercise = null
        )
    )

    fun calculatePercentage(current: Int, target: Int): Int {
        if (target <= 0) return 100
        val pct = (current.toFloat() / target * 100).roundToInt()
        return min(100, pct.coerceAtLeast(0))
    }

    fun isComplete(current: Int, target: Int): Boolean =
        current >= target

    /**
     * Pure activity recording function with strict idempotency / deduplication.
     */
    fun recordActivity(
        activityId: String,
        exerciseKey: ExerciseKey,
        reps: Int,
        challenge: CampusChallenge,
        currentParticipation: ChallengeParticipation
    ): ChallengeParticipation {
        // Discard if already processed
        if (currentParticipation.processedActivityIds.contains(activityId)) {
            return currentParticipation
        }

        // Check if exercise matches challenge target
        val shouldIncrement = challenge.targetExercise == null || challenge.targetExercise == exerciseKey
        val increment = if (shouldIncrement) reps else 0
        val newValue = currentParticipation.currentValue + increment
        val completed = newValue >= challenge.targetValue

        return currentParticipation.copy(
            currentValue = newValue,
            isCompleted = completed,
            processedActivityIds = currentParticipation.processedActivityIds + activityId
        )
    }
}
