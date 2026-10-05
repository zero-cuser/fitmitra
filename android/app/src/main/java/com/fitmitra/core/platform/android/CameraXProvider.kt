package com.fitmitra.core.platform.android

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.fitmitra.core.platform.interfaces.CameraFacing
import com.fitmitra.core.platform.interfaces.CameraState
import com.fitmitra.core.platform.interfaces.ICameraProvider
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Production CameraX implementation adhering to ICameraProvider.
 *
 * Implements non-blocking frame streaming via STRATEGY_KEEP_ONLY_LATEST.
 */
class CameraXProvider(
    private val context: Context
) : ICameraProvider {

    private var lifecycleOwner: LifecycleOwner? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    override var currentFacing: CameraFacing = CameraFacing.FRONT
        private set

    override var state: CameraState = CameraState.IDLE
        private set

    val isFrontCamera: Boolean
        get() = currentFacing == CameraFacing.FRONT

    override fun initialize(lifecycleOwner: LifecycleOwner) {
        this.lifecycleOwner = lifecycleOwner
    }

    override fun startStreaming(
        previewView: PreviewView,
        analyzer: ImageAnalysis.Analyzer,
        onReady: () -> Unit,
        onError: (Throwable) -> Unit
    ) {
        val owner = lifecycleOwner ?: run {
            onError(IllegalStateException("LifecycleOwner not initialized"))
            return
        }

        state = CameraState.STARTING
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()

                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

                // Discard stale frames when ML inference takes longer than camera frame interval
                val imageAnalysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                    .build()
                    .also {
                        it.setAnalyzer(cameraExecutor, analyzer)
                    }

                val lensFacingInt = if (currentFacing == CameraFacing.FRONT) {
                    CameraSelector.LENS_FACING_FRONT
                } else {
                    CameraSelector.LENS_FACING_BACK
                }

                val cameraSelector = CameraSelector.Builder()
                    .requireLensFacing(lensFacingInt)
                    .build()

                cameraProvider?.unbindAll()
                cameraProvider?.bindToLifecycle(
                    owner,
                    cameraSelector,
                    preview,
                    imageAnalysis
                )

                state = CameraState.STREAMING
                onReady()
            } catch (t: Throwable) {
                state = CameraState.ERROR
                onError(t)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    override fun switchCamera(
        previewView: PreviewView,
        analyzer: ImageAnalysis.Analyzer,
        onReady: () -> Unit,
        onError: (Throwable) -> Unit
    ) {
        currentFacing = if (currentFacing == CameraFacing.FRONT) CameraFacing.BACK else CameraFacing.FRONT
        startStreaming(previewView, analyzer, onReady, onError)
    }

    override fun stopStreaming() {
        cameraProvider?.unbindAll()
        state = CameraState.PAUSED
    }

    override fun release() {
        stopStreaming()
        cameraExecutor.shutdown()
        state = CameraState.IDLE
    }
}
