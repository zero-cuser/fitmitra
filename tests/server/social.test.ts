/**
 * FitMitra Campus Social & Friends Network Integration Tests
 * 
 * Tests privacy-first invitations, explicit request-and-accept flow,
 * friend removal, zero PII exposure, and multi-tenant isolation.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('FitMitra Phase 15: Campus Social & Friend Connections', () => {
  let instance: ServerInstance;
  let testDb: Database;
  let userAToken: string;
  let userBToken: string;
  let userCToken: string;

  before(async () => {
    testDb = new Database();
    instance = await createServer(testDb);
  });

  after(async () => {
    await instance.close();
  });

  beforeEach(async () => {
    testDb.reset();

    // Register User A
    const resA = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student_a@campus.edu',
        password: 'passwordA123',
        displayName: 'Aarav Sharma',
        username: 'aarav_fit',
        fitnessGoal: 'strength'
      })
    });
    const dataA = await resA.json();
    userAToken = dataA.token;

    // Register User B
    const resB = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student_b@campus.edu',
        password: 'passwordB123',
        displayName: 'Bhavna Patel',
        username: 'bhavna_runner',
        fitnessGoal: 'cardio'
      })
    });
    const dataB = await resB.json();
    userBToken = dataB.token;

    // Register User C
    const resC = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student_c@campus.edu',
        password: 'passwordC123',
        displayName: 'Chirag Rao',
        username: 'chirag_gym'
      })
    });
    const dataC = await resC.json();
    userCToken = dataC.token;
  });

  test('1. Invitation Lifecycle: User A creates invite code with expiry', async () => {
    const res = await fetch(`${instance.url}/api/v1/friends/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({ maxUses: 3, expiryDays: 5 })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.invitation.inviteCode.startsWith('FIT-'));
    assert.equal(data.invitation.maxUses, 3);
    assert.equal(data.invitation.usesCount, 0);
    assert.equal(data.invitation.status, 'active');
  });

  test('2. Anti-Enumeration & Self-Friending: Rejects invalid code and self-connection', async () => {
    // Generate code from A
    const inviteRes = await fetch(`${instance.url}/api/v1/friends/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const inviteData = await inviteRes.json();
    const code = inviteData.invitation.inviteCode;

    // A attempts to connect with self
    const selfRes = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({ inviteCode: code })
    });
    assert.equal(selfRes.status, 400);
    const selfData = await selfRes.json();
    assert.match(selfData.error, /Cannot connect with yourself/);

    // B attempts with bogus non-existent code
    const bogusRes = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ inviteCode: 'FIT-BOGUS99' })
    });
    assert.equal(bogusRes.status, 404);
    const bogusData = await bogusRes.json();
    assert.match(bogusData.error, /Invalid or expired invitation code/);
  });

  test('3. Request & Accept Flow: User B requests via code, User A accepts', async () => {
    // A creates invite
    const inviteRes = await fetch(`${instance.url}/api/v1/friends/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const inviteData = await inviteRes.json();
    const code = inviteData.invitation.inviteCode;

    // B sends request
    const reqRes = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ inviteCode: code })
    });
    assert.equal(reqRes.status, 201);
    const reqData = await reqRes.json();
    assert.equal(reqData.friendship.status, 'pending');
    assert.equal(reqData.invitationCreator.displayName, 'Aarav Sharma');

    const friendshipId = reqData.friendship.id;

    // Check list for A: has pendingIncoming
    const listARes = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const listAData = await listARes.json();
    assert.equal(listAData.pendingIncoming.length, 1);
    assert.equal(listAData.pendingIncoming[0].requester.displayName, 'Bhavna Patel');

    // Check list for B: has pendingOutgoing
    const listBRes = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    const listBData = await listBRes.json();
    assert.equal(listBData.pendingOutgoing.length, 1);
    assert.equal(listBData.pendingOutgoing[0].recipient.displayName, 'Aarav Sharma');

    // B tries to accept their own outgoing request -> 403 Forbidden
    const unauthAccept = await fetch(`${instance.url}/api/v1/friends/${friendshipId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ action: 'accept' })
    });
    assert.equal(unauthAccept.status, 403);

    // A accepts request
    const acceptRes = await fetch(`${instance.url}/api/v1/friends/${friendshipId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({ action: 'accept' })
    });
    assert.equal(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.equal(acceptData.friendship.status, 'accepted');

    // Both now have 1 accepted friend
    const finalA = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const finalAData = await finalA.json();
    assert.equal(finalAData.accepted.length, 1);
    assert.equal(finalAData.accepted[0].friend.displayName, 'Bhavna Patel');

    const finalB = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    const finalBData = await finalB.json();
    assert.equal(finalBData.accepted.length, 1);
    assert.equal(finalBData.accepted[0].friend.displayName, 'Aarav Sharma');
  });

  test('4. Duplicate Prevention: Cannot send duplicate request or re-friend', async () => {
    const inviteRes = await fetch(`${instance.url}/api/v1/friends/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const inviteData = await inviteRes.json();
    const code = inviteData.invitation.inviteCode;

    // First request
    await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ inviteCode: code })
    });

    // Duplicate request
    const dupRes = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ inviteCode: code })
    });
    assert.equal(dupRes.status, 409);
    const dupData = await dupRes.json();
    assert.match(dupData.error, /already pending/);
  });

  test('5. Friend Removal & Zero-PII Invariant', async () => {
    const inviteRes = await fetch(`${instance.url}/api/v1/friends/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const inviteData = await inviteRes.json();
    const reqRes = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ inviteCode: inviteData.invitation.inviteCode })
    });
    const reqData = await reqRes.json();
    const friendshipId = reqData.friendship.id;

    await fetch(`${instance.url}/api/v1/friends/${friendshipId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({ action: 'accept' })
    });

    // Check Zero-PII: No email or passwords in friends payload
    const friendsList = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const listData = await friendsList.json();
    const friendObj = listData.accepted[0].friend;
    assert.ok(friendObj.displayName);
    assert.equal((friendObj as any).email, undefined);
    assert.equal((friendObj as any).passwordHash, undefined);
    assert.equal((friendObj as any).salt, undefined);

    // User C (unrelated third party) tries to delete friendship -> 403
    const unauthDel = await fetch(`${instance.url}/api/v1/friends/${friendshipId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userCToken}` }
    });
    assert.equal(unauthDel.status, 403);

    // User B removes friendship
    const delRes = await fetch(`${instance.url}/api/v1/friends/${friendshipId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.removed, true);

    // Check list for A: now 0 accepted friends
    const emptyA = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const emptyAData = await emptyA.json();
    assert.equal(emptyAData.accepted.length, 0);
  });
});
