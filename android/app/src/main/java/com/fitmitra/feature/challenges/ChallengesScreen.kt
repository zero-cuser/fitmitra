package com.fitmitra.feature.challenges

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
import com.fitmitra.core.theme.FitMitraColors

@Composable
fun ChallengesScreen(
    viewModel: ChallengesViewModel,
    onBack: () -> Unit,
    onStartWorkoutForChallenge: () -> Unit
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
                    .clickable { onBack() }
                    .padding(end = 12.dp, top = 4.dp, bottom = 4.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Campus Challenges",
                color = FitMitraColors.TextPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(18.dp))

        Text(
            text = "Active Hostel & Campus Leaderboards",
            color = FitMitraColors.TextSecondary,
            fontSize = 13.sp
        )

        Spacer(modifier = Modifier.height(14.dp))

        state.challenges.forEach { item ->
            val ch = item.challenge
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 14.dp),
                color = FitMitraColors.Surface,
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderStrong)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = ch.title,
                            color = FitMitraColors.TextPrimary,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Surface(
                            color = FitMitraColors.Accent.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "${ch.daysRemaining}d left",
                                color = FitMitraColors.Accent,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = ch.description,
                        color = FitMitraColors.TextSecondary,
                        fontSize = 12.sp,
                        lineHeight = 16.sp
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Progress Bar
                    LinearProgressIndicator(
                        progress = { item.percentage / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp),
                        color = if (item.isCompleted) FitMitraColors.Success else FitMitraColors.PrimaryBright,
                        trackColor = FitMitraColors.SurfaceElevated,
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "${item.currentValue} / ${ch.targetValue} ${ch.unit}",
                            color = FitMitraColors.TextPrimary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "${item.percentage}%",
                            color = if (item.isCompleted) FitMitraColors.Success else FitMitraColors.TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onStartWorkoutForChallenge,
            colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text("Work on Challenge Now", fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(28.dp))
    }
}
