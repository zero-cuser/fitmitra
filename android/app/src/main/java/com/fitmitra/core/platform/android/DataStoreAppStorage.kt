package com.fitmitra.core.platform.android

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.fitmitra.core.platform.interfaces.IAppStorage
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.io.IOException

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "fitmitra_prefs")

/**
 * Jetpack DataStore Preferences implementation of IAppStorage.
 * Stores local streaks, workout summaries, and challenge participation safely with asynchronous I/O.
 */
class DataStoreAppStorage(
    private val dataStore: DataStore<Preferences>
) : IAppStorage {

    constructor(context: Context) : this(context.dataStore)

    override suspend fun putString(key: String, value: String) {
        val prefKey = stringPreferencesKey(key)
        dataStore.edit { preferences ->
            preferences[prefKey] = value
        }
    }

    override suspend fun getString(key: String, default: String?): String? {
        val prefKey = stringPreferencesKey(key)
        return try {
            val prefs = dataStore.data.first()
            prefs[prefKey] ?: default
        } catch (_: Exception) {
            default
        }
    }

    override suspend fun putInt(key: String, value: Int) {
        val prefKey = intPreferencesKey(key)
        dataStore.edit { preferences ->
            preferences[prefKey] = value
        }
    }

    override suspend fun getInt(key: String, default: Int): Int {
        val prefKey = intPreferencesKey(key)
        return try {
            val prefs = dataStore.data.first()
            prefs[prefKey] ?: default
        } catch (_: Exception) {
            default
        }
    }

    override suspend fun putBoolean(key: String, value: Boolean) {
        val prefKey = booleanPreferencesKey(key)
        dataStore.edit { preferences ->
            preferences[prefKey] = value
        }
    }

    override suspend fun getBoolean(key: String, default: Boolean): Boolean {
        val prefKey = booleanPreferencesKey(key)
        return try {
            val prefs = dataStore.data.first()
            prefs[prefKey] ?: default
        } catch (_: Exception) {
            default
        }
    }

    override fun observeString(key: String, default: String?): Flow<String?> {
        val prefKey = stringPreferencesKey(key)
        return dataStore.data
            .catch { exception ->
                if (exception is IOException) {
                    emit(emptyPreferences())
                } else {
                    throw exception
                }
            }
            .map { preferences ->
                preferences[prefKey] ?: default
            }
    }

    override fun observeInt(key: String, default: Int): Flow<Int> {
        val prefKey = intPreferencesKey(key)
        return dataStore.data
            .catch { exception ->
                if (exception is IOException) {
                    emit(emptyPreferences())
                } else {
                    throw exception
                }
            }
            .map { preferences ->
                preferences[prefKey] ?: default
            }
    }

    override suspend fun remove(key: String) {
        val strKey = stringPreferencesKey(key)
        val intKey = intPreferencesKey(key)
        val boolKey = booleanPreferencesKey(key)
        dataStore.edit { preferences ->
            preferences.remove(strKey)
            preferences.remove(intKey)
            preferences.remove(boolKey)
        }
    }

    override suspend fun clear() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
