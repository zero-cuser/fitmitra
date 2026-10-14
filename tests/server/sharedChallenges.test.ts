/**
 * FitMitra Private Shared Campus Challenges Integration Tests
 * 
 * Verifies private challenge creation, join via invite code,
 * non-participant 403 authorization gates, server-side validated
 * contributions, idempotency against repeated submissions, and zero-egress guards.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type ServerInstance } from '../../src/server/server.ts';
import { Database } from '../../src/server/db.ts';

describe('FitMitra Phase 15: Private Shared Challenges', () => {
  let instance: ServerInstance;
  let testDb: Database;
  let userAToken: string;
  let userBToken: string;
  let userCToken: string;
  let todayStr: string;
  let nextWeekStr: string;

  before(async () => {
    testDb = new Database();
    instance = await createServer(testDb);
  });

  after(async () => {
    await instance.close();
  });

  beforeEach(async () => {
    testDb.reset();

    const now = new Date();
    todayStr = now.toISOString().split('T')[0];
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Register User A (Challenge Owner)
    const resA = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@campus.edu',
        password: 'password123',
        displayName: 'Dev Sharma',
        username: 'dev_hostel'
      })
    });
    const dataA = await resA.json();
    userAToken = dataA.token;

    // Register User B (Participant)
    const resB = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'participant@campus.edu',
        password: 'password123',
        displayName: 'Priya Verma',
        username: 'priya_v'
      })
    });
    const dataB = await resB.json();
    userBToken = dataB.token;

    // Register User C (Non-Participant)
    const resC = await fetch(`${instance.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'outsider@campus.edu',
        password: 'password123',
        displayName: 'Rohit Roy',
        username: 'rohit_r'
      })
    });
    const dataC = await resC.json();
    userCToken = dataC.token;
  });

  test('1. Challenge Creation: Validates fields, generates invite code, and enrolls owner', async () => {
    const createRes = await fetch(`${instance.url}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Wing-B 50 Squats Sprint',
        description: 'Morning squats challenge for dorm roommates.',
        category: 'strength',
        type: 'rep_target',
        targetValue: 50,
        unit: 'reps',
        exerciseKeys: ['squats'],
        startDate: todayStr,
        endDate: nextWeekStr,
        maxParticipants: 5
      })
    });

    assert.equal(createRes.status, 201);
    const data = await createRes.json();
    assert.equal(data.success, true);
    assert.ok(data.challenge.id);
    assert.ok(data.challenge.inviteCode.startsWith('CHAL-'));
    assert.equal(data.challenge.targetValue, 50);

    const chalId = data.challenge.id;

    // Owner should see this challenge in their list
    const listRes = await fetch(`${instance.url}/api/v1/challenges`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.challenges.length, 1);
    assert.equal(listData.challenges[0].id, chalId);
    assert.equal(listData.challenges[0].isOwner, true);
  });

  test('2. Join via Invite Code & Max Participant Enforcement', async () => {
    // Create challenge with max 2 participants
    const createRes = await fetch(`${instance.url}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: '2-Person Dorm Sprint',
        description: 'Only 2 people allowed.',
        category: 'strength',
        type: 'rep_target',
        targetValue: 30,
        startDate: todayStr,
        endDate: nextWeekStr,
        maxParticipants: 2
      })
    });
    const createData = await createRes.json();
    const code = createData.challenge.inviteCode;

    // User B joins
    const joinB = await fetch(`${instance.url}/api/v1/challenges/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ inviteCode: code })
    });
    assert.equal(joinB.status, 200);
    const joinBData = await joinB.json();
    assert.equal(joinBData.success, true);

    // User B attempts to join again -> 409 Conflict
    const reJoinB = await fetch(`${instance.url}/api/v1/challenges/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ inviteCode: code })
    });
    assert.equal(reJoinB.status, 409);
    const reJoinBData = await reJoinB.json();
    assert.match(reJoinBData.error, /already participating/);

    // User C attempts to join -> 400 Bad Request (Capacity Full)
    const joinC = await fetch(`${instance.url}/api/v1/challenges/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userCToken}`
      },
      body: JSON.stringify({ inviteCode: code })
    });
    assert.equal(joinC.status, 400);
    const joinCData = await joinC.json();
    assert.match(joinCData.error, /maximum participant capacity/);
  });

  test('3. Non-Participant Authorization Gate: Outsider cannot view challenge details', async () => {
    const createRes = await fetch(`${instance.url}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Secret Dorm Challenge',
        description: 'Private',
        targetValue: 40,
        startDate: todayStr,
        endDate: nextWeekStr
      })
    });
    const createData = await createRes.json();
    const chalId = createData.challenge.id;

    // Owner A can view details
    const viewA = await fetch(`${instance.url}/api/v1/challenges/${chalId}`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    assert.equal(viewA.status, 200);
    const viewAData = await viewA.json();
    assert.equal(viewAData.isOwner, true);

    // Outsider C attempts to view details -> 403 Forbidden
    const viewC = await fetch(`${instance.url}/api/v1/challenges/${chalId}`, {
      headers: { Authorization: `Bearer ${userCToken}` }
    });
    assert.equal(viewC.status, 403);
    const viewCData = await viewC.json();
    assert.match(viewCData.error, /not a participant in this private challenge/);
  });

  test('4. Server-Side Contribution Validation & Idempotency', async () => {
    const createRes = await fetch(`${instance.url}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: '100 Squats Dorm Cup',
        description: 'Only squats count',
        type: 'rep_target',
        targetValue: 100,
        exerciseKeys: ['squats'],
        startDate: todayStr,
        endDate: nextWeekStr
      })
    });
    const createData = await createRes.json();
    const chalId = createData.challenge.id;
    const code = createData.challenge.inviteCode;

    // User B joins
    await fetch(`${instance.url}/api/v1/challenges/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ inviteCode: code })
    });

    // 1. Submit invalid exercise (pushups when challenge requires squats) -> 400
    const invalidExRes = await fetch(`${instance.url}/api/v1/challenges/${chalId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({
        activity: {
          id: 'act_pushup_1',
          type: 'workout',
          exerciseKey: 'pushups',
          reps: 20,
          durationSeconds: 120,
          timestamp: new Date().toISOString()
        }
      })
    });
    assert.equal(invalidExRes.status, 400);
    const invalidData = await invalidExRes.json();
    assert.match(invalidData.error, /does not count toward this challenge/);

    // 2. Submit valid squats session (25 reps)
    const validRes = await fetch(`${instance.url}/api/v1/challenges/${chalId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({
        activity: {
          id: 'act_squat_101',
          type: 'workout',
          exerciseKey: 'squats',
          reps: 25,
          durationSeconds: 150,
          timestamp: new Date().toISOString()
        }
      })
    });
    assert.equal(validRes.status, 200);
    const validData = await validRes.json();
    assert.equal(validData.updatedParticipantScore, 25);
    assert.equal(validData.challengeCompleted, false);

    // 3. IDEMPOTENCY: Re-submit the exact same activity ID -> Score remains 25!
    const reSubmitRes = await fetch(`${instance.url}/api/v1/challenges/${chalId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({
        activity: {
          id: 'act_squat_101',
          type: 'workout',
          exerciseKey: 'squats',
          reps: 25,
          durationSeconds: 150,
          timestamp: new Date().toISOString()
        }
      })
    });
    assert.equal(reSubmitRes.status, 200);
    const reSubmitData = await reSubmitRes.json();
    assert.equal(reSubmitData.updatedParticipantScore, 25); // No double counting!

    // 4. Submit next session of 75 reps -> Reaches 100 reps -> challengeCompleted: true
    const completeRes = await fetch(`${instance.url}/api/v1/challenges/${chalId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({
        activity: {
          id: 'act_squat_102',
          type: 'workout',
          exerciseKey: 'squats',
          reps: 75,
          durationSeconds: 300,
          timestamp: new Date().toISOString()
        }
      })
    });
    assert.equal(completeRes.status, 200);
    const completeData = await completeRes.json();
    assert.equal(completeData.updatedParticipantScore, 100);
    assert.equal(completeData.challengeCompleted, true);
  });

  test('5. Privacy Guardrail: Rejects contribution containing raw skeletal landmarks', async () => {
    const createRes = await fetch(`${instance.url}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Zero Egress Test Challenge',
        targetValue: 20,
        startDate: todayStr,
        endDate: nextWeekStr
      })
    });
    const createData = await createRes.json();
    const chalId = createData.challenge.id;

    const leakRes = await fetch(`${instance.url}/api/v1/challenges/${chalId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        activity: {
          id: 'act_leak_1',
          type: 'workout',
          reps: 15,
          durationSeconds: 100,
          landmarks: [{ x: 0.5, y: 0.8 }] // ILLEGAL BIOMETRIC
        }
      })
    });
    assert.equal(leakRes.status, 422);
    const leakData = await leakRes.json();
    assert.match(leakData.error, /Privacy Violation/);
  });

  test('6. Challenge Lifecycle: Participant Leaving and Owner Cancellation', async () => {
    const createRes = await fetch(`${instance.url}/api/v1/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Cancellation Test Challenge',
        targetValue: 50,
        startDate: todayStr,
        endDate: nextWeekStr
      })
    });
    const createData = await createRes.json();
    const chalId = createData.challenge.id;
    const code = createData.challenge.inviteCode;

    // B joins
    await fetch(`${instance.url}/api/v1/challenges/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`
      },
      body: JSON.stringify({ inviteCode: code })
    });

    // B leaves challenge
    const leaveRes = await fetch(`${instance.url}/api/v1/challenges/${chalId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert.equal(leaveRes.status, 200);
    const leaveData = await leaveRes.json();
    assert.equal(leaveData.left, true);

    // Non-owner B tries to cancel challenge -> 403 Forbidden
    const unauthCancel = await fetch(`${instance.url}/api/v1/challenges/${chalId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert.equal(unauthCancel.status, 403);

    // Owner A cancels challenge
    const cancelRes = await fetch(`${instance.url}/api/v1/challenges/${chalId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    assert.equal(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.equal(cancelData.cancelled, true);

    // Details now reflect cancelled status
    const details = await fetch(`${instance.url}/api/v1/challenges/${chalId}`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const detailsData = await details.json();
    assert.equal(detailsData.challenge.status, 'cancelled');
  });
});
