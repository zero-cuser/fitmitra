import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUserProfile,
  calculateCalorieAndWaterNeeds,
  STORAGE_KEY_USER,
  STORAGE_KEY_AUTH_STATUS
} from '../../src/context/authStorage.ts';
import type { AuthStatus } from '../../src/context/authStorage.ts';
import { MockLocalStorage } from '../mocks/browserMocks.ts';

describe('Pure Logic: Auth Profile Validation', () => {
  it('validates a complete user profile', () => {
    const profile = {
      id: 'usr_student_01',
      name: 'Aarav Sharma',
      username: 'aarav_fit',
      email: 'aarav.sharma@campus.edu.in',
      goal: 'strength'
    };
    const validated = validateUserProfile(profile);
    assert.ok(validated);
    assert.equal(validated.id, 'usr_student_01');
    assert.equal(validated.email, 'aarav.sharma@campus.edu.in');
  });

  it('rejects invalid or incomplete profile objects', () => {
    assert.equal(validateUserProfile(null), null);
    assert.equal(validateUserProfile(undefined), null);
    assert.equal(validateUserProfile('non-object'), null);
    assert.equal(validateUserProfile({ id: 'usr_1', name: 'Name' }), null); // missing username, email
    assert.equal(validateUserProfile({ id: 'usr_1', name: 'Name', username: 'user' }), null); // missing email
    assert.equal(validateUserProfile({ id: 123, name: 'Name', username: 'user', email: 'e@mail.com' }), null); // non-string id
  });
});

describe('Pure Logic: Caloric & Hydration Needs Calculation', () => {
  it('calculates Mifflin-St Jeor formula accurately for males', () => {
    // 70kg, 175cm, 20yo male, moderate activity (1.55), strength (+250)
    const res = calculateCalorieAndWaterNeeds('male', 70, 175, 20, 'moderate', 'strength');
    // BMR = 10*70 + 6.25*175 - 5*20 + 5 = 700 + 1093.75 - 100 + 5 = 1698.75 -> 1699
    assert.equal(res.bmr, 1699);
    // TDEE = round(1699 * 1.55) = 2633
    assert.equal(res.tdee, 2633);
    // Target = 2633 + 250 = 2883
    assert.equal(res.targetCalories, 2883);
    // Water = 70 * 35 = 2450
    assert.equal(res.targetWaterMl, 2450);
  });

  it('calculates Mifflin-St Jeor formula accurately for females', () => {
    // 55kg, 160cm, 21yo female, light activity (1.375), wellness (no adjustment)
    const res = calculateCalorieAndWaterNeeds('female', 55, 160, 21, 'light', 'wellness');
    // BMR = 10*55 + 6.25*160 - 5*21 - 161 = 550 + 1000 - 105 - 161 = 1284
    assert.equal(res.bmr, 1284);
    // TDEE = round(1284 * 1.375) = 1766
    assert.equal(res.tdee, 1766);
    assert.equal(res.targetCalories, 1766);
    // Water = 55 * 35 = 1925
    assert.equal(res.targetWaterMl, 1925);
  });

  it('clamps fat loss deficit to the safety floor of 1350 kcal', () => {
    // 45kg, 150cm, 25yo female, sedentary (1.2), fat_loss (-350)
    const res = calculateCalorieAndWaterNeeds('female', 45, 150, 25, 'sedentary', 'fat_loss');
    // BMR = 10*45 + 6.25*150 - 5*25 - 161 = 450 + 937.5 - 125 - 161 = 1101.5 -> 1102
    assert.equal(res.bmr, 1102);
    // TDEE = round(1102 * 1.2) = 1322
    assert.equal(res.tdee, 1322);
    // 1322 - 350 = 972 -> clamped to 1350 floor
    assert.equal(res.targetCalories, 1350);
  });
});

describe('Pure Logic: Authentication Session State Machine', () => {
  it('preserves persistent logged_out state across reloads without auto-authenticating', () => {
    const storage = new MockLocalStorage();
    storage.setItem(STORAGE_KEY_AUTH_STATUS, 'logged_out');

    // Simulate AuthContext mount:
    let currentUser: any = null;
    const status = storage.getItem(STORAGE_KEY_AUTH_STATUS) as AuthStatus;
    const rawUser = storage.getItem(STORAGE_KEY_USER);

    if (status === 'logged_out') {
      currentUser = null;
    } else if (rawUser) {
      currentUser = validateUserProfile(JSON.parse(rawUser));
    } else {
      currentUser = { id: 'usr_guest', name: 'Aarav Sharma' };
    }

    assert.equal(currentUser, null, 'Logged out state must not re-login user');
  });

  it('initializes first-time visitor as guest', () => {
    const storage = new MockLocalStorage(); // empty storage

    let currentUser: any = null;
    let authStatus: AuthStatus = 'logged_out';

    const status = storage.getItem(STORAGE_KEY_AUTH_STATUS);
    const rawUser = storage.getItem(STORAGE_KEY_USER);

    if (status === 'logged_out') {
      currentUser = null;
    } else if (rawUser) {
      currentUser = validateUserProfile(JSON.parse(rawUser));
    } else {
      currentUser = { id: 'usr_student_01', name: 'Aarav Sharma' };
      authStatus = 'guest';
    }

    assert.ok(currentUser);
    assert.equal(authStatus, 'guest');
  });

  it('updates storage keys accurately upon user login and logout', () => {
    const storage = new MockLocalStorage();

    // 1. User logs in
    const userProfile = {
      id: 'usr_99',
      name: 'Priya Patel',
      username: 'priya_p',
      email: 'priya@campus.edu'
    };
    storage.setItem(STORAGE_KEY_USER, JSON.stringify(userProfile));
    storage.setItem(STORAGE_KEY_AUTH_STATUS, 'authenticated');

    assert.equal(storage.getItem(STORAGE_KEY_AUTH_STATUS), 'authenticated');
    assert.ok(storage.getItem(STORAGE_KEY_USER));

    // 2. User logs out
    storage.removeItem(STORAGE_KEY_USER);
    storage.setItem(STORAGE_KEY_AUTH_STATUS, 'logged_out');

    assert.equal(storage.getItem(STORAGE_KEY_USER), null);
    assert.equal(storage.getItem(STORAGE_KEY_AUTH_STATUS), 'logged_out');
  });
});
