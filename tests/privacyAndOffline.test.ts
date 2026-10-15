import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEYS,
  isStorageAvailable,
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  getStorageInventory,
  exportAllUserData,
  clearWorkoutHistory,
  clearNutritionHistory,
  wipeAllLocalData
} from '../src/utils/storageSafety.ts';
import { MockLocalStorage } from './mocks/browserMocks.ts';

describe('Storage Safety & Privacy Architecture', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    // Attach mockStorage to global window.localStorage
    (global as any).window = {
      localStorage: mockStorage
    };
  });

  describe('safeGetItem', () => {
    it('returns fallback value if key does not exist', () => {
      const result = safeGetItem('non_existent_key', undefined, { default: true });
      assert.deepEqual(result, { default: true });
    });

    it('parses valid JSON accurately', () => {
      mockStorage.setItem('test_profile', JSON.stringify({ name: 'Aarav', streak: 7 }));
      const result = safeGetItem<{ name: string; streak: number }>('test_profile');
      assert.deepEqual(result, { name: 'Aarav', streak: 7 });
    });

    it('gracefully handles malformed JSON without crashing or throwing', () => {
      mockStorage.setItem('corrupt_json', '{ broken: true, invalid... ');
      const result = safeGetItem('corrupt_json', undefined, null);
      assert.equal(result, null);
    });

    it('enforces validator guards when provided', () => {
      mockStorage.setItem('test_data', JSON.stringify({ count: 'not-a-number' }));
      const isNumberCount = (d: any): d is { count: number } => typeof d?.count === 'number';
      const result = safeGetItem('test_data', isNumberCount, { count: 0 });
      assert.deepEqual(result, { count: 0 });
    });
  });

  describe('safeSetItem & Quota Guarding', () => {
    it('successfully stores string and object values', () => {
      const success = safeSetItem('test_workout', { reps: 15, exercise: 'squats' });
      assert.equal(success, true);
      const raw = mockStorage.getItem('test_workout');
      assert.ok(raw);
      assert.deepEqual(JSON.parse(raw!), { reps: 15, exercise: 'squats' });
    });

    it('safely catches QuotaExceededError without throwing', () => {
      // Mock setItem throwing QuotaExceededError
      mockStorage.setItem = () => {
        const quotaError = new Error('QuotaExceededError: DOM Exception 22');
        quotaError.name = 'QuotaExceededError';
        throw quotaError;
      };

      let threw = false;
      let success = false;
      try {
        success = safeSetItem('overflow_key', { large: 'payload' });
      } catch {
        threw = true;
      }

      assert.equal(threw, false, 'safeSetItem must never throw on quota error');
      assert.equal(success, false, 'safeSetItem must return false when storage fails');
    });
  });

  describe('safeRemoveItem', () => {
    it('removes item cleanly from storage', () => {
      mockStorage.setItem('temp_key', 'value');
      assert.equal(mockStorage.getItem('temp_key'), 'value');
      const removed = safeRemoveItem('temp_key');
      assert.equal(removed, true);
      assert.equal(mockStorage.getItem('temp_key'), null);
    });
  });

  describe('getStorageInventory', () => {
    it('accurately lists stored keys, existence, byte sizes, and array item counts', () => {
      mockStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ name: 'Student Aarav', hostel: 'Block C' }));
      mockStorage.setItem(STORAGE_KEYS.CALORIES_WEEK, JSON.stringify([
        { day: 'Mon', date: 'Sept 7', caloriesBurned: 280, caloriesGained: 1850, netBalance: 1570 },
        { day: 'Tue', date: 'Sept 8', caloriesBurned: 340, caloriesGained: 1920, netBalance: 1580 }
      ]));

      const inventory = getStorageInventory();
      assert.ok(Array.isArray(inventory));

      const userItem = inventory.find(i => i.key === STORAGE_KEYS.USER);
      assert.ok(userItem);
      assert.equal(userItem?.exists, true);
      assert.ok(userItem?.sizeBytes && userItem.sizeBytes > 0);

      const caloriesItem = inventory.find(i => i.key === STORAGE_KEYS.CALORIES_WEEK);
      assert.ok(caloriesItem);
      assert.equal(caloriesItem?.exists, true);
      assert.equal(caloriesItem?.itemCount, 2);

      const emptyItem = inventory.find(i => i.key === STORAGE_KEYS.WATER);
      assert.ok(emptyItem);
      assert.equal(emptyItem?.exists, false);
      assert.equal(emptyItem?.sizeBytes, 0);
    });
  });

  describe('exportAllUserData', () => {
    it('generates a valid, complete user data backup payload with versioning and timestamp', () => {
      mockStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: 'u1', name: 'Rohan' }));
      mockStorage.setItem(STORAGE_KEYS.CALORIES_WEEK, JSON.stringify([{ day: 'Wed', caloriesBurned: 300 }]));
      mockStorage.setItem(STORAGE_KEYS.NUTRITION, JSON.stringify([{ meal: 'Dal Roti', calories: 450 }]));

      const backup = exportAllUserData();
      assert.equal(backup.version, 1);
      assert.ok(backup.exportedAt);
      assert.equal(backup.source, 'FitMitra Client-Side Privacy Center');
      assert.deepEqual(backup.data.userProfile, { id: 'u1', name: 'Rohan' });
      assert.deepEqual(backup.data.dailyCalorieHistory, [{ day: 'Wed', caloriesBurned: 300 }]);
      assert.deepEqual(backup.data.loggedMeals, [{ meal: 'Dal Roti', calories: 450 }]);
      assert.equal(backup.data.waterToday, null);
    });
  });

  describe('Granular Deletion Controls', () => {
    it('clearWorkoutHistory clears workouts and calories but preserves user profile and meals', () => {
      mockStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ name: 'Aarav' }));
      mockStorage.setItem(STORAGE_KEYS.NUTRITION, JSON.stringify([{ meal: 'Paneer' }]));
      mockStorage.setItem(STORAGE_KEYS.CALORIES_WEEK, JSON.stringify([{ day: 'Mon' }]));
      mockStorage.setItem(STORAGE_KEYS.WORKOUT, JSON.stringify({ reps: 10 }));
      mockStorage.setItem(STORAGE_KEYS.WATER, '1500');

      const success = clearWorkoutHistory();
      assert.equal(success, true);

      // Cleared
      assert.equal(mockStorage.getItem(STORAGE_KEYS.CALORIES_WEEK), null);
      assert.equal(mockStorage.getItem(STORAGE_KEYS.WORKOUT), null);
      assert.equal(mockStorage.getItem(STORAGE_KEYS.WATER), null);

      // Preserved
      assert.ok(mockStorage.getItem(STORAGE_KEYS.USER));
      assert.ok(mockStorage.getItem(STORAGE_KEYS.NUTRITION));
    });

    it('clearNutritionHistory clears meals but preserves profile and workouts', () => {
      mockStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ name: 'Aarav' }));
      mockStorage.setItem(STORAGE_KEYS.NUTRITION, JSON.stringify([{ meal: 'Paneer' }]));
      mockStorage.setItem(STORAGE_KEYS.CALORIES_WEEK, JSON.stringify([{ day: 'Mon' }]));

      const success = clearNutritionHistory();
      assert.equal(success, true);

      assert.equal(mockStorage.getItem(STORAGE_KEYS.NUTRITION), null);
      assert.ok(mockStorage.getItem(STORAGE_KEYS.USER));
      assert.ok(mockStorage.getItem(STORAGE_KEYS.CALORIES_WEEK));
    });

    it('wipeAllLocalData deletes all fitmitra keys completely', () => {
      mockStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ name: 'Aarav' }));
      mockStorage.setItem(STORAGE_KEYS.NUTRITION, JSON.stringify([{ meal: 'Paneer' }]));
      mockStorage.setItem(STORAGE_KEYS.CALORIES_WEEK, JSON.stringify([{ day: 'Mon' }]));
      mockStorage.setItem('fitmitra_custom_key', 'arbitrary_legacy_data');
      mockStorage.setItem('unrelated_key', 'keep_me');

      const success = wipeAllLocalData();
      assert.equal(success, true);

      assert.equal(mockStorage.getItem(STORAGE_KEYS.USER), null);
      assert.equal(mockStorage.getItem(STORAGE_KEYS.NUTRITION), null);
      assert.equal(mockStorage.getItem(STORAGE_KEYS.CALORIES_WEEK), null);
      assert.equal(mockStorage.getItem('fitmitra_custom_key'), null);
      // Unrelated storage remains untouched
      assert.equal(mockStorage.getItem('unrelated_key'), 'keep_me');
    });

    it('wipeAllLocalData purges active production V3 keys case-insensitively', () => {
      mockStorage.setItem('FITMITRA_AUTH_USER_V3', JSON.stringify({ name: 'Student Aarav', email: 'aarav@hostel.edu' }));
      mockStorage.setItem('FITMITRA_AUTH_STATUS_V3', 'authenticated');
      mockStorage.setItem('FITMITRA_FRIENDS_V3', JSON.stringify([{ id: 'f1', name: 'Rohan' }]));
      mockStorage.setItem('FITMITRA_WORKOUT_PROGRESS_V3', JSON.stringify({ xp: 450, streakDays: 12 }));
      mockStorage.setItem('FITMITRA_NUTRITION_V3', JSON.stringify([{ meal: 'Mess Dal' }]));
      mockStorage.setItem('FITMITRA_CALORIES_WEEK_V3', JSON.stringify([{ day: 'Fri', burned: 350 }]));
      mockStorage.setItem('FITMITRA_WATER_V3', '2500');
      mockStorage.setItem('fitmitra_workout_sessions_v1', JSON.stringify([{ id: 's1', reps: 25 }]));
      mockStorage.setItem('fitmitra_auth_token_v1', 'secret_jwt_token');
      mockStorage.setItem('unrelated_app_key', 'do_not_delete');

      const success = wipeAllLocalData();
      assert.equal(success, true);

      assert.equal(mockStorage.getItem('FITMITRA_AUTH_USER_V3'), null);
      assert.equal(mockStorage.getItem('FITMITRA_AUTH_STATUS_V3'), null);
      assert.equal(mockStorage.getItem('FITMITRA_FRIENDS_V3'), null);
      assert.equal(mockStorage.getItem('FITMITRA_WORKOUT_PROGRESS_V3'), null);
      assert.equal(mockStorage.getItem('FITMITRA_NUTRITION_V3'), null);
      assert.equal(mockStorage.getItem('FITMITRA_CALORIES_WEEK_V3'), null);
      assert.equal(mockStorage.getItem('FITMITRA_WATER_V3'), null);
      assert.equal(mockStorage.getItem('fitmitra_workout_sessions_v1'), null);
      assert.equal(mockStorage.getItem('fitmitra_auth_token_v1'), null);
      assert.equal(mockStorage.getItem('unrelated_app_key'), 'do_not_delete');
    });

    it('wipeAllLocalData preserves keys that merely share prefix text without the fitmitra_ delimiter', () => {
      mockStorage.setItem('fitmitrade_holdings', 'shares_100');
      mockStorage.setItem('fitmitrailer_config', 'trailer_active');
      mockStorage.setItem('fitness_tracker_data', 'steps_5000');
      mockStorage.setItem('unrelated_app_key', 'keep_safe');
      mockStorage.setItem('FITMITRA_AUTH_USER_V3', JSON.stringify({ name: 'Aarav' }));
      mockStorage.setItem('fitmitra_last_sync_timestamp_v1', '1720000000000');
      mockStorage.setItem('fitmitra_auth_token_v1', 'token_to_purge');

      const success = wipeAllLocalData();
      assert.equal(success, true);

      // FitMitra keys purged
      assert.equal(mockStorage.getItem('FITMITRA_AUTH_USER_V3'), null);
      assert.equal(mockStorage.getItem('fitmitra_last_sync_timestamp_v1'), null);
      assert.equal(mockStorage.getItem('fitmitra_auth_token_v1'), null);

      // Unrelated keys with similar prefixes preserved
      assert.equal(mockStorage.getItem('fitmitrade_holdings'), 'shares_100');
      assert.equal(mockStorage.getItem('fitmitrailer_config'), 'trailer_active');
      assert.equal(mockStorage.getItem('fitness_tracker_data'), 'steps_5000');
      assert.equal(mockStorage.getItem('unrelated_app_key'), 'keep_safe');
    });

    it('clearWorkoutHistory purges active V3 workout, calorie, water, and workout session records', () => {
      mockStorage.setItem('FITMITRA_AUTH_USER_V3', JSON.stringify({ name: 'Aarav' }));
      mockStorage.setItem('FITMITRA_WORKOUT_PROGRESS_V3', JSON.stringify({ xp: 500, streakDays: 7 }));
      mockStorage.setItem('FITMITRA_CALORIES_WEEK_V3', JSON.stringify([{ day: 'Tue', caloriesBurned: 320 }]));
      mockStorage.setItem('FITMITRA_WATER_V3', '2000');
      mockStorage.setItem('fitmitra_workout_sessions_v1', JSON.stringify([{ id: 'w1', exerciseKey: 'squats' }]));
      mockStorage.setItem('FITMITRA_NUTRITION_V3', JSON.stringify([{ meal: 'Hostel Thali' }]));

      const success = clearWorkoutHistory();
      assert.equal(success, true);

      // Workouts, calories, water, and sessions must be wiped
      assert.equal(mockStorage.getItem('FITMITRA_WORKOUT_PROGRESS_V3'), null);
      assert.equal(mockStorage.getItem('FITMITRA_CALORIES_WEEK_V3'), null);
      assert.equal(mockStorage.getItem('FITMITRA_WATER_V3'), null);
      assert.equal(mockStorage.getItem('fitmitra_workout_sessions_v1'), null);

      // Profile and nutrition must be preserved
      assert.ok(mockStorage.getItem('FITMITRA_AUTH_USER_V3'));
      assert.ok(mockStorage.getItem('FITMITRA_NUTRITION_V3'));
    });

    it('clearNutritionHistory purges active V3 nutrition meals while preserving workouts and profile', () => {
      mockStorage.setItem('FITMITRA_AUTH_USER_V3', JSON.stringify({ name: 'Aarav' }));
      mockStorage.setItem('FITMITRA_NUTRITION_V3', JSON.stringify([{ meal: 'Mess Paneer' }]));
      mockStorage.setItem('FITMITRA_WORKOUT_PROGRESS_V3', JSON.stringify({ xp: 300 }));

      const success = clearNutritionHistory();
      assert.equal(success, true);

      assert.equal(mockStorage.getItem('FITMITRA_NUTRITION_V3'), null);
      assert.ok(mockStorage.getItem('FITMITRA_AUTH_USER_V3'));
      assert.ok(mockStorage.getItem('FITMITRA_WORKOUT_PROGRESS_V3'));
    });

    it('exportAllUserData aggregates active production V3 data faithfully', () => {
      mockStorage.setItem('FITMITRA_AUTH_USER_V3', JSON.stringify({ id: 'usr_v3', name: 'Aarav V3' }));
      mockStorage.setItem('FITMITRA_AUTH_STATUS_V3', 'authenticated');
      mockStorage.setItem('FITMITRA_WORKOUT_PROGRESS_V3', JSON.stringify({ xp: 1200, streakDays: 14 }));
      mockStorage.setItem('FITMITRA_NUTRITION_V3', JSON.stringify([{ meal: 'Mess Roti' }]));
      mockStorage.setItem('FITMITRA_CALORIES_WEEK_V3', JSON.stringify([{ day: 'Mon', caloriesBurned: 400 }]));
      mockStorage.setItem('FITMITRA_WATER_V3', '3000');
      mockStorage.setItem('FITMITRA_FRIENDS_V3', JSON.stringify([{ id: 'f2', name: 'Vikram' }]));

      const exported = exportAllUserData();
      assert.deepEqual(exported.data.userProfile, { id: 'usr_v3', name: 'Aarav V3' });
      assert.equal(exported.data.authStatus, 'authenticated');
      assert.deepEqual(exported.data.workoutProgress, { xp: 1200, streakDays: 14 });
      assert.deepEqual(exported.data.loggedMeals, [{ meal: 'Mess Roti' }]);
      assert.deepEqual(exported.data.dailyCalorieHistory, [{ day: 'Mon', caloriesBurned: 400 }]);
      assert.equal(exported.data.waterToday, 3000);
      assert.deepEqual(exported.data.friends, [{ id: 'f2', name: 'Vikram' }]);
    });

    it('getStorageInventory detects active V3 storage items', () => {
      mockStorage.setItem('FITMITRA_AUTH_USER_V3', JSON.stringify({ id: 'usr_1', name: 'Test' }));
      mockStorage.setItem('FITMITRA_WORKOUT_PROGRESS_V3', JSON.stringify({ xp: 100 }));

      const inventory = getStorageInventory();
      const userItem = inventory.find(i => i.key === 'FITMITRA_AUTH_USER_V3');
      assert.ok(userItem);
      assert.equal(userItem?.exists, true);
      assert.ok(userItem?.sizeBytes && userItem.sizeBytes > 0);

      const workoutItem = inventory.find(i => i.key === 'FITMITRA_WORKOUT_PROGRESS_V3');
      assert.ok(workoutItem);
      assert.equal(workoutItem?.exists, true);
    });
  });

  describe('Privacy Hardening & Regression Suite', () => {
    it('table-driven wipeAllLocalData purges all 25 registered STORAGE_KEYS and preserves unrelated keys', () => {
      // 1. Populate every registered key in STORAGE_KEYS
      const allRegisteredKeys = Object.values(STORAGE_KEYS);
      assert.equal(allRegisteredKeys.length, 25, 'STORAGE_KEYS must define exactly 25 canonical keys');

      allRegisteredKeys.forEach((key, index) => {
        mockStorage.setItem(key, JSON.stringify({ index, registeredKey: key }));
      });

      // 2. Set varied unrelated keys (including adjacent prefixes)
      const unrelatedKeys = [
        'unrelated_app_data',
        'fitmitrade_stocks_portfolio',
        'fitmitrailer_config_v2',
        'fitness_tracker_log',
        'my_fitmitra_backup_archive'
      ];
      unrelatedKeys.forEach((key, i) => {
        mockStorage.setItem(key, `safe_unrelated_value_${i}`);
      });

      // 3. Execute wipe
      const wiped = wipeAllLocalData();
      assert.equal(wiped, true);

      // 4. Verify all 25 registered keys are completely purged
      allRegisteredKeys.forEach((key) => {
        assert.equal(
          mockStorage.getItem(key),
          null,
          `Registered key "${key}" must be removed by wipeAllLocalData`
        );
      });

      // 5. Verify all unrelated keys remain intact
      unrelatedKeys.forEach((key, i) => {
        assert.equal(
          mockStorage.getItem(key),
          `safe_unrelated_value_${i}`,
          `Unrelated key "${key}" must be preserved`
        );
      });
    });

    it('idempotence: wipe and granular clearing operations succeed repeatedly on empty or wiped storage', () => {
      // Repeated wipeAllLocalData
      assert.equal(wipeAllLocalData(), true);
      assert.equal(wipeAllLocalData(), true);

      // Repeated clearWorkoutHistory
      assert.equal(clearWorkoutHistory(), true);
      assert.equal(clearWorkoutHistory(), true);

      // Repeated clearNutritionHistory
      assert.equal(clearNutritionHistory(), true);
      assert.equal(clearNutritionHistory(), true);
    });

    it('comprehensive granular isolation: clearWorkoutHistory wipes all workout & sync queues while preserving identity, nutrition, and friends', () => {
      // Populate comprehensive mixed state
      mockStorage.setItem(STORAGE_KEYS.USER_V3, JSON.stringify({ name: 'Student Aarav', id: 'usr_101' }));
      mockStorage.setItem(STORAGE_KEYS.AUTH_STATUS_V3, 'authenticated');
      mockStorage.setItem(STORAGE_KEYS.FRIENDS_V3, JSON.stringify([{ id: 'f_1', name: 'Rohan' }]));
      mockStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify({ hydrationReminders: true }));
      mockStorage.setItem(STORAGE_KEYS.NUTRITION_V3, JSON.stringify([{ meal: 'Hostel Thali', cals: 650 }]));
      mockStorage.setItem(STORAGE_KEYS.NUTRITION, JSON.stringify([{ meal: 'Legacy Dal', cals: 300 }]));
      mockStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'jwt_token_secret');
      mockStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'sess_active_123');
      mockStorage.setItem(STORAGE_KEYS.SYNC_CONSENT, JSON.stringify({ syncWorkouts: true }));
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ currentStreak: 5, totalXp: 450 }));
      mockStorage.setItem(STORAGE_KEYS.CALORIES_WEEK_V3, JSON.stringify([{ day: 'Mon', caloriesBurned: 350 }]));
      mockStorage.setItem(STORAGE_KEYS.WATER_V3, '2200');
      mockStorage.setItem(STORAGE_KEYS.WORKOUT, JSON.stringify({ legacyProgress: 10 }));
      mockStorage.setItem(STORAGE_KEYS.CALORIES_WEEK, JSON.stringify([{ day: 'Sun', caloriesBurned: 200 }]));
      mockStorage.setItem(STORAGE_KEYS.WATER, '1800');
      mockStorage.setItem(STORAGE_KEYS.EXAM_SESSIONS, JSON.stringify([{ session: 'Midsem Break' }]));
      mockStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, JSON.stringify({ challenge_1: { completed: true } }));
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify([{ id: 'ws_1', exercise: 'squats' }]));
      mockStorage.setItem(STORAGE_KEYS.PENDING_SYNC_QUEUE, JSON.stringify(['ws_1']));

      // 1. Clear workout history
      const workoutClearSuccess = clearWorkoutHistory();
      assert.equal(workoutClearSuccess, true);

      // Verify all workout-related items are null
      const workoutRelatedKeys = [
        STORAGE_KEYS.WORKOUT_V3,
        STORAGE_KEYS.CALORIES_WEEK_V3,
        STORAGE_KEYS.WATER_V3,
        STORAGE_KEYS.WORKOUT,
        STORAGE_KEYS.CALORIES_WEEK,
        STORAGE_KEYS.WATER,
        STORAGE_KEYS.EXAM_SESSIONS,
        STORAGE_KEYS.CHALLENGE_PROGRESS,
        STORAGE_KEYS.WORKOUT_SESSIONS,
        STORAGE_KEYS.PENDING_SYNC_QUEUE
      ];
      workoutRelatedKeys.forEach((k) => {
        assert.equal(mockStorage.getItem(k), null, `Workout key "${k}" should be removed`);
      });

      // Verify identity, auth, nutrition, and friends are strictly preserved
      assert.ok(mockStorage.getItem(STORAGE_KEYS.USER_V3), 'USER_V3 must be preserved');
      assert.equal(mockStorage.getItem(STORAGE_KEYS.AUTH_STATUS_V3), 'authenticated');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.FRIENDS_V3), 'FRIENDS_V3 must be preserved');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.NOTIFICATIONS), 'NOTIFICATIONS must be preserved');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.NUTRITION_V3), 'NUTRITION_V3 must be preserved');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.NUTRITION), 'NUTRITION must be preserved');
      assert.equal(mockStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), 'jwt_token_secret');
      assert.equal(mockStorage.getItem(STORAGE_KEYS.AUTH_SESSION), 'sess_active_123');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.SYNC_CONSENT), 'SYNC_CONSENT must be preserved');

      // 2. Clear nutrition history on the remaining state
      const nutritionClearSuccess = clearNutritionHistory();
      assert.equal(nutritionClearSuccess, true);

      // Nutrition keys wiped
      assert.equal(mockStorage.getItem(STORAGE_KEYS.NUTRITION_V3), null);
      assert.equal(mockStorage.getItem(STORAGE_KEYS.NUTRITION), null);

      // Identity, auth, and friends still intact
      assert.ok(mockStorage.getItem(STORAGE_KEYS.USER_V3));
      assert.equal(mockStorage.getItem(STORAGE_KEYS.AUTH_STATUS_V3), 'authenticated');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.FRIENDS_V3));
      assert.equal(mockStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), 'jwt_token_secret');
    });

    it('graceful export resilience: exportAllUserData survives corrupted JSON without crashing', () => {
      mockStorage.setItem(STORAGE_KEYS.USER_V3, JSON.stringify({ id: 'usr_valid', name: 'Aarav' }));
      mockStorage.setItem(STORAGE_KEYS.AUTH_STATUS_V3, 'authenticated');
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, '{ malformed: json, unclosed... ');
      mockStorage.setItem(STORAGE_KEYS.NUTRITION_V3, JSON.stringify([{ meal: 'Hostel Dal' }]));

      const exported = exportAllUserData();
      assert.equal(exported.version, 1);
      assert.equal(typeof exported.exportedAt, 'string');
      assert.deepEqual(exported.data.userProfile, { id: 'usr_valid', name: 'Aarav' });
      assert.equal(exported.data.authStatus, 'authenticated');
      assert.equal(exported.data.workoutProgress, null, 'Malformed JSON must safely fall back to null');
      assert.deepEqual(exported.data.loggedMeals, [{ meal: 'Hostel Dal' }]);
    });
  });
});
