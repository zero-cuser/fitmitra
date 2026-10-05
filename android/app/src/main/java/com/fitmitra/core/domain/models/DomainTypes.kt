package com.fitmitra.core.domain.models

/**
 * Platform-independent FitMitra domain types.
 *
 * 100% pure Kotlin models reflecting the shared FitMitra domain specification.
 */

enum class ExerciseKey(val id: String, val displayName: String) {
    SQUATS("squats", "Bodyweight Squats"),
    PUSHUPS("pushups", "Push-Ups"),
    LUNGES("lunges", "Forward Lunges"),
    JUMPING_JACKS("jumpingJacks", "Jumping Jacks"),
    PLANK("plank", "Forearm Plank");

    companion object {
        fun fromId(id: String): ExerciseKey =
            entries.find { it.id.equals(id, ignoreCase = true) } ?: SQUATS
    }
}

enum class FitnessGoal(val id: String, val label: String) {
    STRENGTH("strength", "Build Strength"),
    CARDIO("cardio", "Cardio & Stamina"),
    WELLNESS("wellness", "Active Recovery & Mobility"),
    POSTURE("posture", "Desk Posture Reset");

    companion object {
        fun fromId(id: String): FitnessGoal =
            entries.find { it.id.equals(id, ignoreCase = true) } ?: STRENGTH
    }
}

enum class SpaceRequirement(val rank: Int, val label: String) {
    TINY(1, "Tiny (Bedside, ~1x1m)"),
    SMALL(2, "Small (Room aisle, ~2x1m)"),
    MEDIUM(3, "Medium (Open floor, ~2x2m)"),
    LARGE(4, "Large (Full corridor/gym)");
}

enum class NoiseRating(val rank: Int, val label: String) {
    SILENT(1, "Silent (Midnight safe, 0 sound)"),
    LOW(2, "Low (Controlled floor contact)"),
    MODERATE(3, "Moderate (Normal daytime)"),
    HIGH(4, "High (Jumping permitted)");
}

enum class ExerciseDifficulty(val rank: Int, val label: String) {
    BEGINNER(1, "Beginner"),
    INTERMEDIATE(2, "Intermediate"),
    ADVANCED(3, "Advanced");
}

enum class EquipmentType(val id: String, val label: String) {
    NONE("none", "No Equipment"),
    CHAIR("chair", "Hostel Chair"),
    MAT("mat", "Yoga Mat"),
    WALL("wall", "Wall Support");
}

enum class MovementDirection {
    DECREASING_FLEXION,
    INCREASING_ABDUCTION,
    ISOMETRIC_HOLD
}

enum class WorkoutSessionState {
    IDLE,
    PREPARING,
    ACTIVE,
    PAUSED,
    COMPLETING,
    COMPLETED,
    CANCELLED
}

data class RepTransitionThresholds(
    val upThreshold: Float,
    val downThreshold: Float,
    val minHoldMs: Long = 0L,
    val repCooldownMs: Long = 600L
)

data class DomainExerciseDefinition(
    val key: ExerciseKey,
    val name: String,
    val description: String,
    val targetMuscles: List<String>,
    val movementDirection: MovementDirection,
    val thresholds: RepTransitionThresholds,
    val defaultReps: Int,
    val caloriesPerRep: Float,
    val spaceRequirement: SpaceRequirement,
    val noiseRating: NoiseRating,
    val equipmentRequired: List<EquipmentType>,
    val difficulty: ExerciseDifficulty,
    val primaryGoal: FitnessGoal,
    val minConfidenceThreshold: Float = 0.65f
)

data class WorkoutConstraints(
    val durationMinutes: Int = 7,
    val space: SpaceRequirement = SpaceRequirement.SMALL,
    val noiseTolerance: NoiseRating = NoiseRating.SILENT,
    val equipment: List<EquipmentType> = listOf(EquipmentType.NONE),
    val goal: FitnessGoal = FitnessGoal.STRENGTH,
    val difficulty: ExerciseDifficulty = ExerciseDifficulty.BEGINNER,
    val excludedExercises: List<ExerciseKey> = emptyList()
)

data class RecommendedRoutineItem(
    val exerciseKey: ExerciseKey,
    val targetReps: Int,
    val targetSets: Int = 1,
    val restSeconds: Int = 30,
    val estimatedDurationSeconds: Int
)

data class RecommendationResult(
    val success: Boolean,
    val title: String,
    val totalDurationMinutes: Int,
    val space: SpaceRequirement,
    val noise: NoiseRating,
    val difficulty: ExerciseDifficulty,
    val items: List<RecommendedRoutineItem>,
    val explanation: List<String>,
    val blockingConstraints: List<String> = emptyList()
)

data class WorkoutSummary(
    val id: String,
    val timestamp: Long,
    val exerciseKey: ExerciseKey,
    val exerciseName: String,
    val completedReps: Int,
    val targetReps: Int,
    val durationSeconds: Int,
    val caloriesBurned: Int,
    val xpEarned: Int,
    val averagePostureScore: Int,
    val isCompleted: Boolean
)

data class StreakSummary(
    val currentStreakDays: Int,
    val longestStreakDays: Int,
    val isStreakActiveToday: Boolean,
    val lastActiveDate: String?
)

data class CampusChallenge(
    val id: String,
    val title: String,
    val description: String,
    val targetValue: Int,
    val unit: String,
    val daysRemaining: Int,
    val targetExercise: ExerciseKey? = null
)

data class ChallengeParticipation(
    val challengeId: String,
    val currentValue: Int,
    val isCompleted: Boolean,
    val processedActivityIds: Set<String> = emptySet()
)
