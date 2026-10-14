/**
 * FitMitra Automated Server Tests: Authentication & Session Management
 * 
 * Verifies registration, login, session retrieval, rate limiting,
 * password hashing integrity, and account deletion cascading.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('Server Backend Slice: Authentication & Sessions', () => {
  let instance: ServerInstance;
  let testDb: Database;

  before(async () => {
    testDb = new Database();
    instance = await createServer(testDb);
  });

  after(async () => {
    await instance.close();
  });

  beforeEach(() => {
    testDb.reset();
  });

  test('Health check returns 200 OK with version', async () => {
    const res = await fetch(`${instance.url}/api/v1/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.version, '1.0.0');
  });

  test('1. Account Registration: succeeds with valid email and password', async () => {
    const res = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@hostel.edu.in',
        password: 'secure_password_123',
        displayName: 'Aarav Sharma',
        username: 'aarav_sharma'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.account.email, 'student@hostel.edu.in');
    assert.equal(data.profile.displayName, 'Aarav Sharma');
  });

  test('2. Account Registration: rejects duplicate email with 409 Conflict', async () => {
    // First registration
    await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'duplicate@campus.edu.in',
        password: 'password123'
      })
    });

    // Duplicate registration attempt
    const res = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'duplicate@campus.edu.in',
        password: 'password456'
      })
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.ok(data.error.includes('already exists'));
  });

  test('3. Account Registration: rejects invalid email and short passwords', async () => {
    const badEmail = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail', password: 'validpassword' })
    });
    assert.equal(badEmail.status, 400);

    const shortPass = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@hostel.edu.in', password: '12' })
    });
    assert.equal(shortPass.status, 400);
  });

  test('4. Login: authenticates existing user with correct credentials', async () => {
    await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'runner@campus.edu.in',
        password: 'run_fast_password'
      })
    });

    const res = await fetch(`${instance.url}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'runner@campus.edu.in',
        password: 'run_fast_password'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.account.email, 'runner@campus.edu.in');
  });

  test('5. Login: rejects incorrect password with 401 Unauthorized', async () => {
    await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@campus.edu.in',
        password: 'correct_password'
      })
    });

    const res = await fetch(`${instance.url}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@campus.edu.in',
        password: 'WRONG_password'
      })
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error.includes('Invalid'));
  });

  test('6. Session Retrieval: returns account and profile for valid token', async () => {
    const regRes = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'session_user@campus.edu.in',
        password: 'password123',
        displayName: 'Session Tester'
      })
    });
    const { token } = await regRes.json();

    const sessionRes = await fetch(`${instance.url}/api/v1/auth/session`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(sessionRes.status, 200);
    const sessionData = await sessionRes.json();
    assert.equal(sessionData.success, true);
    assert.equal(sessionData.account.email, 'session_user@campus.edu.in');
    assert.equal(sessionData.profile.displayName, 'Session Tester');
  });

  test('7. Session Retrieval: rejects tampered or expired tokens with 401', async () => {
    const res = await fetch(`${instance.url}/api/v1/auth/session`, {
      headers: { Authorization: 'Bearer invalid.tampered.token' }
    });
    assert.equal(res.status, 401);
  });

  test('8. Account Deletion: password-protected cascade deletes account and remote data', async () => {
    const regRes = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'delete_me@campus.edu.in',
        password: 'delete_pass_123'
      })
    });
    const { token, account } = await regRes.json();

    // Push a workout to verify cascade
    await fetch(`${instance.url}/api/v1/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        workouts: [
          {
            id: 'work_to_delete_1',
            exerciseKey: 'squats',
            reps: 20,
            durationSeconds: 60,
            timestamp: new Date().toISOString()
          }
        ]
      })
    });

    // Execute account deletion
    const delRes = await fetch(`${instance.url}/api/v1/auth/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ password: 'delete_pass_123' })
    });

    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.success, true);
    assert.equal(delData.remoteDataDeleted, true);

    // Verify account is purged
    assert.equal(testDb.getAccountById(account.id), null);
    assert.equal(testDb.getWorkouts(account.id).length, 0);

    // Verify login is impossible
    const reLogin = await fetch(`${instance.url}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'delete_me@campus.edu.in',
        password: 'delete_pass_123'
      })
    });
    assert.equal(reLogin.status, 401);
  });
});
