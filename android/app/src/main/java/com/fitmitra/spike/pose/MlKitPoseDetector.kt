package com.fitmitra.spike.pose

import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.fitmitra.spike.domain.PoseFrame
import com.fitmitra.spike.domain.PoseLandmark
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions

/**
 * On-device real-time pose detector adapter bridging CameraX ImageAnalysis to FitMitra domain.
 *
 * Uses Google ML Kit Pose Detection in STREAM_MODE (fast on-device inference, 15-30ms).
 * Strictly runs locally on the CPU/GPU with zero network calls or cloud uploads.
 */
class MlKitPoseDetector(
    private val isFrontCameraProvider: () -> Boolean,
    private val onPoseDetected: (PoseFrame, Long) -> Unit,
    private val onError: (Exception) -> Unit
) : ImageAnalysis.Analyzer {

    private val options = PoseDetectorOptions.Builder()
        .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
        .setPreferredHardwareConfigs(PoseDetectorOptions.CPU_GPU)
        .build()

    private val detector: PoseDetector = PoseDetection.getClient(options)

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
                    onPoseDetected(frame, inferenceLatencyMs)
                } else {
                    onPoseDetected(
                        PoseFrame(emptyList(), System.currentTimeMillis()),
                        inferenceLatencyMs
                    )
                }
            }
            .addOnFailureListener { exc ->
                onError(exc)
            }
            .addOnCompleteListener {
                // Ensure imageProxy is closed after every frame to prevent camera buffer exhaustion
                imageProxy.close()
            }
    }

    fun close() {
        detector.close()
    }
}
