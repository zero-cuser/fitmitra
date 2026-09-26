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
  SCHEMA_VERSION: 'fitmitra_storage_version'
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

    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      console.warn(`[StorageSafety] Corrupted data encountered for key "${key}". Using fallback.`);
      return fallbackValue;
    }
    return parsed as T;
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

  const items: { key: string; label: string; category: StorageInventoryItem['category'] }[] = [
    { key: STORAGE_KEYS.USER, label: 'User Identity & Biometrics', category: 'identity' },
    { key: STORAGE_KEYS.AUTH_STATUS, label: 'Session Authentication Status', category: 'identity' },
    { key: STORAGE_KEYS.WORKOUT, label: 'Current Workout Session State', category: 'workout' },
    { key: STORAGE_KEYS.CALORIES_WEEK, label: 'Weekly Calorie & Active Days History', category: 'workout' },
    { key: STORAGE_KEYS.WATER, label: 'Daily Water Hydration Tracker', category: 'nutrition' },
    { key: STORAGE_KEYS.NUTRITION, label: 'Logged Meals & Nutrition History', category: 'nutrition' },
    { key: STORAGE_KEYS.FRIENDS, label: 'Campus Friends & Peer Stats', category: 'preferences' },
    { key: STORAGE_KEYS.NOTIFICATIONS, label: 'Notification & Reminder Preferences', category: 'preferences' },
    { key: STORAGE_KEYS.EXAM_SESSIONS, label: 'Exam Mode & Study Break Sessions', category: 'workout' }
  ];

  return items.map(({ key, label, category }) => {
    try {
      const raw = window.localStorage.getItem(key);
      const exists = raw !== null;
      const sizeBytes = raw ? new Blob([raw]).size : 0;
      let itemCount: number | undefined;

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            itemCount = parsed.length;
          }
        } catch {
          // not an array
        }
      }

      return { key, label, category, exists, sizeBytes, itemCount };
    } catch {
      return { key, label, category, exists: false, sizeBytes: 0 };
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
      userProfile: safeGetItem(STORAGE_KEYS.USER),
      authStatus: safeGetItem(STORAGE_KEYS.AUTH_STATUS),
      workoutProgress: safeGetItem(STORAGE_KEYS.WORKOUT),
      dailyCalorieHistory: safeGetItem(STORAGE_KEYS.CALORIES_WEEK),
      loggedMeals: safeGetItem(STORAGE_KEYS.NUTRITION),
      waterToday: safeGetItem(STORAGE_KEYS.WATER),
      friends: safeGetItem(STORAGE_KEYS.FRIENDS),
      notificationPreferences: safeGetItem(STORAGE_KEYS.NOTIFICATIONS),
      examSessions: safeGetItem(STORAGE_KEYS.EXAM_SESSIONS)
    }
  };

  return payload;
}

/**
 * Selectively deletes workout and calorie history while preserving user identity.
 */
export function clearWorkoutHistory(): boolean {
  try {
    safeRemoveItem(STORAGE_KEYS.CALORIES_WEEK);
    safeRemoveItem(STORAGE_KEYS.WORKOUT);
    safeRemoveItem(STORAGE_KEYS.WATER);
    safeRemoveItem(STORAGE_KEYS.EXAM_SESSIONS);
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
    safeRemoveItem(STORAGE_KEYS.NUTRITION);
    return true;
  } catch (e) {
    console.error('Failed to clear nutrition history:', e);
    return false;
  }
}

/**
 * Completely wipes all FitMitra keys from LocalStorage.
 * Returns true if successful.
 */
export function wipeAllLocalData(): boolean {
  if (!isStorageAvailable()) return false;

  try {
    Object.values(STORAGE_KEYS).forEach((k) => {
      window.localStorage.removeItem(k);
    });

    // Also remove any miscellaneous legacy keys starting with fitmitra_
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('fitmitra_')) {
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
