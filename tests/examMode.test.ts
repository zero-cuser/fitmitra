import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createExamSession,
  getExamModeConstraints
} from '../src/services/examModeEngine.ts';
import { ElapsedTimerController } from '../src/services/elapsedTimer.ts';
import { STORAGE_KEYS, clearWorkoutHistory } from '../src/utils/storageSafety.ts';
import { MockLocalStorage } from './mocks/browserMocks.ts';
import type { ExamModeType, WorkoutConstraints } from '../src/types/fitness.ts';

describe('FitMitra Exam Mode Engine & Deterministic Timer', () => {
  // 1. Reset Mode Duration
  it('1. Reset mode generates a session totaling exactly 120 seconds (2 minutes)', () => {
    const session = createExamSession('reset');
    assert.equal(session.mode, 'reset');
    assert.equal(session.totalDurationSeconds, 120);
    const sum = session.activities.reduce((acc, a) => acc + a.durationSeconds, 0);
    assert.equal(sum, 120);
  });

  // 2. Break Mode Duration
  it('2. Break mode generates a session totaling exactly 300 seconds (5 minutes)', () => {
    const session = createExamSession('break');
    assert.equal(session.mode, 'break');
    assert.equal(session.totalDurationSeconds, 300);
    const sum = session.activities.reduce((acc, a) => acc + a.durationSeconds, 0);
    assert.equal(sum, 300);
  });

  // 3. Recharge Mode Duration
  it('3. Recharge mode generates a session totaling exactly 600 seconds (10 minutes)', () => {
    const session = createExamSession('recharge');
    assert.equal(session.mode, 'recharge');
    assert.equal(session.totalDurationSeconds, 600);
    const sum = session.activities.reduce((acc, a) => acc + a.durationSeconds, 0);
    assert.equal(sum, 600);
  });

  // 4. Reset & Break Constraints
  it('4. Reset and Break modes enforce silent noise, small space, no equipment, and beginner difficulty', () => {
    const resetConstraints = getExamModeConstraints('reset');
    assert.equal(resetConstraints.noiseTolerance, 'silent');
    assert.equal(resetConstraints.space, 'small');
    assert.deepEqual(resetConstraints.equipment, ['none']);
    assert.equal(resetConstraints.difficulty, 'beginner');
    assert.equal(resetConstraints.energyLevel, 'low');

    const breakConstraints = getExamModeConstraints('break');
    assert.equal(breakConstraints.noiseTolerance, 'silent');
    assert.equal(breakConstraints.space, 'small');
    assert.deepEqual(breakConstraints.equipment, ['none']);
    assert.equal(breakConstraints.difficulty, 'beginner');
    assert.equal(breakConstraints.energyLevel, 'low');
  });

  // 5. Recharge Constraints
  it('5. Recharge mode enforces low noise, small space, no equipment, and moderate energy', () => {
    const rechargeConstraints = getExamModeConstraints('recharge');
    assert.equal(rechargeConstraints.noiseTolerance, 'low');
    assert.equal(rechargeConstraints.space, 'small');
    assert.deepEqual(rechargeConstraints.equipment, ['none']);
    assert.equal(rechargeConstraints.difficulty, 'beginner');
    assert.equal(rechargeConstraints.energyLevel, 'moderate');
  });

  // 6. Movement Exercises Use Adaptive Engine
  it('6. Movement exercises are resolved through Adaptive Hostel Workout Engine', () => {
    const session = createExamSession('reset');
    const movementAct = session.activities.find((a) => a.category === 'movement');
    assert.ok(movementAct, 'Reset mode must contain at least one movement activity');
    assert.ok(movementAct.exerciseKey, 'Movement activity must specify an exerciseKey');
    // Constraints used must match
    assert.equal(session.constraintsUsed.noiseTolerance, 'silent');
  });

  // 7. No Noisy Exercises in Silent Break
  it('7. Jumping jacks are never selected during silent study reset or break', () => {
    const reset = createExamSession('reset');
    const breakSession = createExamSession('break');

    for (const act of [...reset.activities, ...breakSession.activities]) {
      if (act.category === 'movement') {
        assert.notEqual(act.exerciseKey, 'jumping_jacks', 'Jumping jacks must not appear in silent sessions');
      }
    }
  });

  // 8. Camera Opt-in: Non-movement activities never require camera
  it('8. Non-movement activities (eye_break, stretch, breathing) strictly have isCameraEligible = false', () => {
    const modes: ExamModeType[] = ['reset', 'break', 'recharge'];
    for (const m of modes) {
      const session = createExamSession(m);
      for (const act of session.activities) {
        if (act.category !== 'movement') {
          assert.equal(
            act.isCameraEligible,
            false,
            `Activity ${act.id} of category ${act.category} must not require camera`
          );
        }
      }
    }
  });

  // 9. Camera Opt-in: Movement activities have isCameraEligible = true
  it('9. Movement activities have isCameraEligible = true and exerciseKey defined', () => {
    const session = createExamSession('recharge');
    const movements = session.activities.filter((a) => a.category === 'movement');
    assert.ok(movements.length >= 2, 'Recharge should have 2 movement activities');
    for (const mov of movements) {
      assert.equal(mov.isCameraEligible, true);
      assert.ok(mov.exerciseKey);
    }
  });

  // 10. ElapsedTimerController: Initial State
  it('10. ElapsedTimerController initializes at activity index 0 and 0 elapsed seconds', () => {
    const testActivities = [
      { id: 'a1', name: 'Eye Rest', durationSeconds: 30 },
      { id: 'a2', name: 'Movement', durationSeconds: 45 }
    ];
    const timer = new ElapsedTimerController(testActivities);
    const snap = timer.getSnapshot(1000);
    assert.equal(snap.activityIndex, 0);
    assert.equal(snap.currentActivityId, 'a1');
    assert.equal(snap.activityElapsedSeconds, 0);
    assert.equal(snap.activityRemainingSeconds, 30);
    assert.equal(snap.totalSessionDurationSeconds, 75);
    assert.equal(snap.isRunning, false);
    assert.equal(snap.isPaused, false);
    assert.equal(snap.isCompleted, false);
  });

  // 11. ElapsedTimerController: Step and wall-clock delta tracking
  it('11. ElapsedTimerController accurately tracks elapsed time using timestamp deltas', () => {
    const testActivities = [
      { id: 'a1', name: 'Eye Rest', durationSeconds: 30 },
      { id: 'a2', name: 'Stretch', durationSeconds: 30 }
    ];
    const timer = new ElapsedTimerController(testActivities);
    const t0 = 100000;
    timer.start(t0);

    // Step at +10 seconds
    const step1 = timer.step(t0 + 10000);
    assert.equal(step1.activityCompleted, false);
    assert.equal(step1.sessionCompleted, false);

    const snap1 = timer.getSnapshot(t0 + 10000);
    assert.equal(snap1.activityElapsedSeconds, 10);
    assert.equal(snap1.activityRemainingSeconds, 20);
    assert.equal(snap1.totalSessionElapsedSeconds, 10);
  });

  // 12. ElapsedTimerController: Pause freezes time
  it('12. Pausing timer freezes elapsed time even as system time advances', () => {
    const testActivities = [{ id: 'a1', name: 'Hold', durationSeconds: 30 }];
    const timer = new ElapsedTimerController(testActivities);
    const t0 = 200000;
    timer.start(t0);

    // Run for 15 seconds
    timer.step(t0 + 15000);
    // Pause at +15s
    timer.pause(t0 + 15000);

    const pausedSnap = timer.getSnapshot(t0 + 15000);
    assert.equal(pausedSnap.isPaused, true);
    assert.equal(pausedSnap.isRunning, false);
    assert.equal(pausedSnap.activityElapsedSeconds, 15);

    // Advance system clock by 30 seconds while paused
    timer.step(t0 + 45000);
    const stillPausedSnap = timer.getSnapshot(t0 + 45000);
    assert.equal(stillPausedSnap.activityElapsedSeconds, 15);
    assert.equal(stillPausedSnap.activityRemainingSeconds, 15);
  });

  // 13. ElapsedTimerController: Resume continues seamlessly
  it('13. Resuming timer continues from frozen accumulated time', () => {
    const testActivities = [{ id: 'a1', name: 'Hold', durationSeconds: 30 }];
    const timer = new ElapsedTimerController(testActivities);
    const t0 = 300000;
    timer.start(t0);
    timer.pause(t0 + 10000); // 10s elapsed

    // Resume at +50s
    timer.resume(t0 + 50000);
    // Step 5 seconds later
    timer.step(t0 + 55000);

    const snap = timer.getSnapshot(t0 + 55000);
    assert.equal(snap.activityElapsedSeconds, 15); // 10s before pause + 5s after resume
    assert.equal(snap.activityRemainingSeconds, 15);
  });

  // 14. Activity Transition on Completion
  it('14. Completing an activity duration advances to the next activity', () => {
    const testActivities = [
      { id: 'a1', name: 'First', durationSeconds: 20 },
      { id: 'a2', name: 'Second', durationSeconds: 30 }
    ];
    const timer = new ElapsedTimerController(testActivities);
    const t0 = 400000;
    timer.start(t0);

    // Step at +20 seconds
    const result = timer.step(t0 + 20000);
    assert.equal(result.activityCompleted, true);
    assert.equal(result.sessionCompleted, false);

    const snap = timer.getSnapshot(t0 + 20000);
    assert.equal(snap.activityIndex, 1);
    assert.equal(snap.currentActivityId, 'a2');
    assert.equal(snap.activityElapsedSeconds, 0);
    assert.equal(snap.activityRemainingSeconds, 30);
    assert.equal(snap.totalSessionElapsedSeconds, 20);
  });

  // 15. Final Session Completion
  it('15. Completing the last activity completes the entire session', () => {
    const testActivities = [{ id: 'a1', name: 'Solo', durationSeconds: 15 }];
    const timer = new ElapsedTimerController(testActivities);
    const t0 = 500000;
    timer.start(t0);

    const result = timer.step(t0 + 15000);
    assert.equal(result.activityCompleted, true);
    assert.equal(result.sessionCompleted, true);

    const snap = timer.getSnapshot(t0 + 15000);
    assert.equal(snap.isCompleted, true);
    assert.equal(snap.isRunning, false);
    assert.equal(snap.activityRemainingSeconds, 0);
    assert.equal(snap.totalSessionElapsedSeconds, 15);
  });

  // 16. Skip current activity
  it('16. skip() immediately moves to next activity or completes session if on last', () => {
    const testActivities = [
      { id: 'a1', name: 'Act 1', durationSeconds: 30 },
      { id: 'a2', name: 'Act 2', durationSeconds: 30 }
    ];
    const timer = new ElapsedTimerController(testActivities);
    timer.start(600000);

    // Skip Act 1
    const didSkip1 = timer.skip(600005);
    assert.equal(didSkip1, true);
    let snap = timer.getSnapshot(600005);
    assert.equal(snap.activityIndex, 1);
    assert.equal(snap.currentActivityId, 'a2');

    // Skip Act 2 (last)
    const didSkip2 = timer.skip(600010);
    assert.equal(didSkip2, true);
    snap = timer.getSnapshot(600010);
    assert.equal(snap.isCompleted, true);
  });

  // 17. endSession() halts immediately
  it('17. endSession() immediately stops and marks session completed', () => {
    const testActivities = [
      { id: 'a1', name: 'Act 1', durationSeconds: 60 },
      { id: 'a2', name: 'Act 2', durationSeconds: 60 }
    ];
    const timer = new ElapsedTimerController(testActivities);
    timer.start(700000);
    timer.endSession();

    const snap = timer.getSnapshot(700005);
    assert.equal(snap.isCompleted, true);
    assert.equal(snap.isRunning, false);
  });

  // 18. Simulated Background Tab Throttling (drift protection)
  it('18. Handles large time jump during tab throttle without missing state', () => {
    const testActivities = [
      { id: 'a1', name: 'Act 1', durationSeconds: 30 },
      { id: 'a2', name: 'Act 2', durationSeconds: 30 }
    ];
    const timer = new ElapsedTimerController(testActivities);
    const t0 = 800000;
    timer.start(t0);

    // Tab throttled: 40 seconds passed before next tick
    const res = timer.step(t0 + 40000);
    assert.equal(res.activityCompleted, true);
    assert.equal(res.sessionCompleted, false);

    const snap = timer.getSnapshot(t0 + 40000);
    assert.equal(snap.activityIndex, 1);
  });

  // 19. Storage Safety Key check
  it('19. STORAGE_KEYS contains EXAM_SESSIONS and clearWorkoutHistory includes it', () => {
    assert.equal(STORAGE_KEYS.EXAM_SESSIONS, 'fitmitra_exam_sessions');

    const mockStorage = new MockLocalStorage();
    (global as any).window = {
      localStorage: mockStorage
    };

    mockStorage.setItem(STORAGE_KEYS.EXAM_SESSIONS, JSON.stringify([{ id: 'sess_1' }]));
    mockStorage.setItem(STORAGE_KEYS.WORKOUT, JSON.stringify([{ id: 'work_1' }]));
    mockStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ name: 'Student' }));

    const res = clearWorkoutHistory();
    assert.equal(res, true);
    assert.equal(mockStorage.getItem(STORAGE_KEYS.EXAM_SESSIONS), null);
    assert.equal(mockStorage.getItem(STORAGE_KEYS.WORKOUT), null);
    // User profile should NOT be touched
    assert.ok(mockStorage.getItem(STORAGE_KEYS.USER));
  });
});
