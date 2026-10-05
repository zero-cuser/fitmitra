package com.fitmitra.core.domain.exam

import com.fitmitra.core.domain.models.ExerciseKey

enum class ExamModeType(val id: String, val title: String, val durationMinutes: Int) {
    RESET("reset", "2-Minute Desk Reset", 2),
    BREAK("break", "5-Minute Study Break", 5),
    RECHARGE("recharge", "10-Minute Study Recharge", 10);

    companion object {
        fun fromId(id: String): ExamModeType =
            entries.find { it.id.equals(id, ignoreCase = true) } ?: RESET
    }
}

data class ExamActivityItem(
    val id: String,
    val name: String,
    val category: String,
    val durationSeconds: Int,
    val description: String,
    val cues: List<String>,
    val exerciseKey: ExerciseKey? = null,
    val isCameraEligible: Boolean = false
)

data class ExamSessionConfig(
    val mode: ExamModeType,
    val title: String,
    val totalDurationSeconds: Int,
    val activities: List<ExamActivityItem>
)

object ExamEngine {

    fun createSession(mode: ExamModeType): ExamSessionConfig {
        val activities = mutableListOf<ExamActivityItem>()

        when (mode) {
            ExamModeType.RESET -> {
                // 120 seconds total
                activities.add(
                    ExamActivityItem(
                        id = "act_eye_reset",
                        name = "Screen Rest & Distant Focus",
                        category = "eye_break",
                        durationSeconds = 30,
                        description = "Look at an object at least 20 feet away to relax eye focus.",
                        cues = listOf("Blink gently and breathe steadily", "Drop shoulders away from ears")
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_neck_mobility",
                        name = "Neck & Shoulder Mobility",
                        category = "stretch",
                        durationSeconds = 45,
                        description = "Slow head tilts and backward shoulder rolls to relieve study desk stiffness.",
                        cues = listOf("Roll shoulders backward in smooth circles", "Tilt ear gently toward shoulder")
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_gentle_squats",
                        name = "Gentle Desk Squats",
                        category = "movement",
                        durationSeconds = 45,
                        description = "Controlled bodyweight squats to circulate blood flow after sitting.",
                        cues = listOf("Plant heels flat on floor", "Move at a relaxed, smooth cadence"),
                        exerciseKey = ExerciseKey.SQUATS,
                        isCameraEligible = true
                    )
                )
            }

            ExamModeType.BREAK -> {
                // 300 seconds total
                activities.add(
                    ExamActivityItem(
                        id = "act_eye_posture",
                        name = "Eye Rest & Posture Check",
                        category = "eye_break",
                        durationSeconds = 45,
                        description = "Disengage from screens, look across the room, and align your spine upright.",
                        cues = listOf("Stand tall with weight balanced evenly", "Focus on a distant object")
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_thoracic_stretch",
                        name = "Chest & Upper-Back Opener",
                        category = "stretch",
                        durationSeconds = 60,
                        description = "Standing chest opener and shoulder mobility to counter desk hunching.",
                        cues = listOf("Interlace fingers behind back gently", "Open collarbones wide and breathe")
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_movement_squats",
                        name = "Lower-Body Movement Set",
                        category = "movement",
                        durationSeconds = 120,
                        description = "Steady bodyweight squats to stimulate circulation.",
                        cues = listOf("Keep chest elevated", "Breathe smoothly through each rep"),
                        exerciseKey = ExerciseKey.SQUATS,
                        isCameraEligible = true
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_breath_hydrate",
                        name = "Hydration & Breathing",
                        category = "breathing",
                        durationSeconds = 75,
                        description = "Drink water and take slow, relaxed diaphragmatic breaths.",
                        cues = listOf("Take a slow sip of water", "Exhale fully and relax your jaw")
                    )
                )
            }

            ExamModeType.RECHARGE -> {
                // 600 seconds total
                activities.add(
                    ExamActivityItem(
                        id = "act_screen_detox",
                        name = "Screen Detox & Vision Reset",
                        category = "eye_break",
                        durationSeconds = 60,
                        description = "Close your eyes for 30 seconds, then focus outside a window.",
                        cues = listOf("Rest your optic muscles", "Release tension behind your forehead")
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_full_upper_mobility",
                        name = "Neck, Traps & Spine Mobility",
                        category = "stretch",
                        durationSeconds = 90,
                        description = "Comprehensive mobility circuit for neck, traps, and thoracic spine.",
                        cues = listOf("Slow neck half-circles", "Arm circles forward and backward")
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_movement_squats_recharge",
                        name = "Bodyweight Squat Circuit",
                        category = "movement",
                        durationSeconds = 120,
                        description = "Continuous, rhythmic squats to wake up lower-body circulation.",
                        cues = listOf("Drive through heels", "Keep smooth cadence"),
                        exerciseKey = ExerciseKey.SQUATS,
                        isCameraEligible = true
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_core_stability",
                        name = "Core Stability Hold",
                        category = "movement",
                        durationSeconds = 120,
                        description = "Quiet, stationary plank or standing brace to align core muscles.",
                        cues = listOf("Maintain straight line from shoulders to heels", "Do not hold your breath"),
                        exerciseKey = ExerciseKey.PLANK,
                        isCameraEligible = true
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_full_stretch",
                        name = "Full-Body Standing Stretch",
                        category = "stretch",
                        durationSeconds = 90,
                        description = "Reach overhead, stretch calves and hip flexors.",
                        cues = listOf("Reach tall toward the ceiling", "Gentle torso rotation")
                    )
                )
                activities.add(
                    ExamActivityItem(
                        id = "act_mindful_hydration",
                        name = "Hydration & Calm Breathing",
                        category = "breathing",
                        durationSeconds = 120,
                        description = "Rehydrate and practice 2 minutes of 4-second box breathing.",
                        cues = listOf("Drink a full glass of water", "Inhale 4s, hold 4s, exhale 4s")
                    )
                )
            }
        }

        val totalDuration = activities.sumOf { it.durationSeconds }
        return ExamSessionConfig(
            mode = mode,
            title = mode.title,
            totalDurationSeconds = totalDuration,
            activities = activities
        )
    }
}
