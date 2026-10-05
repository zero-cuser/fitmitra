package com.fitmitra.spike.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fitmitra.spike.domain.PoseFrame
import com.fitmitra.spike.domain.SquatKinematics
import com.fitmitra.spike.pose.CoordinateNormalizer

/**
 * Developer visual debugging overlay.
 *
 * Renders detected joints, skeleton segments, joint angle readouts,
 * inference latency, and real-time frame rates.
 */
@Composable
fun DebugOverlay(
    uiState: SpikeUiState,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.fillMaxSize()) {
        val frame = uiState.currentFrame
        if (frame != null && frame.landmarks.size >= 29) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val canvasWidth = size.width
                val canvasHeight = size.height

                fun getPoint(idx: Int): Offset? {
                    val lm = frame.landmarks.getOrNull(idx) ?: return null
                    if ((lm.visibility ?: 0f) < 0.3f) return null
                    val (px, py) = CoordinateNormalizer.toCanvasPixels(lm, canvasWidth, canvasHeight)
                    return Offset(px, py)
                }

                // Joint indices
                val lHip = getPoint(SquatKinematics.LEFT_HIP)
                val lKnee = getPoint(SquatKinematics.LEFT_KNEE)
                val lAnkle = getPoint(SquatKinematics.LEFT_ANKLE)

                val rHip = getPoint(SquatKinematics.RIGHT_HIP)
                val rKnee = getPoint(SquatKinematics.RIGHT_KNEE)
                val rAnkle = getPoint(SquatKinematics.RIGHT_ANKLE)

                val skeletonColor = if (uiState.squatPhase.name == "DOWN") Color(0xFF00E676) else Color(0xFFFFD600)
                val jointColor = Color(0xFF00E5FF)

                // Left leg lines
                if (lHip != null && lKnee != null) {
                    drawLine(skeletonColor, lHip, lKnee, strokeWidth = 8f, cap = StrokeCap.Round)
                }
                if (lKnee != null && lAnkle != null) {
                    drawLine(skeletonColor, lKnee, lAnkle, strokeWidth = 8f, cap = StrokeCap.Round)
                }

                // Right leg lines
                if (rHip != null && rKnee != null) {
                    drawLine(skeletonColor, rHip, rKnee, strokeWidth = 8f, cap = StrokeCap.Round)
                }
                if (rKnee != null && rAnkle != null) {
                    drawLine(skeletonColor, rKnee, rAnkle, strokeWidth = 8f, cap = StrokeCap.Round)
                }

                // Draw joint circles
                listOfNotNull(lHip, lKnee, lAnkle, rHip, rKnee, rAnkle).forEach { pt ->
                    drawCircle(Color.White, radius = 12f, center = pt)
                    drawCircle(jointColor, radius = 8f, center = pt)
                }
            }
        }

        // Top telemetry diagnostics card
        Column(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp)
                .background(Color(0xCC111827), RoundedCornerShape(8.dp))
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Text(
                text = "[DEV OVERLAY — FITMITRA SPIKE]",
                color = Color(0xFF38BDF8),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "FPS: ${uiState.fps} | Latency: ${uiState.inferenceLatencyMs}ms",
                color = Color.White,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "Knee Angle: %.1f°".format(uiState.kneeAngle),
                color = if (uiState.kneeAngle <= SquatKinematics.DOWN_THRESHOLD_DEGREES) Color(0xFF4ADE80) else Color(0xFFFBBF24),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "State: ${uiState.squatPhase.name} | Reps: ${uiState.repCount}",
                color = Color.White,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "Confidence: ${(uiState.confidence * 100).toInt()}%",
                color = if (uiState.confidence >= SquatKinematics.MIN_CONFIDENCE_THRESHOLD) Color(0xFF4ADE80) else Color(0xFFF87171),
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "Camera: ${if (uiState.isFrontCamera) "Front (Mirrored)" else "Back"}",
                color = Color(0xFF94A3B8),
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}
