package com.fitmitra.core.platform.android

import com.fitmitra.core.domain.models.PoseLandmark

/**
 * Coordinate Normalization and Orientation Mapping for Android.
 *
 * Normalizes raw pixel coordinates from ML Kit into FitMitra [0..1] domain space.
 * Mirrors horizontally when using the front camera so user movement mirrors their reflection.
 */
object CoordinateNormalizer {

    fun normalize(
        rawX: Float,
        rawY: Float,
        rawZ: Float?,
        confidence: Float?,
        imageWidth: Int,
        imageHeight: Int,
        isFrontCamera: Boolean
    ): PoseLandmark {
        val w = if (imageWidth > 0) imageWidth.toFloat() else 1.0f
        val h = if (imageHeight > 0) imageHeight.toFloat() else 1.0f

        val normX = (rawX / w).coerceIn(0.0f, 1.0f)
        val normY = (rawY / h).coerceIn(0.0f, 1.0f)

        val finalX = if (isFrontCamera) 1.0f - normX else normX

        return PoseLandmark(
            x = finalX,
            y = normY,
            z = rawZ?.let { it / w },
            visibility = confidence?.coerceIn(0.0f, 1.0f)
        )
    }

    fun toCanvasPixels(
        landmark: PoseLandmark,
        canvasWidth: Float,
        canvasHeight: Float
    ): Pair<Float, Float> {
        return Pair(landmark.x * canvasWidth, landmark.y * canvasHeight)
    }
}
