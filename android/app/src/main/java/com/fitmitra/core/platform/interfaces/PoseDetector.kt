package com.fitmitra.core.platform.interfaces

import androidx.camera.core.ImageAnalysis
import com.fitmitra.core.domain.models.PoseFrame

/**
 * Platform abstraction interface for real-time pose detector.
 */
interface IPoseDetector : ImageAnalysis.Analyzer {
    fun setPoseListener(listener: (frame: PoseFrame, latencyMs: Long) -> Unit)
    fun setErrorListener(listener: (error: Throwable) -> Unit)
    fun close()
}
