package com.fitmitra.core.platform.android

import com.fitmitra.core.domain.models.ChallengeParticipantSummary
import com.fitmitra.core.domain.models.FriendInvitation
import com.fitmitra.core.domain.models.FriendProfile
import com.fitmitra.core.domain.models.Friendship
import com.fitmitra.core.domain.models.FriendshipsList
import com.fitmitra.core.domain.models.SharedChallenge
import com.fitmitra.core.domain.models.SharedChallengeDetails
import com.fitmitra.core.domain.repositories.ISocialRepository
import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class RemoteSocialRepository(
    private val storage: IAppStorage,
    private val baseUrl: String = "http://10.0.2.2:3001"
) : ISocialRepository {

    companion object {
        const val KEY_AUTH_TOKEN = "remote_auth_token_v1"
    }

    private suspend fun getToken(): String? = storage.getString(KEY_AUTH_TOKEN, null)

    private fun sanitizeNoBiometrics(json: JSONObject) {
        val prohibited = listOf("landmarks", "poseLandmarks", "rawCoordinates", "cameraFrame", "videoBuffer")
        for (key in prohibited) {
            if (json.has(key)) {
                throw IllegalArgumentException("Client Guardrail: Biometric landmarks or video frames cannot be transmitted.")
            }
        }
    }

    private fun readResponse(conn: HttpURLConnection): String {
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        return BufferedReader(InputStreamReader(stream ?: conn.inputStream)).use { it.readText() }
    }

    private fun parseFriendProfile(json: JSONObject): FriendProfile {
        return FriendProfile(
            accountId = json.optString("accountId", ""),
            displayName = json.optString("displayName", ""),
            username = json.optString("username", ""),
            avatarColor = json.optString("avatarColor", "emerald")
        )
    }

    private fun parseFriendship(json: JSONObject): Friendship {
        return Friendship(
            id = json.getString("id"),
            friend = parseFriendProfile(json.getJSONObject("friend")),
            status = json.optString("status", "pending"),
            isIncoming = json.optBoolean("isIncoming", false),
            createdAt = json.optString("createdAt", ""),
            updatedAt = json.optString("updatedAt", "")
        )
    }

    private fun parseFriendInvitation(json: JSONObject): FriendInvitation {
        return FriendInvitation(
            id = json.getString("id"),
            code = json.getString("code"),
            createdBy = json.getString("createdBy"),
            creatorName = json.optString("creatorName", ""),
            createdAt = json.getString("createdAt"),
            expiresAt = json.getString("expiresAt"),
            isRevoked = json.optBoolean("isRevoked", false)
        )
    }

    private fun parseSharedChallenge(json: JSONObject): SharedChallenge {
        return SharedChallenge(
            id = json.getString("id"),
            code = json.getString("code"),
            title = json.getString("title"),
            description = json.optString("description", ""),
            exerciseKey = json.getString("exerciseKey"),
            targetMetric = json.getString("targetMetric"),
            targetValue = json.getInt("targetValue"),
            creatorId = json.getString("creatorId"),
            creatorName = json.optString("creatorName", ""),
            maxParticipants = json.optInt("maxParticipants", 10),
            participantCount = json.optInt("participantCount", 1),
            startDate = json.getString("startDate"),
            endDate = json.getString("endDate"),
            isActive = json.optBoolean("isActive", true),
            userProgress = if (json.has("userProgress")) json.getInt("userProgress") else null,
            userRank = if (json.has("userRank")) json.getInt("userRank") else null,
            completed = if (json.has("completed")) json.getBoolean("completed") else null
        )
    }

    private fun parseParticipantSummary(json: JSONObject): ChallengeParticipantSummary {
        return ChallengeParticipantSummary(
            accountId = json.getString("accountId"),
            displayName = json.optString("displayName", ""),
            username = json.optString("username", ""),
            avatarColor = json.optString("avatarColor", "emerald"),
            score = json.optInt("score", 0),
            rank = json.optInt("rank", 1),
            completed = json.optBoolean("completed", false),
            joinedAt = json.optString("joinedAt", ""),
            lastContributedAt = json.optString("lastContributedAt", "")
        )
    }

    override suspend fun createFriendInvitation(): Result<FriendInvitation> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/friends/invite")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }
            OutputStreamWriter(conn.outputStream).use { it.write("{}") }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                Result.success(parseFriendInvitation(json.getJSONObject("invitation")))
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to create invitation.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun sendFriendRequest(inviteCode: String): Result<Friendship> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/friends/request")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }
            val body = JSONObject().put("code", inviteCode.trim().uppercase())
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                Result.success(parseFriendship(json.getJSONObject("friendship")))
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to send friend request.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun respondToFriendRequest(friendshipId: String, accept: Boolean): Result<Unit> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/friends/$friendshipId/respond")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }
            val body = JSONObject().put("accept", accept)
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                Result.success(Unit)
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to respond to friend request.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getFriendships(): Result<FriendshipsList> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/friends")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 5000
                readTimeout = 5000
            }
            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                val friendsArr = json.optJSONArray("friends") ?: JSONArray()
                val incomingArr = json.optJSONArray("pendingIncoming") ?: JSONArray()
                val outgoingArr = json.optJSONArray("pendingOutgoing") ?: JSONArray()

                val friends = mutableListOf<Friendship>()
                for (i in 0 until friendsArr.length()) {
                    friends.add(parseFriendship(friendsArr.getJSONObject(i)))
                }
                val incoming = mutableListOf<Friendship>()
                for (i in 0 until incomingArr.length()) {
                    incoming.add(parseFriendship(incomingArr.getJSONObject(i)))
                }
                val outgoing = mutableListOf<Friendship>()
                for (i in 0 until outgoingArr.length()) {
                    outgoing.add(parseFriendship(outgoingArr.getJSONObject(i)))
                }

                Result.success(FriendshipsList(friends, incoming, outgoing))
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to fetch friends.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun removeFriend(friendshipId: String): Result<Unit> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/friends/$friendshipId")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "DELETE"
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 5000
                readTimeout = 5000
            }
            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                Result.success(Unit)
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to remove friend.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun revokeInvitation(code: String): Result<Unit> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/friends/invite/${code.trim().uppercase()}")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "DELETE"
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 5000
                readTimeout = 5000
            }
            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                Result.success(Unit)
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to revoke invitation.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createSharedChallenge(
        title: String,
        description: String,
        exerciseKey: String,
        targetMetric: String,
        targetValue: Int,
        maxParticipants: Int,
        durationDays: Int
    ): Result<SharedChallenge> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/challenges")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }
            val body = JSONObject().apply {
                put("title", title)
                put("description", description)
                put("exerciseKey", exerciseKey)
                put("targetMetric", targetMetric)
                put("targetValue", targetValue)
                put("maxParticipants", maxParticipants)
                put("durationDays", durationDays)
            }
            sanitizeNoBiometrics(body)
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                Result.success(parseSharedChallenge(json.getJSONObject("challenge")))
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to create challenge.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun joinSharedChallenge(code: String): Result<SharedChallenge> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/challenges/join")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }
            val body = JSONObject().put("code", code.trim().uppercase())
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                Result.success(parseSharedChallenge(json.getJSONObject("challenge")))
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to join challenge.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getUserChallenges(): Result<List<SharedChallenge>> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/challenges")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 5000
                readTimeout = 5000
            }
            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                val arr = json.optJSONArray("challenges") ?: JSONArray()
                val list = mutableListOf<SharedChallenge>()
                for (i in 0 until arr.length()) {
                    list.add(parseSharedChallenge(arr.getJSONObject(i)))
                }
                Result.success(list)
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to fetch challenges.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getChallengeDetails(challengeId: String): Result<SharedChallengeDetails> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/challenges/$challengeId")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 5000
                readTimeout = 5000
            }
            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                val challenge = parseSharedChallenge(json.getJSONObject("challenge"))
                val participantsArr = json.optJSONArray("participants") ?: JSONArray()
                val participants = mutableListOf<ChallengeParticipantSummary>()
                for (i in 0 until participantsArr.length()) {
                    participants.add(parseParticipantSummary(participantsArr.getJSONObject(i)))
                }
                Result.success(SharedChallengeDetails(challenge, participants))
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to fetch challenge details.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun contributeToChallenge(challengeId: String, amount: Int, activityId: String?): Result<Int> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/challenges/$challengeId/contribute")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }
            val body = JSONObject().apply {
                put("amount", amount)
                if (activityId != null) put("activityId", activityId)
            }
            sanitizeNoBiometrics(body)
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                Result.success(json.optInt("newTotal", 0))
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to contribute to challenge.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun leaveChallenge(challengeId: String): Result<Unit> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/challenges/$challengeId/leave")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }
            OutputStreamWriter(conn.outputStream).use { it.write("{}") }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                Result.success(Unit)
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to leave challenge.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun cancelChallenge(challengeId: String): Result<Unit> = withContext(Dispatchers.IO) {
        val token = getToken() ?: return@withContext Result.failure(IllegalStateException("Authentication required."))
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/challenges/$challengeId/cancel")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }
            OutputStreamWriter(conn.outputStream).use { it.write("{}") }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)
            if (responseCode in 200..299) {
                Result.success(Unit)
            } else {
                val err = JSONObject(responseText).optString("error", "Failed to cancel challenge.")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
