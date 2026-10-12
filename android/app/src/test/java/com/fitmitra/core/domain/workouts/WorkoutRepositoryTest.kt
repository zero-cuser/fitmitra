package com.fitmitra.core.domain.workouts

import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.WorkoutSummary
import com.fitmitra.core.platform.FakeAppStorage
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class WorkoutRepositoryTest {

    private lateinit var storage: FakeAppStorage
    private lateinit var repository: WorkoutRepository

    @Before
    fun setUp() {
        storage = FakeAppStorage()
        repository = WorkoutRepository(storage)
    }

    @Test
    fun testInitialDefaultsAreZero() = runBlocking {
        val stats = repository.getLifetimeStats()
        assertEquals(0, stats.totalWorkouts)
        assertEquals(0, stats.totalReps)
        assertEquals(0, stats.totalCalories)
        assertEquals(0, stats.totalXp)
        assertEquals(0, stats.currentStreak)
        assertEquals(0, stats.longestStreak)
        assertFalse(stats.isActiveToday)

        val summaries = repository.getWorkoutSummaries()
        assertTrue(summaries.isEmpty())
    }

    @Test
    fun testRecordCompletedSessionIdempotency() = runBlocking {
        val summary = WorkoutSummary(
            id = "sess_test_101",
            timestamp = System.currentTimeMillis(),
            exerciseKey = ExerciseKey.SQUATS,
            exerciseName = "Bodyweight Squats",
            completedReps = 12,
            targetReps = 12,
            durationSeconds = 65,
            caloriesBurned = 15,
            xpEarned = 70,
            averagePostureScore = 95,
            isCompleted = true
        )

        // First recording must succeed
        val firstResult = repository.recordCompletedSession(summary)
        assertTrue("First session recording should succeed", firstResult)

        val statsAfterFirst = repository.getLifetimeStats()
        assertEquals(1, statsAfterFirst.totalWorkouts)
        assertEquals(12, statsAfterFirst.totalReps)
        assertEquals(15, statsAfterFirst.totalCalories)
        assertEquals(70, statsAfterFirst.totalXp)
        assertEquals(1, statsAfterFirst.currentStreak)
        assertTrue(statsAfterFirst.isActiveToday)

        // Duplicate recording with identical session ID must be rejected (idempotency)
        val duplicateResult = repository.recordCompletedSession(summary)
        assertFalse("Duplicate session recording must be rejected", duplicateResult)

        val statsAfterDuplicate = repository.getLifetimeStats()
        assertEquals("Total workouts must not increment on duplicate", 1, statsAfterDuplicate.totalWorkouts)
        assertEquals("Total reps must not inflate on duplicate", 12, statsAfterDuplicate.totalReps)
        assertEquals("Current streak must remain 1", 1, statsAfterDuplicate.currentStreak)

        val summaries = repository.getWorkoutSummaries()
        assertEquals(1, summaries.size)
        assertEquals("sess_test_101", summaries[0].id)
    }

    @Test
    fun testRejectIncompleteOrCancelledSession() = runBlocking {
        val incompleteSummary = WorkoutSummary(
            id = "sess_incomplete_001",
            timestamp = System.currentTimeMillis(),
            exerciseKey = ExerciseKey.PUSHUPS,
            exerciseName = "Push-Ups",
            completedReps = 4,
            targetReps = 10,
            durationSeconds = 20,
            caloriesBurned = 5,
            xpEarned = 10,
            averagePostureScore = 80,
            isCompleted = false
        )

        val result = repository.recordCompletedSession(incompleteSummary)
        assertFalse("Incomplete or cancelled session must be rejected", result)

        val stats = repository.getLifetimeStats()
        assertEquals(0, stats.totalWorkouts)
        assertEquals(0, stats.totalReps)
        assertEquals(0, stats.currentStreak)

        val summaries = repository.getWorkoutSummaries()
        assertTrue("Summaries list must remain empty", summaries.isEmpty())
    }

    @Test
    fun testSameDayMultipleWorkoutsDoNotInflateStreak() = runBlocking {
        val now = System.currentTimeMillis()

        val workout1 = WorkoutSummary(
            id = "sess_day1_a",
            timestamp = now,
            exerciseKey = ExerciseKey.SQUATS,
            exerciseName = "Bodyweight Squats",
            completedReps = 10,
            targetReps = 10,
            durationSeconds = 60,
            caloriesBurned = 12,
            xpEarned = 60,
            averagePostureScore = 90,
            isCompleted = true
        )

        val workout2 = WorkoutSummary(
            id = "sess_day1_b",
            timestamp = now + 3600_000L, // 1 hour later, same day
            exerciseKey = ExerciseKey.LUNGES,
            exerciseName = "Forward Lunges",
            completedReps = 12,
            targetReps = 12,
            durationSeconds = 70,
            caloriesBurned = 14,
            xpEarned = 70,
            averagePostureScore = 92,
            isCompleted = true
        )

        repository.recordCompletedSession(workout1)
        repository.recordCompletedSession(workout2)

        val stats = repository.getLifetimeStats()
        assertEquals(2, stats.totalWorkouts)
        assertEquals(22, stats.totalReps)
        assertEquals("Multiple workouts on the same day must count as 1 streak day", 1, stats.currentStreak)
        assertTrue(stats.isActiveToday)
    }

    @Test
    fun testConsecutiveDaysStreakIncrementsProperly() = runBlocking {
        val now = System.currentTimeMillis()
        val oneDayMs = 24 * 60 * 60 * 1000L

        // Workout yesterday
        val yesterdayWorkout = WorkoutSummary(
            id = "sess_yesterday",
            timestamp = now - oneDayMs,
            exerciseKey = ExerciseKey.SQUATS,
            exerciseName = "Bodyweight Squats",
            completedReps = 15,
            targetReps = 15,
            durationSeconds = 80,
            caloriesBurned = 18,
            xpEarned = 85,
            averagePostureScore = 91,
            isCompleted = true
        )

        // Workout today
        val todayWorkout = WorkoutSummary(
            id = "sess_today",
            timestamp = now,
            exerciseKey = ExerciseKey.PUSHUPS,
            exerciseName = "Push-Ups",
            completedReps = 10,
            targetReps = 10,
            durationSeconds = 50,
            caloriesBurned = 12,
            xpEarned = 60,
            averagePostureScore = 94,
            isCompleted = true
        )

        repository.recordCompletedSession(yesterdayWorkout)
        repository.recordCompletedSession(todayWorkout)

        val stats = repository.getLifetimeStats()
        assertEquals(2, stats.totalWorkouts)
        assertEquals(25, stats.totalReps)
        assertEquals(2, stats.currentStreak)
        assertTrue(stats.isActiveToday)
    }

    @Test
    fun testChallengeProgressSynchronizedAndIdempotent() = runBlocking {
        val squatSummary = WorkoutSummary(
            id = "sess_challenge_squat",
            timestamp = System.currentTimeMillis(),
            exerciseKey = ExerciseKey.SQUATS,
            exerciseName = "Bodyweight Squats",
            completedReps = 25,
            targetReps = 25,
            durationSeconds = 120,
            caloriesBurned = 30,
            xpEarned = 140,
            averagePostureScore = 96,
            isCompleted = true
        )

        repository.recordCompletedSession(squatSummary)

        val participations = repository.getChallengeParticipations()
        val squatChallenge = participations.find { it.challengeId == "chal_squats_100" }
        assertNotNull(squatChallenge)
        assertEquals(25, squatChallenge!!.currentValue)
        assertTrue(squatChallenge.processedActivityIds.contains("sess_challenge_squat"))
    }
}
