package com.fitmitra.feature

import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.WorkoutSessionState
import com.fitmitra.core.domain.workouts.WorkoutRepository
import com.fitmitra.core.platform.FakeAppStorage
import com.fitmitra.feature.posecoach.PoseCoachViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.lang.RuntimeException

@OptIn(ExperimentalCoroutinesApi::class)
class PoseCoachViewModelHardeningTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var storage: FakeAppStorage
    private lateinit var viewModel: PoseCoachViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        storage = FakeAppStorage()
        viewModel = PoseCoachViewModel(
            exerciseKey = ExerciseKey.SQUATS,
            targetReps = 10,
            audioPlayer = null,
            speechProvider = null,
            storage = storage
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testInitialState() {
        val state = viewModel.uiState.value
        assertEquals("Bodyweight Squats", state.exerciseName)
        assertEquals(WorkoutSessionState.ACTIVE, state.sessionState)
        assertEquals(0, state.currentReps)
        assertEquals(10, state.targetReps)
        assertFalse(state.isPaused)
        assertFalse(state.isCompleted)
        assertFalse(state.isCancelled)
        assertNull(state.errorMessage)
    }

    @Test
    fun testPauseAndResumeTransitions() {
        assertFalse(viewModel.uiState.value.isPaused)
        assertEquals(WorkoutSessionState.ACTIVE, viewModel.uiState.value.sessionState)

        viewModel.togglePause()
        assertTrue(viewModel.uiState.value.isPaused)
        assertEquals(WorkoutSessionState.PAUSED, viewModel.uiState.value.sessionState)

        viewModel.togglePause()
        assertFalse(viewModel.uiState.value.isPaused)
        assertEquals(WorkoutSessionState.ACTIVE, viewModel.uiState.value.sessionState)
    }

    @Test
    fun testCancelWorkoutExplicitly() = runTest {
        viewModel.cancelWorkout()
        val state = viewModel.uiState.value

        assertEquals(WorkoutSessionState.CANCELLED, state.sessionState)
        assertTrue(state.isCancelled)
        assertFalse(state.isCompleted)

        testDispatcher.scheduler.advanceUntilIdle()

        // Verify storage: Cancelled workout must NOT be saved to repository
        val repository = WorkoutRepository(storage)
        val stats = repository.getLifetimeStats()
        assertEquals("Cancelled workouts must not count towards total", 0, stats.totalWorkouts)
        assertEquals(0, stats.totalReps)
        assertEquals(0, stats.currentStreak)
    }

    @Test
    fun testFinishEarlyWithZeroRepsCancelsWorkout() = runTest {
        viewModel.finishEarly()
        val state = viewModel.uiState.value

        assertEquals(WorkoutSessionState.CANCELLED, state.sessionState)
        assertTrue(state.isCancelled)
        assertFalse(state.isCompleted)

        testDispatcher.scheduler.advanceUntilIdle()

        val repository = WorkoutRepository(storage)
        val stats = repository.getLifetimeStats()
        assertEquals("Exiting with 0 reps must discard session", 0, stats.totalWorkouts)
        assertEquals(0, stats.currentStreak)
    }

    @Test
    fun testCameraFailureAndRecovery() {
        val error = RuntimeException("Camera hardware resource unavailable")
        viewModel.reportCameraError(error)

        var state = viewModel.uiState.value
        assertEquals(WorkoutSessionState.FAILED, state.sessionState)
        assertEquals("Camera hardware resource unavailable", state.errorMessage)

        viewModel.retryCamera()
        state = viewModel.uiState.value
        assertEquals(WorkoutSessionState.ACTIVE, state.sessionState)
        assertNull(state.errorMessage)
    }

    @Test
    fun testAudioAndDebugToggles() {
        assertFalse(viewModel.uiState.value.isMuted)
        viewModel.toggleMute()
        assertTrue(viewModel.uiState.value.isMuted)

        assertFalse(viewModel.uiState.value.showDebugOverlay)
        viewModel.toggleDebug()
        assertTrue(viewModel.uiState.value.showDebugOverlay)
    }

    @Test
    fun testPauseResumePhaseReset() {
        // When active, toggle pause
        viewModel.togglePause()
        assertTrue(viewModel.uiState.value.isPaused)
        assertEquals(WorkoutSessionState.PAUSED, viewModel.uiState.value.sessionState)

        // Resuming must set isPaused = false and active state
        viewModel.togglePause()
        assertFalse(viewModel.uiState.value.isPaused)
        assertEquals(WorkoutSessionState.ACTIVE, viewModel.uiState.value.sessionState)
    }
}
