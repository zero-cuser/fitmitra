package com.fitmitra.spike.ui

import androidx.lifecycle.ViewModel
import com.fitmitra.spike.domain.PoseFrame
import com.fitmitra.spike.domain.SquatAnalysisResult
import com.fitmitra.spike.domain.SquatPhase
import com.fitmitra.spike.domain.SquatRepCounter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class SpikeUiState(
    val isRunning: Boolean = false,
    val isCameraActive: Boolean = false,
    val isFrontCamera: Boolean = true,
    val isPoseDetected: Boolean = false,
    val repCount: Int = 0,
    val squatPhase: SquatPhase = SquatPhase.UP,
    val kneeAngle: Float = 180f,
    val confidence: Float = 0f,
    val feedback: String? = null,
    val inferenceLatencyMs: Long = 0L,
    val fps: Int = 0,
    val isDebugOverlayVisible: Boolean = true,
    val currentFrame: PoseFrame? = null,
    val errorMessage: String? = null
)

class SpikeViewModel : ViewModel() {
    private val repCounter = SquatRepCounter()
    private val _uiState = MutableStateFlow(SpikeUiState())
    val uiState: StateFlow<SpikeUiState> = _uiState.asStateFlow()

    private var frameCount = 0
    private var lastFpsTimestamp = System.currentTimeMillis()

    fun onFrameAnalyzed(frame: PoseFrame, inferenceLatencyMs: Long) {
        if (!_uiState.value.isRunning) return

        val result: SquatAnalysisResult = repCounter.processFrame(frame)

        // Frame rate calculation
        frameCount++
        val now = System.currentTimeMillis()
        var currentFps = _uiState.value.fps
        if (now - lastFpsTimestamp >= 1000L) {
            currentFps = frameCount
            frameCount = 0
            lastFpsTimestamp = now
        }

        _uiState.update {
            it.copy(
                isPoseDetected = result.isTrackingValid,
                repCount = result.repCount,
                squatPhase = result.phase,
                kneeAngle = result.kneeAngle,
                confidence = result.averageConfidence,
                feedback = result.formFeedback,
                inferenceLatencyMs = inferenceLatencyMs,
                fps = currentFps,
                currentFrame = frame
            )
        }
    }

    fun startSession() {
        repCounter.reset()
        _uiState.update {
            it.copy(
                isRunning = true,
                repCount = 0,
                squatPhase = SquatPhase.UP,
                kneeAngle = 180f,
                errorMessage = null
            )
        }
    }

    fun stopSession() {
        _uiState.update {
            it.copy(
                isRunning = false,
                feedback = "Session Stopped"
            )
        }
    }

    fun toggleDebugOverlay() {
        _uiState.update { it.copy(isDebugOverlayVisible = !it.isDebugOverlayVisible) }
    }

    fun setFrontCamera(isFront: Boolean) {
        _uiState.update { it.copy(isFrontCamera = isFront) }
    }

    fun setError(message: String) {
        _uiState.update { it.copy(errorMessage = message) }
    }
}
