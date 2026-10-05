package com.fitmitra.core.domain

import com.fitmitra.core.domain.models.PoseLandmark
import com.fitmitra.core.domain.pose.AngleMath
import org.junit.Assert.*
import org.junit.Test

class AngleMathTest {

    @Test
    fun testStraightLineYields180Degrees() {
        val a = PoseLandmark(x = 0.5f, y = 0.2f)
        val b = PoseLandmark(x = 0.5f, y = 0.5f)
        val c = PoseLandmark(x = 0.5f, y = 0.8f)

        val angle = AngleMath.calculateAngle(a, b, c)
        assertEquals(180.0f, angle, 0.5f)
    }

    @Test
    fun testRightAngleYields90Degrees() {
        val a = PoseLandmark(x = 0.5f, y = 0.2f)
        val b = PoseLandmark(x = 0.5f, y = 0.5f)
        val c = PoseLandmark(x = 0.8f, y = 0.5f)

        val angle = AngleMath.calculateAngle(a, b, c)
        assertEquals(90.0f, angle, 0.5f)
    }

    @Test
    fun testConfidenceGating() {
        val landmarks = listOf(
            PoseLandmark(0.5f, 0.5f, visibility = 0.8f),
            PoseLandmark(0.5f, 0.6f, visibility = 0.4f),
            PoseLandmark(0.5f, 0.7f, visibility = 0.9f)
        )

        val validChain = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(0, 2), minConfidence = 0.65f)
        assertTrue(validChain)

        val invalidChain = AngleMath.hasMinimumJointConfidence(landmarks, intArrayOf(0, 1, 2), minConfidence = 0.65f)
        assertFalse(invalidChain)
    }

    @Test
    fun testLandmarkSmoothingEMA() {
        val prev = listOf(PoseLandmark(0.0f, 0.0f))
        val curr = listOf(PoseLandmark(1.0f, 1.0f))

        val smoothed = AngleMath.smoothLandmarksEMA(curr, prev, alpha = 0.5f)
        assertEquals(0.5f, smoothed[0].x, 0.01f)
        assertEquals(0.5f, smoothed[0].y, 0.01f)
    }
}
