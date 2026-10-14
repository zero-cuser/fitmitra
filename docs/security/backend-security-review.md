# FitMitra Backend Security Review & Threat Model
## Phase 13: Backend Integration & Account Synchronization

**Status**: Verified & Enforced  
**Date**: October 2026  
**Audience**: Security Auditors, Backend Engineers, Android & Web Developers  

---

## 1. Threat Model & Security Boundaries

FitMitra's architecture is built around a zero-trust approach toward client-submitted biometric telemetry and multi-tenant cloud storage. The application's threat model evaluates five primary attack vectors:

| Threat / Attack Vector | Impact | Mitigation Mechanism in Phase 13 |
| :--- | :--- | :--- |
| **Biometric Telemetry Leakage** | Compromise of user physical privacy via camera frames or skeletal joint vectors. | **Zero-Egress Invariant**: All computer vision inference executes on-device (WASM on web, ML Kit on Android). The backend API explicitly rejects any payload containing `landmarks`, `frames`, `coordinates`, or `keypoints` with HTTP `422 Unprocessable Entity`. |
| **Credential Guessing & Brute Force** | Unauthorized account takeover. | Rate limiting per IP/account (5 auth attempts/minute; 60 requests/minute overall). Passwords hashed using PBKDF2-HMAC-SHA512 (100,000 iterations, 32-byte cryptographically secure salt). |
| **Tenant Isolation Breach / Cross-Account Access** | An attacker accesses or modifies another student's workout history or challenge progress. | Authenticated identity derived strictly from validated JWT claims (`session.accountId`). Every database mutation and query enforces Row-Level Security (RLS) predicates (`account_id = current_account_id()`). Cross-account writes are rejected with `403 Forbidden`. |
| **Tampered / Counterfeit Tokens** | Privilege escalation or impersonation. | Cryptographic HMAC-SHA256 signature verification with constant-time equality comparisons (`timingSafeEqual`) to eliminate timing attacks. Expired or altered tokens fail with `401 Unauthorized`. |
| **Data Retention After Deletion** | Lingering records after user requests account removal. | Cryptographic and physical cascading deletion across `accounts`, `profiles`, `workout_records`, `challenge_progress`, and `sync_tombstones`. Optional dual-mode deletion (remote-only vs. full wipe). |

---

## 2. Authentication & Cryptographic Standards

### 2.1 Password Storage Specification
- **Algorithm**: PBKDF2 with HMAC-SHA512 (National Institute of Standards and Technology / NIST SP 800-132 compliant).
- **Salt**: 32 bytes (256 bits) generated via Node.js `crypto.randomBytes(32)`. Unique per account.
- **Iteration Count**: 100,000 rounds.
- **Key Length**: 64 bytes (512 bits).
- **Verification**: Constant-time buffer comparison using `crypto.timingSafeEqual()` to guard against side-channel timing analysis.

### 2.2 Token-Based Session Management
- **Token Type**: Bearer JSON Web Token (JWT) with HMAC-SHA256 signature (`HS256`).
- **Payload Claims**:
  - `sub`: Unique account UUIDv4 (`acc_<timestamp>_<hex>`).
  - `email`: User campus email address.
  - `iat`: Issue timestamp (seconds since Unix epoch).
  - `exp`: Expiration timestamp (default: 7 days / 604,800 seconds).
- **Signature Verification**: Signature recalculated using the server's private `JWT_SECRET` and compared via `crypto.timingSafeEqual()`. Any invalid format, tampered payload, or expired claim results in immediate token rejection.
- **Storage on Clients**:
  - Web: Device-local browser storage managed by `WebRemoteAuthRepository`.
  - Android: Encrypted `DataStore` key-value storage managed by `RemoteAuthRepository`.

---

## 3. Multi-Tenant Authorization & Row-Level Security (RLS)

### 3.1 Server-Enforced Isolation
The backend data store enforces owner isolation at every layer:
1. **API Route Gate**: Requests to `/api/v1/sync/push`, `/api/v1/sync/pull`, `/api/v1/auth/session`, and `/api/v1/auth/delete` require a valid `Authorization: Bearer <token>` header. Unauthenticated requests are blocked with `401 Unauthorized`.
2. **Owner Matching**: When synchronizing workouts or challenge progress, each incoming entity's ID is inspected against existing records:
   - If an entity exists and belongs to a different `accountId`, the mutation is blocked with `403 Forbidden` (`PermissionDenied`).
   - All insertions automatically assign the authenticated user's `accountId`.
