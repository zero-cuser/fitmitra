# FitMitra Architecture Specification: Synchronization Contract & Protocol

**Phase**: 14 — Cross-Device Synchronization & Backend Reliability  
**Status**: Adopted & Enforced  
**Date**: October 2026  
**Target Environments**: Next.js 14 Web Application & Native Android (Compose / Kotlin)  

---

## 1. Executive Summary

FitMitra's synchronization protocol is engineered for **intermittent, high-latency, lossy hostel Wi-Fi, and mobile networks**. The system guarantees:

1. **Local Independence**: All workouts, streaks, and challenges are recorded locally first. Network connectivity is never required to start, perform, or complete a workout.
2. **Idempotent Operations**: Network retries, duplicate pushes, and concurrent uploads never generate duplicate repetitions, streak increments, or multiple workout entries.
3. **Explicit User Consent**: Synchronization is opt-in. Unregistered anonymous users operate completely offline. When an account is connected, users explicitly review what data is uploaded.
4. **Deterministic Conflict Resolution**: Every data category has a mathematically sound, entity-appropriate conflict resolution policy.
5. **Bounded Exponential Backoff**: Offline retries scale predictably (1s, 2s, 4s, 8s, 16s, capped at 30s) to prevent battery exhaustion and network storms.

---

## 2. Synchronization Architecture & Lifecycle

