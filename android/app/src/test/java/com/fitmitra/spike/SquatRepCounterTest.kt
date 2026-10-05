package com.fitmitra.spike

import com.fitmitra.spike.domain.PoseFrame
import com.fitmitra.spike.domain.PoseLandmark
import com.fitmitra.spike.domain.SquatKinematics
import com.fitmitra.spike.domain.SquatPhase
import com.fitmitra.spike.domain.SquatRepCounter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SquatRepCounterTest {

    private lateinit var counter: SquatRepCounter

    @Before
    fun setUp() {
        counter = SquatRepCounter()
    }

    private fun createFrame(kneeAngle: Float, timestampMs: Long, confidence: Float = 0.9f): PoseFrame {
        val landmarks = ArrayList<PoseLandmark>(33)
        for (i in 0..32) {
            landmarks.add(PoseLandmark(0.5f, 0.5f, visibility = confidence))
        }

        val kneeX = 0.5f
        val kneeY = 0.5f
        val legLength = 0.3f

        // Ankle straight down along +Y
        val ankleX = kneeX
        val ankleY = kneeY + legLength

        // Hip placed at exact target angle relative to knee-ankle vector
        val rad = Math.toRadians(kneeAngle.toDouble())
        val hipX = (kneeX + legLength * Math.sin(rad)).toFloat()
        val hipY = (kneeY + legLength * Math.cos(rad)).toFloat()

        landmarks[SquatKinematics.LEFT_KNEE] = PoseLandmark(kneeX, kneeY, visibility = confidence)
        landmarks[SquatKinematics.LEFT_ANKLE] = PoseLandmark(ankleX, ankleY, visibility = confidence)
        landmarks[SquatKinematics.LEFT_HIP] = PoseLandmark(hipX, hipY, visibility = confidence)

        landmarks[SquatKinematics.RIGHT_KNEE] = PoseLandmark(kneeX, kneeY, visibility = confidence)
        landmarks[SquatKinematics.RIGHT_ANKLE] = PoseLandmark(ankleX, ankleY, visibility = confidence)
        landmarks[SquatKinematics.RIGHT_HIP] = PoseLandmark(hipX, hipY, visibility = confidence)

        return PoseFrame(landmarks, timestampMs)
    }

    @Test
    fun processFrame_countsFullSquatRepCycle() {
        var t = 1000L

        // 1. Standing upright (180°)
        var result = counter.processFrame(createFrame(180f, t))
        assertEquals(SquatPhase.UP, result.phase)
        assertEquals(0, result.repCount)

        // 2. Descending (135°)
        t += 300L
        result = counter.processFrame(createFrame(135f, t))
        assertEquals(SquatPhase.DESCENDING, result.phase)
        assertEquals(0, result.repCount)

        // 3. Reaches full depth (115° <= 125°)
        t += 300L
        result = counter.processFrame(createFrame(115f, t))
        assertEquals(SquatPhase.DOWN, result.phase)
        assertEquals(0, result.repCount)

        // 4. Ascending (135°)
        t += 300L
        result = counter.processFrame(createFrame(135f, t))
        assertEquals(SquatPhase.ASCENDING, result.phase)
        assertEquals(0, result.repCount)

        // 5. Standing lockout (180° >= 145°) after cooldown
        t += 800L
        result = counter.processFrame(createFrame(180f, t))
        assertEquals(SquatPhase.UP, result.phase)
        assertEquals(1, result.repCount)
    }

    @Test
    fun processFrame_rejectsIncompleteSquatWithoutDepth() {
        var t = 1000L

        // Standing upright
        counter.processFrame(createFrame(180f, t))

        // Descends halfway to 135° (never reaching downThreshold 125°)
        t += 300L
        val descending = counter.processFrame(createFrame(135f, t))
        assertEquals(SquatPhase.DESCENDING, descending.phase)

        // Rises back to standing without hitting depth
        t += 400L
        val returned = counter.processFrame(createFrame(180f, t))
        assertEquals(SquatPhase.UP, returned.phase)
        assertEquals(0, returned.repCount) // Rep must NOT be counted
    }

    @Test
    fun processFrame_debouncesRapidBounceWithinCooldownWindow() {
        var t = 1000L

        // Complete Rep 1
        counter.processFrame(createFrame(180f, t))
        counter.processFrame(createFrame(135f, t + 200))
        counter.processFrame(createFrame(115f, t + 400))
        counter.processFrame(createFrame(135f, t + 600))
        val rep1 = counter.processFrame(createFrame(180f, t + 1000))
        assertEquals(1, rep1.repCount)

        // Rapid second rep attempt only 200ms later (within 600ms cooldown)
        val t2 = t + 1000
        counter.processFrame(createFrame(135f, t2 + 50))
        counter.processFrame(createFrame(115f, t2 + 100))
        counter.processFrame(createFrame(135f, t2 + 150))
        val rep2 = counter.processFrame(createFrame(180f, t2 + 200))

        // Debounced: Rep count remains 1
        assertEquals(1, rep2.repCount)
    }

    @Test
    fun processFrame_suppressesTransitionsWhenJointsAreObscured() {
        // Frame with low confidence (0.4 < 0.65)
        val obscuredFrame = createFrame(115f, 1000L, confidence = 0.4f)
        val result = counter.processFrame(obscuredFrame)

        assertFalse(result.isTrackingValid)
        assertEquals(0, result.repCount)
        assertEquals(SquatPhase.UP, result.phase)
    }
}
