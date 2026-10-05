package com.fitmitra.feature.workout.selection

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fitmitra.core.domain.exercises.ExerciseCatalog
import com.fitmitra.core.domain.models.FitnessGoal
import com.fitmitra.core.domain.models.NoiseRating
import com.fitmitra.core.domain.models.SpaceRequirement
import com.fitmitra.core.theme.FitMitraColors

@Composable
fun WorkoutSelectionScreen(
    viewModel: WorkoutSelectionViewModel,
    onBack: () -> Unit,
    onAcceptRoutine: (exerciseKey: String, targetReps: Int) -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val constraints = state.constraints
    val recommendation = state.recommendation
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FitMitraColors.Background)
            .statusBarsPadding()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // Top Nav
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
                text = "Adaptive Hostel Routine",
                color = FitMitraColors.TextPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(18.dp))

        // Constraint: Duration
        Text(
            text = "AVAILABLE TIME",
            color = FitMitraColors.TextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(5, 7, 10, 15).forEach { mins ->
                val selected = constraints.durationMinutes == mins
                FilterChip(
                    selected = selected,
                    onClick = { viewModel.updateDuration(mins) },
                    label = { Text("$mins min", fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = FitMitraColors.Primary,
                        selectedLabelColor = FitMitraColors.TextPrimary,
                        containerColor = FitMitraColors.Surface,
                        labelColor = FitMitraColors.TextSecondary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Constraint: Space
        Text(
            text = "HOSTEL ROOM SPACE",
            color = FitMitraColors.TextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(SpaceRequirement.SMALL, SpaceRequirement.MEDIUM).forEach { spc ->
                val selected = constraints.space == spc
                FilterChip(
                    selected = selected,
                    onClick = { viewModel.updateSpace(spc) },
                    label = { Text(if (spc == SpaceRequirement.SMALL) "Bedside (~1x2m)" else "Open Floor") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = FitMitraColors.Primary,
                        selectedLabelColor = FitMitraColors.TextPrimary,
                        containerColor = FitMitraColors.Surface,
                        labelColor = FitMitraColors.TextSecondary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Constraint: Noise
        Text(
            text = "NOISE TOLERANCE",
            color = FitMitraColors.TextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(NoiseRating.SILENT, NoiseRating.MODERATE).forEach { nse ->
                val selected = constraints.noiseTolerance == nse
                FilterChip(
                    selected = selected,
                    onClick = { viewModel.updateNoise(nse) },
                    label = { Text(if (nse == NoiseRating.SILENT) "Silent (Midnight Safe)" else "Daytime (Normal)") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = FitMitraColors.Primary,
                        selectedLabelColor = FitMitraColors.TextPrimary,
                        containerColor = FitMitraColors.Surface,
                        labelColor = FitMitraColors.TextSecondary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Constraint: Goal
        Text(
            text = "SESSION FOCUS",
            color = FitMitraColors.TextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(FitnessGoal.STRENGTH, FitnessGoal.POSTURE, FitnessGoal.CARDIO).forEach { gl ->
                val selected = constraints.goal == gl
                FilterChip(
                    selected = selected,
                    onClick = { viewModel.updateGoal(gl) },
                    label = { Text(gl.label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = FitMitraColors.Primary,
                        selectedLabelColor = FitMitraColors.TextPrimary,
                        containerColor = FitMitraColors.Surface,
                        labelColor = FitMitraColors.TextSecondary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Recommendation Result Card
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FitMitraColors.SurfaceElevated,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Primary.copy(alpha = 0.5f))
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = recommendation.title,
                        color = FitMitraColors.TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    Surface(
                        color = FitMitraColors.Success.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "${recommendation.totalDurationMinutes} MIN",
                            color = FitMitraColors.Success,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                recommendation.items.forEachIndexed { index, item ->
                    val exDef = ExerciseCatalog.getExercise(item.exerciseKey)
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        color = FitMitraColors.Surface,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "${index + 1}. ${exDef.name}",
                                    color = FitMitraColors.TextPrimary,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "${item.targetReps} reps • ${exDef.targetMuscles.take(2).joinToString(", ")}",
                                    color = FitMitraColors.TextSecondary,
                                    fontSize = 12.sp
                                )
                            }
                            Text(
                                text = "${item.restSeconds}s rest",
                                color = FitMitraColors.TextMuted,
                                fontSize = 11.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Explanations
                recommendation.explanation.forEach { exp ->
                    Text(
                        text = "✓ $exp",
                        color = FitMitraColors.Accent,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(vertical = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                val primaryItem = recommendation.items.firstOrNull()
                Button(
                    onClick = {
                        if (primaryItem != null) {
                            onAcceptRoutine(primaryItem.exerciseKey.name, primaryItem.targetReps)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Accept Routine & Start Setup", fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))
    }
}
