package com.fitmitra.feature.exam

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitmitra.core.domain.exam.*
import com.fitmitra.core.platform.interfaces.AudioCue
import com.fitmitra.core.platform.interfaces.IAudioPlayer
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ExamUiState(
    val selectedMode: ExamModeType = ExamModeType.RESET,
    val isSessionActive: Boolean = false,
    val currentActivityName: String = "",
    val currentActivityCategory: String = "",
    val currentActivityDescription: String = "",
    val currentCues: List<String> = emptyList(),
    val activityRemainingSeconds: Int = 0,
    val activityDurationSeconds: Int = 0,
    val activityIndex: Int = 0,
    val totalActivities: Int = 0,
    val isPaused: Boolean = false,
    val isCompleted: Boolean = false
)

class ExamViewModel(
    private val audioPlayer: IAudioPlayer? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow(ExamUiState())
    val uiState: StateFlow<ExamUiState> = _uiState.asStateFlow()

    private var timerController: ElapsedTimerController? = null
    private var timerJob: Job? = null
    private var sessionConfig: ExamSessionConfig = ExamEngine.createSession(ExamModeType.RESET)

    fun selectMode(mode: ExamModeType) {
        if (_uiState.value.isSessionActive) return
        sessionConfig = ExamEngine.createSession(mode)
        _uiState.value = _uiState.value.copy(selectedMode = mode)
    }

    fun startSession() {
        val activities = sessionConfig.activities
        timerController = ElapsedTimerController(activities).apply { start() }

        val firstAct = activities.first()
        _uiState.value = _uiState.value.copy(
            isSessionActive = true,
            isCompleted = false,
            isPaused = false,
            currentActivityName = firstAct.name,
            currentActivityCategory = firstAct.category,
            currentActivityDescription = firstAct.description,
            currentCues = firstAct.cues,
            activityDurationSeconds = firstAct.durationSeconds,
            activityRemainingSeconds = firstAct.durationSeconds,
            activityIndex = 0,
            totalActivities = activities.size
        )

        audioPlayer?.playCue(AudioCue.BREAK_BELL)
        startTimerLoop()
    }

    private fun startTimerLoop() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(250L)
                val controller = timerController ?: break
                val stepped = controller.step()
                val snapshot = controller.getSnapshot()

                if (stepped) {
                    audioPlayer?.playCue(AudioCue.BREAK_BELL)
                }

                if (snapshot.isCompleted) {
                    audioPlayer?.playCue(AudioCue.WORKOUT_COMPLETE)
                    _uiState.value = _uiState.value.copy(
                        isCompleted = true,
                        isSessionActive = false
                    )
                    break
                }

                val currentAct = sessionConfig.activities.getOrNull(snapshot.activityIndex)
                _uiState.value = _uiState.value.copy(
                    activityIndex = snapshot.activityIndex,
                    activityRemainingSeconds = snapshot.activityRemainingSeconds,
                    currentActivityName = currentAct?.name ?: snapshot.currentActivityName,
                    currentActivityDescription = currentAct?.description ?: "",
                    currentCues = currentAct?.cues ?: emptyList(),
                    isPaused = snapshot.isPaused
                )
            }
        }
    }

    fun togglePause() {
        val controller = timerController ?: return
        if (controller.getSnapshot().isPaused) {
            controller.resume()
        } else {
            controller.pause()
        }
    }

    fun skipActivity() {
        timerController?.skip()
        audioPlayer?.playCue(AudioCue.COUNTDOWN_TICK)
    }

    fun endSession() {
        timerJob?.cancel()
        timerController = null
        _uiState.value = _uiState.value.copy(
            isSessionActive = false,
            isCompleted = false
        )
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
