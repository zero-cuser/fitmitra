package com.fitmitra.core.domain

import com.fitmitra.core.domain.exam.ExamEngine
import com.fitmitra.core.domain.exam.ExamModeType
import org.junit.Assert.*
import org.junit.Test

class ExamEngineTest {

    @Test
    fun testTwoMinuteResetDurationMatches120Seconds() {
        val config = ExamEngine.createSession(ExamModeType.RESET)
        assertEquals(120, config.totalDurationSeconds)
        assertTrue(config.activities.isNotEmpty())
    }

    @Test
    fun testFiveMinuteBreakDurationMatches300Seconds() {
        val config = ExamEngine.createSession(ExamModeType.BREAK)
        assertEquals(300, config.totalDurationSeconds)
        assertTrue(config.activities.size >= 3)
    }

    @Test
    fun testTenMinuteRechargeDurationMatches600Seconds() {
        val config = ExamEngine.createSession(ExamModeType.RECHARGE)
        assertEquals(600, config.totalDurationSeconds)
        assertTrue(config.activities.size >= 4)
    }

    @Test
    fun testExamActivitiesHaveCuesAndDescriptions() {
        ExamModeType.entries.forEach { mode ->
            val session = ExamEngine.createSession(mode)
            session.activities.forEach { act ->
                assertTrue("Activity ${act.name} must have description", act.description.isNotBlank())
                assertTrue("Activity ${act.name} must have duration > 0", act.durationSeconds > 0)
                assertTrue("Activity ${act.name} must have coaching cues", act.cues.isNotEmpty())
            }
        }
    }
}
