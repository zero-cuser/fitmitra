package com.fitmitra.core.domain

import com.fitmitra.core.domain.exam.ElapsedTimerController
import com.fitmitra.core.domain.exam.ExamEngine
import com.fitmitra.core.domain.exam.ExamModeType
import org.junit.Assert.*
import org.junit.Test

class ElapsedTimerTest {

    @Test
    fun testTimerStepsAndCompletesWithoutDrift() {
        val session = ExamEngine.createSession(ExamModeType.RESET)
        val controller = ElapsedTimerController(session.activities)

        var t = 1000000L
        controller.start(t)

        var snapshot = controller.getSnapshot(t)
        assertEquals(0, snapshot.activityIndex)
        assertTrue(snapshot.isRunning)
        assertFalse(snapshot.isPaused)

        // Advance past first activity (30s)
        t += 31000L
        val stepped = controller.step(t)
        assertTrue(stepped)

        snapshot = controller.getSnapshot(t)
        assertEquals(1, snapshot.activityIndex)
    }

    @Test
    fun testTimerPauseAndResume() {
        val session = ExamEngine.createSession(ExamModeType.RESET)
        val controller = ElapsedTimerController(session.activities)

        var t = 1000000L
        controller.start(t)

        t += 10000L
        controller.pause(t)

        var snapshot = controller.getSnapshot(t)
        assertTrue(snapshot.isPaused)
        assertEquals(10, snapshot.activityElapsedSeconds)

        // Time passes while paused
        t += 50000L
        snapshot = controller.getSnapshot(t)
        assertEquals("Paused timer must not advance elapsed time", 10, snapshot.activityElapsedSeconds)

        // Resume
        controller.resume(t)
        t += 5000L
        snapshot = controller.getSnapshot(t)
        assertEquals(15, snapshot.activityElapsedSeconds)
    }

    @Test
    fun testTimerSkip() {
        val session = ExamEngine.createSession(ExamModeType.RESET)
        val controller = ElapsedTimerController(session.activities)

        controller.start(1000L)
        val skipped = controller.skip(2000L)
        assertTrue(skipped)

        val snapshot = controller.getSnapshot(2000L)
        assertEquals(1, snapshot.activityIndex)
    }
}
