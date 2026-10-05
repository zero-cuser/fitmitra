package com.fitmitra.feature.workout.setup

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.fitmitra.core.domain.exercises.ExerciseCatalog
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.theme.FitMitraColors

@Composable
fun WorkoutSetupScreen(
    exerciseKeyString: String,
    targetReps: Int,
    onBack: () -> Unit,
    onStartWorkout: (exerciseKey: String, reps: Int) -> Unit
) {
    val key = try {
        ExerciseKey.valueOf(exerciseKeyString)
    } catch (_: Exception) {
        ExerciseKey.SQUATS
    }
    val exercise = ExerciseCatalog.getExercise(key)
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FitMitraColors.Background)
            .statusBarsPadding()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // Navigation header
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
                text = "Workout Setup",
                color = FitMitraColors.TextPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Exercise Card
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.Surface,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderStrong)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text(
                    text = exercise.name,
                    color = FitMitraColors.TextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = exercise.description,
                    color = FitMitraColors.TextSecondary,
                    fontSize = 13.sp,
                    lineHeight = 18.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("TARGET GOAL", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("$targetReps REPS", color = FitMitraColors.PrimaryBright, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                    Column {
                        Text("NOISE LEVEL", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(exercise.noiseRating.label.split(" ").first(), color = FitMitraColors.Success, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                    Column {
                        Text("SPACE", color = FitMitraColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(exercise.spaceRequirement.name, color = FitMitraColors.Accent, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Camera Placement Instructions
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.SurfaceElevated,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderSubtle)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text(
                    text = "Phone Placement Checklist",
                    color = FitMitraColors.TextPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(10.dp))

                listOf(
                    "📱 Prop phone upright against a book or wall at hip/chest level",
                    "📏 Step back approximately 2 meters until your full body is in frame",
                    "💡 Ensure reasonable lighting without blinding backlights behind you",
                    "🔇 Audio cues will chirp on every completed repetition"
                ).forEach { item ->
                    Text(
                        text = item,
                        color = FitMitraColors.TextSecondary,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(vertical = 4.dp),
                        lineHeight = 18.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Privacy Guarantee Card
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.Surface,
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Success.copy(alpha = 0.3f))
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "🛡️", fontSize = 22.sp)
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "100% On-Device Pose Intelligence",
                        color = FitMitraColors.Success,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                    Text(
                        text = "All pose detection runs locally on your phone. Video frames are never sent over the internet or saved to storage.",
                        color = FitMitraColors.TextSecondary,
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        Button(
            onClick = { onStartWorkout(key.name, targetReps) },
            colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
        ) {
            Text("Start Workout (Activate Camera)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}
