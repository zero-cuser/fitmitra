package com.fitmitra.core.domain.exam

import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

data class TimerSnapshot(
    val activityIndex: Int,
    val totalActivities: Int,
    val currentActivityId: String,
    val currentActivityName: String,
    val activityDurationSeconds: Int,
    val activityRemainingSeconds: Int,
    val activityElapsedSeconds: Int,
    val totalSessionDurationSeconds: Int,
    val totalSessionElapsedSeconds: Int,
    val isRunning: Boolean,
    val isPaused: Boolean,
    val isCompleted: Boolean
)

/**
 * Pure wall-clock delta elapsed timer controller.
 * Prevents timer drift when phone screens sleep or apps undergo background lifecycle shifts.
 */
class ElapsedTimerController(
    private val activities: List<ExamActivityItem>
) {
    init {
        require(activities.isNotEmpty()) { "ElapsedTimerController requires at least one activity." }
    }

    private var activityIndex = 0
    private var isRunning = false
    private var isPaused = false
    private var isCompleted = false

    private var startTime: Long? = null
    private var accumulatedMsInActivity = 0L
    private var previousActivitiesElapsedSeconds = 0

    fun start(now: Long = System.currentTimeMillis()) {
        if (isCompleted) return
        isRunning = true
        isPaused = false
        startTime = now
    }

    fun pause(now: Long = System.currentTimeMillis()) {
        if (!isRunning || isPaused || isCompleted) return
        if (startTime != null) {
            accumulatedMsInActivity += max(0L, now - startTime!!)
        }
        startTime = null
        isRunning = false
        isPaused = true
    }

    fun resume(now: Long = System.currentTimeMillis()) {
        if (!isPaused || isCompleted) return
        startTime = now
        isRunning = true
        isPaused = false
    }

    fun skip(now: Long = System.currentTimeMillis()): Boolean {
        if (isCompleted) return false

        val currentAct = activities[activityIndex]
        previousActivitiesElapsedSeconds += currentAct.durationSeconds

        if (activityIndex < activities.size - 1) {
            activityIndex += 1
            accumulatedMsInActivity = 0L
            startTime = if (isRunning && !isPaused) now else null
            return true
        } else {
            isCompleted = true
            isRunning = false
            isPaused = false
            startTime = null
            return true
        }
    }

    fun step(now: Long = System.currentTimeMillis()): Boolean {
        if (!isRunning || isPaused || isCompleted || startTime == null) {
            return false
        }

        val currentAct = activities[activityIndex]
        val totalElapsedMs = accumulatedMsInActivity + max(0L, now - startTime!!)
        val targetMs = currentAct.durationSeconds * 1000L

        if (totalElapsedMs >= targetMs) {
            previousActivitiesElapsedSeconds += currentAct.durationSeconds

            if (activityIndex < activities.size - 1) {
                activityIndex += 1
                accumulatedMsInActivity = 0L
                startTime = now
                return true
            } else {
                isCompleted = true
                isRunning = false
                isPaused = false
                startTime = null
                return true
            }
        }
        return false
    }

    fun getSnapshot(now: Long = System.currentTimeMillis()): TimerSnapshot {
        val currentAct = activities.getOrElse(activityIndex) { activities.last() }

        var currentElapsedMs = accumulatedMsInActivity
        if (isRunning && !isPaused && startTime != null) {
            currentElapsedMs += max(0L, now - startTime!!)
        }

        val actDuration = currentAct.durationSeconds
        val actElapsed = min(actDuration, floor(currentElapsedMs / 1000.0).toInt())
        val actRemaining = if (isCompleted) 0 else max(0, ceil((actDuration * 1000L - currentElapsedMs) / 1000.0).toInt())

        val totalDuration = activities.sumOf { it.durationSeconds }
        val totalElapsed = if (isCompleted) totalDuration else min(totalDuration, previousActivitiesElapsedSeconds + actElapsed)

        return TimerSnapshot(
            activityIndex = activityIndex,
            totalActivities = activities.size,
            currentActivityId = currentAct.id,
            currentActivityName = currentAct.name,
            activityDurationSeconds = actDuration,
            activityRemainingSeconds = actRemaining,
            activityElapsedSeconds = actElapsed,
            totalSessionDurationSeconds = totalDuration,
            totalSessionElapsedSeconds = totalElapsed,
            isRunning = isRunning,
            isPaused = isPaused,
            isCompleted = isCompleted
        )
    }
}
