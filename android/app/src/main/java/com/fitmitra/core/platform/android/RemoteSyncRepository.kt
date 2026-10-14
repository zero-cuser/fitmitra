package com.fitmitra.core.platform.android

import com.fitmitra.core.domain.models.*
import com.fitmitra.core.domain.repositories.ISyncRepository
import com.fitmitra.core.domain.workouts.WorkoutRepository
import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class RemoteSyncRepository(
    private val storage: IAppStorage,
    private val workoutRepository: WorkoutRepository,
    private val baseUrl: String = "http://10.0.2.2:3001"
) : ISyncRepository {

    companion object {
        const val KEY_SYNC_CONSENT = "sync_consent_enabled_v1"
        const val KEY_LAST_SYNC_TS = "sync_last_timestamp_v1"
        const val KEY_RETRY_COUNT = "sync_retry_count_v1"
        const val MAX_RETRIES = 5
        const val MAX_BACKOFF_DELAY_MS = 30000L

        fun calculateBackoffDelay(retryCount: Int): Long {
            return (1000L * (1 shl retryCount.coerceIn(0, 5))).coerceAtMost(MAX_BACKOFF_DELAY_MS)
        }
    }

    private val _syncStatus = MutableStateFlow(SyncStatus(state = SyncStatusState.DISABLED))
    override val syncStatus: StateFlow<SyncStatus> = _syncStatus.asStateFlow()

    suspend fun initialize() {
        val isEnabled = storage.getBoolean(KEY_SYNC_CONSENT, false)
        val token = storage.getString(RemoteAuthRepository.KEY_AUTH_TOKEN, null)
        val lastTsStr = storage.getString(KEY_LAST_SYNC_TS, null)
        val lastTs = lastTsStr?.toLongOrNull()

        if (isEnabled && !token.isNullOrEmpty()) {
            _syncStatus.value = SyncStatus(
                state = SyncStatusState.IDLE,
                lastSyncTimestampMs = lastTs,
                pendingCount = getPendingCount()
            )
        } else {
            _syncStatus.value = SyncStatus(state = SyncStatusState.DISABLED)
        }
    }

    override suspend fun enableSync(consent: SyncConsent) {
        storage.putBoolean(KEY_SYNC_CONSENT, true)
        storage.putInt(KEY_RETRY_COUNT, 0)
        _syncStatus.value = SyncStatus(
            state = SyncStatusState.IDLE,
            lastSyncTimestampMs = _syncStatus.value.lastSyncTimestampMs,
            pendingCount = getPendingCount()
        )
    }

    override suspend fun disableSync() {
        storage.putBoolean(KEY_SYNC_CONSENT, false)
        storage.putInt(KEY_RETRY_COUNT, 0)
        _syncStatus.value = SyncStatus(state = SyncStatusState.DISABLED)
    }

    override suspend fun getPendingCount(): Int {
        return workoutRepository.getWorkoutSummaries().size
    }

    override suspend fun syncNow(): SyncResult = withContext(Dispatchers.IO) {
        val token = storage.getString(RemoteAuthRepository.KEY_AUTH_TOKEN, null)
        val isEnabled = storage.getBoolean(KEY_SYNC_CONSENT, false)

        if (!isEnabled || token.isNullOrEmpty()) {
            _syncStatus.value = SyncStatus(state = SyncStatusState.DISABLED)
            return@withContext SyncResult(
                success = false,
                error = "Sync is disabled or account is not authenticated."
            )
        }

        _syncStatus.value = _syncStatus.value.copy(state = SyncStatusState.SYNCING)
        var currentRetries = storage.getInt(KEY_RETRY_COUNT, 0)

        try {
            // 1. Prepare local workouts
            val localSummaries = workoutRepository.getWorkoutSummaries()
            val workoutsJson = JSONArray()
            for (w in localSummaries) {
                workoutsJson.put(JSONObject().apply {
                    put("id", w.id)
                    put("exerciseKey", w.exerciseKey.id)
                    put("exerciseName", w.exerciseName)
                    put("reps", w.completedReps)
                    put("durationSeconds", w.durationSeconds)
                    put("postureScore", w.averagePostureScore)
                    put("timestamp", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                        timeZone = java.util.TimeZone.getTimeZone("UTC")
                    }.format(java.util.Date(w.timestamp)))
                    put("completedFully", w.isCompleted)
                    put("source", "pose_coach")
                    put("schemaVersion", 2)
                })
            }

            // 2. Push to server
            val pushUrl = URL("${baseUrl.trimEnd('/')}/api/v1/sync/push")
            val pushConn = (pushUrl.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
                doOutput = true
                connectTimeout = 6000
                readTimeout = 6000
            }

            val pushPayload = JSONObject().apply {
                put("clientVersion", "1.0.0")
                put("schemaVersion", 2)
                put("workouts", workoutsJson)
                put("challenges", JSONArray())
                put("tombstones", JSONArray())
            }

            OutputStreamWriter(pushConn.outputStream).use { it.write(pushPayload.toString()) }
            val pushCode = pushConn.responseCode
            if (pushCode !in 200..299) {
                throw Exception("Push rejected by server with HTTP $pushCode")
            }

            // 3. Pull from server (with pagination support)
            var offset = 0
            val limit = 50
            var hasMore = true
            var serverTimestamp = ""

            while (hasMore) {
                val pullUrl = URL("${baseUrl.trimEnd('/')}/api/v1/sync/pull?limit=$limit&offset=$offset")
                val pullConn = (pullUrl.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    setRequestProperty("Authorization", "Bearer $token")
                    connectTimeout = 6000
                    readTimeout = 6000
                }

                val pullCode = pullConn.responseCode
                if (pullCode !in 200..299) {
                    throw Exception("Pull failed with HTTP $pullCode")
                }

                val pullText = readResponse(pullConn)
                val pullData = JSONObject(pullText)
                serverTimestamp = pullData.optString("serverTimestamp", "")
                val remoteWorkouts = pullData.optJSONArray("workouts") ?: JSONArray()

                // Merge remote workouts idempotently
                for (i in 0 until remoteWorkouts.length()) {
                    val rw = remoteWorkouts.getJSONObject(i)
                    val id = rw.getString("id")
                    if (!workoutRepository.isSessionRecorded(id)) {
                        val exKey = ExerciseKey.fromId(rw.optString("exerciseKey", "squats"))
                        val summary = WorkoutSummary(
                            id = id,
                            timestamp = try {
                                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                                    timeZone = java.util.TimeZone.getTimeZone("UTC")
                                }.parse(rw.getString("timestamp"))?.time ?: System.currentTimeMillis()
                            } catch (_: Exception) {
                                System.currentTimeMillis()
                            },
                            exerciseKey = exKey,
                            exerciseName = rw.optString("exerciseName", exKey.displayName),
                            completedReps = rw.getInt("reps"),
                            targetReps = rw.getInt("reps"),
                            durationSeconds = rw.getInt("durationSeconds"),
                            caloriesBurned = (rw.getInt("reps") * 0.45).toInt(),
                            xpEarned = rw.getInt("reps") * 5,
                            averagePostureScore = rw.optInt("postureScore", 90),
                            isCompleted = rw.optBoolean("completedFully", true)
                        )
                        workoutRepository.recordCompletedSession(summary)
                    }
                }

                hasMore = pullData.optBoolean("hasMore", false)
                offset += limit
                if (offset > 1000) break // Safety break
            }

            val now = System.currentTimeMillis()
            storage.putString(KEY_LAST_SYNC_TS, now.toString())
            storage.putInt(KEY_RETRY_COUNT, 0)

            _syncStatus.value = SyncStatus(
                state = SyncStatusState.SYNCED,
                lastSyncTimestampMs = now,
                pendingCount = 0
            )

            SyncResult(
                success = true,
                syncedWorkouts = localSummaries.size,
                serverTimestamp = serverTimestamp
            )
        } catch (e: Exception) {
            currentRetries = (currentRetries + 1).coerceAtMost(MAX_RETRIES)
            storage.putInt(KEY_RETRY_COUNT, currentRetries)

            _syncStatus.value = _syncStatus.value.copy(
                state = SyncStatusState.OFFLINE,
                lastError = e.message ?: "Network unreachable"
            )
            SyncResult(
                success = false,
                error = "Sync failed: ${e.message ?: "Network unreachable"}. Workouts saved locally."
            )
        }
    }

    private fun readResponse(conn: HttpURLConnection): String {
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        return BufferedReader(InputStreamReader(stream ?: conn.inputStream)).use { it.readText() }
    }
}
