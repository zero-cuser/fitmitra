package com.fitmitra.feature.posecoach

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.exercises.ExerciseCatalog
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.PoseFrame
import com.fitmitra.core.domain.models.WorkoutSummary
import com.fitmitra.core.domain.pose.ExerciseAnalysisResult
import com.fitmitra.core.domain.pose.ExerciseTracker
import com.fitmitra.core.domain.pose.MovementPhase
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

data class PoseCoachUiState(
    val exerciseName: String,
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
    val completedSummary: WorkoutSummary? = null
)

class PoseCoachViewModel(
    val exerciseKey: ExerciseKey,
    val targetReps: Int,
    private val audioPlayer: IAudioPlayer? = null,
    private val speechProvider: ISpeechProvider? = null,
    private val storage: IAppStorage? = null
) : ViewModel() {

    private val exerciseDef = ExerciseCatalog.getExercise(exerciseKey)
    private val tracker = ExerciseTracker(exerciseDef)

    private val _uiState = MutableStateFlow(
        PoseCoachUiState(
            exerciseName = exerciseDef.name,
            targetReps = targetReps
        )
    )
    val uiState: StateFlow<PoseCoachUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null
    private var lastSpokenFeedback: String? = null

    init {
        startTimer()
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000L)
                if (!_uiState.value.isPaused && !_uiState.value.isCompleted) {
                    _uiState.value = _uiState.value.copy(
                        elapsedSeconds = _uiState.value.elapsedSeconds + 1
                    )
                }
            }
        }
    }

    fun onPoseFrame(frame: PoseFrame, latencyMs: Long) {
        if (_uiState.value.isPaused || _uiState.value.isCompleted) return

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
        if (completed && !_uiState.value.isCompleted) {
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
        val newPaused = !_uiState.value.isPaused
        _uiState.value = _uiState.value.copy(isPaused = newPaused)
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

    fun finishEarly() {
        completeSession(_uiState.value.currentReps)
    }

    private fun completeSession(finalReps: Int) {
        val duration = _uiState.value.elapsedSeconds.coerceAtLeast(1)
        val summary = WorkoutRules.createSessionSummary(
            exerciseKey = exerciseKey,
            completedReps = finalReps,
            targetReps = targetReps,
            durationSeconds = duration
        )

        _uiState.value = _uiState.value.copy(
            isCompleted = true,
            completedSummary = summary
        )

        // Asynchronously persist session and update stats
        storage?.let { store ->
            viewModelScope.launch {
                val currentWorkouts = store.getInt("stat_total_workouts", 0)
                val currentXp = store.getInt("stat_total_xp", 0)
                val currentStreak = store.getInt("stat_current_streak", 0)
                val longestStreak = store.getInt("stat_longest_streak", 0)

                store.putInt("stat_total_workouts", currentWorkouts + 1)
                store.putInt("stat_total_xp", currentXp + summary.xpEarned)
                store.putInt("stat_current_streak", currentStreak + 1)
                store.putInt("stat_longest_streak", maxOf(longestStreak, currentStreak + 1))
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
