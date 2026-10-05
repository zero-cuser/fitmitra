package com.fitmitra.core.domain.pose

import com.fitmitra.core.domain.models.PoseLandmark
import kotlin.math.PI
import kotlin.math.acos
import kotlin.math.sqrt

/**
 * Pure trigonometric kinematic math and landmark filtering.
 */
object AngleMath {

    /**
     * Calculates the 2D interior angle (0..180 degrees) between points A-B-C with vertex at B.
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
     * Smooths landmark coordinates using Exponential Moving Average (EMA).
     */
    fun smoothLandmarksEMA(
        current: List<PoseLandmark>,
        previous: List<PoseLandmark>?,
        alpha: Float = 0.65f
    ): List<PoseLandmark> {
        if (previous == null || previous.size != current.size) return current

        return current.mapIndexed { idx, curr ->
            val prev = previous[idx]
            PoseLandmark(
                x = alpha * curr.x + (1f - alpha) * prev.x,
                y = alpha * curr.y + (1f - alpha) * prev.y,
                z = if (curr.z != null && prev.z != null) alpha * curr.z + (1f - alpha) * prev.z else curr.z,
                visibility = curr.visibility
            )
        }
    }

    /**
     * Verifies that all joints in the chain meet the minimum confidence threshold.
     */
    fun hasMinimumJointConfidence(
        landmarks: List<PoseLandmark>,
        jointIndices: IntArray,
        minConfidence: Float = 0.65f
    ): Boolean {
        for (idx in jointIndices) {
            if (idx >= landmarks.size) return false
            val vis = landmarks[idx].visibility ?: 0f
            if (vis < minConfidence) return false
        }
        return true
    }
}
