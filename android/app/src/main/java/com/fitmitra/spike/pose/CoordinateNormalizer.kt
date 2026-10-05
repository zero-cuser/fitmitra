package com.fitmitra.spike.pose

import com.fitmitra.spike.domain.PoseLandmark

/**
 * Coordinate Normalization and Orientation Mapping for Android.
 *
 * Maps raw pixel coordinates from ML Kit Pose Detection into FitMitra's normalized domain space:
 * - x in [0.0, 1.0] (origin: top-left, increasing rightwards)
 * - y in [0.0, 1.0] (origin: top-left, increasing downwards)
 * - visibility in [0.0, 1.0] (tracking confidence)
 *
 * Front-Camera Mirroring:
 * Front-facing selfie cameras on Android capture an unmirrored physical sensor feed.
 * For user-facing workout coaching, users expect mirror behavior (lifting right arm moves
 * the visually rightward arm on screen). When [isFrontCamera] is true, x is mirrored:
 * x = 1.0f - (rawX / width)
 */
object CoordinateNormalizer {

    /**
     * Normalizes a raw landmark into FitMitra [0..1] domain coordinates.
     */
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

    /**
     * Converts a normalized landmark back to preview canvas pixels for rendering overlays.
     */
    fun toCanvasPixels(
        landmark: PoseLandmark,
        canvasWidth: Float,
        canvasHeight: Float
    ): Pair<Float, Float> {
        val px = landmark.x * canvasWidth
        val py = landmark.y * canvasHeight
        return Pair(px, py)
    }
}
