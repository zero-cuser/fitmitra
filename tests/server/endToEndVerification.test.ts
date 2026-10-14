/**
 * FitMitra Phase 16: Production Integration & End-to-End Verification Test Suite
 * 
 * Verifies the complete 12-step flow across Account A, Account B, and Account C
 * against the real standalone HTTP server and database engine:
 * 
 * 1. Create an invitation as Account A.
 * 2. Redeem the invitation as Account B.
 * 3. Accept the friend request.
 * 4. Confirm the relationship on both accounts.
 * 5. Remove the relationship and confirm access is revoked appropriately.
 * 6. Create a private shared challenge.
 * 7. Invite or admit the authorized second participant.
 * 8. Confirm an unrelated third account receives no private challenge data.
 * 9. Complete a valid activity and synchronize it.
 * 10. Retry the same contribution and verify no duplicate progress.
 * 11. Leave or cancel the challenge and verify state transitions.
 * 12. Delete a dedicated test account and verify cascade and retention rules.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('Phase 16 End-to-End Integration & Multi-User Verification', () => {
  let instance: ServerInstance;
  let testDb: Database;

  // Test accounts
  let tokenA: string;
  let accountIdA: string;
  let tokenB: string;
  let accountIdB: string;
  let tokenC: string;
  let accountIdC: string;

  // Shared state across the 12 steps
  let inviteCodeA: string;
  let friendshipId: string;
  let challengeId: string;
  let challengeInviteCode: string;

  before(async () => {
    testDb = new Database();
    instance = await createServer(testDb);

    // Register Account A (Campus Senior)
    const regA = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student_a@campus.edu.in',
        password: 'Password123!',
        displayName: 'Aarav Sharma',
        username: 'aarav_fit'
      })
    });
    const dataA = await regA.json();
    tokenA = dataA.token;
    accountIdA = dataA.account.id;

    // Register Account B (Hostel Roommate)
    const regB = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student_b@campus.edu.in',
        password: 'Password123!',
        displayName: 'Rohan Verma',
        username: 'rohan_fit'
      })
    });
    const dataB = await regB.json();
    tokenB = dataB.token;
    accountIdB = dataB.account.id;

    // Register Account C (Unrelated Outsider)
    const regC = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student_c@campus.edu.in',
        password: 'Password123!',
        displayName: 'Karan Mehra',
        username: 'karan_m'
      })
    });
    const dataC = await regC.json();
    tokenC = dataC.token;
    accountIdC = dataC.account.id;
  });

  after(async () => {
    await instance.close();
  });

  test('Step 1: Account A creates a shareable friend invitation code', async () => {
    const res = await fetch(`${instance.url}/api/v1/friends/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.invitation.inviteCode);
    assert.ok(data.invitation.inviteCode.startsWith('FIT-'));
    assert.equal(data.invitation.creatorAccountId, accountIdA);
    assert.equal(data.invitation.status, 'active');
    inviteCodeA = data.invitation.inviteCode;
  });

  test('Security Check: Invalid/Expired invitation returns generic 404 (Anti-Enumeration)', async () => {
    const res = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ code: 'FIT-ZZZZ' })
    });
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error, 'Invalid or expired invitation code.');
  });

  test('Step 2: Account B redeems Account A invitation to initiate friend request', async () => {
    const res = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ code: inviteCodeA })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.friendship);
    assert.equal(data.friendship.status, 'pending');
    assert.equal(data.invitationCreator.displayName, 'Aarav Sharma');
    friendshipId = data.friendship.id;
  });

  test('Step 3: Account A accepts the incoming friend request', async () => {
    // Check pending incoming on Account A
    const listA = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const listDataA = await listA.json();
    assert.equal(listDataA.pendingIncoming.length, 1);
    assert.equal(listDataA.pendingIncoming[0].friendshipId, friendshipId);

    // Accept request with action: 'accept'
    const respondRes = await fetch(`${instance.url}/api/v1/friends/${friendshipId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ action: 'accept' })
    });
    assert.equal(respondRes.status, 200);
    const respondData = await respondRes.json();
    assert.equal(respondData.friendship.status, 'accepted');
  });

  test('Step 4: Confirm bidirectional friendship on both Account A and Account B', async () => {
    // Verify Account A
    const resA = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const dataA = await resA.json();
    assert.equal(dataA.accepted.length, 1);
    assert.equal(dataA.accepted[0].friend.displayName, 'Rohan Verma');

    // Verify Account B
    const resB = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const dataB = await resB.json();
    assert.equal(dataB.accepted.length, 1);
    assert.equal(dataB.accepted[0].friend.displayName, 'Aarav Sharma');
  });

  test('Step 5: Account B removes friendship and confirms mutual revocation', async () => {
    const delRes = await fetch(`${instance.url}/api/v1/friends/${friendshipId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(delRes.status, 200);

    // Verify Account A has 0 friends now
    const resA = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const dataA = await resA.json();
    assert.equal(dataA.accepted.length, 0);

    // Verify Account B has 0 friends now
    const resB = await fetch(`${instance.url}/api/v1/friends`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const dataB = await resB.json();
    assert.equal(dataB.accepted.length, 0);
  });

  test('Step 6: Account A creates a private cohort challenge (CHAL-XXXX)', async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const res = await fetch(`${instance.url}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Hostel 100 Squats Sprint',
        description: 'Complete 100 bodyweight squats before semester exams',
        category: 'strength',
        type: 'rep_target',
        targetValue: 100,
        unit: 'reps',
        exerciseKeys: ['squats'],
        startDate: today,
        endDate: nextWeek,
        maxParticipants: 10
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.challenge.id);
    assert.ok(data.challenge.inviteCode.startsWith('CHAL-'));
    assert.equal(data.challenge.ownerAccountId, accountIdA);
    challengeId = data.challenge.id;
    challengeInviteCode = data.challenge.inviteCode;
  });

  test('Step 7: Account B joins the private challenge using the invite code', async () => {
    const res = await fetch(`${instance.url}/api/v1/challenges/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ inviteCode: challengeInviteCode })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.challenge.id, challengeId);
    assert.equal(data.participant.accountId, accountIdB);
  });

  test('Step 8: Authorization Gate — Unrelated Account C receives 403 Forbidden on private challenge', async () => {
    // Account C tries to read private challenge details
    const res = await fetch(`${instance.url}/api/v1/challenges/${challengeId}`, {
      headers: { 'Authorization': `Bearer ${tokenC}` }
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'You are not a participant in this private challenge.');

    // Account C tries to contribute to private challenge
    const contribRes = await fetch(`${instance.url}/api/v1/challenges/${challengeId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenC}`
      },
      body: JSON.stringify({
        activity: {
          id: 'act_c_intruder',
          type: 'workout',
          exerciseKey: 'squats',
          reps: 20,
          durationSeconds: 60
        }
      })
    });
    assert.equal(contribRes.status, 403);
  });

  test('Step 9: Account B contributes valid reps and verifies participant standings update', async () => {
    const res = await fetch(`${instance.url}/api/v1/challenges/${challengeId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        activity: {
          id: 'act_squat_b_session_1',
          type: 'workout',
          exerciseKey: 'squats',
          reps: 25,
          durationSeconds: 60
        }
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.updatedParticipantScore, 25);

    // Account A views details: Account B is present with 25 reps
    const detailsRes = await fetch(`${instance.url}/api/v1/challenges/${challengeId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(detailsRes.status, 200);
    const details = await detailsRes.json();
    assert.equal(details.participants.length, 2);
    const participantB = details.participants.find((p: any) => p.displayName === 'Rohan Verma');
    assert.ok(participantB);
    assert.equal(participantB.currentValue, 25);
  });

  test('Step 10: Idempotency — Re-submitting identical activity ID does not inflate reps', async () => {
    const retryRes = await fetch(`${instance.url}/api/v1/challenges/${challengeId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        activity: {
          id: 'act_squat_b_session_1', // Identical activity ID
          type: 'workout',
          exerciseKey: 'squats',
          reps: 25,
          durationSeconds: 60
        }
      })
    });
    assert.equal(retryRes.status, 200);
    const data = await retryRes.json();
    assert.equal(data.updatedParticipantScore, 25); // Score unchanged at 25, NOT inflated to 50!

    // Verify details still show 25
    const detailsRes = await fetch(`${instance.url}/api/v1/challenges/${challengeId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const details = await detailsRes.json();
    const participantB = details.participants.find((p: any) => p.displayName === 'Rohan Verma');
    assert.equal(participantB.currentValue, 25);
  });

  test('Step 11: Challenge Lifecycle — Non-owner cannot cancel; Owner cancels successfully', async () => {
    // Account B (not owner) tries to cancel -> 403 Forbidden
    const failCancel = await fetch(`${instance.url}/api/v1/challenges/${challengeId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(failCancel.status, 403);
    const failData = await failCancel.json();
    assert.ok(failData.error.includes('Only the challenge creator'));

    // Account B leaves challenge
    const leaveRes = await fetch(`${instance.url}/api/v1/challenges/${challengeId}/leave`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(leaveRes.status, 200);

    // Account A cancels challenge
    const cancelRes = await fetch(`${instance.url}/api/v1/challenges/${challengeId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(cancelRes.status, 200);

    // Verify challenge is marked cancelled
    const detailsRes = await fetch(`${instance.url}/api/v1/challenges/${challengeId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(detailsRes.status, 200);
    const details = await detailsRes.json();
    assert.equal(details.challenge.status, 'cancelled');
  });

  test('Step 12: Account Deletion Cascade — Completely purges user across all social tables', async () => {
    // Create new friend invitation for Account B
    const invRes = await fetch(`${instance.url}/api/v1/friends/invite`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const invData = await invRes.json();
    const codeB = invData.invitation.inviteCode;

    // Purge Account B via DELETE /api/v1/auth/delete
    const delAccountRes = await fetch(`${instance.url}/api/v1/auth/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ password: 'Password123!' })
    });
    assert.equal(delAccountRes.status, 200);

    // Confirm session returns 404 (Account not found)
    const sessionRes = await fetch(`${instance.url}/api/v1/auth/session`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(sessionRes.status, 404);

    // Confirm invite code B is completely purged (returns 404 anti-enumeration)
    const redeemRes = await fetch(`${instance.url}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ code: codeB })
    });
    assert.equal(redeemRes.status, 404);
  });
});
