package com.fitmitra.core.platform.interfaces

import androidx.camera.core.ImageAnalysis
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner

enum class CameraFacing {
    FRONT,
    BACK
}

enum class CameraState {
    IDLE,
    STARTING,
    STREAMING,
    PAUSED,
    ERROR
}

/**
 * Platform abstraction interface for camera streaming.
 */
interface ICameraProvider {
    val currentFacing: CameraFacing
    val state: CameraState

    fun initialize(lifecycleOwner: LifecycleOwner)
    fun startStreaming(
        previewView: PreviewView,
        analyzer: ImageAnalysis.Analyzer,
        onReady: () -> Unit = {},
        onError: (Throwable) -> Unit = {}
    )
    fun switchCamera(
        previewView: PreviewView,
        analyzer: ImageAnalysis.Analyzer,
        onReady: () -> Unit = {},
        onError: (Throwable) -> Unit = {}
    )
    fun stopStreaming()
    fun release()
}
