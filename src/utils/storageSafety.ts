/**
 * FitMitra Centralized Storage Safety & Privacy Manager
 * 
 * Provides fail-safe, quota-guarded, and validated LocalStorage access.
 * Guarantees zero unhandled exceptions on QuotaExceededError or corrupted JSON.
 * Preserves legacy storage schemas without forced migration.
 */

export const STORAGE_KEYS = {
  USER: 'fitmitra_user_profile',
  AUTH_STATUS: 'fitmitra_auth_status',
  FRIENDS: 'fitmitra_friends',
  WORKOUT: 'fitmitra_workout_progress',
  NUTRITION: 'fitmitra_logged_meals',
  CALORIES_WEEK: 'fitmitra_daily_calorie_history',
  WATER: 'fitmitra_water_today',
  NOTIFICATIONS: 'fitmitra_notification_prefs',
  EXAM_SESSIONS: 'fitmitra_exam_sessions',
  CHALLENGE_PROGRESS: 'fitmitra_challenge_progress',
  SCHEMA_VERSION: 'fitmitra_storage_version',
  // Active production V3 keys
  USER_V3: 'FITMITRA_AUTH_USER_V3',
  AUTH_STATUS_V3: 'FITMITRA_AUTH_STATUS_V3',
  FRIENDS_V3: 'FITMITRA_FRIENDS_V3',
  WORKOUT_V3: 'FITMITRA_WORKOUT_PROGRESS_V3',
  NUTRITION_V3: 'FITMITRA_NUTRITION_V3',
  CALORIES_WEEK_V3: 'FITMITRA_CALORIES_WEEK_V3',
  WATER_V3: 'FITMITRA_WATER_V3',
  // Sync and session keys
  WORKOUT_SESSIONS: 'fitmitra_workout_sessions_v1',
  AUTH_TOKEN: 'fitmitra_auth_token_v1',
  AUTH_SESSION: 'fitmitra_auth_session_v1',
  SYNC_CONSENT: 'fitmitra_sync_consent_v1',
  SYNC_RETRY_COUNT: 'fitmitra_sync_retry_count_v1',
  PENDING_SYNC_QUEUE: 'fitmitra_pending_sync_queue_v1',
  LAST_SYNC_TS: 'fitmitra_last_sync_timestamp_v1'
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export interface StorageInventoryItem {
  key: string;
  label: string;
  category: 'identity' | 'workout' | 'nutrition' | 'preferences';
  exists: boolean;
  sizeBytes: number;
  itemCount?: number;
}

export interface UserDataExportPayload {
  version: number;
  exportedAt: string;
  source: string;
  data: {
    userProfile: unknown | null;
    authStatus: string | null;
    workoutProgress: unknown | null;
    dailyCalorieHistory: unknown[] | null;
    loggedMeals: unknown[] | null;
    waterToday: number | null;
    friends: unknown[] | null;
    notificationPreferences: unknown | null;
    examSessions?: unknown[] | null;
    challengeProgress?: Record<string, unknown> | null;
  };
}

/**
 * Checks if browser LocalStorage is available and accessible.
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__fitmitra_storage_probe__';
    window.localStorage.setItem(testKey, 'probe');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely retrieves and parses an item from LocalStorage.
 * Falls back to fallbackValue if key does not exist, JSON is corrupt, or validator fails.
 */
export function safeGetItem<T>(
  key: string,
  validator?: (data: unknown) => data is T,
  fallbackValue: T | null = null
): T | null {
  if (!isStorageAvailable()) return fallbackValue;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallbackValue;

    try {
      const parsed = JSON.parse(raw);
      if (validator && !validator(parsed)) {
        console.warn(`[StorageSafety] Corrupted data encountered for key "${key}". Using fallback.`);
        return fallbackValue;
      }
      return parsed as T;
    } catch {
      // If raw string was intended as JSON object/array/quoted string, it is malformed JSON: fallback safely
      const trimmed = raw.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
        console.warn(`[StorageSafety] Corrupted data encountered for key "${key}". Using fallback.`);
        return fallbackValue;
      }
      // Otherwise, it was stored as an unquoted plain string scalar (e.g. 'logged_out', 'guest', 'authenticated')
      if (!validator || validator(raw)) {
        return raw as unknown as T;
      }
      return fallbackValue;
    }
  } catch (err) {
    console.warn(`[StorageSafety] Failed to read or parse key "${key}":`, err);
    return fallbackValue;
  }
}

