package com.fitmitra.core.platform.android

import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.SyncConsent
import com.fitmitra.core.domain.models.SyncStatusState
import com.fitmitra.core.domain.models.WorkoutSummary
import com.fitmitra.core.domain.workouts.WorkoutRepository
import com.fitmitra.core.platform.FakeAppStorage
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class RemoteSyncRepositoryTest {

    private lateinit var storage: FakeAppStorage
    private lateinit var workoutRepository: WorkoutRepository
    private lateinit var syncRepository: RemoteSyncRepository

    @Before
    fun setUp() {
        storage = FakeAppStorage()
        workoutRepository = WorkoutRepository(storage)
        syncRepository = RemoteSyncRepository(storage, workoutRepository)
    }

    @Test
    fun testDefaultStateIsDisabled() = runBlocking {
        syncRepository.initialize()
        val status = syncRepository.syncStatus.value
        assertEquals(SyncStatusState.DISABLED, status.state)
        assertEquals(0, syncRepository.getPendingCount())
    }

    @Test
    fun testEnableAndDisableSyncConsent() = runBlocking {
        syncRepository.initialize()
        assertEquals(SyncStatusState.DISABLED, syncRepository.syncStatus.value.state)

        val consent = SyncConsent(
            consentedAt = "2026-10-14T12:00:00.000Z",
            syncWorkouts = true,
            syncChallenges = true
        )
        syncRepository.enableSync(consent)
        assertEquals(SyncStatusState.IDLE, syncRepository.syncStatus.value.state)
        assertTrue(storage.getBoolean(RemoteSyncRepository.KEY_SYNC_CONSENT, false))

        syncRepository.disableSync()
        assertEquals(SyncStatusState.DISABLED, syncRepository.syncStatus.value.state)
        assertFalse(storage.getBoolean(RemoteSyncRepository.KEY_SYNC_CONSENT, true))
    }

    @Test
    fun testSyncNowWithoutTokenFailsGracefully() = runBlocking {
        val consent = SyncConsent(consentedAt = "2026-10-14T12:00:00.000Z")
        syncRepository.enableSync(consent)

        // No auth token saved in storage
        val result = syncRepository.syncNow()
        assertFalse(result.success)
        assertTrue(result.error?.contains("Sync is disabled or account is not authenticated") == true)
        assertEquals(SyncStatusState.DISABLED, syncRepository.syncStatus.value.state)
    }

    @Test
    fun testPendingCountReflectsLocalWorkoutSummaries() = runBlocking {
        val summary1 = WorkoutSummary(
            id = "w_sync_test_1",
            timestamp = System.currentTimeMillis(),
            exerciseKey = ExerciseKey.SQUATS,
            exerciseName = "Bodyweight Squats",
            completedReps = 15,
            targetReps = 15,
            durationSeconds = 45,
            caloriesBurned = 7,
            xpEarned = 75,
            averagePostureScore = 92,
            isCompleted = true
        )
        workoutRepository.recordCompletedSession(summary1)

        val summary2 = WorkoutSummary(
            id = "w_sync_test_2",
            timestamp = System.currentTimeMillis(),
            exerciseKey = ExerciseKey.PUSHUPS,
            exerciseName = "Push-Ups",
            completedReps = 10,
            targetReps = 10,
            durationSeconds = 60,
            caloriesBurned = 8,
            xpEarned = 50,
            averagePostureScore = 95,
            isCompleted = true
        )
        workoutRepository.recordCompletedSession(summary2)

        assertEquals(2, syncRepository.getPendingCount())
    }

    @Test
    fun testExponentialBackoffCalculation() {
        assertEquals(1000L, RemoteSyncRepository.calculateBackoffDelay(0))
        assertEquals(2000L, RemoteSyncRepository.calculateBackoffDelay(1))
        assertEquals(4000L, RemoteSyncRepository.calculateBackoffDelay(2))
        assertEquals(8000L, RemoteSyncRepository.calculateBackoffDelay(3))
        assertEquals(16000L, RemoteSyncRepository.calculateBackoffDelay(4))
        assertEquals(30000L, RemoteSyncRepository.calculateBackoffDelay(5))
        assertEquals(30000L, RemoteSyncRepository.calculateBackoffDelay(10))
    }
}
