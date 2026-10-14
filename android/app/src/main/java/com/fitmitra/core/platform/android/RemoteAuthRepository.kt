package com.fitmitra.core.platform.android

import com.fitmitra.core.domain.models.AccountDeletionResult
import com.fitmitra.core.domain.models.AuthResult
import com.fitmitra.core.domain.models.AuthSession
import com.fitmitra.core.domain.repositories.IAuthRepository
import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class RemoteAuthRepository(
    private val storage: IAppStorage,
    private val baseUrl: String = "http://10.0.2.2:3001"
) : IAuthRepository {

    companion object {
        const val KEY_AUTH_TOKEN = "remote_auth_token_v1"
        const val KEY_AUTH_SESSION = "remote_auth_session_v1"
    }

    override suspend fun register(
        email: String,
        password: String,
        displayName: String,
        username: String
    ): AuthResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/auth/register")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }

            val body = JSONObject().apply {
                put("email", email)
                put("password", password)
                put("displayName", displayName)
                put("username", username.ifEmpty { email.substringBefore("@") })
            }

            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)

            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                val token = json.getString("token")
                val account = json.getJSONObject("account")
                val profile = json.getJSONObject("profile")

                val session = AuthSession(
                    token = token,
                    accountId = account.getString("id"),
                    email = account.getString("email"),
                    displayName = profile.getString("displayName"),
                    username = profile.getString("username"),
                    expiresAt = account.optString("createdAt", "")
                )

                storage.putString(KEY_AUTH_TOKEN, token)
                storage.putString(KEY_AUTH_SESSION, responseText)

                AuthResult(success = true, session = session)
            } else {
                val errorMsg = try {
                    JSONObject(responseText).optString("error", "Registration failed.")
                } catch (_: Exception) {
                    "Registration failed with HTTP $responseCode"
                }
                AuthResult(success = false, error = errorMsg)
            }
        } catch (e: Exception) {
            AuthResult(success = false, error = "Network unavailable. Please try again.")
        }
    }

    override suspend fun login(email: String, password: String): AuthResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/v1/auth/login")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
                connectTimeout = 5000
                readTimeout = 5000
            }

            val body = JSONObject().apply {
                put("email", email)
                put("password", password)
            }

            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

            val responseCode = conn.responseCode
            val responseText = readResponse(conn)

            if (responseCode in 200..299) {
                val json = JSONObject(responseText)
                val token = json.getString("token")
                val account = json.getJSONObject("account")
                val profile = json.getJSONObject("profile")

                val session = AuthSession(
                    token = token,
                    accountId = account.getString("id"),
                    email = account.getString("email"),
                    displayName = profile.getString("displayName"),
                    username = profile.getString("username"),
                    expiresAt = account.optString("createdAt", "")
                )

                storage.putString(KEY_AUTH_TOKEN, token)
                storage.putString(KEY_AUTH_SESSION, responseText)

                AuthResult(success = true, session = session)
            } else {
                val errorMsg = try {
                    JSONObject(responseText).optString("error", "Invalid credentials.")
                } catch (_: Exception) {
                    "Login failed with HTTP $responseCode"
                }
                AuthResult(success = false, error = errorMsg)
            }
        } catch (e: Exception) {
            AuthResult(success = false, error = "Cannot connect to server. Check network connection.")
        }
    }

    override suspend fun logout() = withContext(Dispatchers.IO) {
        val token = storage.getString(KEY_AUTH_TOKEN, null)
        if (token != null) {
            try {
                val url = URL("${baseUrl.trimEnd('/')}/api/v1/auth/logout")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Authorization", "Bearer $token")
                    connectTimeout = 3000
                    readTimeout = 3000
                }
                conn.responseCode // execute
            } catch (_: Exception) {
                // Ignore network error on logout
            }
        }
        storage.putString(KEY_AUTH_TOKEN, "")
        storage.putString(KEY_AUTH_SESSION, "")
    }

    override suspend fun getCurrentSession(): AuthSession? = withContext(Dispatchers.IO) {
        val token = storage.getString(KEY_AUTH_TOKEN, null)
        val rawSession = storage.getString(KEY_AUTH_SESSION, null)
        if (token.isNullOrEmpty() || rawSession.isNullOrEmpty()) return@withContext null

        try {
            val json = JSONObject(rawSession)
            val account = json.optJSONObject("account")
            val profile = json.optJSONObject("profile")
            if (account != null && profile != null) {
                AuthSession(
                    token = token,
                    accountId = account.getString("id"),
                    email = account.getString("email"),
                    displayName = profile.getString("displayName"),
                    username = profile.getString("username"),
                    expiresAt = account.optString("createdAt", "")
                )
            } else null
        } catch (_: Exception) {
            null
        }
    }

    override suspend fun deleteAccount(password: String, deleteRemoteDataOnly: Boolean): AccountDeletionResult =
        withContext(Dispatchers.IO) {
            val session = getCurrentSession()
            val token = storage.getString(KEY_AUTH_TOKEN, null)

            if (token == null || session == null) {
                return@withContext AccountDeletionResult(
                    success = false,
                    remoteDataDeleted = false,
                    localDataDeleted = false,
                    accountId = ""
                )
            }

            try {
                val url = URL("${baseUrl.trimEnd('/')}/api/v1/auth/delete")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "DELETE"
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Authorization", "Bearer $token")
                    doOutput = true
                    connectTimeout = 5000
                    readTimeout = 5000
                }

                val body = JSONObject().apply {
                    put("password", password)
                }

                OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

                val code = conn.responseCode
                if (code in 200..299) {
                    if (!deleteRemoteDataOnly) {
                        storage.putString(KEY_AUTH_TOKEN, "")
                        storage.putString(KEY_AUTH_SESSION, "")
                        // Reset local data
                    }
                    AccountDeletionResult(
                        success = true,
                        remoteDataDeleted = true,
                        localDataDeleted = !deleteRemoteDataOnly,
                        accountId = session.accountId
                    )
                } else {
                    AccountDeletionResult(
                        success = false,
                        remoteDataDeleted = false,
                        localDataDeleted = false,
                        accountId = session.accountId
                    )
                }
            } catch (e: Exception) {
                AccountDeletionResult(
                    success = false,
                    remoteDataDeleted = false,
                    localDataDeleted = false,
                    accountId = session.accountId
                )
            }
        }

    private fun readResponse(conn: HttpURLConnection): String {
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        return BufferedReader(InputStreamReader(stream ?: conn.inputStream)).use { it.readText() }
    }
}
