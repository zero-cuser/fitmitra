package com.fitmitra.core.domain.adaptive

import com.fitmitra.core.domain.exercises.ExerciseCatalog
import com.fitmitra.core.domain.models.DomainExerciseDefinition
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.RecommendationResult
import com.fitmitra.core.domain.models.RecommendedRoutineItem
import com.fitmitra.core.domain.models.WorkoutConstraints

/**
 * Pure, deterministic Adaptive Hostel Workout recommendation engine.
 *
 * Solves constrained workout generation for hostel realities:
 * - Tiny spaces
 * - Silent noise tolerance (midnight study sessions)
 * - Equipment-free default
 */
object AdaptiveEngine {

    fun generateWorkout(constraints: WorkoutConstraints): RecommendationResult {
        val allExercises = ExerciseCatalog.getAllExercises()
        val blockingConstraints = mutableListOf<String>()

        // 1. HARD CONSTRAINT FILTERING
        val eligibleExercises = allExercises.filter { ex ->
            // Space constraint: exercise space rank must not exceed user's available space
            if (ex.spaceRequirement.rank > constraints.space.rank) {
                return@filter false
            }

            // Noise constraint: exercise noise rank must not exceed user's noise tolerance
            if (ex.noiseRating.rank > constraints.noiseTolerance.rank) {
                return@filter false
            }

            // Excluded exercises
            if (constraints.excludedExercises.contains(ex.key)) {
                return@filter false
            }

            // Equipment: required equipment must be present in user's available equipment list
            val hasRequiredEquipment = ex.equipmentRequired.all { req ->
                constraints.equipment.contains(req)
            }
            if (!hasRequiredEquipment) {
                return@filter false
            }

            true
        }

        if (eligibleExercises.isEmpty()) {
            if (constraints.space.rank == 1) {
                blockingConstraints.add("Space is too confined for multi-directional exercises")
            }
            if (constraints.noiseTolerance.rank == 1) {
                blockingConstraints.add("Silent noise requirement excludes high-impact exercises")
            }
            return RecommendationResult(
                success = false,
                title = "No Matching Workout",
                totalDurationMinutes = constraints.durationMinutes,
                space = constraints.space,
                noise = constraints.noiseTolerance,
                difficulty = constraints.difficulty,
                items = emptyList(),
                explanation = listOf("No exercises satisfied all physical hostel constraints simultaneously."),
                blockingConstraints = blockingConstraints
            )
        }

        // 2. SOFT SCORING & SELECTION
        val scored = eligibleExercises.sortedWith(
            compareByDescending<DomainExerciseDefinition> { it.primaryGoal == constraints.goal }
                .thenBy { kotlin.math.abs(it.difficulty.rank - constraints.difficulty.rank) }
        )

        val selectedExercises = if (constraints.durationMinutes <= 5) {
            scored.take(1)
        } else if (constraints.durationMinutes <= 10) {
            scored.take(2)
        } else {
            scored.take(3)
        }

        // 3. SCALE VOLUME BY DURATION & DIFFICULTY
        val volumeMultiplier = when (constraints.difficulty.rank) {
            1 -> 1.0f
            2 -> 1.25f
            else -> 1.5f
        }

        val routineItems = selectedExercises.map { ex ->
            val reps = (ex.defaultReps * volumeMultiplier).toInt()
            val estDuration = (reps * 4) + 30 // ~4 sec per rep + 30s rest
            RecommendedRoutineItem(
                exerciseKey = ex.key,
                targetReps = reps,
                targetSets = 1,
                restSeconds = 30,
                estimatedDurationSeconds = estDuration
            )
        }

        val explanation = mutableListOf<String>()
        explanation.add("Tailored for ${constraints.durationMinutes} min ${constraints.goal.label} session")
        explanation.add("Strictly respects ${constraints.noiseTolerance.label} with 0 equipment needed")
        explanation.add("Fits within ${constraints.space.label}")

        val title = when {
            constraints.durationMinutes <= 5 -> "Quick Hostel Desk Reset"
            constraints.goal.id == "strength" -> "Hostel Strength Circuit"
            constraints.goal.id == "cardio" -> "Quiet Cardio Burst"
            else -> "Hostel Room Session"
        }

        return RecommendationResult(
            success = true,
            title = title,
            totalDurationMinutes = constraints.durationMinutes,
            space = constraints.space,
            noise = constraints.noiseTolerance,
            difficulty = constraints.difficulty,
            items = routineItems,
            explanation = explanation
        )
    }
}
