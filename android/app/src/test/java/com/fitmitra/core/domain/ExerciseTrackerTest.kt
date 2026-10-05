package com.fitmitra.core.domain

import com.fitmitra.core.domain.exercises.ExerciseCatalog
import com.fitmitra.core.domain.models.ExerciseKey
import com.fitmitra.core.domain.models.PoseFrame
import com.fitmitra.core.domain.models.PoseLandmark
import com.fitmitra.core.domain.pose.AngleMath
import com.fitmitra.core.domain.pose.ExerciseTracker
import com.fitmitra.core.domain.pose.MovementPhase
import org.junit.Assert.*
import org.junit.Test
import kotlin.math.cos
import kotlin.math.sin

class ExerciseTrackerTest {

    private fun createSquatFrame(kneeAngleDegrees: Float, timestampMs: Long): PoseFrame {
        val landmarks = ArrayList<PoseLandmark>(33)
        for (i in 0..32) {
            landmarks.add(PoseLandmark(0f, 0f, 0f, 0.9f))
        }

        // Ankle (27 & 28) vertically below knee
        val kneeY = 0.6f
        val legLen = 0.3f
        val ankleX = 0.5f
        val ankleY = kneeY + legLen

        // Knee (25 & 26)
        val kneeX = 0.5f

        // Hip (23 & 24) positioned so angle at knee equals kneeAngleDegrees
        // In 2D plane: Ankle vector is (0, legLen).
        // Hip vector is (legLen * sin(rad), -legLen * cos(rad))
        val rad = Math.toRadians((180.0 - kneeAngleDegrees).toDouble())
        val hipX = (kneeX + legLen * sin(rad)).toFloat()
        val hipY = (kneeY - legLen * cos(rad)).toFloat()

        landmarks[ExerciseTracker.LEFT_HIP] = PoseLandmark(hipX, hipY, 0f, 0.95f)
        landmarks[ExerciseTracker.RIGHT_HIP] = PoseLandmark(hipX, hipY, 0f, 0.95f)
        landmarks[ExerciseTracker.LEFT_KNEE] = PoseLandmark(kneeX, kneeY, 0f, 0.95f)
        landmarks[ExerciseTracker.RIGHT_KNEE] = PoseLandmark(kneeX, kneeY, 0f, 0.95f)
        landmarks[ExerciseTracker.LEFT_ANKLE] = PoseLandmark(ankleX, ankleY, 0f, 0.95f)
        landmarks[ExerciseTracker.RIGHT_ANKLE] = PoseLandmark(ankleX, ankleY, 0f, 0.95f)

        return PoseFrame(landmarks, timestampMs)
    }

    @Test
    fun testSquatRepCountingCycle() {
        val squatDef = ExerciseCatalog.getExercise(ExerciseKey.SQUATS)
        val tracker = ExerciseTracker(squatDef)

        var t = 1000L

        // 1. Standing upright (175°) -> UP
        var res = tracker.processFrame(createSquatFrame(175f, t))
        tracker.processFrame(createSquatFrame(175f, t + 33L))
        assertEquals(MovementPhase.UP, res.phase)
        assertEquals(0, res.repCount)

        // 2. Descending (135°) -> DESCENDING (feed 2 frames for EMA convergence)
        t += 200L
        tracker.processFrame(createSquatFrame(135f, t))
        t += 33L
        res = tracker.processFrame(createSquatFrame(135f, t))
        assertEquals(MovementPhase.DESCENDING, res.phase)

        // 3. At bottom depth (115°) -> DOWN
        t += 200L
        tracker.processFrame(createSquatFrame(115f, t))
        t += 33L
        res = tracker.processFrame(createSquatFrame(115f, t))
        assertEquals(MovementPhase.DOWN, res.phase)

        // 4. Ascending (135°) -> ASCENDING
        t += 200L
        tracker.processFrame(createSquatFrame(135f, t))
        t += 33L
        res = tracker.processFrame(createSquatFrame(135f, t))
        assertEquals(MovementPhase.ASCENDING, res.phase)

        // 5. Standing back upright (175°) after cooldown -> Rep completed!
        t += 800L
        res = tracker.processFrame(createSquatFrame(175f, t))
        assertEquals(MovementPhase.UP, res.phase)
        assertEquals(1, res.repCount)
        assertTrue(res.repCompletedThisFrame)
    }

    @Test
    fun testCooldownPreventsImmediateDuplicateRep() {
        val squatDef = ExerciseCatalog.getExercise(ExerciseKey.SQUATS)
        val tracker = ExerciseTracker(squatDef)

        var t = 1000L
        tracker.processFrame(createSquatFrame(175f, t))
        tracker.processFrame(createSquatFrame(115f, t + 100L))

        // Return to UP immediately within 100ms (< 600ms cooldown)
        val res = tracker.processFrame(createSquatFrame(155f, t + 200L))
        assertEquals("Rapid bounce without cooldown must not trigger rep count", 0, res.repCount)
    }
}
