package com.fitmitra.core.platform.android

import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageProxy
import com.fitmitra.core.domain.models.PoseFrame
import com.fitmitra.core.domain.models.PoseLandmark
import com.fitmitra.core.platform.interfaces.IPoseDetector
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions

/**
 * Production implementation of IPoseDetector utilizing Google ML Kit Pose Detection.
 * Runs 100% on-device in STREAM_MODE with CPU_GPU acceleration.
 * Zero network transmission, zero cloud dependencies.
 */
class MlKitPoseDetector(
    private val isFrontCameraProvider: () -> Boolean = { true }
) : IPoseDetector {

    private val options = PoseDetectorOptions.Builder()
        .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
        .setPreferredHardwareConfigs(PoseDetectorOptions.CPU_GPU)
        .build()

    private val detector: PoseDetector = PoseDetection.getClient(options)

    private var poseListener: ((PoseFrame, Long) -> Unit)? = null
    private var errorListener: ((Throwable) -> Unit)? = null

    override fun setPoseListener(listener: (frame: PoseFrame, latencyMs: Long) -> Unit) {
        this.poseListener = listener
    }

    override fun setErrorListener(listener: (error: Throwable) -> Unit) {
        this.errorListener = listener
    }

    @ExperimentalGetImage
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            return
        }

        val startTime = System.currentTimeMillis()
        val rotationDegrees = imageProxy.imageInfo.rotationDegrees
        val inputImage = InputImage.fromMediaImage(mediaImage, rotationDegrees)

        val isFront = isFrontCameraProvider()
        val width = inputImage.width
        val height = inputImage.height

        detector.process(inputImage)
            .addOnSuccessListener { pose ->
                val inferenceLatencyMs = System.currentTimeMillis() - startTime
                val allLandmarks = pose.allPoseLandmarks

                if (allLandmarks.isNotEmpty()) {
                    val landmarksList = ArrayList<PoseLandmark>(33)
                    for (i in 0..32) {
                        val landmark = pose.getPoseLandmark(i)
                        if (landmark != null) {
                            landmarksList.add(
                                CoordinateNormalizer.normalize(
                                    rawX = landmark.position.x,
                                    rawY = landmark.position.y,
                                    rawZ = landmark.position3D.z,
                                    confidence = landmark.inFrameLikelihood,
                                    imageWidth = width,
                                    imageHeight = height,
                                    isFrontCamera = isFront
                                )
                            )
                        } else {
                            landmarksList.add(PoseLandmark(0f, 0f, 0f, 0f))
                        }
                    }

                    val frame = PoseFrame(landmarksList, System.currentTimeMillis())
                    poseListener?.invoke(frame, inferenceLatencyMs)
                } else {
                    poseListener?.invoke(
                        PoseFrame(emptyList(), System.currentTimeMillis()),
                        inferenceLatencyMs
                    )
                }
            }
            .addOnFailureListener { exc ->
                errorListener?.invoke(exc)
            }
            .addOnCompleteListener {
                // Ensure imageProxy is closed after every frame to prevent camera buffer exhaustion
                imageProxy.close()
            }
    }

    override fun close() {
        try {
            detector.close()
        } catch (_: Exception) {
        }
    }
}
