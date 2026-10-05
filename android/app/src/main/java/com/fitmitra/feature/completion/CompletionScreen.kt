package com.fitmitra.feature.completion

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fitmitra.core.theme.FitMitraColors

@Composable
fun CompletionScreen(
    exerciseName: String,
    completedReps: Int,
    targetReps: Int,
    durationSeconds: Int,
    caloriesBurned: Double,
    xpEarned: Int,
    onNavigateHome: () -> Unit
) {
    val scrollState = rememberScrollState()
    val mins = durationSeconds / 60
    val secs = durationSeconds % 60

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FitMitraColors.Background)
            .statusBarsPadding()
            .verticalScroll(scrollState)
            .padding(horizontal = 24.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        Text(text = "🎉", fontSize = 48.sp)
        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "Workout Complete!",
            color = FitMitraColors.TextPrimary,
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Great job crushing your $exerciseName session.",
            color = FitMitraColors.TextSecondary,
            fontSize = 14.sp
        )

        Spacer(modifier = Modifier.height(28.dp))

        // XP Reward Banner
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.Primary.copy(alpha = 0.15f),
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Primary.copy(alpha = 0.4f))
        ) {
            Row(
                modifier = Modifier.padding(18.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "+$xpEarned XP",
                        color = FitMitraColors.PrimaryBright,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        text = "Added to your fitness progress",
                        color = FitMitraColors.TextSecondary,
                        fontSize = 12.sp
                    )
                }

                Surface(
                    color = FitMitraColors.Warning.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "🔥 Streak Kept!",
                        color = FitMitraColors.Warning,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Metrics Grid
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.Surface,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderStrong)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("COMPLETED REPS", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("$completedReps / $targetReps", color = FitMitraColors.TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                    Column {
                        Text("ACTIVE DURATION", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("%02d:%02d".format(mins, secs), color = FitMitraColors.TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("ESTIMATED CALORIES", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("%.1f kcal".format(caloriesBurned), color = FitMitraColors.Success, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                    Column {
                        Text("FORM ACCURACY", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("94%", color = FitMitraColors.Accent, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(36.dp))

        Button(
            onClick = onNavigateHome,
            colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
        ) {
            Text("Back to Dashboard", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}
