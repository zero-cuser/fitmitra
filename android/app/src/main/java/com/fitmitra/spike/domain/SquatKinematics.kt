package com.fitmitra.spike.domain

import kotlin.math.acos
import kotlin.math.PI
import kotlin.math.sqrt

/**
 * Biomechanical constants and Euclidean kinematic angle math for squats.
 *
 * Thresholds and parameters strictly match FitMitra's single-source-of-truth domain
 * in src/domain/exercises/exerciseCatalog.ts:
 * - downThreshold: 125.0° (flexion depth confirmation)
 * - upThreshold: 145.0° (lockout / standing extension)
 * - minConfidence: 0.65 (minimum visibility per joint)
 * - repCooldownMs: 600ms (debounce window against rapid oscillations)
 */
object SquatKinematics {
    // MediaPipe & ML Kit 33-landmark indices
    const val NOSE = 0
    const val LEFT_SHOULDER = 11
    const val RIGHT_SHOULDER = 12
    const val LEFT_HIP = 23
    const val RIGHT_HIP = 24
    const val LEFT_KNEE = 25
    const val RIGHT_KNEE = 26
    const val LEFT_ANKLE = 27
    const val RIGHT_ANKLE = 28

    // Thresholds identical to FitMitra Web Domain
    const val DOWN_THRESHOLD_DEGREES = 125.0f
    const val UP_THRESHOLD_DEGREES = 145.0f
    const val MIN_CONFIDENCE_THRESHOLD = 0.65f
    const val REP_COOLDOWN_MS = 600L

    /**
     * Calculates the interior 2D angle (in degrees [0..180]) formed by 3 planar points: A -> B -> C.
     * B is the vertex point (e.g., knee).
     */
    fun calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): Float {
        val v1x = a.x - b.x
        val v1y = a.y - b.y
        val v2x = c.x - b.x
        val v2y = c.y - b.y

        val dot = (v1x * v2x) + (v1y * v2y)
        val mag1 = sqrt((v1x * v1x + v1y * v1y).toDouble()).toFloat()
        val mag2 = sqrt((v2x * v2x + v2y * v2y).toDouble()).toFloat()

        if (mag1 == 0f || mag2 == 0f) return 180.0f

        val cosine = (dot / (mag1 * mag2)).coerceIn(-1.0f, 1.0f)
        return (acos(cosine.toDouble()) * (180.0 / PI)).toFloat()
    }

    /**
     * Checks if all required joint indices have visibility >= MIN_CONFIDENCE_THRESHOLD.
     */
    fun hasSufficientConfidence(landmarks: List<PoseLandmark>, indices: IntArray): Boolean {
        for (idx in indices) {
            if (idx >= landmarks.size) return false
            val vis = landmarks[idx].visibility ?: 0f
            if (vis < MIN_CONFIDENCE_THRESHOLD) return false
        }
        return true
    }
}
