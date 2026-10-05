package com.fitmitra.core.domain.models

/**
 * Normalized 3D landmark representation.
 * Coordinates are normalized to [0, 1] relative to the camera viewport.
 */
data class PoseLandmark(
    val x: Float,
    val y: Float,
    val z: Float? = null,
    val visibility: Float? = null
)

/**
 * Immutable frame emitted by pose detection.
 */
data class PoseFrame(
    val landmarks: List<PoseLandmark>,
    val timestampMs: Long
)

/**
 * Domain feedback events dispatched during workout execution.
 */
sealed interface WorkoutFeedbackEvent {
    data class RepCompleted(val repCount: Int, val exerciseKey: ExerciseKey) : WorkoutFeedbackEvent
    data class FormWarning(val message: String, val severity: String = "warning") : WorkoutFeedbackEvent
    data class StateTransition(val state: String) : WorkoutFeedbackEvent
    data class WorkoutCompleted(val summary: WorkoutSummary) : WorkoutFeedbackEvent
}