/**
 * Safely writes an item to LocalStorage with quota protection.
 * Catches QuotaExceededError and private browsing restrictions without throwing.
 */
export function safeSetItem<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) return false;

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.error(`[StorageSafety] Write failed for key "${key}". Likely QuotaExceededError or private browsing:`, err);
    return false;
  }
}

/**
 * Safely removes an item from LocalStorage.
 */
export function safeRemoveItem(key: string): boolean {
  if (!isStorageAvailable()) return false;

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[StorageSafety] Failed to remove key "${key}":`, err);
    return false;
  }
}

/**
 * Scans all FitMitra stored keys and returns a structured audit inventory.
 */
export function getStorageInventory(): StorageInventoryItem[] {
  if (!isStorageAvailable()) return [];

  const inventoryDefs: {
    primaryKey: string;
    fallbackKey?: string;
    label: string;
    category: StorageInventoryItem['category'];
  }[] = [
    { primaryKey: STORAGE_KEYS.USER_V3, fallbackKey: STORAGE_KEYS.USER, label: 'User Identity & Biometrics', category: 'identity' },
    { primaryKey: STORAGE_KEYS.AUTH_STATUS_V3, fallbackKey: STORAGE_KEYS.AUTH_STATUS, label: 'Session Authentication Status', category: 'identity' },
    { primaryKey: STORAGE_KEYS.WORKOUT_V3, fallbackKey: STORAGE_KEYS.WORKOUT, label: 'Current Workout Session State', category: 'workout' },
    { primaryKey: STORAGE_KEYS.CALORIES_WEEK_V3, fallbackKey: STORAGE_KEYS.CALORIES_WEEK, label: 'Weekly Calorie & Active Days History', category: 'workout' },
    { primaryKey: STORAGE_KEYS.WATER_V3, fallbackKey: STORAGE_KEYS.WATER, label: 'Daily Water Hydration Tracker', category: 'nutrition' },
    { primaryKey: STORAGE_KEYS.NUTRITION_V3, fallbackKey: STORAGE_KEYS.NUTRITION, label: 'Logged Meals & Nutrition History', category: 'nutrition' },
    { primaryKey: STORAGE_KEYS.FRIENDS_V3, fallbackKey: STORAGE_KEYS.FRIENDS, label: 'Campus Friends & Peer Stats', category: 'preferences' },
    { primaryKey: STORAGE_KEYS.NOTIFICATIONS, label: 'Notification & Reminder Preferences', category: 'preferences' },
    { primaryKey: STORAGE_KEYS.EXAM_SESSIONS, label: 'Exam Mode & Study Break Sessions', category: 'workout' },
    { primaryKey: STORAGE_KEYS.CHALLENGE_PROGRESS, label: 'Campus Challenge Progress', category: 'workout' },
    { primaryKey: STORAGE_KEYS.WORKOUT_SESSIONS, label: 'Completed Workout History Log', category: 'workout' }
  ];

  return inventoryDefs.map(({ primaryKey, fallbackKey, label, category }) => {
    try {
      const activeKey =
        window.localStorage.getItem(primaryKey) !== null
          ? primaryKey
          : (fallbackKey && window.localStorage.getItem(fallbackKey) !== null)
            ? fallbackKey
            : (fallbackKey || primaryKey);

      const raw = window.localStorage.getItem(activeKey);
      const exists = raw !== null;
      const sizeBytes = raw ? new Blob([raw]).size : 0;
      let itemCount: number | undefined;

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            itemCount = parsed.length;
          } else if (typeof parsed === 'object' && parsed !== null) {
            itemCount = Object.keys(parsed).length;
          }
        } catch {
          // not an array/object
        }
      }

      return { key: activeKey, label, category, exists, sizeBytes, itemCount };
    } catch {
      return { key: primaryKey, label, category, exists: false, sizeBytes: 0 };
    }
  });
}

/**
 * Aggregates all user-owned data into a clean, complete JSON export payload.
 */
export function exportAllUserData(): UserDataExportPayload {
  const payload: UserDataExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: 'FitMitra Client-Side Privacy Center',
    data: {
      userProfile: safeGetItem(STORAGE_KEYS.USER_V3) ?? safeGetItem(STORAGE_KEYS.USER),
      authStatus: safeGetItem(STORAGE_KEYS.AUTH_STATUS_V3) ?? safeGetItem(STORAGE_KEYS.AUTH_STATUS),
      workoutProgress: safeGetItem(STORAGE_KEYS.WORKOUT_V3) ?? safeGetItem(STORAGE_KEYS.WORKOUT),
      dailyCalorieHistory: safeGetItem(STORAGE_KEYS.CALORIES_WEEK_V3) ?? safeGetItem(STORAGE_KEYS.CALORIES_WEEK),
      loggedMeals: safeGetItem(STORAGE_KEYS.NUTRITION_V3) ?? safeGetItem(STORAGE_KEYS.NUTRITION),
      waterToday: safeGetItem(STORAGE_KEYS.WATER_V3) ?? safeGetItem(STORAGE_KEYS.WATER),
      friends: safeGetItem(STORAGE_KEYS.FRIENDS_V3) ?? safeGetItem(STORAGE_KEYS.FRIENDS),
      notificationPreferences: safeGetItem(STORAGE_KEYS.NOTIFICATIONS),
      examSessions: safeGetItem(STORAGE_KEYS.EXAM_SESSIONS),
      challengeProgress: safeGetItem(STORAGE_KEYS.CHALLENGE_PROGRESS)
    }
  };

  return payload;
}

/**
 * Selectively deletes workout and calorie history while preserving user identity.
 */
export function clearWorkoutHistory(): boolean {
  try {
    // Clear active V3 workout & calorie records
    safeRemoveItem(STORAGE_KEYS.CALORIES_WEEK_V3);
    safeRemoveItem(STORAGE_KEYS.WORKOUT_V3);
    safeRemoveItem(STORAGE_KEYS.WATER_V3);
    // Clear legacy storage keys
    safeRemoveItem(STORAGE_KEYS.CALORIES_WEEK);
    safeRemoveItem(STORAGE_KEYS.WORKOUT);
    safeRemoveItem(STORAGE_KEYS.WATER);
    safeRemoveItem(STORAGE_KEYS.EXAM_SESSIONS);
    safeRemoveItem(STORAGE_KEYS.CHALLENGE_PROGRESS);
    // Clear sync workout history logs
    safeRemoveItem(STORAGE_KEYS.WORKOUT_SESSIONS);
    safeRemoveItem(STORAGE_KEYS.PENDING_SYNC_QUEUE);
    return true;
  } catch (e) {
    console.error('Failed to clear workout history:', e);
    return false;
  }
}

/**
 * Selectively deletes logged meals and nutrition data.
 */
export function clearNutritionHistory(): boolean {
  try {
    safeRemoveItem(STORAGE_KEYS.NUTRITION_V3);
    safeRemoveItem(STORAGE_KEYS.NUTRITION);
    return true;
  } catch (e) {
    console.error('Failed to clear nutrition history:', e);
    return false;
  }
}

/**
 * Completely wipes all FitMitra keys from LocalStorage.
 * Case-insensitively purges all active V3, sync, and legacy fitmitra keys.
 * Returns true if successful.
 */
export function wipeAllLocalData(): boolean {
  if (!isStorageAvailable()) return false;

  try {
    // 1. Remove all explicit known registered storage keys
    Object.values(STORAGE_KEYS).forEach((k) => {
      window.localStorage.removeItem(k);
    });

    // 2. Case-insensitive sweep for all FitMitra keys (FITMITRA_*_V3, fitmitra_*, etc.)
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.toLowerCase().startsWith('fitmitra_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));

    return true;
  } catch (e) {
    console.error('Failed to wipe local data:', e);
    return false;
  }
}
