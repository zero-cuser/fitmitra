# Phase 26: PostgreSQL CI Integration Failure Analysis & Fix

## 1. Executive Summary

- **GitHub Actions Run ID**: `38611132218` (Workflow: `PostgreSQL CI & Release Gate`)
- **Failing Job**: `release-gate` (Job ID: `116014459454`)
- **Failing Step**: `Run Strict Release Gate (Live PostgreSQL Multi-Process Tests)`
- **Node.js Environment**: Node.js v22.14.0 (GitHub Actions `ubuntu-latest`, PostgreSQL 15 service container)
- **Primary Root Cause**: Check 8 in `tests/server/postgresLiveIntegration.test.ts` attempted to verify idempotent deduplication for workout sync. However, the test payload constructed a fresh timestamp (`updatedAt: new Date().toISOString()`) milliseconds after Check 5. Because `PostgresDatabase.upsertWorkout` implements Last-Write-Wins (LWW) deduplication (`incomingUpdated <= currentUpdated`), the database correctly detected a newer timestamp, executed an `UPDATE`, and returned `status: 'updated'`. The test strictly asserted `expected: 'ignored'`, triggering an `AssertionError`.
- **Resolution**:
  1. Updated Check 8 to retry with the exact `initialWorkoutRecord` payload and timestamp from Check 5, properly verifying that a duplicate network push is treated idempotently (`status: 'ignored'`).
  2. Added a distinct verification for subsequent updates with an explicitly newer timestamp, verifying that genuine modifications succeed (`status: 'updated'`).
  3. Structured all 15 checks inside `await t.test(...)` subtests, ensuring granular TAP subtest logging and pinpoint diagnostics in GitHub Actions and local test runners.
  4. Added cleanup safety handling for concurrent account IDs in Check 13.
- **Verification Status**:
  - TypeScript Typecheck (`npx tsc --noEmit`): **0 errors** (Exit code: 0).
  - Full Test Suite (`npm test`): **344 passed, 0 failed, 1 skipped** (Exit code: 0).
  - Strict Guard Execution (`npm run test:release-gate`): Properly refuses execution and exits code 1 when `TEST_DATABASE_URL` is omitted.

---

## 2. Raw CI Failure Evidence

From GitHub Actions Job `116014459454` log:

```text
# Subtest: PostgreSQL Live Multi-Process Integration Test Suite
    # Subtest: Live Multi-Step Verification (Checks 1-13)
        Check 1 passed: Schema migration reached v3 on clean PostgreSQL database
        Check 2 passed: Migration history table records all 3 migrations correctly
        Check 3 passed: Running migrations a second time is strictly idempotent
        Check 4 passed: Account and profile created and read back successfully
        Check 5 passed: Workout inserted, read back, and profile stats updated atomically
        Process 1 (write) completed: { accountId: '11111111-2222-3333-4444-555555555555', workoutId: 'restarted_work_1773511874984' }
        Process 2 (read) completed: Read workout restarted_work_1773511874984 from account 11111111-2222-3333-4444-555555555555
        Check 6 passed: Fresh process read back records written by previous process
        Check 6 passed: Account and workouts survived pool restart
        Check 7 passed: Session token issued before restart verified successfully
    not ok 1 - Live Multi-Step Verification (Checks 1-13)
      ---
      duration_ms: 147.21882
      failureType: 'testCodeFailure'
      error: |-
        Check 8: Duplicate push must be ignored idempotently
        + actual - expected
        + 'updated'
        - 'ignored'
      code: 'ERR_ASSERTION'
      name: 'AssertionError'
      expected: 'ignored'
      actual: 'updated'
      operator: 'strictEqual'
      stack: |-
        TestContext.<anonymous> (file:///home/runner/work/fitmitra/fitmitra/tests/server/postgresLiveIntegration.test.ts:543:14)
        process.processTicksAndRejections (node:internal/process/task_queues:105:5)
        async Test.run (node:internal/test_runner/test:940:9)
        async Promise.all (index 0)
        async Suite.run (node:internal/test_runner/test:1320:7)
        async startSubtestAfterBootstrap (node:internal/test_runner/harness:293:3)
      ...
```

---

## 3. Root Cause Investigation

### 3.1 The Production Deduplication Logic (`src/server/postgresDb.ts`)

In `src/server/postgresDb.ts`, `upsertWorkout` implements timestamp-based deduplication (Last-Write-Wins):

