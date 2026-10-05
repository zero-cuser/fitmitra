package com.fitmitra.spike

import com.fitmitra.spike.domain.PoseLandmark
import com.fitmitra.spike.domain.SquatKinematics
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SquatKinematicsTest {

    @Test
    fun calculateAngle_straightLineIs180Degrees() {
        val hip = PoseLandmark(x = 0.5f, y = 0.2f, visibility = 0.9f)
        val knee = PoseLandmark(x = 0.5f, y = 0.5f, visibility = 0.9f)
        val ankle = PoseLandmark(x = 0.5f, y = 0.8f, visibility = 0.9f)

        val angle = SquatKinematics.calculateAngle(hip, knee, ankle)
        assertEquals(180.0f, angle, 0.5f)
    }

    @Test
    fun calculateAngle_rightAngleIs90Degrees() {
        val hip = PoseLandmark(x = 0.2f, y = 0.5f, visibility = 0.9f)
        val knee = PoseLandmark(x = 0.5f, y = 0.5f, visibility = 0.9f)
        val ankle = PoseLandmark(x = 0.5f, y = 0.8f, visibility = 0.9f)

        val angle = SquatKinematics.calculateAngle(hip, knee, ankle)
        assertEquals(90.0f, angle, 0.5f)
    }

    @Test
    fun calculateAngle_squatDepthInflectionAngle() {
        // Hip at (0.3, 0.4), Knee at (0.5, 0.5), Ankle at (0.5, 0.8)
        val hip = PoseLandmark(x = 0.3f, y = 0.4f, visibility = 0.95f)
        val knee = PoseLandmark(x = 0.5f, y = 0.5f, visibility = 0.95f)
        val ankle = PoseLandmark(x = 0.5f, y = 0.8f, visibility = 0.95f)

        val angle = SquatKinematics.calculateAngle(hip, knee, ankle)
        // Cosine: dot(-0.2, -0.1) . (0, 0.3) = -0.03 / (sqrt(0.05) * 0.3) = -0.03 / 0.067 = -0.447
        // arccos(-0.447) ≈ 116.5° (Valid squat depth <= 125°)
        assertTrue(angle <= SquatKinematics.DOWN_THRESHOLD_DEGREES)
    }

    @Test
    fun hasSufficientConfidence_validatesChainCorrectly() {
        val landmarks = ArrayList<PoseLandmark>()
        for (i in 0..32) {
            landmarks.add(PoseLandmark(0.5f, 0.5f, visibility = 0.85f))
        }

        val requiredJoints = intArrayOf(
            SquatKinematics.LEFT_HIP,
            SquatKinematics.LEFT_KNEE,
            SquatKinematics.LEFT_ANKLE
        )
        assertTrue(SquatKinematics.hasSufficientConfidence(landmarks, requiredJoints))

        // Degrade left knee visibility below threshold (0.65)
        landmarks[SquatKinematics.LEFT_KNEE] = PoseLandmark(0.5f, 0.5f, visibility = 0.45f)
        assertFalse(SquatKinematics.hasSufficientConfidence(landmarks, requiredJoints))
    }
}
