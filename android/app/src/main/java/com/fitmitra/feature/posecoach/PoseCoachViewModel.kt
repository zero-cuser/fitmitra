package com.fitmitra.feature.posecoach

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.exercises.ExerciseCatalog
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.PoseFrame
import com.fitmitra.core.domain.models.WorkoutSessionState
import com.fitmitra.core.domain.models.WorkoutSummary
import com.fitmitra.core.domain.pose.ExerciseAnalysisResult
import com.fitmitra.core.domain.pose.ExerciseTracker
import com.fitmitra.core.domain.pose.MovementPhase
import com.fitmitra.core.domain.workouts.WorkoutRepository
import com.fitmitra.core.domain.workouts.WorkoutRules
import com.fitmitra.core.platform.interfaces.AudioCue
import com.fitmitra.core.platform.interfaces.IAudioPlayer
import com.fitmitra.core.platform.interfaces.IAppStorage
import com.fitmitra.core.platform.interfaces.ISpeechProvider
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

data class PoseCoachUiState(
    val sessionId: String,
    val exerciseName: String,
    val sessionState: WorkoutSessionState = WorkoutSessionState.ACTIVE,
    val currentReps: Int = 0,
    val targetReps: Int = 12,
    val currentAngle: Float = 180f,
    val phase: MovementPhase = MovementPhase.UP,
    val formFeedback: String? = null,
    val isTrackingValid: Boolean = false,
    val elapsedSeconds: Int = 0,
    val isPaused: Boolean = false,
    val isMuted: Boolean = false,
    val showDebugOverlay: Boolean = false,
    val inferenceLatencyMs: Long = 0L,
    val averageConfidence: Float = 0f,
    val isCompleted: Boolean = false,
    val isCancelled: Boolean = false,
    val errorMessage: String? = null,
    val completedSummary: WorkoutSummary? = null
)

