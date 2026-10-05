package com.fitmitra.feature.exam

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fitmitra.core.domain.exam.ExamEngine
import com.fitmitra.core.domain.exam.ExamModeType
import com.fitmitra.core.theme.FitMitraColors

@Composable
fun ExamScreen(
    viewModel: ExamViewModel,
    onBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FitMitraColors.Background)
            .statusBarsPadding()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // Navigation Bar
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "‹ Back",
                color = FitMitraColors.PrimaryBright,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                modifier = Modifier
                    .clickable {
                        if (state.isSessionActive) {
                            viewModel.endSession()
                        }
                        onBack()
                    }
                    .padding(end = 12.dp, top = 4.dp, bottom = 4.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Exam Mode",
                color = FitMitraColors.TextPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(18.dp))

        if (state.isCompleted) {
            // Completed View
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 40.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(text = "🧠", fontSize = 48.sp)
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Break Complete!",
                    color = FitMitraColors.TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Eyes rested, blood circulating. You're set for your next study block.",
                    color = FitMitraColors.TextSecondary,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )

                Spacer(modifier = Modifier.height(32.dp))
                Button(
                    onClick = {
                        viewModel.endSession()
                        onBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Secondary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Return to Dashboard", fontWeight = FontWeight.Bold)
                }
            }
        } else if (state.isSessionActive) {
            // Active Session View
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = FitMitraColors.SurfaceElevated,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Secondary.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "ACTIVITY ${state.activityIndex + 1} OF ${state.totalActivities}",
                        color = FitMitraColors.Secondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    val mins = state.activityRemainingSeconds / 60
                    val secs = state.activityRemainingSeconds % 60
                    Text(
                        text = "%02d:%02d".format(mins, secs),
                        color = FitMitraColors.TextPrimary,
                        fontSize = 54.sp,
                        fontWeight = FontWeight.ExtraBold
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = state.currentActivityName,
                        color = FitMitraColors.TextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = state.currentActivityDescription,
                        color = FitMitraColors.TextSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )

                    if (state.currentCues.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Column(modifier = Modifier.fillMaxWidth()) {
                            state.currentCues.forEach { cue ->
                                Text(
                                    text = "• $cue",
                                    color = FitMitraColors.Accent,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(28.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Button(
                            onClick = { viewModel.togglePause() },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (state.isPaused) FitMitraColors.Success else FitMitraColors.Surface
                            ),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(if (state.isPaused) "Resume" else "Pause")
                        }

                        Button(
                            onClick = { viewModel.skipActivity() },
                            colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Secondary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Skip Activity ›")
                        }
                    }
                }
            }
        } else {
            // Mode Selection View
            Text(
                text = "Choose Your Break Length",
                color = FitMitraColors.TextSecondary,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(12.dp))

            listOf(ExamModeType.RESET, ExamModeType.BREAK, ExamModeType.RECHARGE).forEach { mode ->
                val selected = state.selectedMode == mode
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                        .clickable { viewModel.selectMode(mode) },
                    color = if (selected) FitMitraColors.SurfaceElevated else FitMitraColors.Surface,
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (selected) FitMitraColors.Secondary else FitMitraColors.BorderSubtle
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = mode.title,
                                color = FitMitraColors.TextPrimary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Surface(
                                color = FitMitraColors.Secondary.copy(alpha = 0.2f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "${mode.durationMinutes} MIN",
                                    color = FitMitraColors.Secondary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        val previewSession = ExamEngine.createSession(mode)
                        val summaryText = previewSession.activities.joinToString(" • ") { it.name }
                        Text(
                            text = summaryText,
                            color = FitMitraColors.TextSecondary,
                            fontSize = 12.sp,
                            maxLines = 2
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = { viewModel.startSession() },
                colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Secondary),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Text("Start ${state.selectedMode.durationMinutes}-Minute Micro-Break", fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(28.dp))
    }
}
