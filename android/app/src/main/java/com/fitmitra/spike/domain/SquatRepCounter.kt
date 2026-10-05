package com.fitmitra.spike.domain

/**
 * Biomechanical movement states for squats.
 */
enum class SquatPhase {
    UP,
    DESCENDING,
    DOWN,
    ASCENDING
}

/**
 * Frame-by-frame analysis snapshot emitted to the UI and debug overlay.
 */
data class SquatAnalysisResult(
    val phase: SquatPhase,
    val repCount: Int,
    val kneeAngle: Float,
    val averageConfidence: Float,
    val isTrackingValid: Boolean,
    val formFeedback: String? = null
)

/**
 * Pure, deterministic squat rep counter and state machine.
 *
 * Emulates the exact biomechanical state machine used in FitMitra's core domain.
 */
class SquatRepCounter(
    val downThreshold: Float = SquatKinematics.DOWN_THRESHOLD_DEGREES,
    val upThreshold: Float = SquatKinematics.UP_THRESHOLD_DEGREES,
    val repCooldownMs: Long = SquatKinematics.REP_COOLDOWN_MS
) {
    var phase: SquatPhase = SquatPhase.UP
        private set

    var repCount: Int = 0
        private set

    private var lastRepTimestampMs: Long = 0L

    fun reset() {
        phase = SquatPhase.UP
        repCount = 0
        lastRepTimestampMs = 0L
    }

    /**
     * Evaluates a single pose frame. Updates state machine and rep count.
     */
    fun processFrame(frame: PoseFrame): SquatAnalysisResult {
        val landmarks = frame.landmarks
        if (landmarks.size < 29) {
            return SquatAnalysisResult(
                phase = phase,
                repCount = repCount,
                kneeAngle = 180f,
                averageConfidence = 0f,
                isTrackingValid = false,
                formFeedback = "Stand back to fit in camera"
            )
        }

        val leftValid = SquatKinematics.hasSufficientConfidence(
            landmarks,
            intArrayOf(SquatKinematics.LEFT_HIP, SquatKinematics.LEFT_KNEE, SquatKinematics.LEFT_ANKLE)
        )
        val rightValid = SquatKinematics.hasSufficientConfidence(
            landmarks,
            intArrayOf(SquatKinematics.RIGHT_HIP, SquatKinematics.RIGHT_KNEE, SquatKinematics.RIGHT_ANKLE)
        )

        // Strict multi-tier visibility gating: if neither side has sufficient tracking, suppress state changes
        if (!leftValid && !rightValid) {
            return SquatAnalysisResult(
                phase = phase,
                repCount = repCount,
                kneeAngle = 180f,
                averageConfidence = 0f,
                isTrackingValid = false,
                formFeedback = "Legs obscured - ensure full visibility"
            )
        }

        val angle: Float
        val confidence: Float

        if (leftValid && rightValid) {
            val leftAngle = SquatKinematics.calculateAngle(
                landmarks[SquatKinematics.LEFT_HIP],
                landmarks[SquatKinematics.LEFT_KNEE],
                landmarks[SquatKinematics.LEFT_ANKLE]
            )
            val rightAngle = SquatKinematics.calculateAngle(
                landmarks[SquatKinematics.RIGHT_HIP],
                landmarks[SquatKinematics.RIGHT_KNEE],
                landmarks[SquatKinematics.RIGHT_ANKLE]
            )
            angle = (leftAngle + rightAngle) / 2.0f
            confidence = ((landmarks[SquatKinematics.LEFT_KNEE].visibility ?: 0f) +
                    (landmarks[SquatKinematics.RIGHT_KNEE].visibility ?: 0f)) / 2.0f
        } else if (leftValid) {
            angle = SquatKinematics.calculateAngle(
                landmarks[SquatKinematics.LEFT_HIP],
                landmarks[SquatKinematics.LEFT_KNEE],
                landmarks[SquatKinematics.LEFT_ANKLE]
            )
            confidence = landmarks[SquatKinematics.LEFT_KNEE].visibility ?: 0f
        } else {
            angle = SquatKinematics.calculateAngle(
                landmarks[SquatKinematics.RIGHT_HIP],
                landmarks[SquatKinematics.RIGHT_KNEE],
                landmarks[SquatKinematics.RIGHT_ANKLE]
            )
            confidence = landmarks[SquatKinematics.RIGHT_KNEE].visibility ?: 0f
        }

        // Biomechanical State Machine Transitions (Decreasing Flexion)
        when (phase) {
            SquatPhase.UP -> {
                if (angle < upThreshold) {
                    phase = SquatPhase.DESCENDING
                }
            }
            SquatPhase.DESCENDING -> {
                if (angle <= downThreshold) {
                    phase = SquatPhase.DOWN
                } else if (angle >= upThreshold) {
                    phase = SquatPhase.UP // Returned without reaching depth
                }
            }
            SquatPhase.DOWN -> {
                if (angle > downThreshold) {
                    phase = SquatPhase.ASCENDING
                }
            }
            SquatPhase.ASCENDING -> {
                if (angle >= upThreshold) {
                    val now = frame.timestampMs
                    if (now - lastRepTimestampMs >= repCooldownMs) {
                        repCount += 1
                        lastRepTimestampMs = now
                    }
                    phase = SquatPhase.UP
                } else if (angle <= downThreshold) {
                    phase = SquatPhase.DOWN // Bounced back to bottom
                }
            }
        }

        val feedback = when {
            phase == SquatPhase.DOWN -> "Good depth! Drive up!"
            phase == SquatPhase.DESCENDING && angle > downThreshold -> "Descend lower..."
            phase == SquatPhase.UP -> "Ready for next rep"
            else -> null
        }

        return SquatAnalysisResult(
            phase = phase,
            repCount = repCount,
            kneeAngle = angle,
            averageConfidence = confidence,
            isTrackingValid = true,
            formFeedback = feedback
        )
    }
}