3. **Database RLS Policies**: The PostgreSQL schema (`src/server/schema.sql`) defines explicit Row-Level Security policies:
   ```sql
   ALTER TABLE workout_records ENABLE ROW LEVEL SECURITY;
   CREATE POLICY user_workout_isolation ON workout_records
       FOR ALL USING (account_id = current_setting('app.current_account_id', true));
   ```

---

## 4. Biometric Data Zero-Egress Enforcement

To prevent accidental data leakage from buggy client extensions or compromised clients, the server implements strict deep validation:
```typescript
function containsProhibitedPoseData(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some(containsProhibitedPoseData);
  const keys = Object.keys(obj as Record<string, unknown>).map(k => k.toLowerCase());
  const prohibited = ['landmarks', 'landmark', 'poseframe', 'coordinates', 'keypoints', 'rawframe', 'video'];
  if (keys.some(k => prohibited.includes(k))) return true;
  return Object.values(obj as Record<string, unknown>).some(containsProhibitedPoseData);
}
```
If any payload sent to `/api/v1/sync/push` contains prohibited keys, the request is immediately aborted with:
```json
{
  "error": "PrivacyViolation",
  "message": "Raw pose landmarks, video frames, and skeletal coordinates must NEVER leave client hardware."
}
```
Status: **HTTP 422 Unprocessable Entity**.

---

## 5. Denial of Service & Abuse Mitigation

1. **Payload Size Guard**: Incoming request bodies are capped at 1 MB. Requests exceeding 1 MB are terminated immediately with `413 Payload Too Large`.
2. **In-Memory Sliding Window Rate Limiting**:
   - Authentication Endpoints (`/api/v1/auth/*`): 10 requests per minute per IP address.
   - Synchronization Endpoints (`/api/v1/sync/*`): 60 requests per minute per IP address.
   - Exceeded limits receive `429 Too Many Requests` with a descriptive retry prompt.
3. **JSON Parsing Protection**: Malformed JSON bodies return `400 Bad Request` without stack trace leakage.

---

## 6. Account Deletion & Right to Erasure (GDPR / Privacy Compliance)

When a student requests account deletion:
1. Re-authentication via password confirmation is required.
2. The user selects between two deletion policies:
   - **Remote-Only**: Cloud records (account, profile, synced workouts, challenge progress, tombstones) are permanently purged; local device workouts remain intact.
   - **Full Wipe**: Both cloud records and local device storage are completely erased.
3. Database foreign keys use `ON DELETE CASCADE` so that deleting an entry in `accounts` automatically and atomically removes all associated records in `profiles`, `workout_records`, `challenge_progress`, and `sync_tombstones`.
4. The deletion operation is verified via automated test `tests/server/auth.test.ts`.

---

## 7. Phase 14 Synchronization Hardening & Threat Analysis

### 7.1 Stale Overwrite Mitigation
Distributed offline writes can arrive out-of-order when multiple client devices sync asynchronously.
- **Threat**: Client A performs an update at $t_1$, client B performs an update at $t_2$ ($t_2 > t_1$). If Client A's packet is delayed in a retry queue and reaches the backend after Client B's packet, naive upsert would overwrite the newer state.
- **Mitigation**: Server-side timestamp verification (`updated_at > existing.updated_at`). Workouts with older `updated_at` timestamps are safely skipped (`ignored_stale_update`) and the response informs the client that the newer state is retained.
- **User Preferences**: Resolved via Last-Write-Wins (LWW) utilizing the highest ISO-8601 millisecond timestamp.

### 7.2 Tombstone Precedence & Resurrection Prevention
- **Threat**: User deletes a workout session on Web (generating a tombstone). Weeks later, their Android phone connects to Wi-Fi after being offline. Without protection, the phone's local storage would re-upload the deleted workout to the server, "resurrecting" it.
- **Mitigation**: The server checks the `sync_tombstones` table before accepting any workout insertion. If an active tombstone exists for `(account_id, entity_id)`, the upload is rejected with `ignored_tombstone`. When the Android device pulls changes, it receives the tombstone and purges its local cache.

