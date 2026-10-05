package com.fitmitra.spike

import com.fitmitra.spike.domain.PoseLandmark
import com.fitmitra.spike.pose.CoordinateNormalizer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CoordinateNormalizationTest {

    @Test
    fun normalize_mapsRawPixelsToUnitInterval() {
        val landmark = CoordinateNormalizer.normalize(
            rawX = 320f,
            rawY = 240f,
            rawZ = 50f,
            confidence = 0.95f,
            imageWidth = 640,
            imageHeight = 480,
            isFrontCamera = false
        )

        assertEquals(0.5f, landmark.x, 0.001f)
        assertEquals(0.5f, landmark.y, 0.001f)
        assertEquals(0.95f, landmark.visibility ?: 0f, 0.001f)
        assertTrue(landmark.x in 0f..1f)
        assertTrue(landmark.y in 0f..1f)
    }

    @Test
    fun normalize_handlesFrontCameraMirroring() {
        // In selfie mode, user's physical right is image x = 160 (25% from left).
        // Mirrored for user intuition, x should map to 1.0 - 0.25 = 0.75 (75% from left).
        val mirrored = CoordinateNormalizer.normalize(
            rawX = 160f,
            rawY = 120f,
            rawZ = null,
            confidence = 0.88f,
            imageWidth = 640,
            imageHeight = 480,
            isFrontCamera = true
        )

        assertEquals(0.75f, mirrored.x, 0.001f)
        assertEquals(0.25f, mirrored.y, 0.001f)
    }

    @Test
    fun normalize_clampsOutOfBoundsCoordinates() {
        val clamped = CoordinateNormalizer.normalize(
            rawX = -50f,
            rawY = 700f,
            rawZ = null,
            confidence = 1.5f,
            imageWidth = 640,
            imageHeight = 480,
            isFrontCamera = false
        )

        assertEquals(0.0f, clamped.x, 0.001f)
        assertEquals(1.0f, clamped.y, 0.001f)
        assertEquals(1.0f, clamped.visibility ?: 0f, 0.001f)
    }

    @Test
    fun toCanvasPixels_mapsNormalizedToTargetCanvasDimensions() {
        val landmark = PoseLandmark(x = 0.5f, y = 0.75f, visibility = 0.9f)
        val (px, py) = CoordinateNormalizer.toCanvasPixels(landmark, 1080f, 1920f)

        assertEquals(540f, px, 0.01f)
        assertEquals(1440f, py, 0.01f)
    }
}
