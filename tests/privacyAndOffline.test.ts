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
  });
});
