/**
 * FitMitra Social Isolation & Deletion Cascades Tests
 * 
 * Verifies that account deletion permanently purges friend relationships,
 * invitations, and challenge data, and verifies cross-tenant authorization boundaries.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('FitMitra Phase 15: Social Isolation & Cascading Deletions', () => {
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

  test('1. Account Deletion: Purges user friend relationships, invitations, and cancels challenges', async () => {
    // 1. Register User A
    const resA = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'deleting_user@campus.edu',
        password: 'securePassword123',
        displayName: 'Samir Khan',
        username: 'samir_k'
      })
    });
    const dataA = await resA.json();
    const tokenA = dataA.token;

    // 2. Register User B
    const resB = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'remaining_user@campus.edu',
        password: 'securePassword456',
        displayName: 'Rohan Mehta',
        username: 'rohan_m'
      })
    });
    const dataB = await resB.json();
    const tokenB = dataB.token;

    // 3. User A creates invitation
    const inviteRes = await fetch(`${instance.url}/api/v1/friends/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const inviteData = await inviteRes.json();
    const inviteCode = inviteData.invitation.inviteCode;

    // 4. User B connects and A accepts
    const reqRes = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ inviteCode })
    });
    const reqData = await reqRes.json();
    const friendshipId = reqData.friendship.id;

    await fetch(`${instance.url}/api/v1/friends/${friendshipId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ action: 'accept' })
    });

    // 5. User A creates a shared challenge and B joins
    const chalRes = await fetch(`${instance.url}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Samir Dorm Sprint',
        targetValue: 50,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
      })
    });
    const chalData = await chalRes.json();
    const chalId = chalData.challenge.id;
    const chalCode = chalData.challenge.inviteCode;

    await fetch(`${instance.url}/api/v1/challenges/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ inviteCode: chalCode })
    });

    // Verify User B sees 1 friend
    const friendsBBefore = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const friendsBData = await friendsBBefore.json();
    assert.equal(friendsBData.accepted.length, 1);

    // 6. User A requests ACCOUNT DELETION
    const delRes = await fetch(`${instance.url}/api/v1/auth/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ password: 'securePassword123' })
    });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.remoteDataDeleted, true);

    // 7. Verify User B no longer has User A in friends list!
    const friendsBAfter = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const friendsBAfterData = await friendsBAfter.json();
    assert.equal(friendsBAfterData.accepted.length, 0);

    // 8. Verify the challenge created by User A is marked cancelled
    const chalDetails = await fetch(`${instance.url}/api/v1/challenges/${chalId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const chalDetailsData = await chalDetails.json();
    assert.equal(chalDetailsData.challenge.status, 'cancelled');

    // 9. Verify invite code created by User A is completely invalid
    const attemptInvite = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ inviteCode })
    });
    assert.equal(attemptInvite.status, 404);
  });

  test('2. Invitation Revocation Security: User B cannot revoke User A invite code', async () => {
    // User A creates code
    const resA = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user_a@campus.edu',
        password: 'password123',
        displayName: 'User A',
        username: 'user_a'
      })
    });
    const dataA = await resA.json();
    const tokenA = dataA.token;

    const resB = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user_b@campus.edu',
        password: 'password123',
        displayName: 'User B',
        username: 'user_b'
      })
    });
    const dataB = await resB.json();
    const tokenB = dataB.token;

    const inviteRes = await fetch(`${instance.url}/api/v1/friends/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const inviteData = await inviteRes.json();
    const code = inviteData.invitation.inviteCode;

    // User B attempts to revoke A's code -> 403 Forbidden
    const unauthRevoke = await fetch(`${instance.url}/api/v1/friends/invite/${code}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.equal(unauthRevoke.status, 403);
  });
});
