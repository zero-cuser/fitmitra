package com.fitmitra.core.domain

import com.fitmitra.core.domain.challenges.ChallengeRules
import com.fitmitra.core.domain.models.CampusChallenge
import com.fitmitra.core.domain.models.ChallengeParticipation
import com.fitmitra.core.domain.models.ExerciseKey
import org.junit.Assert.*
import org.junit.Test

class ChallengeRulesTest {

    @Test
    fun testPercentageCalculation() {
        assertEquals(0, ChallengeRules.calculatePercentage(0, 100))
        assertEquals(50, ChallengeRules.calculatePercentage(50, 100))
        assertEquals(100, ChallengeRules.calculatePercentage(100, 100))
        assertEquals(100, ChallengeRules.calculatePercentage(150, 100)) // Capped at 100
    }

    @Test
    fun testActivityDeduplicationIdempotency() {
        val challenge = CampusChallenge(
            id = "chal_squats",
            title = "Squat Challenge",
            description = "Do squats",
            targetValue = 50,
            unit = "reps",
            daysRemaining = 3,
            targetExercise = ExerciseKey.SQUATS
        )

        var participation = ChallengeParticipation(
            challengeId = "chal_squats",
            currentValue = 10,
            isCompleted = false
        )

        // Record workout
        participation = ChallengeRules.recordActivity(
            activityId = "act_101",
            exerciseKey = ExerciseKey.SQUATS,
            reps = 15,
            challenge = challenge,
            currentParticipation = participation
        )
        assertEquals(25, participation.currentValue)
        assertFalse(participation.isCompleted)

        // Record SAME activity again (should be ignored)
        val duplicateResult = ChallengeRules.recordActivity(
            activityId = "act_101",
            exerciseKey = ExerciseKey.SQUATS,
            reps = 15,
            challenge = challenge,
            currentParticipation = participation
        )
        assertEquals("Duplicate activity must not increment challenge progress", 25, duplicateResult.currentValue)
    }
}