```typescript
const currentUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
const incomingUpdated = workout.updatedAt ? new Date(workout.updatedAt).getTime() : Date.now();
if (incomingUpdated <= currentUpdated) {
  return { status: 'ignored', workout: this.mapWorkoutRow(row) };
}

await client.query(
  `UPDATE workouts
   SET exercise_key = $1, exercise_name = $2, reps = $3, duration_seconds = $4,
       posture_score = $5, timestamp = $6, is_hostel_friendly = $7, completed_fully = $8,
       source = $9, schema_version = $10, updated_at = $11
   WHERE account_id = $12 AND id = $13`,
  [ ... ]
);
return { status: 'updated', workout: ... };
```

### 3.2 The Defect in the Test Case (`tests/server/postgresLiveIntegration.test.ts`)

In Check 5:
```typescript
const workoutTimestamp = new Date().toISOString(); // e.g. T1 = 1773511874984
const initialWorkoutRecord = {
  id: workoutId,
  ...,
  timestamp: workoutTimestamp,
  updatedAt: workoutTimestamp
};
await liveDb.upsertWorkout(accountId, initialWorkoutRecord); // Inserted at T1
```

In Check 8 (prior to fix):
```typescript
const duplicateUpsert = await liveDb2.upsertWorkout(accountId, {
  id: workoutId,
  exerciseKey: 'squat',
  exerciseName: 'Squat',
  reps: 20,
  durationSeconds: 60,
  postureScore: 95,
  timestamp: workoutTimestamp,
  isHostelFriendly: true,
  completedFully: true,
  source: 'pose_coach',
  schemaVersion: 1,
  updatedAt: new Date().toISOString() // BUG: Evaluates to T2, where T2 > T1!
});
assert.equal(duplicateUpsert.status, 'ignored');
```

Because `new Date().toISOString()` generated a timestamp approximately 140ms later than $T_1$, `incomingUpdated > currentUpdated` evaluated to `true`. The database logic was completely correct: it recognized an incoming record with a newer modification timestamp and performed an update (`status: 'updated'`). The test was flawed in generating a new timestamp for an idempotency test.

---

## 4. Fix Applied

### 4.1 Check 8 Idempotency and Update Verification
In `tests/server/postgresLiveIntegration.test.ts`:
1. **Idempotent Retry**: Pass `initialWorkoutRecord` (which has the exact same `updatedAt` timestamp $T_1$). Because `incomingUpdated <= currentUpdated`, `upsertWorkout` correctly identifies it as a duplicate retry and returns `{ status: 'ignored' }`.
2. **Explicit Update**: Construct a separate record with `updatedAt: new Date(Date.now() + 1000).toISOString()` to verify that when an athlete genuinely updates reps or workout data with a newer timestamp, the database accepts the update with `{ status: 'updated' }`.

### 4.2 Subtest Granularity
All 15 verification steps are now enclosed in `await t.test('Check N: ...', async () => { ... })`. If any single check encounters an issue, the exact subtest name and line will be highlighted directly in TAP / CI output without obscuring earlier or subsequent checks.

### 4.3 Safe Cleanup in Check 13
Check 13 tests race condition handling for duplicate email registration. Two account IDs (`44444444-...` and `55555555-...`) are attempted concurrently. The cleanup was hardened to delete both IDs with `.catch(() => {})` so subsequent runs never collide.

---

## 5. Local Validation Results

1. **TypeScript Typechecking**:
   ```powershell
   npx tsc --noEmit
   # Exit code: 0 (0 errors)
   ```
2. **Standard Test Suite**:
   ```powershell
   npm test
   # Exit code: 0
   # 344 passed, 0 failed, 1 skipped
   ```
3. **Release Gate Guard (Without Live DB)**:
   ```powershell
   npm run test:release-gate
   # Exit code: 1
   # Error: Strict release gate guard: TEST_DATABASE_URL is not set.
   ```
   *Guarantees that the release gate cannot be bypassed or mocked locally.*

---

## 6. Verification & Staging Release Gate Status

| Gate | Status | Evidence |
| :--- | :--- | :--- |
| **Node.js 22 Runtime** | **PASSED** | CI workflow pinned to `22.x` and executing natively |
| **Clean Migration to v3** | **PASSED** | CI Check 1 passed on fresh PostgreSQL 15 |
| **Migration Idempotency** | **PASSED** | CI Check 3 verified zero-op re-application |
| **OS-Level Multi-Process Persistence** | **PASSED** | CI Check 6 helper process written & read across processes |
| **Session Continuity Across Restart** | **PASSED** | CI Check 7 verified tokens across database reconnect |
| **Idempotent Sync Pushes** | **RESOLVED** | Check 8 timestamp defect resolved; ready for CI re-run |
| **Physical Backup & Restore Drill** | **PENDING RUN** | Scheduled to run immediately following release-gate in CI |
