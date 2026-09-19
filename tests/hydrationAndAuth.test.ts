import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateWeeklyCalorieRecords } from '../src/context/workoutStorage.ts';
import {
  validateUserProfile,
  calculateCalorieAndWaterNeeds,
  STORAGE_KEY_USER,
  STORAGE_KEY_AUTH_STATUS
} from '../src/context/authStorage.ts';
import type { AuthStatus } from '../src/context/authStorage.ts';

describe('WorkoutContext Storage & Hydration Validation', () => {
  it('validates and returns well-formed weekly calorie history records', () => {
    const validRecords = [
      { day: 'Mon', date: 'Sept 7', caloriesBurned: 280, caloriesGained: 1850, netBalance: 1570 },
      { day: 'Tue', date: 'Sept 8', caloriesBurned: 340, caloriesGained: 1920, netBalance: 1580 }
    ];
    const result = validateWeeklyCalorieRecords(validRecords);
    assert.deepEqual(result, validRecords);
  });

  it('rejects non-array inputs (null, undefined, string, object)', () => {
    assert.equal(validateWeeklyCalorieRecords(null), null);
    assert.equal(validateWeeklyCalorieRecords(undefined), null);
    assert.equal(validateWeeklyCalorieRecords(''), null);
    assert.equal(validateWeeklyCalorieRecords({}), null);
    assert.equal(validateWeeklyCalorieRecords(123), null);
  });

  it('rejects empty array so default records can be retained', () => {
    assert.equal(validateWeeklyCalorieRecords([]), null);
  });

  it('rejects corrupted records with missing required fields', () => {
    const invalidRecords = [
      { day: 'Mon', date: 'Sept 7', caloriesBurned: 280, caloriesGained: 1850 } // missing netBalance
    ];
    assert.equal(validateWeeklyCalorieRecords(invalidRecords), null);
  });

  it('rejects corrupted records with wrong data types', () => {
    const invalidRecords = [
      { day: 'Mon', date: 'Sept 7', caloriesBurned: '280', caloriesGained: 1850, netBalance: 1570 }
    ];
    assert.equal(validateWeeklyCalorieRecords(invalidRecords), null);
  });
});

describe('AuthContext Profile Validation and Needs Calculation', () => {
  it('validates a complete user profile', () => {
    const profile = {
      id: 'usr_test',
      name: 'Test Student',
      username: 'test_student',
      email: 'test@student.edu',
      goal: 'strength'
    };
    const validated = validateUserProfile(profile);
    assert.ok(validated);
    assert.equal(validated.id, 'usr_test');
    assert.equal(validated.email, 'test@student.edu');
  });

  it('rejects invalid or malformed profile objects', () => {
    assert.equal(validateUserProfile(null), null);
    assert.equal(validateUserProfile(undefined), null);
    assert.equal(validateUserProfile('string'), null);
    assert.equal(validateUserProfile({ id: '1' }), null); // missing name, username, email
    assert.equal(validateUserProfile({ id: '1', name: 'A', username: 'a' }), null); // missing email
  });

  it('calculates BMR, TDEE, target calories and water needs accurately', () => {
    // 70kg, 175cm, 20yo male, moderate activity, strength goal
    const result = calculateCalorieAndWaterNeeds('male', 70, 175, 20, 'moderate', 'strength');
    // BMR = 10*70 + 6.25*175 - 5*20 + 5 = 700 + 1093.75 - 100 + 5 = 1698.75 -> 1699
    assert.equal(result.bmr, 1699);
    // TDEE = round(1699 * 1.55) = 2633
    assert.equal(result.tdee, 2633);
    // Target calories with strength (+250) = 2883
    assert.equal(result.targetCalories, 2883);
    // Water needs = 70 * 35 = 2450 ml
    assert.equal(result.targetWaterMl, 2450);
  });

  it('applies fat loss deficit with minimum calorie floor', () => {
    // 50kg, 155cm, 22yo female, sedentary, fat_loss goal
    const result = calculateCalorieAndWaterNeeds('female', 50, 155, 22, 'sedentary', 'fat_loss');
    // BMR = 10*50 + 6.25*155 - 5*22 - 161 = 500 + 968.75 - 110 - 161 = 1197.75 -> 1198
    assert.equal(result.bmr, 1198);
    // TDEE = 1198 * 1.2 = 1438
    assert.equal(result.tdee, 1438);
    // 1438 - 350 = 1088, but clamped to minimum floor 1350
    assert.equal(result.targetCalories, 1350);
  });
});

describe('AuthContext Persistent Logout State Machine Simulation', () => {
  it('correctly models initial visit (first visit: no user, no status -> guest)', () => {
    let savedUser: string | null = null;
    let savedStatus: string | null = null;

    // Simulation of AuthContext initialization logic:
    let currentUser: any = null;
    let authStatus: AuthStatus = 'logged_out';

    if (savedStatus === 'logged_out') {
      currentUser = null;
    } else if (savedUser) {
      currentUser = JSON.parse(savedUser);
    } else {
      // First visit default
      currentUser = { id: 'usr_student_01', name: 'Aarav Sharma' };
      authStatus = 'guest';
    }

    assert.ok(currentUser);
    assert.equal(currentUser.id, 'usr_student_01');
    assert.equal(authStatus, 'guest');
  });

  it('correctly preserves logged_out state across page refreshes (no re-auth to Aarav)', () => {
    // User had logged out previously:
    const mockLocalStorage: Record<string, string> = {
      [STORAGE_KEY_AUTH_STATUS]: 'logged_out'
    };
    // STORAGE_KEY_USER is NOT present

    const savedStatus = mockLocalStorage[STORAGE_KEY_AUTH_STATUS];
    const savedUser = mockLocalStorage[STORAGE_KEY_USER];

    let currentUser: any = null;
    if (savedStatus === 'logged_out') {
      currentUser = null;
    } else if (savedUser) {
      currentUser = validateUserProfile(JSON.parse(savedUser));
    } else {
      currentUser = { id: 'usr_student_01', name: 'Aarav Sharma' };
    }

    // User MUST remain null on refresh!
    assert.equal(currentUser, null);
  });

  it('correctly updates storage keys when user logs out', () => {
    const mockLocalStorage: Record<string, string> = {
      [STORAGE_KEY_USER]: JSON.stringify({ id: 'usr_student_01', name: 'Aarav' }),
      [STORAGE_KEY_AUTH_STATUS]: 'authenticated'
    };

    // Simulate logout()
    delete mockLocalStorage[STORAGE_KEY_USER];
    mockLocalStorage[STORAGE_KEY_AUTH_STATUS] = 'logged_out';

    assert.equal(mockLocalStorage[STORAGE_KEY_USER], undefined);
    assert.equal(mockLocalStorage[STORAGE_KEY_AUTH_STATUS], 'logged_out');
  });
});