```text
┌──────────────────────────────────────────────────────────┐
│                   Local Storage Engine                   │
│         (LocalStorage on Web / DataStore on Android)    │
│  - Local Workouts (Canonical)   - Local Challenges       │
│  - Pending Change Queue         - Tombstones (Deletes)   │
└──────────────┬────────────────────────────▲──────────────┘
               │ Push Local Changes         │ Pull Remote Changes
               │ (Idempotent Upsert)        │ (Paginated Delta)
               ▼                            │
┌───────────────────────────────────────────┴──────────────┐
│             Sync Manager / ISyncRepository               │
│  - Online / Offline State Machine                        │
│  - Bounded Exponential Backoff Queue (Max 5 Retries)     │
│  - Conflict Resolution Engine (LWW & Tombstone Gates)    │
└──────────────┬────────────────────────────▲──────────────┘
               │ HTTPS REST / TLS 1.3       │ HTTPS REST / TLS 1.3
               ▼                            │
┌───────────────────────────────────────────┴──────────────┐
│                  FitMitra Backend API                    │
│  - POST /api/v1/sync/push (Authenticated Bearer Token)   │
│  - GET  /api/v1/sync/pull (Since Timestamp & Pagination) │
│  - Row Level Security (RLS) / Strict Owner Isolation     │
│  - Atomic Multi-Record Transactions & Zero-Egress Gate   │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Entity-by-Entity Synchronization Guarantees

| Entity Type | Authoritative Source | Stable Identifier | Conflict Resolution | Creation / Update Semantics | Deletion Semantics |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Workout Sessions** | Client Device (Hardware Pose Detection) | `work_<timestamp>_<uuid>` | **Append-Only Immutable**. Pushes perform idempotent upsert. Duplicate pushes do not create duplicate rows. | Created upon session completion. Immutable once recorded; core kinematics (exerciseKey, reps) cannot be altered. | Soft-deleted via `sync_tombstones`. Tombstones take precedence over resurrection by stale uploads. |
| **Progress Summaries** | Derived from canonical workout sessions | Derived locally per device | **Reconciliation**. Recomputed deterministically from the union of verified completed sessions. | Derived dynamically. Incomplete/cancelled sessions do not contribute. | Automatically reflects deletions when canonical sessions are tombstoned. |
| **User Preferences** | User-configured Settings | `accountId` (One profile per account) | **Last-Write-Wins (LWW)** based on ISO 8601 UTC `updatedAt`. Stale client updates rejected if server is newer. | Updated explicitly by user. Pushed in sync payload under `preferences`. | Cleared on account deletion or local sign-out. |
| **Challenge Progress** | Local Activity Verification | `part_<userId>_<challengeId>` | **Event-Sourced Set Union**. Deduplicates `processedActivityIds` to prevent double-counting. | Incremented only when a distinct qualifying workout ID is processed. | Purged on challenge exit or account deletion. |
| **Tombstones** | Deleting Client | `tomb_<timestamp>_<hex>` | **Precedence over Upserts**. A tombstone prevents resurrecting deleted workouts. | Created on user record deletion. Propagated to all connected devices on next pull. | Retained for 90 days to ensure all offline devices receive the deletion. |

---

## 4. Bounded Exponential Backoff & Retry Policy

To protect client battery and prevent hammering the server during hostel network outages:

| Retry Attempt | Delay | Backoff Multiplier | Client State |
| :---: | :---: | :---: | :--- |
| **0** (Immediate) | 1,000 ms | $1.0\times$ | Normal sync triggered |
| **1** | 2,000 ms | $2.0\times$ | `OFFLINE` (First retry) |
| **2** | 4,000 ms | $4.0\times$ | `OFFLINE` (Second retry) |
| **3** | 8,000 ms | $8.0\times$ | `OFFLINE` (Third retry) |
| **4** | 16,000 ms | $16.0\times$ | `OFFLINE` (Fourth retry) |
| **5+** (Cap) | 30,000 ms | $30.0\times$ (Capped) | `OFFLINE` (Manual trigger or reconnect required) |

**Invariant**: Local workouts are **NEVER discarded** when sync fails. Pending items remain safely in local persistent storage (`pending_sync_queue`) until a verified HTTP 200 acknowledgment is received from the server.

---

## 5. API Protocol Specification

### 5.1 Push Synchronization (`POST /api/v1/sync/push`)

- **Headers**:
  - `Authorization: Bearer <jwt_token>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "clientVersion": "1.0.0",
  "schemaVersion": 2,
  "workouts": [
    {
      "id": "work_1728901200000_a1b2",
      "exerciseKey": "squats",
      "exerciseName": "Bodyweight Squats",
      "reps": 20,
      "durationSeconds": 90,
      "postureScore": 92,
      "timestamp": "2026-10-14T05:00:00.000Z",
      "completedFully": true,
      "source": "pose_coach"
    }
  ],
  "challenges": [
    {
      "id": "part_usr_1_chal_squat_century",
      "challengeId": "chal_squat_century",
      "currentValue": 20,
      "targetValue": 100,
      "completedDays": ["2026-10-14"],
      "completedSessions": 1,
      "processedActivityIds": ["work_1728901200000_a1b2"],
      "completed": false,
      "updatedAt": "2026-10-14T05:02:00.000Z"
    }
  ],
  "preferences": {
    "soundMuted": true,
    "noiseTolerance": "silent"
  },
  "preferencesUpdatedAt": "2026-10-14T05:02:00.000Z",
  "tombstones": [
    {
      "id": "tomb_1728901300000_c3d4",
      "entityType": "workout",
      "entityId": "work_1728900000000_old1",
      "deletedAt": "2026-10-14T05:03:00.000Z"
    }
  ]
}
```

- **Response Body (`200 OK`)**:
```json
{
  "success": true,
  "syncedWorkouts": 1,
  "ignoredWorkouts": 0,
  "syncedChallenges": 1,
  "processedTombstones": 1,
  "preferencesUpdated": true,
  "serverTimestamp": "2026-10-14T05:03:05.120Z"
}
```

---

### 5.2 Pull Synchronization (`GET /api/v1/sync/pull`)

- **Query Parameters**:
  - `since`: ISO 8601 UTC timestamp (e.g. `2026-10-14T00:00:00.000Z`).
  - `limit`: Number of records per page (default: 50, max: 200).
  - `offset`: Pagination offset (default: 0).
- **Response Body (`200 OK`)**:
```json
{
  "success": true,
  "serverTimestamp": "2026-10-14T05:03:10.000Z",
  "totalWorkouts": 1,
  "hasMore": false,
  "limit": 50,
  "offset": 0,
  "workouts": [...],
  "challenges": [...],
  "tombstones": [...],
  "profile": { ... }
}
```

---

## 6. Schema Versioning & Compatibility

- **Current Server Schema Version**: `2`
- **Supported Client Schema Versions**: `1` through `2`
- **Rule**: If a client submits `schemaVersion > 2`, the server returns `400 Bad Request` with an explicit message prompting the student to update the app. Older clients (`version = 1`) degrade gracefully by ignoring preference synchronization while preserving core workout backup.
