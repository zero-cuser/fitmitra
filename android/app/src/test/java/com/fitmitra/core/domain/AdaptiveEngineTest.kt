package com.fitmitra.core.domain

import com.fitmitra.core.domain.adaptive.AdaptiveEngine
import com.fitmitra.core.domain.models.*
import org.junit.Assert.*
import org.junit.Test

class AdaptiveEngineTest {

    @Test
    fun testShortDurationGeneratesSingleExercise() {
        val constraints = WorkoutConstraints(
            durationMinutes = 5,
            space = SpaceRequirement.SMALL,
            noiseTolerance = NoiseRating.SILENT,
            goal = FitnessGoal.STRENGTH
        )

        val result = AdaptiveEngine.generateWorkout(constraints)
        assertTrue(result.success)
        assertEquals(1, result.items.size)
        assertTrue(result.explanation.isNotEmpty())
    }

    @Test
    fun testMediumDurationGeneratesMultipleExercises() {
        val constraints = WorkoutConstraints(
            durationMinutes = 10,
            space = SpaceRequirement.MEDIUM,
            noiseTolerance = NoiseRating.MODERATE,
            goal = FitnessGoal.STRENGTH
        )

        val result = AdaptiveEngine.generateWorkout(constraints)
        assertTrue(result.success)
        assertEquals(2, result.items.size)
    }

    @Test
    fun testSilentNoiseConstraintExcludesJumpingJacks() {
        val constraints = WorkoutConstraints(
            durationMinutes = 15,
            space = SpaceRequirement.LARGE,
            noiseTolerance = NoiseRating.SILENT,
            goal = FitnessGoal.CARDIO
        )

        val result = AdaptiveEngine.generateWorkout(constraints)
        assertTrue(result.success)
        val hasJumpingJacks = result.items.any { it.exerciseKey == ExerciseKey.JUMPING_JACKS }
        assertFalse("Silent constraint must strictly exclude jumping jacks", hasJumpingJacks)
    }

    @Test
    fun testDeterministicExplainability() {
        val constraints = WorkoutConstraints(
            durationMinutes = 7,
            space = SpaceRequirement.SMALL,
            noiseTolerance = NoiseRating.SILENT,
            goal = FitnessGoal.POSTURE
        )

        val result1 = AdaptiveEngine.generateWorkout(constraints)
        val result2 = AdaptiveEngine.generateWorkout(constraints)

        assertEquals(result1.title, result2.title)
        assertEquals(result1.items.size, result2.items.size)
        assertEquals(result1.explanation, result2.explanation)
    }
}
