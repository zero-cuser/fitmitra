# FitMitra Architecture Specification: Data Classification & Privacy Boundary

**Phase**: 13 — Backend Integration & Account Synchronization  
**Status**: Adopted & Enforced  
**Date**: October 2026  
**Target Environments**: Next.js 14 Web Application & Native Android (Compose / Kotlin)  

---

## 1. Executive Summary & Core Principle

FitMitra operates on a **Local-First, Zero-Surveillance Privacy Architecture**. The application is designed to be fully functional in student hostel rooms, corridors, and libraries without an active internet connection or user account.

Cloud accounts and backend synchronization are **strictly optional, opt-in convenience features** for students who want multi-device history backup.

To safeguard user privacy, every single data artifact handled by FitMitra is strictly classified into one of five immutable tiers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FITMITRA DATA TAXONOMY                         │
├───────────────────────────┬────────────────────────────────────────────┤
│ 1. Device-Local           │ Strict Zero Egress.                        │
│    (Local Hardware Only)  │ Camera frames, pose landmarks, audio, UI.  │
├───────────────────────────┼────────────────────────────────────────────┤
│ 2. User-Owned Syncable    │ Opt-in synchronization only with consent.  │
│    (Encrypted Egress)     │ Workouts, challenge progress, preferences. │
├───────────────────────────┼────────────────────────────────────────────┤
│ 3. Account & Security     │ Managed by Auth Provider / Server Slice.   │
│    (Strict Isolation)     │ Email, PBKDF2 password hashes, JWT tokens. │
├───────────────────────────┼────────────────────────────────────────────┤
│ 4. Shared / Public        │ Read-only global catalogs & definitions.   │
│    (Read-Only Ingress)    │ Biomechanical catalog, challenges, menus.  │
├───────────────────────────┼────────────────────────────────────────────┤
│ 5. Sensitive Biometrics   │ Local by default. End-to-end isolated.     │
│    (Zero Public Egress)   │ Weight, height, age, calorie targets.      │
└───────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. Comprehensive Data Classification Matrix

| Data Item | Classification Tier | Storage Medium | Network Policy | Rationale & Privacy Guardrail |
| :--- | :--- | :--- | :--- | :--- |
| **Raw Camera Frames** | **Device-Local** | Volatile RAM buffer only | **ZERO EGRESS** (Never uploaded) | Camera buffers are processed on-device (ML Kit / MediaPipe WASM) and immediately released/closed. |
| **Pose Landmark Vectors** | **Device-Local** | Volatile RAM state | **ZERO EGRESS** (Never uploaded) | 33 Cartesian coordinates ($x, y, z, \text{vis}$) are used for real-time rep detection and discarded frame-by-frame. |
| **Instantaneous Joint Angles** | **Device-Local** | Ephemeral memory | **ZERO EGRESS** (Never uploaded) | Real-time trigonometry (`calculateAngle`) used for hysteresis tracking. |
| **Live Camera State** | **Device-Local** | Ephemeral memory / UI state | **ZERO EGRESS** (Never uploaded) | Lens facing, preview resolution, and frame pump timers remain strictly on device. |
| **Audio Synthesis Buffers** | **Device-Local** | Web Audio / SoundPool | **ZERO EGRESS** (Never uploaded) | Procedural sound generation assets. |
| **Workout Session Summaries** | **User-Owned Syncable** | LocalStorage / DataStore / Cloud | **Opt-In Sync Only** | Contains aggregate metrics: `exerciseKey`, `reps`, `durationSeconds`, `postureScore`, `timestamp`. Never contains video or landmarks. |
| **Exam Mode Break Logs** | **User-Owned Syncable** | LocalStorage / DataStore / Cloud | **Opt-In Sync Only** | Aggregate study break duration and completed mobility drills. |
| **Campus Challenge Progress** | **User-Owned Syncable** | LocalStorage / DataStore / Cloud | **Opt-In Sync Only** | Joined challenges, completed days, and deduplicated activity IDs. |
| **Fitness Preferences** | **User-Owned Syncable** | LocalStorage / DataStore / Cloud | **Opt-In Sync Only** | Noise rating, space requirement, sound muted, voice coach enabled. |
| **Physical Biometrics** | **Sensitive Biometrics** | LocalStorage / DataStore | **Local-Only by Default** | Age, gender, height, weight, BMR/TDEE. Never shared with peers or campus networks. |
| **Authentication Credentials** | **Account & Security** | Server database / Secure Storage | **TLS 1.3 Protected Egress** | Passwords hashed with PBKDF2-HMAC-SHA512 (100,000 iterations). Plaintext passwords are never stored. |
| **Session Tokens (JWT)** | **Account & Security** | Client storage / Memory | **Bearer Authorization** | Signed HMAC-SHA256 tokens with explicit expiration. |
| **Exercise Biomechanics Catalog** | **Shared / Public** | Bundled app code / CDN | **Read-Only Ingress** | Static rules, angles, depth thresholds, and form cues. |
| **Campus Challenge Definitions** | **Shared / Public** | Bundled app code / CDN | **Read-Only Ingress** | Static challenge targets, durations, and rules. |
| **Mess Menu Nutrition Data** | **Shared / Public** | Bundled app code / CDN | **Read-Only Ingress** | Curated Indian campus food nutritional breakdowns. |
| **Friend Invitations (`FIT-XXXX`)** | **Campus Social & Cohort** | Server database / Local cache | **TLS 1.3 Protected Egress** | Cryptographic invite tokens with 48h TTL and max 5 uses. Anti-enumeration returns 404. |
| **Friend Relationships** | **Campus Social & Cohort** | Server database / Local cache | **Explicit Two-Way Consent** | Unidirectional requests require recipient acceptance. Zero address book permissions. |
| **Shared Challenges (`CHAL-XXXX`)** | **Campus Social & Cohort** | Server database / Local cache | **Cohort-Authorized Only** | 403 gate blocks non-participants. Closed room scale (2–50 students). |
| **Challenge Contributions** | **Campus Social & Cohort** | Server database / Local cache | **Validated Idempotent Egress**| Deduplicated via `activity.id`. Zero landmark/video frame egress enforced (422 rejection). |

---

## 3. Strict Prohibitions & Architectural Invariants

1. **Zero Video Telemetry**:
   - The application does not contain, and will never contain, code that encodes video streams, saves camera frames to disk, or transmits image data over any network socket.
2. **Zero Landmark Logging**:
   - Landmarks are prohibited from being written to persistent storage (`IAppStorage`, `localStorage`, Room DB, SQLite, or backend databases). Any attempt to pass landmark coordinates to a repository triggers an immediate `RepositoryError('PermissionDenied')`.
3. **No Forced Accounts**:
   - The workout flow (`HomeScreen` $\to$ `WorkoutSelection` $\to$ `PoseCoach` $\to$ `Completion`) must execute completely with an unauthenticated, anonymous guest profile. No modal, dialog, or network gate may block workout execution.
4. **No Silent Upgrades**:
   - Local anonymous data must never be transmitted to a backend automatically upon login or registration. An explicit review and consent screen must precede any data synchronization.
5. **No Telemetry / Analytics SDKs**:
   - No third-party ad networks, behavioural analytics (Google Analytics, Mixpanel, Firebase Analytics), or intrusive tracking SDKs are permitted in the web or Android client.