class PoseCoachViewModel(
    val exerciseKey: ExerciseKey,
    val targetReps: Int,
    private val audioPlayer: IAudioPlayer? = null,
    private val speechProvider: ISpeechProvider? = null,
    private val storage: IAppStorage? = null
) : ViewModel() {

    private val sessionId: String = "sess_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(8)}"
    private val exerciseDef = ExerciseCatalog.getExercise(exerciseKey)
    private val tracker = ExerciseTracker(exerciseDef)
    private val repository: WorkoutRepository? = storage?.let { WorkoutRepository(it) }

    private val _uiState = MutableStateFlow(
        PoseCoachUiState(
            sessionId = sessionId,
            exerciseName = exerciseDef.name,
            targetReps = targetReps,
            sessionState = WorkoutSessionState.ACTIVE
        )
    )
    val uiState: StateFlow<PoseCoachUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null
    private var lastSpokenFeedback: String? = null
    private var isCompletingOrDone = false

    init {
        startTimer()
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000L)
                val state = _uiState.value
                if (!state.isPaused && !state.isCompleted && !state.isCancelled && state.sessionState == WorkoutSessionState.ACTIVE) {
                    _uiState.value = state.copy(
                        elapsedSeconds = state.elapsedSeconds + 1
                    )
                }
            }
        }
    }

    fun onPoseFrame(frame: PoseFrame, latencyMs: Long) {
        val state = _uiState.value
        if (state.isPaused || state.isCompleted || state.isCancelled || state.sessionState != WorkoutSessionState.ACTIVE) {
            return
        }

        val result: ExerciseAnalysisResult = tracker.processFrame(frame)

        if (result.repCompletedThisFrame) {
            audioPlayer?.playCue(AudioCue.REP_SUCCESS)
            speechProvider?.speak("${result.repCount}", priority = true)
        }

        if (result.formFeedback != null && result.formFeedback != lastSpokenFeedback) {
            lastSpokenFeedback = result.formFeedback
            speechProvider?.speak(result.formFeedback, priority = false)
        }

        val completed = result.repCount >= targetReps
        if (completed && !isCompletingOrDone) {
            audioPlayer?.playCue(AudioCue.WORKOUT_COMPLETE)
            speechProvider?.speak("Workout completed! Fantastic job!", priority = true)
            completeSession(result.repCount)
            return
        }

        _uiState.value = _uiState.value.copy(
            currentReps = result.repCount,
            currentAngle = result.currentAngle,
            phase = result.phase,
            formFeedback = result.formFeedback,
            isTrackingValid = result.isTrackingValid,
            inferenceLatencyMs = latencyMs,
            averageConfidence = result.averageConfidence
        )
    }

    fun togglePause() {
        if (_uiState.value.isCompleted || _uiState.value.isCancelled) return

        val newPaused = !_uiState.value.isPaused
        val newState = if (newPaused) WorkoutSessionState.PAUSED else WorkoutSessionState.ACTIVE
        if (!newPaused) {
            tracker.resetPhase()
        }
        _uiState.value = _uiState.value.copy(
            isPaused = newPaused,
            sessionState = newState
        )
        if (newPaused) {
            speechProvider?.speak("Workout paused", priority = true)
        } else {
            speechProvider?.speak("Resuming workout", priority = true)
        }
    }

    fun toggleMute() {
        val newMuted = !_uiState.value.isMuted
        audioPlayer?.setMuted(newMuted)
        speechProvider?.setEnabled(!newMuted)
        _uiState.value = _uiState.value.copy(isMuted = newMuted)
    }

    fun toggleDebug() {
        _uiState.value = _uiState.value.copy(showDebugOverlay = !_uiState.value.showDebugOverlay)
    }

    /**
     * User explicitly finishes session with current completed reps.
     * Only counts as a completed workout if at least 1 rep was achieved.
     */
    fun finishEarly() {
        if (_uiState.value.currentReps > 0) {
            completeSession(_uiState.value.currentReps)
        } else {
            cancelWorkout()
        }
    }

    /**
     * Explicitly cancels and abandons the workout.
     * Guaranteed NOT to increment total completed workouts or streaks.
     */
    fun cancelWorkout() {
        if (isCompletingOrDone) return
        isCompletingOrDone = true
        timerJob?.cancel()

        _uiState.value = _uiState.value.copy(
            sessionState = WorkoutSessionState.CANCELLED,
            isCancelled = true,
            isPaused = false
        )
        speechProvider?.speak("Workout cancelled", priority = true)
    }

    fun reportCameraError(error: Throwable) {
        _uiState.value = _uiState.value.copy(
            sessionState = WorkoutSessionState.FAILED,
            errorMessage = error.localizedMessage ?: "Camera preview unavailable"
        )
    }

    fun retryCamera() {
        _uiState.value = _uiState.value.copy(
            sessionState = WorkoutSessionState.ACTIVE,
            errorMessage = null
        )
    }

    /**
     * Strictly idempotent completion logic.
     */
    private fun completeSession(finalReps: Int) {
        if (isCompletingOrDone) return
        isCompletingOrDone = true
        timerJob?.cancel()

        _uiState.value = _uiState.value.copy(
            currentReps = finalReps,
            sessionState = WorkoutSessionState.COMPLETING
        )

        val duration = _uiState.value.elapsedSeconds.coerceAtLeast(1)
        val summary = WorkoutSummary(
            id = sessionId,
            timestamp = System.currentTimeMillis(),
            exerciseKey = exerciseKey,
            exerciseName = exerciseDef.name,
            completedReps = finalReps,
            targetReps = targetReps,
            durationSeconds = duration,
            caloriesBurned = WorkoutRules.calculateCaloriesBurned(exerciseKey, finalReps),
            xpEarned = WorkoutRules.calculateXpEarned(finalReps, isCompleted = true),
            averagePostureScore = 92,
            isCompleted = true
        )

        // Asynchronously persist session and update stats via WorkoutRepository
        viewModelScope.launch {
            repository?.recordCompletedSession(summary)

            _uiState.value = _uiState.value.copy(
                currentReps = finalReps,
                sessionState = WorkoutSessionState.COMPLETED,
                isCompleted = true,
                completedSummary = summary
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
