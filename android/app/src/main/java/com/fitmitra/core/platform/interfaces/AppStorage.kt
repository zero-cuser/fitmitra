package com.fitmitra.core.platform.interfaces

import kotlinx.coroutines.flow.Flow

interface IAppStorage {
    suspend fun putString(key: String, value: String)
    suspend fun getString(key: String, default: String? = null): String?

    suspend fun putInt(key: String, value: Int)
    suspend fun getInt(key: String, default: Int = 0): Int

    suspend fun putBoolean(key: String, value: Boolean)
    suspend fun getBoolean(key: String, default: Boolean = false): Boolean

    fun observeString(key: String, default: String? = null): Flow<String?>
    fun observeInt(key: String, default: Int = 0): Flow<Int>

    suspend fun remove(key: String)
    suspend fun clear()
}
