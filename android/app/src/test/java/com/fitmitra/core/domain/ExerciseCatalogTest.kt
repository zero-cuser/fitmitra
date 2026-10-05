package com.fitmitra.core.domain

import com.fitmitra.core.domain.exercises.ExerciseCatalog
import com.fitmitra.core.domain.models.ExerciseKey
import org.junit.Assert.*
import org.junit.Test

class ExerciseCatalogTest {

    @Test
    fun testAllCatalogExercisesExist() {
        val exercises = ExerciseCatalog.getAllExercises()
        assertEquals(5, exercises.size)

        val keys = exercises.map { it.key }.toSet()
        assertTrue(keys.contains(ExerciseKey.SQUATS))
        assertTrue(keys.contains(ExerciseKey.PUSHUPS))
        assertTrue(keys.contains(ExerciseKey.LUNGES))
        assertTrue(keys.contains(ExerciseKey.JUMPING_JACKS))
        assertTrue(keys.contains(ExerciseKey.PLANK))
    }

    @Test
    fun testExerciseThresholdsAreValid() {
        ExerciseCatalog.getAllExercises().forEach { ex ->
            assertTrue("${ex.name} must have positive default reps", ex.defaultReps > 0)
            assertTrue("${ex.name} must have positive calories per rep", ex.caloriesPerRep > 0f)
            assertTrue("${ex.name} up threshold must be non-zero", ex.thresholds.upThreshold > 0f)
            assertTrue("${ex.name} down threshold must be non-zero", ex.thresholds.downThreshold > 0f)
        }
    }

    @Test
    fun testSquatThresholdsMatchWebDomainSpecification() {
        val squat = ExerciseCatalog.getExercise(ExerciseKey.SQUATS)
        assertEquals(145.0f, squat.thresholds.upThreshold, 0.01f)
        assertEquals(125.0f, squat.thresholds.downThreshold, 0.01f)
        assertEquals(600L, squat.thresholds.repCooldownMs)
    }

    @Test
    fun testPushupThresholdsMatchWebDomainSpecification() {
        val pushup = ExerciseCatalog.getExercise(ExerciseKey.PUSHUPS)
        assertEquals(160.0f, pushup.thresholds.upThreshold, 0.01f)
        assertEquals(90.0f, pushup.thresholds.downThreshold, 0.01f)
    }
}
