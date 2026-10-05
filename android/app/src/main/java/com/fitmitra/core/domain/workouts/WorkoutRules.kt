package com.fitmitra.core.domain.workouts

import com.fitmitra.core.domain.exercises.ExerciseCatalog
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.WorkoutSummary
import kotlin.math.roundToInt

data class LevelProgressInfo(
    val level: Int,
    val currentLevelXp: Int,
    val nextLevelXp: Int,
    val levelProgressPercent: Int
)

/**
 * Pure calculation rules for workouts, calories, and user XP progression.
 */
object WorkoutRules {

    fun calculateCaloriesBurned(exerciseKey: ExerciseKey, reps: Int): Int {
        val definition = ExerciseCatalog.getExercise(exerciseKey)
        return (reps * definition.caloriesPerRep).roundToInt().coerceAtLeast(1)
    }

    fun calculateXpEarned(reps: Int, isCompleted: Boolean, perfectForm: Boolean = false): Int {
        var xp = reps * 10
        if (isCompleted) xp += 50
        if (perfectForm) xp += 25
        return xp
    }

    fun calculateLevelFromXp(totalXp: Int): LevelProgressInfo {
        // Level formula: Level 1 = 0-99 XP, Level 2 = 100-199 XP, etc. (100 XP per level base)
        val level = (totalXp / 100) + 1
        val currentLevelXp = totalXp % 100
        val nextLevelXp = 100
        val progressPercent = ((currentLevelXp.toFloat() / nextLevelXp) * 100).roundToInt()

        return LevelProgressInfo(
            level = level,
            currentLevelXp = currentLevelXp,
            nextLevelXp = nextLevelXp,
            levelProgressPercent = progressPercent
        )
    }

    fun createSessionSummary(
        exerciseKey: ExerciseKey,
        completedReps: Int,
        targetReps: Int,
        durationSeconds: Int,
        averagePostureScore: Int = 90
    ): WorkoutSummary {
        val isCompleted = completedReps >= targetReps
        val calories = calculateCaloriesBurned(exerciseKey, completedReps)
        val xp = calculateXpEarned(completedReps, isCompleted, averagePostureScore >= 95)
        val def = ExerciseCatalog.getExercise(exerciseKey)

        return WorkoutSummary(
            id = "sess_${System.currentTimeMillis()}",
            timestamp = System.currentTimeMillis(),
            exerciseKey = exerciseKey,
            exerciseName = def.name,
            completedReps = completedReps,
            targetReps = targetReps,
            durationSeconds = durationSeconds,
            caloriesBurned = calories,
            xpEarned = xp,
            averagePostureScore = averagePostureScore,
            isCompleted = isCompleted
        )
    }
}
