package com.fitmitra.spike.camera

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Lifecycle-safe CameraX manager providing camera preview and non-blocking image analysis.
 *
 * Implements STRATEGY_KEEP_ONLY_LATEST to avoid queue growth and ensure that frame processing
 * always works on the freshest frame with zero latency accumulation.
 */
class CameraXManager(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner
) {
    private var cameraProvider: ProcessCameraProvider? = null
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    var lensFacing: Int = CameraSelector.LENS_FACING_FRONT
        private set

    val isFrontCamera: Boolean
        get() = lensFacing == CameraSelector.LENS_FACING_FRONT

    fun startCamera(
        previewView: PreviewView,
        analyzer: ImageAnalysis.Analyzer,
        onReady: () -> Unit = {},
        onError: (Throwable) -> Unit = {}
    ) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()

                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

                // KEEP_ONLY_LATEST drops stale queued frames if inference takes longer than frame interval
                val imageAnalysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                    .build()
                    .also {
                        it.setAnalyzer(cameraExecutor, analyzer)
                    }

                val cameraSelector = CameraSelector.Builder()
                    .requireLensFacing(lensFacing)
                    .build()

                cameraProvider?.unbindAll()
                cameraProvider?.bindToLifecycle(
                    lifecycleOwner,
                    cameraSelector,
                    preview,
                    imageAnalysis
                )

                onReady()
            } catch (exc: Throwable) {
                onError(exc)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    fun switchCamera(
        previewView: PreviewView,
        analyzer: ImageAnalysis.Analyzer,
        onReady: () -> Unit = {},
        onError: (Throwable) -> Unit = {}
    ) {
        lensFacing = if (lensFacing == CameraSelector.LENS_FACING_FRONT) {
            CameraSelector.LENS_FACING_BACK
        } else {
            CameraSelector.LENS_FACING_FRONT
        }
        startCamera(previewView, analyzer, onReady, onError)
    }

    fun stopCamera() {
        cameraProvider?.unbindAll()
    }

    fun release() {
        stopCamera()
        cameraExecutor.shutdown()
    }
}
