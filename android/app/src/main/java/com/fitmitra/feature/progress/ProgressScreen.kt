package com.fitmitra.feature.progress

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
fun ProgressScreen(
    viewModel: ProgressViewModel,
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
                    .clickable { onBack() }
                    .padding(end = 12.dp, top = 4.dp, bottom = 4.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Progress & Streaks",
                color = FitMitraColors.TextPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Streak Card
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.SurfaceElevated,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Warning.copy(alpha = 0.4f))
        ) {
            Row(
                modifier = Modifier.padding(20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("CURRENT STREAK", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = "🔥 ${state.currentStreak} Days",
                        color = FitMitraColors.Warning,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (state.isActiveToday) "Workout completed today! 🎉" else "Workout needed today",
                        color = if (state.isActiveToday) FitMitraColors.Success else FitMitraColors.TextSecondary,
                        fontSize = 12.sp
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text("LONGEST STREAK", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = "${state.longestStreak} Days",
                        color = FitMitraColors.TextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Lifetime Stats
        Text(
            text = "Lifetime Metrics",
            color = FitMitraColors.TextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(12.dp))

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.Surface,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderStrong)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("TOTAL WORKOUTS", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("${state.totalWorkouts}", color = FitMitraColors.TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    }
                    Column {
                        Text("TOTAL REPS", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("${state.totalReps}", color = FitMitraColors.PrimaryBright, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("CALORIES BURNED", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("${state.totalCalories} kcal", color = FitMitraColors.Success, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    }
                    Column {
                        Text("TOTAL XP", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("${state.totalXp} XP", color = FitMitraColors.Accent, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Privacy Guarantee
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.SurfaceElevated,
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderSubtle)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "🔒 Local Storage Privacy",
                    color = FitMitraColors.TextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "All workout histories, reps, and streaks are saved in private encrypted Jetpack DataStore on your device. Zero external cloud tracking.",
                    color = FitMitraColors.TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 15.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(28.dp))
    }
}
