package com.fitmitra.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fitmitra.core.domain.exercises.ExerciseCatalog
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.theme.FitMitraColors

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onNavigateToWorkoutSelection: () -> Unit,
    onNavigateToSetup: (exerciseKey: String) -> Unit,
    onNavigateToExam: () -> Unit,
    onNavigateToChallenges: () -> Unit,
    onNavigateToProgress: () -> Unit
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
        // App Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "FitMitra",
                    color = FitMitraColors.TextPrimary,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "AI Pose Coach • Hostel Fitness",
                    color = FitMitraColors.TextSecondary,
                    fontSize = 13.sp
                )
            }

            Surface(
                color = FitMitraColors.SurfaceElevated,
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderSubtle)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "LVL ${state.level}",
                        color = FitMitraColors.PrimaryBright,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${state.totalXp} XP",
                        color = FitMitraColors.TextSecondary,
                        fontSize = 12.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Streak & Activity Banner
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onNavigateToProgress() },
            color = FitMitraColors.Surface,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderStrong)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "🔥 ${state.currentStreak} Day Streak",
                            color = FitMitraColors.Warning,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        if (state.isActiveToday) {
                            Surface(
                                color = FitMitraColors.Success.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "Active Today",
                                    color = FitMitraColors.Success,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${state.totalWorkouts} lifetime workouts completed",
                        color = FitMitraColors.TextSecondary,
                        fontSize = 13.sp
                    )
                }

                Text(
                    text = "Stats ›",
                    color = FitMitraColors.PrimaryBright,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Hero: Adaptive Hostel Workout Engine
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.SurfaceElevated,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Primary.copy(alpha = 0.4f))
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Surface(
                    color = FitMitraColors.Primary.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "ADAPTIVE ENGINE",
                        color = FitMitraColors.PrimaryBright,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Hostel Room Routine Solver",
                    color = FitMitraColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Constrained by space, noise, or 7 minutes between lectures? Get a deterministic routine tailored to your room.",
                    color = FitMitraColors.TextSecondary,
                    fontSize = 13.sp,
                    lineHeight = 18.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = onNavigateToWorkoutSelection,
                    colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Configure & Solve Routine", fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Quick Start Exercises Section
        Text(
            text = "Quick Pose Coach Workouts",
            color = FitMitraColors.TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp
        )
        Spacer(modifier = Modifier.height(12.dp))

        ExerciseCatalog.getAllExercises().forEach { exercise ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp)
                    .clickable { onNavigateToSetup(exercise.key.name) },
                color = FitMitraColors.Surface,
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderSubtle)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = exercise.name,
                            color = FitMitraColors.TextPrimary,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "${exercise.defaultReps} reps • ${exercise.noiseRating.name} • ${exercise.spaceRequirement.name} space",
                            color = FitMitraColors.TextSecondary,
                            fontSize = 12.sp
                        )
                    }

                    Surface(
                        color = FitMitraColors.Primary.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "Start ›",
                            color = FitMitraColors.PrimaryBright,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Exam Mode Card
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onNavigateToExam() },
            color = FitMitraColors.Surface,
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Secondary.copy(alpha = 0.4f))
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "📚 Exam Mode",
                        color = FitMitraColors.Secondary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "2, 5, or 10 min micro-breaks for study recharge.",
                        color = FitMitraColors.TextSecondary,
                        fontSize = 12.sp
                    )
                }
                Text("Open ›", color = FitMitraColors.Secondary, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Campus Challenges Card
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onNavigateToChallenges() },
            color = FitMitraColors.Surface,
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Accent.copy(alpha = 0.4f))
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "🏆 Campus Challenges",
                        color = FitMitraColors.Accent,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "3 active challenges: Squat Blitz, Consistency, Quiet Night.",
                        color = FitMitraColors.TextSecondary,
                        fontSize = 12.sp
                    )
                }
                Text("View ›", color = FitMitraColors.Accent, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(28.dp))
    }
}
