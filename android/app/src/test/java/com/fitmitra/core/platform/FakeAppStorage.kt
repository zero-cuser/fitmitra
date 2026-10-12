package com.fitmitra.core.platform

import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf

class FakeAppStorage : IAppStorage {
    private val stringMap = mutableMapOf<String, String>()
    private val intMap = mutableMapOf<String, Int>()
    private val boolMap = mutableMapOf<String, Boolean>()

    override suspend fun putString(key: String, value: String) {
        stringMap[key] = value
    }

    override suspend fun getString(key: String, default: String?): String? {
        return stringMap[key] ?: default
    }

    override suspend fun putInt(key: String, value: Int) {
        intMap[key] = value
    }

    override suspend fun getInt(key: String, default: Int): Int {
        return intMap[key] ?: default
    }

    override suspend fun putBoolean(key: String, value: Boolean) {
        boolMap[key] = value
    }

    override suspend fun getBoolean(key: String, default: Boolean): Boolean {
        return boolMap[key] ?: default
    }

    override fun observeString(key: String, default: String?): Flow<String?> = flowOf(stringMap[key] ?: default)
    override fun observeInt(key: String, default: Int): Flow<Int> = flowOf(intMap[key] ?: default)

    override suspend fun remove(key: String) {
        stringMap.remove(key)
        intMap.remove(key)
        boolMap.remove(key)
    }

    override suspend fun clear() {
        stringMap.clear()
        intMap.clear()
        boolMap.clear()
    }
}
