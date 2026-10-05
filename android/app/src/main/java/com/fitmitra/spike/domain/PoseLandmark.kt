package com.fitmitra.spike.domain

/**
 * Normalized landmark representation adhering to the FitMitra domain contract.
 *
 * Coordinates are normalized to [0, 1] relative to the camera frame dimensions.
 * Visibility ranges from [0, 1] indicating detection likelihood.
 */
data class PoseLandmark(
    val x: Float,
    val y: Float,
    val z: Float? = null,
    val visibility: Float? = null
)

/**
 * Immutable snapshot of detected landmarks at a given timestamp.
 */
data class PoseFrame(
    val landmarks: List<PoseLandmark>,
    val timestampMs: Long
)