### 7.3 Challenge Progress Replay / Inflation Attack
- **Threat**: Malicious or buggy clients resubmitting duplicate completion events to artificially inflate campus challenge rep counts, active days, or XP.
- **Mitigation**: Challenge state tracks an explicit array of `processedActivityIds`. When a client pushes challenge updates, the server merges activity IDs via Set union:
  $$\text{processedActivityIds} = \text{processedActivityIds}_{\text{server}} \cup \text{processedActivityIds}_{\text{incoming}}$$
  Duplicate submissions of the same activity ID contribute 0 additional reps and 0 additional days.

### 7.4 Sanitized Operational Logging & Zero-PII Leakage
FitMitra Phase 14 introduces structured operational telemetry (`src/server/logger.ts`) with strict privacy invariants:
- **Zero Token Leakage**: Authorization headers and JWTs are explicitly sanitized.
- **Zero Raw Pose Telemetry**: Pose vectors, landmarks, and video buffers are never logged.
- **PII Masking**: Account IDs are truncated and masked (e.g. `acc_178...3f8a`), emails and passwords are never logged in operational telemetry.
- **Security Audit Events**: `PRIVACY_VIOLATION`, `RATE_LIMITED`, `UNAUTHORIZED`, and `CONFLICT_RESOLVED` events are logged with timestamp and event metadata only.

### 7.5 Client Version Compatibility Enforcement
Clients submit their schema version header (`X-Client-Schema-Version: 3`). The backend validates that the client version falls within supported boundaries (`1 <= version <= 3`). Unsupported or breaking schema versions are rejected with `400 Bad Request` (`UnsupportedSchemaVersion`) before any mutation occurs, preventing schema corruption.

---

## 8. Phase 15 Campus Social & Shared Challenge Security Architecture

### 8.1 Anti-Enumeration & Code Scrapes
- **Threat**: Attackers iterating through 4-character codes (e.g. `FIT-0000` to `FIT-ZZZZ`) to harvest campus usernames or spam requests.
- **Mitigation**: 
  1. Codes are cryptographically generated using uppercase alphanumeric characters without ambiguous characters (`0`, `O`, `1`, `I`).
  2. Submitting an invalid or expired code returns HTTP 404 with a generic error message (`Invalid or expired invitation code.`), revealing zero information about whether the code previously existed.
  3. Codes expire after 48 hours and enforce a maximum use quota (default: 5 connections).
  4. Global rate limits (60 req/min) throttle rapid guessing attempts.

### 8.2 Two-Way Explicit Consent & Zero Address Book Access
- **Threat**: Aggressive social scraping, address book harvesting, or non-consensual contact tracking.
- **Mitigation**:
  1. FitMitra requests **zero contact or address book permissions** on both Android and Web.
  2. Submitting an invite code creates a unidirectional `pending` friendship. The recipient must explicitly accept the request before any reciprocal progress is revealed.
  3. Either party can delete the friendship at any time with immediate cascading removal.

### 8.3 Private Challenge Authorization Gate
- **Threat**: Unauthorized users viewing or manipulating closed hostel fitness sprints.
- **Mitigation**:
  1. Every request to `/api/v1/challenges/:id` and `/api/v1/challenges/:id/contribute` enforces strict participant authorization:
     - The requester must be the challenge creator or an actively enrolled participant in `shared_challenge_participants`.
     - Non-participants receive an immediate HTTP 403 Forbidden.
  2. Participant caps (2 to 50 members) prevent unmanageable cohort bloat.

### 8.4 Server-Side Contribution Validation & Idempotency
- **Threat**: Replay attacks inflating reps or malicious submission of raw camera telemetry.
- **Mitigation**:
  1. Contributions require a unique `activityId` (composite key: `challengeId_accountId_activityId`). Repeated submissions return the existing score without inflating repetitions.
  2. The server strictly validates that contribution amounts are positive integers.
  3. Pre-mutation biometric guardrails reject any contribution payload containing `landmarks`, `poseLandmarks`, or camera frames with HTTP 422 Unprocessable Entity.

### 8.5 Cascading Account Deletion
- **Threat**: Lingering friend records or challenge leaderboards retaining data after user account deletion.
- **Mitigation**:
  When a user purges their account, the database cascades:
  - Revokes all friend invitations created by the user.
  - Deletes all friendships where the user was either party.
  - Removes the user from all shared challenge participant rosters.
  - Purges all contribution records submitted by the user.
  - Automatically cancels and soft-deletes any shared challenges owned by the user.


