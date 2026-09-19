import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateWeeklyCalorieRecords,
  STORAGE_KEY_CALORIES_WEEK,
  STORAGE_KEY_WORKOUT
} from '../../src/context/workoutStorage.ts';
import { MockLocalStorage } from '../mocks/browserMocks.ts';
import type { DailyCalorieRecord } from '../../src/types/fitness.ts';

describe('Pure Logic: LocalStorage Parsing & Validation', () => {
  const validRecords: DailyCalorieRecord[] = [
    { day: 'Mon', date: 'Sept 7', caloriesBurned: 280, caloriesGained: 1850, netBalance: 1570 },
    { day: 'Tue', date: 'Sept 8', caloriesBurned: 340, caloriesGained: 1920, netBalance: 1580 }
  ];

  it('validates well-formed DailyCalorieRecord arrays', () => {
    const result = validateWeeklyCalorieRecords(validRecords);
    assert.deepEqual(result, validRecords);
  });

  it('rejects non-array inputs (null, undefined, string, object, number)', () => {
    assert.equal(validateWeeklyCalorieRecords(null), null);
    assert.equal(validateWeeklyCalorieRecords(undefined), null);
    assert.equal(validateWeeklyCalorieRecords(''), null);
    assert.equal(validateWeeklyCalorieRecords('{ "day": "Mon" }'), null);
    assert.equal(validateWeeklyCalorieRecords(42), null);
    assert.equal(validateWeeklyCalorieRecords(true), null);
  });

  it('rejects empty array so default initial seeds are preserved', () => {
    assert.equal(validateWeeklyCalorieRecords([]), null);
  });

  it('rejects corrupted records with missing required properties', () => {
    const missingDay = [{ date: 'Sept 7', caloriesBurned: 280, caloriesGained: 1850, netBalance: 1570 }];
    assert.equal(validateWeeklyCalorieRecords(missingDay), null);

    const missingCalories = [{ day: 'Mon', date: 'Sept 7', caloriesGained: 1850, netBalance: 1570 }];
    assert.equal(validateWeeklyCalorieRecords(missingCalories), null);

    const missingNet = [{ day: 'Mon', date: 'Sept 7', caloriesBurned: 280, caloriesGained: 1850 }];
    assert.equal(validateWeeklyCalorieRecords(missingNet), null);
  });

  it('rejects records with wrong data types', () => {
    const stringCalories = [{ day: 'Mon', date: 'Sept 7', caloriesBurned: '280', caloriesGained: 1850, netBalance: 1570 }];
    assert.equal(validateWeeklyCalorieRecords(stringCalories), null);

    const nullDate = [{ day: 'Mon', date: null, caloriesBurned: 280, caloriesGained: 1850, netBalance: 1570 }];
    assert.equal(validateWeeklyCalorieRecords(nullDate), null);
  });
});

describe('Pure Logic: Workout Hydration State Machine Simulation', () => {
  it('prevents unhydrated state from clobbering existing LocalStorage data', () => {
    const storage = new MockLocalStorage();
    const existingUserData = JSON.stringify({ completedReps: 45, currentExercise: 'pushups' });
    storage.setItem(STORAGE_KEY_WORKOUT, existingUserData);

    // Simulation of React Component lifecycle:
    let isHydrated = false;
    let state = { completedReps: 0, currentExercise: 'squats' }; // Default unhydrated state

    // Synchronous write attempt before mount/hydration
    const persistEffect = () => {
      if (!isHydrated) return; // Hydration Guard
      storage.setItem(STORAGE_KEY_WORKOUT, JSON.stringify(state));
    };

    persistEffect();
    assert.equal(
      storage.getItem(STORAGE_KEY_WORKOUT),
      existingUserData,
      'Existing storage must NOT be overwritten before hydration completes'
    );

    // Mount hydration completes
    const saved = storage.getItem(STORAGE_KEY_WORKOUT);
    if (saved) {
      state = JSON.parse(saved);
    }
    isHydrated = true;

    // After hydration, user performs a workout rep
    state.completedReps += 1;
    persistEffect();

    assert.equal(
      JSON.parse(storage.getItem(STORAGE_KEY_WORKOUT)!).completedReps,
      46,
      'Subsequent state updates must persist accurately'
    );
  });

  it('falls back safely to initial seeds when LocalStorage contains corrupted JSON', () => {
    const storage = new MockLocalStorage();
    storage.setItem(STORAGE_KEY_CALORIES_WEEK, 'corrupted{bad::json');

    const defaultSeed: DailyCalorieRecord[] = [
      { day: 'Mon', date: 'Sept 7', caloriesBurned: 280, caloriesGained: 1850, netBalance: 1570 }
    ];

    let activeRecords = defaultSeed;
    const raw = storage.getItem(STORAGE_KEY_CALORIES_WEEK);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const valid = validateWeeklyCalorieRecords(parsed);
        if (valid) {
          activeRecords = valid;
        }
      } catch {
        // Fallback to defaultSeed
      }
    }

    assert.deepEqual(activeRecords, defaultSeed, 'Should fall back safely on corrupted JSON');
  });
});
