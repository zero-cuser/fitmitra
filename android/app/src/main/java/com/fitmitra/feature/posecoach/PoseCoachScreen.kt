package com.fitmitra.feature.posecoach

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.fitmitra.core.domain.models.WorkoutSessionState
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

    // Handle cancellation
    LaunchedEffect(state.isCancelled) {
        if (state.isCancelled) {
            onExitWorkout()
        }
    }

    // Lifecycle-managed Camera & Pose Detector with guaranteed disposal
    val cameraProvider = remember { CameraXProvider(context) }
    val poseDetector = remember {
        MlKitPoseDetector(isFrontCameraProvider = { cameraProvider.isFrontCamera }).apply {
            setPoseListener { frame, latencyMs ->
                viewModel.onPoseFrame(frame, latencyMs)
            }
            setErrorListener { error ->
                viewModel.reportCameraError(error)
            }
        }
    }

    DisposableEffect(lifecycleOwner) {
        cameraProvider.initialize(lifecycleOwner)
        onDispose {
            cameraProvider.release()
            poseDetector.close()
        }
    }

    var showExitDialog by remember { mutableStateOf(false) }

    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            confirmButton = {
                if (state.currentReps > 0) {
                    TextButton(
                        onClick = {
                            showExitDialog = false
                            viewModel.finishEarly()
                        },
                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                    ) {
                        Text(
                            "Save & Finish (${state.currentReps} reps)",
                            color = FitMitraColors.PrimaryBright,
                            fontWeight = FontWeight.Bold
                        )
                    }
                } else {
                    TextButton(
                        onClick = {
                            showExitDialog = false
                            viewModel.cancelWorkout()
                        },
                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                    ) {
                        Text(
                            "Discard & Exit",
                            color = FitMitraColors.Danger,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            },
            dismissButton = {
                Row {
                    if (state.currentReps > 0) {
                        TextButton(
                            onClick = {
                                showExitDialog = false
                                viewModel.cancelWorkout()
                            },
                            modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text("Discard", color = FitMitraColors.Danger)
                        }
                    }
                    TextButton(
                        onClick = { showExitDialog = false },
                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                    ) {
                        Text("Continue Workout", color = FitMitraColors.TextSecondary)
                    }
                }
            },
            title = {
                Text(
                    if (state.currentReps > 0) "Finish or Discard Workout?" else "Discard Workout?",
                    color = FitMitraColors.TextPrimary
                )
            },
            text = {
                Text(
                    if (state.currentReps > 0)
                        "You have completed ${state.currentReps} reps. You can save your progress now or discard this session without counting it as completed."
                    else
                        "No repetitions were completed. Discarding will exit without recording an incomplete workout.",
                    color = FitMitraColors.TextSecondary
                )
            },
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
        if (hasCameraPermission && state.sessionState != WorkoutSessionState.FAILED) {
            AndroidView(
                factory = { ctx ->
                    val previewView = PreviewView(ctx).apply {
                        implementationMode = PreviewView.ImplementationMode.PERFORMANCE
                        scaleType = PreviewView.ScaleType.FILL_CENTER
                    }

                    cameraProvider.startStreaming(
                        previewView = previewView,
                        analyzer = poseDetector,
                        onReady = {},
                        onError = { err ->
                            viewModel.reportCameraError(err)
                        }
                    )

                    previewView
                },
                modifier = Modifier.fillMaxSize()
            )
        } else if (state.sessionState == WorkoutSessionState.FAILED) {
            // Camera Error Fallback UI
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(FitMitraColors.Background)
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    color = FitMitraColors.SurfaceElevated,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Danger.copy(alpha = 0.5f))
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(text = "⚠️", fontSize = 36.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Camera Unavailable",
                            color = FitMitraColors.TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = state.errorMessage ?: "Could not access camera feed. Verify no other app is using the camera.",
                            color = FitMitraColors.TextSecondary,
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(
                                onClick = { viewModel.retryCamera() },
                                colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                            ) {
                                Text("Retry Camera")
                            }
                            Button(
                                onClick = { viewModel.cancelWorkout() },
                                colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Surface),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                            ) {
                                Text("Exit Workout", color = FitMitraColors.TextPrimary)
                            }
                        }
                    }
                }
            }
        } else {
            // Permission Request State
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(FitMitraColors.Background),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(24.dp)
                ) {
                    Text(
                        "Camera permission is required for on-device AI Pose Coaching.",
                        color = FitMitraColors.TextPrimary,
                        fontSize = 15.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                    ) {
                        Text("Grant Camera Permission")
                    }
                }
            }
        }

        // Overlay: HUD & Controls
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
                    modifier = Modifier
                        .clickable { showExitDialog = true }
                        .semantics { contentDescription = "Exit workout session" }
                        .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "✕ Exit",
                            color = FitMitraColors.TextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Surface(
                    color = FitMitraColors.SurfaceElevated.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .semantics { contentDescription = "Elapsed workout duration" }
                        .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                ) {
                    val mins = state.elapsedSeconds / 60
                    val secs = state.elapsedSeconds % 60
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "%02d:%02d".format(mins, secs),
                            color = FitMitraColors.TextPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Surface(
                    color = FitMitraColors.SurfaceElevated.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .clickable { viewModel.toggleMute() }
                        .semantics { contentDescription = if (state.isMuted) "Unmute audio coach" else "Mute audio coach" }
                        .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = if (state.isMuted) "🔇 Muted" else "🔊 Sound",
                            color = FitMitraColors.TextPrimary,
                            fontSize = 14.sp
                        )
                    }
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
                    border = androidx.compose.foundation.BorderStroke(2.dp, FitMitraColors.PrimaryBright.copy(alpha = 0.6f)),
                    modifier = Modifier.semantics {
                        contentDescription = "Current reps: ${state.currentReps} out of ${state.targetReps}"
                    }
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

                // High-visibility Form Status Pill (Not relying on color alone)
                val statusText = if (state.isTrackingValid) {
                    state.formFeedback ?: "Tracking active: perform rep"
                } else {
                    "⚠️ Step back to fit entire body in camera"
                }

                Surface(
                    color = if (state.isTrackingValid) FitMitraColors.Primary.copy(alpha = 0.9f) else FitMitraColors.Warning.copy(alpha = 0.95f),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.semantics { contentDescription = "Form feedback: $statusText" }
                ) {
                    Text(
                        text = statusText,
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 18.dp, vertical = 8.dp)
                    )
                }

                if (state.showDebugOverlay) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        color = Color.Black.copy(alpha = 0.8f),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderSubtle)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("Angle: %.1f°".format(state.currentAngle), color = FitMitraColors.Accent, fontSize = 12.sp)
                            Text("Phase: ${state.phase}", color = FitMitraColors.TextPrimary, fontSize = 12.sp)
                            Text("Confidence: %.2f".format(state.averageConfidence), color = FitMitraColors.TextSecondary, fontSize = 12.sp)
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
                    modifier = Modifier
                        .clickable { viewModel.toggleDebug() }
                        .semantics { contentDescription = if (state.showDebugOverlay) "Hide telemetry debug overlay" else "Show telemetry debug overlay" }
                        .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = if (state.showDebugOverlay) "Hide Debug" else "Debug",
                            color = FitMitraColors.TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }

                Button(
                    onClick = { viewModel.togglePause() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (state.isPaused) FitMitraColors.Success else FitMitraColors.SurfaceElevated
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .defaultMinSize(minWidth = 100.dp, minHeight = 48.dp)
                        .semantics { contentDescription = if (state.isPaused) "Resume workout session" else "Pause workout session" }
                ) {
                    Text(
                        text = if (state.isPaused) "Resume" else "Pause",
                        fontWeight = FontWeight.Bold
                    )
                }

                Button(
                    onClick = {
                        if (state.currentReps > 0) {
                            viewModel.finishEarly()
                        } else {
                            showExitDialog = true
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .defaultMinSize(minWidth = 100.dp, minHeight = 48.dp)
                        .semantics { contentDescription = "Finish workout session now" }
                ) {
                    Text("Finish", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
