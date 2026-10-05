package com.fitmitra.feature.posecoach

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.fitmitra.core.domain.models.WorkoutSummary
import com.fitmitra.core.platform.android.CameraXProvider
import com.fitmitra.core.platform.android.MlKitPoseDetector
import com.fitmitra.core.theme.FitMitraColors

@Composable
fun PoseCoachScreen(
    viewModel: PoseCoachViewModel,
    onExitWorkout: () -> Unit,
    onWorkoutCompleted: (summary: WorkoutSummary) -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // Auto-navigate when workout completes
    LaunchedEffect(state.isCompleted, state.completedSummary) {
        if (state.isCompleted && state.completedSummary != null) {
            onWorkoutCompleted(state.completedSummary!!)
        }
    }

    var showExitDialog by remember { mutableStateOf(false) }

    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        showExitDialog = false
                        viewModel.finishEarly()
                    }
                ) {
                    Text("Save & Exit", color = FitMitraColors.PrimaryBright, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showExitDialog = false }) {
                    Text("Continue Workout", color = FitMitraColors.TextSecondary)
                }
            },
            title = { Text("Quit Workout?") },
            text = { Text("Your completed repetitions will be saved to your session history.") },
            containerColor = FitMitraColors.SurfaceElevated,
            titleContentColor = FitMitraColors.TextPrimary,
            textContentColor = FitMitraColors.TextSecondary
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Camera Preview Layer
        if (hasCameraPermission) {
            AndroidView(
                factory = { ctx ->
                    val previewView = PreviewView(ctx).apply {
                        implementationMode = PreviewView.ImplementationMode.PERFORMANCE
                        scaleType = PreviewView.ScaleType.FILL_CENTER
                    }

                    val poseDetector = MlKitPoseDetector(isFrontCameraProvider = { true })
                    poseDetector.setPoseListener { frame, latencyMs ->
                        viewModel.onPoseFrame(frame, latencyMs)
                    }

                    val cameraProvider = CameraXProvider(ctx)
                    cameraProvider.initialize(lifecycleOwner)
                    cameraProvider.startStreaming(
                        previewView = previewView,
                        analyzer = poseDetector,
                        onReady = {},
                        onError = {}
                    )

                    previewView
                },
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(FitMitraColors.Background),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Camera permission required for AI Pose Coach", color = FitMitraColors.TextPrimary)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) }) {
                        Text("Grant Permission")
                    }
                }
            }
        }

        // Overlay: Dark gradient for readability
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // TOP BAR
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = FitMitraColors.SurfaceElevated.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.clickable { showExitDialog = true }
                ) {
                    Text(
                        text = "✕ Exit",
                        color = FitMitraColors.TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }

                Surface(
                    color = FitMitraColors.SurfaceElevated.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    val mins = state.elapsedSeconds / 60
                    val secs = state.elapsedSeconds % 60
                    Text(
                        text = "%02d:%02d".format(mins, secs),
                        color = FitMitraColors.TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }

                Surface(
                    color = FitMitraColors.SurfaceElevated.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.clickable { viewModel.toggleMute() }
                ) {
                    Text(
                        text = if (state.isMuted) "🔇 Muted" else "🔊 Sound",
                        color = FitMitraColors.TextPrimary,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    )
                }
            }

            // CENTER: HERO REP DISPLAY & COACHING
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    color = FitMitraColors.Surface.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(24.dp),
                    border = androidx.compose.foundation.BorderStroke(2.dp, FitMitraColors.PrimaryBright.copy(alpha = 0.6f))
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 32.dp, vertical = 16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "${state.currentReps}",
                            color = FitMitraColors.TextPrimary,
                            fontSize = 64.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            text = "/ ${state.targetReps} REPS",
                            color = FitMitraColors.TextSecondary,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // High-visibility Form Pill
                val feedback = state.formFeedback ?: if (state.isTrackingValid) "Rep in motion" else "Step back to fit in frame"
                Surface(
                    color = if (state.isTrackingValid) FitMitraColors.Primary.copy(alpha = 0.9f) else FitMitraColors.Warning.copy(alpha = 0.9f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = feedback,
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 18.dp, vertical = 8.dp)
                    )
                }

                if (state.showDebugOverlay) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        color = Color.Black.copy(alpha = 0.75f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("Angle: %.1f°".format(state.currentAngle), color = FitMitraColors.Accent, fontSize = 12.sp)
                            Text("Phase: ${state.phase}", color = FitMitraColors.TextPrimary, fontSize = 12.sp)
                            Text("Inference Latency: ${state.inferenceLatencyMs}ms", color = FitMitraColors.Success, fontSize = 12.sp)
                        }
                    }
                }
            }

            // BOTTOM CONTROL BAR
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = FitMitraColors.SurfaceElevated.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.clickable { viewModel.toggleDebug() }
                ) {
                    Text(
                        text = if (state.showDebugOverlay) "Hide Debug" else "Debug",
                        color = FitMitraColors.TextSecondary,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    )
                }

                Button(
                    onClick = { viewModel.togglePause() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (state.isPaused) FitMitraColors.Success else FitMitraColors.SurfaceElevated
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = if (state.isPaused) "Resume" else "Pause",
                        fontWeight = FontWeight.Bold
                    )
                }

                Button(
                    onClick = { viewModel.finishEarly() },
                    colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Finish", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
