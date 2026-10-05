package com.fitmitra.navigation

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.platform.android.AndroidAudioPlayer
import com.fitmitra.core.platform.android.AndroidSpeechProvider
import com.fitmitra.core.platform.android.DataStoreAppStorage
import com.fitmitra.core.theme.FitMitraAppTheme
import com.fitmitra.core.theme.FitMitraColors
import com.fitmitra.feature.challenges.ChallengesScreen
import com.fitmitra.feature.challenges.ChallengesViewModel
import com.fitmitra.feature.completion.CompletionScreen
import com.fitmitra.feature.exam.ExamScreen
import com.fitmitra.feature.exam.ExamViewModel
import com.fitmitra.feature.home.HomeScreen
import com.fitmitra.feature.home.HomeViewModel
import com.fitmitra.feature.posecoach.PoseCoachScreen
import com.fitmitra.feature.posecoach.PoseCoachViewModel
import com.fitmitra.feature.progress.ProgressScreen
import com.fitmitra.feature.progress.ProgressViewModel
import com.fitmitra.feature.workout.selection.WorkoutSelectionScreen
import com.fitmitra.feature.workout.selection.WorkoutSelectionViewModel
import com.fitmitra.feature.workout.setup.WorkoutSetupScreen

@Composable
fun FitMitraApp() {
    val context = LocalContext.current
    val navState = remember { AppNavigationState() }

    val storage = remember { DataStoreAppStorage(context) }
    val audioPlayer = remember { AndroidAudioPlayer() }
    val speechProvider = remember { AndroidSpeechProvider(context) }

    DisposableEffect(Unit) {
        onDispose {
            audioPlayer.release()
            speechProvider.release()
        }
    }

    BackHandler(enabled = navState.currentScreen != Screen.Home) {
        navState.popBack()
    }

    FitMitraAppTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = FitMitraColors.Background
        ) {
            when (val screen = navState.currentScreen) {
                is Screen.Home -> {
                    val homeVm = remember { HomeViewModel(storage) }
                    HomeScreen(
                        viewModel = homeVm,
                        onNavigateToWorkoutSelection = { navState.navigateTo(Screen.WorkoutSelection) },
                        onNavigateToSetup = { key -> navState.navigateTo(Screen.WorkoutSetup(key)) },
                        onNavigateToExam = { navState.navigateTo(Screen.Exam) },
                        onNavigateToChallenges = { navState.navigateTo(Screen.Challenges) },
                        onNavigateToProgress = { navState.navigateTo(Screen.Progress) }
                    )
                }

                is Screen.WorkoutSelection -> {
                    val selectionVm = remember { WorkoutSelectionViewModel() }
                    WorkoutSelectionScreen(
                        viewModel = selectionVm,
                        onBack = { navState.popBack() },
                        onAcceptRoutine = { key, reps -> navState.navigateTo(Screen.WorkoutSetup(key, reps)) }
                    )
                }

                is Screen.WorkoutSetup -> {
                    WorkoutSetupScreen(
                        exerciseKeyString = screen.exerciseKey,
                        targetReps = screen.targetReps,
                        onBack = { navState.popBack() },
                        onStartWorkout = { key, reps -> navState.navigateTo(Screen.PoseCoach(key, reps)) }
                    )
                }

                is Screen.PoseCoach -> {
                    val poseKey = try {
                        ExerciseKey.valueOf(screen.exerciseKey)
                    } catch (_: Exception) {
                        ExerciseKey.SQUATS
                    }
                    val poseCoachVm = remember(screen.exerciseKey, screen.targetReps) {
                        PoseCoachViewModel(
                            exerciseKey = poseKey,
                            targetReps = screen.targetReps,
                            audioPlayer = audioPlayer,
                            speechProvider = speechProvider,
                            storage = storage
                        )
                    }
                    PoseCoachScreen(
                        viewModel = poseCoachVm,
                        onExitWorkout = { navState.popBack() },
                        onWorkoutCompleted = { summary ->
                            navState.navigateTo(
                                Screen.Completion(
                                    exerciseKey = summary.exerciseKey.name,
                                    exerciseName = summary.exerciseName,
                                    completedReps = summary.completedReps,
                                    targetReps = summary.targetReps,
                                    durationSeconds = summary.durationSeconds,
                                    caloriesBurned = summary.caloriesBurned.toDouble(),
                                    xpEarned = summary.xpEarned
                                )
                            )
                        }
                    )
                }

                is Screen.Completion -> {
                    CompletionScreen(
                        exerciseName = screen.exerciseName,
                        completedReps = screen.completedReps,
                        targetReps = screen.targetReps,
                        durationSeconds = screen.durationSeconds,
                        caloriesBurned = screen.caloriesBurned,
                        xpEarned = screen.xpEarned,
                        onNavigateHome = { navState.navigateHome() }
                    )
                }

                is Screen.Progress -> {
                    val progressVm = remember { ProgressViewModel(storage) }
                    ProgressScreen(
                        viewModel = progressVm,
                        onBack = { navState.popBack() }
                    )
                }

                is Screen.Exam -> {
                    val examVm = remember { ExamViewModel(audioPlayer) }
                    ExamScreen(
                        viewModel = examVm,
                        onBack = { navState.popBack() }
                    )
                }

                is Screen.Challenges -> {
                    val challengesVm = remember { ChallengesViewModel(storage) }
                    ChallengesScreen(
                        viewModel = challengesVm,
                        onBack = { navState.popBack() },
                        onStartWorkoutForChallenge = { navState.navigateTo(Screen.WorkoutSetup("SQUATS", 20)) }
                    )
                }
            }
        }
    }
}
