package com.fitmitra.core.domain.exercises

import com.fitmitra.core.domain.models.DomainExerciseDefinition
import com.fitmitra.core.domain.models.EquipmentType
import com.fitmitra.core.domain.models.ExerciseDifficulty
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.FitnessGoal
import com.fitmitra.core.domain.models.MovementDirection
import com.fitmitra.core.domain.models.NoiseRating
import com.fitmitra.core.domain.models.RepTransitionThresholds
import com.fitmitra.core.domain.models.SpaceRequirement

/**
 * Single source of truth exercise catalog for FitMitra Android.
 *
 * Exact threshold parity with FitMitra Web Domain (src/domain/exercises/exerciseCatalog.ts).
 */
object ExerciseCatalog {

    val CATALOG: Map<ExerciseKey, DomainExerciseDefinition> = mapOf(
        ExerciseKey.SQUATS to DomainExerciseDefinition(
            key = ExerciseKey.SQUATS,
            name = "Bodyweight Squats",
            description = "Compound lower body exercise targeting quadriceps, hamstrings, and glutes.",
            targetMuscles = listOf("Quadriceps", "Glutes", "Hamstrings"),
            movementDirection = MovementDirection.DECREASING_FLEXION,
            thresholds = RepTransitionThresholds(
                upThreshold = 145.0f,
                downThreshold = 125.0f,
                minHoldMs = 0L,
                repCooldownMs = 600L
            ),
            defaultReps = 12,
            caloriesPerRep = 0.32f,
            spaceRequirement = SpaceRequirement.SMALL,
            noiseRating = NoiseRating.SILENT,
            equipmentRequired = listOf(EquipmentType.NONE),
            difficulty = ExerciseDifficulty.BEGINNER,
            primaryGoal = FitnessGoal.STRENGTH
        ),

        ExerciseKey.PUSHUPS to DomainExerciseDefinition(
            key = ExerciseKey.PUSHUPS,
            name = "Push-Ups",
            description = "Upper body pushing exercise targeting chest, triceps, and anterior deltoids.",
            targetMuscles = listOf("Chest", "Triceps", "Shoulders", "Core"),
            movementDirection = MovementDirection.DECREASING_FLEXION,
            thresholds = RepTransitionThresholds(
                upThreshold = 160.0f,
                downThreshold = 90.0f,
                minHoldMs = 0L,
                repCooldownMs = 600L
            ),
            defaultReps = 10,
            caloriesPerRep = 0.45f,
            spaceRequirement = SpaceRequirement.SMALL,
            noiseRating = NoiseRating.SILENT,
            equipmentRequired = listOf(EquipmentType.NONE),
            difficulty = ExerciseDifficulty.INTERMEDIATE,
            primaryGoal = FitnessGoal.STRENGTH
        ),

        ExerciseKey.LUNGES to DomainExerciseDefinition(
            key = ExerciseKey.LUNGES,
            name = "Forward Lunges",
            description = "Unilateral lower body movement testing stability, glute, and quadricep drive.",
            targetMuscles = listOf("Quadriceps", "Glutes", "Calves"),
            movementDirection = MovementDirection.DECREASING_FLEXION,
            thresholds = RepTransitionThresholds(
                upThreshold = 160.0f,
                downThreshold = 90.0f,
                minHoldMs = 0L,
                repCooldownMs = 600L
            ),
            defaultReps = 10,
            caloriesPerRep = 0.38f,
            spaceRequirement = SpaceRequirement.MEDIUM,
            noiseRating = NoiseRating.SILENT,
            equipmentRequired = listOf(EquipmentType.NONE),
            difficulty = ExerciseDifficulty.BEGINNER,
            primaryGoal = FitnessGoal.STRENGTH
        ),

        ExerciseKey.JUMPING_JACKS to DomainExerciseDefinition(
            key = ExerciseKey.JUMPING_JACKS,
            name = "Jumping Jacks",
            description = "Full body cardiovascular movement increasing heart rate and aerobic endurance.",
            targetMuscles = listOf("Cardiovascular", "Calves", "Deltoids"),
            movementDirection = MovementDirection.INCREASING_ABDUCTION,
            thresholds = RepTransitionThresholds(
                upThreshold = 95.0f,
                downThreshold = 70.0f,
                minHoldMs = 0L,
                repCooldownMs = 450L
            ),
            defaultReps = 25,
            caloriesPerRep = 0.20f,
            spaceRequirement = SpaceRequirement.MEDIUM,
            noiseRating = NoiseRating.HIGH,
            equipmentRequired = listOf(EquipmentType.NONE),
            difficulty = ExerciseDifficulty.BEGINNER,
            primaryGoal = FitnessGoal.CARDIO
        ),

        ExerciseKey.PLANK to DomainExerciseDefinition(
            key = ExerciseKey.PLANK,
            name = "Forearm Plank",
            description = "Isometric core stability hold reinforcing abdominal bracing and spine alignment.",
            targetMuscles = listOf("Core", "Transverse Abdominis", "Lower Back"),
            movementDirection = MovementDirection.ISOMETRIC_HOLD,
            thresholds = RepTransitionThresholds(
                upThreshold = 180.0f,
                downThreshold = 165.0f,
                minHoldMs = 1000L,
                repCooldownMs = 0L
            ),
            defaultReps = 30, // seconds
            caloriesPerRep = 0.08f,
            spaceRequirement = SpaceRequirement.SMALL,
            noiseRating = NoiseRating.SILENT,
            equipmentRequired = listOf(EquipmentType.NONE),
            difficulty = ExerciseDifficulty.BEGINNER,
            primaryGoal = FitnessGoal.POSTURE
        )
    )

    fun getExercise(key: ExerciseKey): DomainExerciseDefinition =
        CATALOG[key] ?: CATALOG.values.first()

    fun getAllExercises(): List<DomainExerciseDefinition> =
        CATALOG.values.toList()
}
