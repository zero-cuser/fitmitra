package com.fitmitra.core.domain.pose

import com.fitmitra.core.domain.models.DomainExerciseDefinition
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.MovementDirection
import com.fitmitra.core.domain.models.PoseFrame
import com.fitmitra.core.domain.models.PoseLandmark

enum class MovementPhase {
    UP,
    DESCENDING,
    DOWN,
    ASCENDING,
    HOLDING,
    OUT_OF_BOUNDS
}

data class ExerciseAnalysisResult(
    val phase: MovementPhase,
    val repCount: Int,
    val currentAngle: Float,
    val averageConfidence: Float,
    val isTrackingValid: Boolean,
    val formFeedback: String? = null,
    val repCompletedThisFrame: Boolean = false
)

/**
 * Universal, deterministic biomechanical tracker for all FitMitra catalog exercises.
 * Uses exact thresholds, hysteresis bands, and cooldowns from ExerciseCatalog.
 */
class ExerciseTracker(
    val exercise: DomainExerciseDefinition
) {
    var phase: MovementPhase = MovementPhase.UP
        private set

    var repCount: Int = 0
        private set

    private var lastRepTimestampMs: Long = 0L
    private var smoothedLandmarks: List<PoseLandmark>? = null
    private var holdStartTimestampMs: Long = 0L

    companion object {
        const val LEFT_SHOULDER = 11
        const val RIGHT_SHOULDER = 12
        const val LEFT_ELBOW = 13
        const val RIGHT_ELBOW = 14
        const val LEFT_WRIST = 15
        const val RIGHT_WRIST = 16
        const val LEFT_HIP = 23
        const val RIGHT_HIP = 24
        const val LEFT_KNEE = 25
        const val RIGHT_KNEE = 26
        const val LEFT_ANKLE = 27
        const val RIGHT_ANKLE = 28
    }

    fun reset() {
        phase = MovementPhase.UP
        repCount = 0
        lastRepTimestampMs = 0L
        smoothedLandmarks = null
        holdStartTimestampMs = 0L
    }

    fun processFrame(rawFrame: PoseFrame): ExerciseAnalysisResult {
        val landmarks = AngleMath.smoothLandmarksEMA(rawFrame.landmarks, smoothedLandmarks)
        smoothedLandmarks = landmarks

        if (landmarks.size < 29) {
            return ExerciseAnalysisResult(
                phase = phase,
                repCount = repCount,
                currentAngle = 180f,
                averageConfidence = 0f,
                isTrackingValid = false,
                formFeedback = "Step back to fit in camera"
            )
        }

        return when (exercise.key) {
            ExerciseKey.SQUATS -> processSquat(landmarks, rawFrame.timestampMs)
            ExerciseKey.PUSHUPS -> processPushup(landmarks, rawFrame.timestampMs)
            ExerciseKey.LUNGES -> processLunge(landmarks, rawFrame.timestampMs)
            ExerciseKey.JUMPING_JACKS -> processJumpingJack(landmarks, rawFrame.timestampMs)
            ExerciseKey.PLANK -> processPlank(landmarks, rawFrame.timestampMs)
        }
    }

    private fun processSquat(landmarks: List<PoseLandmark>, timestampMs: Long): ExerciseAnalysisResult {
        val leftValid = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(LEFT_HIP, LEFT_KNEE, LEFT_ANKLE))
        val rightValid = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE))

        if (!leftValid && !rightValid) {
            return ExerciseAnalysisResult(
                phase = phase,
                repCount = repCount,
                currentAngle = 180f,
                averageConfidence = 0f,
                isTrackingValid = false,
                formFeedback = "Ensure legs are visible"
            )
        }

        val angle = when {
            leftValid && rightValid -> {
                val lA = AngleMath.calculateAngle(landmarks[LEFT_HIP], landmarks[LEFT_KNEE], landmarks[LEFT_ANKLE])
                val rA = AngleMath.calculateAngle(landmarks[RIGHT_HIP], landmarks[RIGHT_KNEE], landmarks[RIGHT_ANKLE])
                (lA + rA) / 2.0f
            }
            leftValid -> AngleMath.calculateAngle(landmarks[LEFT_HIP], landmarks[LEFT_KNEE], landmarks[LEFT_ANKLE])
            else -> AngleMath.calculateAngle(landmarks[RIGHT_HIP], landmarks[RIGHT_KNEE], landmarks[RIGHT_ANKLE])
        }

        val conf = if (leftValid && rightValid) {
            ((landmarks[LEFT_KNEE].visibility ?: 0f) + (landmarks[RIGHT_KNEE].visibility ?: 0f)) / 2f
        } else if (leftValid) {
            landmarks[LEFT_KNEE].visibility ?: 0f
        } else {
            landmarks[RIGHT_KNEE].visibility ?: 0f
        }

        var repJustCompleted = false
        val downThreshold = exercise.thresholds.downThreshold
        val upThreshold = exercise.thresholds.upThreshold
        val repCooldown = exercise.thresholds.repCooldownMs

        when (phase) {
            MovementPhase.UP -> {
                if (angle < upThreshold) phase = MovementPhase.DESCENDING
            }
            MovementPhase.DESCENDING -> {
                if (angle <= downThreshold) phase = MovementPhase.DOWN
                else if (angle >= upThreshold) phase = MovementPhase.UP
            }
            MovementPhase.DOWN -> {
                if (angle > downThreshold) phase = MovementPhase.ASCENDING
            }
            MovementPhase.ASCENDING -> {
                if (angle >= upThreshold) {
                    if (timestampMs - lastRepTimestampMs >= repCooldown) {
                        repCount += 1
                        lastRepTimestampMs = timestampMs
                        repJustCompleted = true
                    }
                    phase = MovementPhase.UP
                } else if (angle <= downThreshold) {
                    phase = MovementPhase.DOWN
                }
            }
            else -> phase = MovementPhase.UP
        }

        val feedback = when (phase) {
            MovementPhase.DOWN -> "Great depth! Drive up!"
            MovementPhase.DESCENDING -> if (angle > downThreshold + 15f) "Lower into squat..." else "Almost there!"
            MovementPhase.UP -> "Ready"
            MovementPhase.ASCENDING -> "Keep back straight"
            else -> null
        }

        return ExerciseAnalysisResult(
            phase = phase,
            repCount = repCount,
            currentAngle = angle,
            averageConfidence = conf,
            isTrackingValid = true,
            formFeedback = feedback,
            repCompletedThisFrame = repJustCompleted
        )
    }

    private fun processPushup(landmarks: List<PoseLandmark>, timestampMs: Long): ExerciseAnalysisResult {
        val leftValid = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST))
        val rightValid = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST))

        if (!leftValid && !rightValid) {
            return ExerciseAnalysisResult(
                phase = phase,
                repCount = repCount,
                currentAngle = 180f,
                averageConfidence = 0f,
                isTrackingValid = false,
                formFeedback = "Ensure arms are visible"
            )
        }

        val angle = when {
            leftValid && rightValid -> {
                val lA = AngleMath.calculateAngle(landmarks[LEFT_SHOULDER], landmarks[LEFT_ELBOW], landmarks[LEFT_WRIST])
                val rA = AngleMath.calculateAngle(landmarks[RIGHT_SHOULDER], landmarks[RIGHT_ELBOW], landmarks[RIGHT_WRIST])
                (lA + rA) / 2.0f
            }
            leftValid -> AngleMath.calculateAngle(landmarks[LEFT_SHOULDER], landmarks[LEFT_ELBOW], landmarks[LEFT_WRIST])
            else -> AngleMath.calculateAngle(landmarks[RIGHT_SHOULDER], landmarks[RIGHT_ELBOW], landmarks[RIGHT_WRIST])
        }

        val conf = if (leftValid && rightValid) {
            ((landmarks[LEFT_ELBOW].visibility ?: 0f) + (landmarks[RIGHT_ELBOW].visibility ?: 0f)) / 2f
        } else if (leftValid) {
            landmarks[LEFT_ELBOW].visibility ?: 0f
        } else {
            landmarks[RIGHT_ELBOW].visibility ?: 0f
        }

        var repJustCompleted = false
        val downThreshold = exercise.thresholds.downThreshold // 90°
        val upThreshold = exercise.thresholds.upThreshold // 160°
        val repCooldown = exercise.thresholds.repCooldownMs

        when (phase) {
            MovementPhase.UP -> {
                if (angle < upThreshold) phase = MovementPhase.DESCENDING
            }
            MovementPhase.DESCENDING -> {
                if (angle <= downThreshold) phase = MovementPhase.DOWN
                else if (angle >= upThreshold) phase = MovementPhase.UP
            }
            MovementPhase.DOWN -> {
                if (angle > downThreshold) phase = MovementPhase.ASCENDING
            }
            MovementPhase.ASCENDING -> {
                if (angle >= upThreshold) {
                    if (timestampMs - lastRepTimestampMs >= repCooldown) {
                        repCount += 1
                        lastRepTimestampMs = timestampMs
                        repJustCompleted = true
                    }
                    phase = MovementPhase.UP
                } else if (angle <= downThreshold) {
                    phase = MovementPhase.DOWN
                }
            }
            else -> phase = MovementPhase.UP
        }

        val feedback = when (phase) {
            MovementPhase.DOWN -> "Chest down! Push up!"
            MovementPhase.DESCENDING -> "Lower chest smoothly"
            MovementPhase.UP -> "Ready"
            MovementPhase.ASCENDING -> "Lock out elbows"
            else -> null
        }

        return ExerciseAnalysisResult(
            phase = phase,
            repCount = repCount,
            currentAngle = angle,
            averageConfidence = conf,
            isTrackingValid = true,
            formFeedback = feedback,
            repCompletedThisFrame = repJustCompleted
        )
    }

    private fun processLunge(landmarks: List<PoseLandmark>, timestampMs: Long): ExerciseAnalysisResult {
        return processSquat(landmarks, timestampMs) // Shares knee angle kinematics
    }

    private fun processJumpingJack(landmarks: List<PoseLandmark>, timestampMs: Long): ExerciseAnalysisResult {
        val leftValid = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(LEFT_HIP, LEFT_SHOULDER, LEFT_WRIST))
        val rightValid = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(RIGHT_HIP, RIGHT_SHOULDER, RIGHT_WRIST))

        if (!leftValid && !rightValid) {
            return ExerciseAnalysisResult(
                phase = phase,
                repCount = repCount,
                currentAngle = 0f,
                averageConfidence = 0f,
                isTrackingValid = false,
                formFeedback = "Ensure upper body is visible"
            )
        }

        val angle = when {
            leftValid && rightValid -> {
                val lA = AngleMath.calculateAngle(landmarks[LEFT_HIP], landmarks[LEFT_SHOULDER], landmarks[LEFT_WRIST])
                val rA = AngleMath.calculateAngle(landmarks[RIGHT_HIP], landmarks[RIGHT_SHOULDER], landmarks[RIGHT_WRIST])
                (lA + rA) / 2.0f
            }
            leftValid -> AngleMath.calculateAngle(landmarks[LEFT_HIP], landmarks[LEFT_SHOULDER], landmarks[LEFT_WRIST])
            else -> AngleMath.calculateAngle(landmarks[RIGHT_HIP], landmarks[RIGHT_SHOULDER], landmarks[RIGHT_WRIST])
        }

        val conf = if (leftValid && rightValid) {
            ((landmarks[LEFT_SHOULDER].visibility ?: 0f) + (landmarks[RIGHT_SHOULDER].visibility ?: 0f)) / 2f
        } else 0.7f

        var repJustCompleted = false
        // Increasing abduction: Down = arms down (< 70°), Up = arms up (> 95°)
        val downThreshold = exercise.thresholds.downThreshold // 70°
        val upThreshold = exercise.thresholds.upThreshold // 95°
        val repCooldown = exercise.thresholds.repCooldownMs

        when (phase) {
            MovementPhase.UP -> {
                if (angle < upThreshold) phase = MovementPhase.DESCENDING
            }
            MovementPhase.DESCENDING -> {
                if (angle <= downThreshold) {
                    phase = MovementPhase.DOWN
                    if (timestampMs - lastRepTimestampMs >= repCooldown) {
                        repCount += 1
                        lastRepTimestampMs = timestampMs
                        repJustCompleted = true
                    }
                }
            }
            MovementPhase.DOWN -> {
                if (angle > downThreshold) phase = MovementPhase.ASCENDING
            }
            MovementPhase.ASCENDING -> {
                if (angle >= upThreshold) phase = MovementPhase.UP
            }
            else -> phase = MovementPhase.DOWN
        }

        return ExerciseAnalysisResult(
            phase = phase,
            repCount = repCount,
            currentAngle = angle,
            averageConfidence = conf,
            isTrackingValid = true,
            formFeedback = if (phase == MovementPhase.UP) "Arms high!" else "Clap down!",
            repCompletedThisFrame = repJustCompleted
        )
    }

    private fun processPlank(landmarks: List<PoseLandmark>, timestampMs: Long): ExerciseAnalysisResult {
        val leftValid = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(LEFT_SHOULDER, LEFT_HIP, LEFT_ANKLE))
        val rightValid = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(RIGHT_SHOULDER, RIGHT_HIP, RIGHT_ANKLE))

        if (!leftValid && !rightValid) {
            return ExerciseAnalysisResult(
                phase = MovementPhase.OUT_OF_BOUNDS,
                repCount = repCount,
                currentAngle = 180f,
                averageConfidence = 0f,
                isTrackingValid = false,
                formFeedback = "Ensure entire body is visible"
            )
        }

        val angle = when {
            leftValid && rightValid -> {
                val lA = AngleMath.calculateAngle(landmarks[LEFT_SHOULDER], landmarks[LEFT_HIP], landmarks[LEFT_ANKLE])
                val rA = AngleMath.calculateAngle(landmarks[RIGHT_SHOULDER], landmarks[RIGHT_HIP], landmarks[RIGHT_ANKLE])
                (lA + rA) / 2.0f
            }
            leftValid -> AngleMath.calculateAngle(landmarks[LEFT_SHOULDER], landmarks[LEFT_HIP], landmarks[LEFT_ANKLE])
            else -> AngleMath.calculateAngle(landmarks[RIGHT_SHOULDER], landmarks[RIGHT_HIP], landmarks[RIGHT_ANKLE])
        }

        val conf = if (leftValid && rightValid) {
            ((landmarks[LEFT_HIP].visibility ?: 0f) + (landmarks[RIGHT_HIP].visibility ?: 0f)) / 2f
        } else 0.7f

        // Spine alignment: 165° to 195°
        val isAligned = angle in 165.0f..195.0f
        var repJustCompleted = false

        if (isAligned) {
            if (holdStartTimestampMs == 0L) {
                holdStartTimestampMs = timestampMs
            } else {
                val elapsedSeconds = ((timestampMs - holdStartTimestampMs) / 1000L).toInt()
                if (elapsedSeconds > repCount) {
                    repCount = elapsedSeconds
                    repJustCompleted = true
                }
            }
            phase = MovementPhase.HOLDING
        } else {
            holdStartTimestampMs = 0L
            phase = MovementPhase.OUT_OF_BOUNDS
        }

        val feedback = when {
            phase == MovementPhase.HOLDING -> "Great hold! Keep core tight!"
            angle < 165f -> "Raise your hips slightly"
            angle > 195f -> "Do not sag hips"
            else -> "Hold plank alignment"
        }

        return ExerciseAnalysisResult(
            phase = phase,
            repCount = repCount,
            currentAngle = angle,
            averageConfidence = conf,
            isTrackingValid = true,
            formFeedback = feedback,
            repCompletedThisFrame = repJustCompleted
        )
    }
}
