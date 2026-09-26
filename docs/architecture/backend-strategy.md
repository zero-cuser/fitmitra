# FitMitra Architecture Decision Record (ADR)
## Phase 6: Backend & Account Strategy

**Status**: Approved & Adopted  
**Date**: September 2026  
**Context**: FitMitra Local-First Campus Fitness Application  
**Target Platform**: Web (Next.js 14 App Router, Static Export) & Future Native Android  

---

## 1. Executive Summary & Guiding Philosophy

FitMitra is built on three uncompromised architectural pillars:
1. **Local-First & Offline-Guaranteed**: The complete student experience—AI Pose Coach, Adaptive Hostel Workout Engine, Exam Mode, Mess Nutrition, and Campus Challenges—must function deterministically without an active internet connection.
2. **Absolute Visual & Telemetric Privacy**: Raw camera frames and full-body skeletal landmark coordinate streams must never leave the user's client hardware. No video streaming, no server-side computer vision, and no cloud-stored landmark vectors.
3. **Transparent Data Ownership**: Users own their data. Anonymous operation is a permanent first-class citizen. Cloud synchronization and account creation are strictly optional, opt-in capabilities designed to provide multi-device convenience, not user surveillance or engagement lock-in.

This document establishes the architecture for future backend integration, defining the typed repository boundaries, data classifications, conflict resolution policies, and technical trade-offs required before any server infrastructure is provisioned.

---

## 2. Current Architecture Inventory & Audit

A rigorous inspection of the current production-oriented codebase reveals the following component and data landscape:

| Domain / Component | Current Implementation | Storage / State Mechanism | Network / Remote Activity |
| :--- | :--- | :--- | :--- |
| **Authentication** | Client-side modal + simulated credentials (`AuthContext.tsx`, `authStorage.ts`) | Browser `localStorage` (`FITMITRA_AUTH_USER_V3`, `FITMITRA_AUTH_STATUS_V3`) | **Zero**. No server validation, no password hashing, no tokens. |
| **User Profile & Biometrics** | `UserProfile` (`fitness.ts`) containing identity, hostel wing, age, height, weight, BMR/TDEE | Browser `localStorage` (`fitmitra_user_profile`) | **Zero**. Derived locally via Mifflin-St Jeor equation. |
| **AI Pose Coach** | `@mediapipe/pose` browser WASM pipeline (`CameraView.tsx`, `FramePumpController.ts`) | Ephemeral in-memory React state | **Zero**. Frames processed on device; raw coordinates discarded every frame. |
| **Adaptive Workout Engine** | Constraint satisfaction solver (`workoutRecommendationEngine.ts`) | Pure in-memory deterministic calculation | **Zero**. 100% offline rule matching. |
| **Exam Mode** | Elapsed wall-clock timer & study break routines (`examModeEngine.ts`, `elapsedTimer.ts`) | Browser `localStorage` (`fitmitra_exam_sessions`) | **Zero**. Opt-in camera; Web Audio API local chimes. |
| **Campus Challenges** | Local catalog of 6 challenges (`campusChallengesService.ts`) | Browser `localStorage` (`fitmitra_challenge_progress`) | **Zero**. Local progress with deduplicated `processedActivityIds`. |
| **Friends / Community** | Seeded mock student profiles (`FriendsHub.tsx`, `DailyComparisonModal.tsx`) | Browser `localStorage` (`FITMITRA_FRIENDS_V3`) | **Zero**. Local cheer counter increment. |
| **Storage Safety & Privacy** | Centralized quota guards & validation (`storageSafety.ts`) | Browser `localStorage` with JSON validation | **Zero**. Supports full JSON export and selective history wiping. |
| **Network Requests / APIs** | None. Next.js configured with `output: 'export'` (`next.config.mjs`) | Static HTML/CSS/JS export in `out/` | **Zero**. No API routes (`src/app/api/` does not exist). |
| **Environment Variables** | Only `process.env.NODE_ENV === 'production'` in build config | N/A | **Zero** production secrets or API keys committed or required. |

---

## 3. Comprehensive Data Classification

To ensure strict privacy boundaries when cloud synchronization is introduced, every data item in FitMitra is classified into one of four immutable tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FITMITRA DATA TAXONOMY                         │
├───────────────────────────┬────────────────────────────────────────────┤
│ 1. Device-Local           │ Never leaves device hardware.               │
│    (Zero Egress)          │ Frames, landmarks, audio buffers, UI state.│
├───────────────────────────┼────────────────────────────────────────────┤
│ 2. User-Owned Syncable    │ Opt-in synchronization only.               │
│    (Encrypted Egress)     │ Profile, workouts, challenge progress.     │
├───────────────────────────┼────────────────────────────────────────────┤
│ 3. Public / Shared        │ Read-only curated or server-aggregated.    │
│    (Global Ingress)       │ Exercise catalog, challenge rules, menus.  │
├───────────────────────────┼────────────────────────────────────────────┤
│ 4. Sensitive Biometrics   │ Strict consent; privacy-preserving schema. │
│    (Special Handling)     │ Weight, height, age, calorie targets.      │
└───────────────────────────┴────────────────────────────────────────────┘
```

### 3.1 Device-Local Data (Zero Egress Under Any Circumstance)
- **Raw Camera Frames**: Video frames captured from `navigator.mediaDevices.getUserMedia()`.
- **MediaPipe Pose Landmarks**: Continuous 33-point Cartesian coordinate vectors ($x, y, z, \text{visibility}$).
- **Instantaneous Joint Angles**: Frame-by-frame trigonometric angles (e.g., knee flexion, elbow angle).
- **Rep State Machine Internal Trackers**: Debounce timers, hysteresis phase tracking, and transient confidence scores.
- **Audio Synthesis Buffers**: Web Audio API oscillator nodes and chime buffers.
- **Transient UI State**: Active modal tabs, drawer expanded states, and scroll positions.
- **Offline Binary Assets**: Downloaded `@mediapipe/pose` WASM binaries and model weights.

### 3.2 User-Owned Synchronized Data (Syncable Only with Explicit User Opt-In)
- **Account Identity**: Cryptographic user ID, authentication provider identifier, account creation timestamp.
- **Public Profile**: Display name, username handle, avatar color/preset, optional hostel wing.
- **Workout History Records**: Completed session summaries (stable ID, timestamp, exercise key, completed reps, duration, posture score).
- **Exam Session Records**: Completed study breaks (stable ID, mode, duration, completed activities).
- **Challenge Progress**: User challenge state (joined timestamp, current units, completed calendar days, completion timestamp).
- **Fitness Preferences**: Target goals, noise tolerance, space requirement, equipment availability, sound preferences.
- **Nutrition Logs**: Logged mess food items, custom meal records, daily water consumption.

### 3.3 Public / Shared Data
- **Exercise Catalog & Biomechanics**: Exercise keys, names, joint chains, depth angles, and lockout thresholds.
- **Campus Challenge Definitions**: Challenge IDs, titles, descriptions, target numbers, units, rules, and durations.
- **Mess Menu Nutrition Data**: Hostel mess meal items, standard portion weights, calories, and macronutrient breakdowns.
- **Aggregated Challenge Milestones (Future)**: Anonymized campus total counts (e.g. "Campus completed 10,000 squats this week").

### 3.4 Sensitive Data & Privacy Guardrails
- **Physical Biometrics (Age, Gender, Height, Weight)**:
  - *Risk*: Personal health profiling, weight stigmatization.
  - *Guardrail*: Stored locally by default. If synced, biometrics must be end-to-end encrypted or isolated from public profile views. They are never exposed to campus friends or leaderboards.
- **Study & Sleep Habits (Exam Mode Logs)**:
  - *Risk*: Inferring student stress levels, academic struggle, or late-night schedules.
  - *Guardrail*: Only aggregate active minutes are exposed; detailed session timestamps remain private to the user.

---

## 4. The Future Sync Boundary & Repository Architecture

UI components must never call remote database SDKs or network clients directly. FitMitra introduces an abstract **Domain Repository Layer** that decouples business logic from persistence.

### 4.1 Architectural Hierarchy

```
       ┌────────────────────────────────────────────────────────┐
       │                 UI Presentation Layer                  │
       │       (HomeDashboard, CampusChallenges, etc.)          │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             Application & Use-Case Layer               │
       │      (WorkoutContext, AuthContext, Engine Services)    │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │          Domain Boundary & Repository Interfaces       │
       │   (IWorkoutHistoryRepository, IChallengeRepository)    │
       └──────────────┬──────────────────────────┬──────────────┘
                      │                          │
       ┌──────────────▼─────────────┐     ┌──────▼─────────────┐
       │ Local Storage Repositories │     │ Future Cloud Sync  │
       │ (LocalWorkoutRepository,   │     │ Repositories       │
       │  LocalChallengeRepository) │     │ (CloudRepository)  │
       └──────────────┬─────────────┘     └──────┬─────────────┘
                      │                          │
                      ▼                          ▼
               [ LocalStorage ]          [ Remote Backend ]
```

### 4.2 Standardized Repository Error Hierarchy

Every repository method returns strongly typed domain models or throws predictable `RepositoryError` instances. UI components handle these errors gracefully without crashing:

```typescript
export type RepositoryErrorCode =
  | 'NotAuthenticated'   // Operation requires an active account
  | 'Offline'            // Operation requires connectivity and queue is full
  | 'PermissionDenied'   // User lacks access to requested resource
  | 'NotFound'           // Entity ID does not exist
  | 'Conflict'           // Concurrent modification conflict (version mismatch)
  | 'ServerError'        // Remote provider 5xx or unrecoverable error
  | 'Unknown';           // Unhandled runtime exception

export class RepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}
```

---

## 5. Authentication Audit & Reality Check

### 5.1 Audit of Existing Authentication
The current `AuthContext` implementation provides:
- Client-side email/username formatting.
- Password minimum-length check ($\ge 4$ characters).
- Immediate generation of mock `usr_${Date.now()}` IDs.
- Direct JSON storage in browser `localStorage`.

### 5.2 Explicit Architectural Clarification
> **CRITICAL REALITY CHECK**:  
> The current authentication mechanism is **demo-only and local-only**. It provides **zero cryptographic security, zero identity verification, and zero data protection against local device access**. Passwords are never hashed, authenticated sessions are not signed, and tokens do not exist.  
> 
> FitMitra will **not** attempt to simulate a "secure" custom password store client-side. When production authentication is introduced, it must be delegated entirely to an industry-standard identity provider (OAuth 2.0 / OIDC, Supabase Auth, Firebase Auth, or Passkeys/WebAuthn).

---

## 6. Future Account & Identity Model

To prevent leaking identity into application features, authentication identity is strictly separated from user application profiles:

### 6.1 Platform-Neutral Account Model (`Account`)
```typescript
export interface Account {
  id: string;                          // Global UUIDv4
  authType: 'anonymous' | 'authenticated';
  provider?: 'email' | 'google' | 'passkey';
  email?: string;
  emailVerified: boolean;
  createdAt: string;                   // ISO 8601 UTC
  updatedAt: string;                   // ISO 8601 UTC
  lastSeenAt: string;                  // ISO 8601 UTC
}
```

### 6.2 Application Profile Model (`DomainUserProfile`)
```typescript
export interface DomainUserProfile {
  accountId: string;                   // References Account.id
  displayName: string;
  username: string;
  avatarColor: string;
  hostelWing?: string;                 // e.g. "Aryabhatta Wing A"
  fitnessGoal: FitnessGoal;
  goals: FitnessGoal[];
  biometrics?: {
    age?: number;
    gender?: 'male' | 'female' | 'other';
    heightCm?: number;
    weightKg?: number;
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very_active';
  };
  preferences: {
    noiseTolerance: NoiseRating;
    space: SpaceRequirement;
    soundMuted: boolean;
    voiceCoachEnabled: boolean;
  };
  createdAt: string;                   // ISO 8601 UTC
  updatedAt: string;                   // ISO 8601 UTC
}
```

---

## 7. Anonymous-First Usage & Account Upgrade Path

### 7.1 Anonymous Mode as a Permanent Baseline
FitMitra preserves anonymous usage as a primary product feature. Users can forever execute:
- AI Pose Coach workouts
- Adaptive Hostel Workout routines
- Exam Mode study breaks
- Local Campus Challenges
- Mess Nutrition tracking
- Privacy Center data export and wiping

**Account creation is never a prerequisite for fitness tracking.**

### 7.2 Explicit, Non-Silent Upgrade Migration Flow
When a user decides to create a cloud account, their local history must never be silently harvested. The transition must follow an explicit, user-governed flow:

```
┌────────────────────────────────────────────────────────┐
│                   1. Local Anonymous                   │
│   All data persisted in browser LocalStorage           │
└───────────────────────────┬────────────────────────────┘
                            │ User clicks "Backup to Cloud"
                            ▼
┌────────────────────────────────────────────────────────┐
│               2. Authenticate Identity                 │
│   OAuth 2.0 / Passkey completes in auth modal          │
└───────────────────────────┬────────────────────────────┘
                            │ Authenticated session established
                            ▼
┌────────────────────────────────────────────────────────┐
│            3. Review Local Data (Preview)              │
│   "We found: 14 workouts, 2 challenge records,         │
│    5 meal entries. Choose what to sync:"               │
│   [x] Profile & Goals                                  │
│   [x] Workout History (14 sessions)                    │
│   [x] Campus Challenge Progress                        │
│   [ ] Mess Nutrition History (exclude)                 │
└───────────────────────────┬────────────────────────────┘
                            │ User reviews and confirms
                            ▼
┌────────────────────────────────────────────────────────┐
│             4. Atomic Migration Upload                 │
│   Transform selected items -> Upload with stable IDs   │
└───────────────────────────┬────────────────────────────┘
                            │ Success response
                            ▼
┌────────────────────────────────────────────────────────┐
│           5. Cloud Account Active & Synced             │
│   Local repository switches to synced cloud adapter    │
└───────────────────────────┘
```

---

## 8. Campus Challenges & Future Leaderboard Boundaries

### 8.1 Separation of Challenge Definition from Participation
In Phase 5, challenges were structured into a local catalog. To prepare for cloud-hosted challenges, the data model cleanly separates static definitions from dynamic student participation:

- **`ChallengeDefinition`** (Curated, Read-Only):
  `id`, `title`, `description`, `category`, `type`, `targetValue`, `unit`, `durationDays`, `rules`, `constraints`.
- **`ChallengeParticipation`** (User-Specific, Mutable):
  `id`, `userId`, `challengeId`, `joinedAt`, `currentValue`, `completedDays`, `processedActivityIds`, `completed`, `completedAt`.

### 8.2 Strict Leaderboard Requirements & Anti-Cheat Boundary
Leaderboards are intentionally **not implemented** in this phase. Before any competitive leaderboard is deployed, the following architectural conditions must be met:

1. **Server-Authoritative Validation**:
   - Client applications submit workout telemetry summaries (exercise key, timestamp, duration, rep timestamps, average cadence).
   - The server validates kinematic feasibility (e.g. flagging impossible cadences such as 100 squats in 30 seconds).
   - Client-submitted arbitrary score counters are never accepted.
2. **Anti-Cheating & Biomechanical Plausibility**:
   - Workouts without verified AI Pose Coach joint tracking cannot enter competitive campus tier rankings (only unranked self-study).
3. **Privacy & Pseudonymity**:
   - Leaderboards default to anonymized handles (e.g., `Runner#4812` or user-chosen public aliases).
   - Real names, emails, and specific hostel room numbers are strictly withheld.
   - Users can toggle `Public Leaderboard Visibility: Off` at any time while retaining challenge participation.
4. **Data Deletion Cascading**:
   - If a student wipes their account or leaves a challenge, their entry is purged from all server ranking caches within 60 seconds.

---

## 9. Conflict Resolution Strategy

When multiple devices synchronize to a single user account, conflicts are resolved deterministically based on data nature:

| Domain Entity | Conflict Strategy | Implementation Mechanism | Rationale |
| :--- | :--- | :--- | :--- |
| **Profile & Settings** | **Last-Write-Wins (LWW)** | Field-level ISO 8601 UTC timestamp comparison (`updatedAt`). | Profiles change infrequently; user expects latest device edit to prevail. |
| **Workout History** | **Append-Only with Stable IDs** | Cryptographically stable UUIDv4 (`work_uuid4`). Duplicates deduplicated on `id`. | A completed workout on Phone A and another on Laptop B are both valid and must both be preserved. |
| **Exam Session Records** | **Append-Only with Stable IDs** | Stable session UUIDs. Merged into chronological order. | Study breaks are immutable historical events. |
| **Challenge Progress** | **Event-Sourced Recalculation** | Recompute progress from union of deduplicated `processedActivityIds` and verified workout records. | Blindly overwriting total counters causes lost reps. Recomputing from atomic session IDs guarantees mathematical accuracy. |
| **Nutrition Logs** | **Append-Only Meals** | Unique `meal_uuid4` per logged food entry. | Prevents simultaneous breakfast and lunch entries on different devices from clobbering each other. |

---

## 10. Identifiers & Timestamp Standardization

### 10.1 Stable Identifiers
- Array indexes are **never** used as persistent identifiers.
- Entity IDs follow the format `<prefix>_<timestamp>_<random>`:
  - Account: `acc_<timestamp>_<hex>`
  - Profile: `prof_<timestamp>_<hex>`
  - Workout: `work_<timestamp>_<hex>`
  - Exam Session: `exam_<timestamp>_<hex>`
  - Challenge Participation: `part_<userId>_<challengeId>`
- All IDs are immutable once generated.

### 10.2 ISO 8601 UTC Timestamps
All domain models use strict ISO 8601 UTC representation:
```text
YYYY-MM-DDTHH:mm:ss.sssZ
Example: "2026-09-26T17:40:00.000Z"
```
No locale-formatted date strings (e.g. `"Sept 2026"`, `"Mon, 26 Sep"`) are permitted inside persistent domain storage. Locale formatting is isolated strictly to presentation components at render time.

---

## 11. Objective Backend Technology Evaluation

FitMitra's requirements:
- Local-first architecture with offline resilience.
- Next.js 14 App Router static export (`output: 'export'`) hosting on GitHub Pages or custom CDN.
- Future native Android application interoperability.
- High privacy standards (no vendor vendor-lock on personal health telemetry).
- Zero-cost or micro-cost student project sustainability.

### Comparative Engineering Analysis

| Dimension | Option A: Supabase (PostgreSQL) | Option B: Firebase (Firestore / Auth) | Option C: Custom API (Go / Node + Postgres) | Option D: Cloudflare Workers + D1 (SQLite) |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Built-in GoTrue (Email, OAuth, Magic Links). Easy Android SDK. | Firebase Auth (Mature, multi-platform, robust phone auth). | Custom JWT / OAuth. High implementation burden. | Cloudflare Zero Trust or Clerk/Auth0 integration needed. |
| **Database** | Relational PostgreSQL with Row-Level Security (RLS). | NoSQL Document Store (Firestore). | Relational PostgreSQL with full SQL control. | Serverless SQLite at the edge (D1). |
| **Offline Synchronization** | Manual offline sync (requires client queueing library like RxDB or custom sync). | Native client SDK offline cache & automatic document sync. | Custom offline queueing & sync protocol needed. | Custom HTTP sync protocol needed. |
| **Static Export Compatibility** | 100% compatible. Direct client SDK calls via HTTPS/WSS. | 100% compatible. Direct client SDK calls. | 100% compatible. Direct REST/GraphQL calls. | 100% compatible. Direct REST calls to Workers. |
| **Android Interoperability** | Official Kotlin SDK available. Direct Postgres via PostgREST. | Official Firebase Android SDK with deep OS integration. | Platform-agnostic REST/JSON clients (Retrofit/Ktor). | Platform-agnostic REST/JSON clients. |
| **Privacy & Data Portability** | Outstanding. Standard PostgreSQL dump; full user data ownership; easily self-hosted via Docker. | Poor to moderate. Proprietary document schema; migration requires custom ETL pipelines. | Outstanding. Full database control and self-hosting. | Good. Standard SQLite database exports. |
| **Complexity & Maintenance** | Low-to-moderate. Managed platform; declarative SQL migrations. | Low. Managed serverless backend; complex security rule syntax. | High. Requires VM/container management, patching, CI/CD, SSL, backups. | Moderate. Edge TypeScript functions + D1 migrations. |
| **Cost at Scale (Hostel Audience)** | Free tier generous (500MB DB, 50k MAU). Predictable flat pricing ($25/mo). | Generous free tier, but read/write spikes can cause sudden cost escalations. | Server cost (e.g. $5-$10/mo VPS) fixed regardless of read/write volume. | Free tier extremely generous (5M requests/mo, 5GB storage). |
| **Vendor Lock-In** | Low. Can be self-hosted on any Linux VPS using open-source Supabase stack. | High. Tight proprietary coupling to Google Cloud Platform. | Zero. 100% portable open-source code. | Low-to-moderate. Cloudflare Workers API binding. |

### Technical Summary
- **Supabase (Option A)** provides the strongest balance of data portability (PostgreSQL + RLS), Android compatibility, and self-hostability without requiring custom backend server maintenance.
- **Firebase (Option B)** offers the easiest out-of-the-box offline synchronization for simple documents, but carries high vendor lock-in and non-relational query limitations for campus aggregations.
- **Custom API (Option C)** provides absolute flexibility, but imposes unnecessary DevOps and infrastructure maintenance overhead on a student-focused project.
- **Cloudflare D1 (Option D)** provides a fast, modern edge option with zero maintenance, but requires assembling third-party authentication and Android SDK tooling.

---

## 12. Android Migration Portability

To prepare for an upcoming native Android (Kotlin / Jetpack Compose) client sharing the same conceptual backend, the domain models must be cleanly isolated:

### 12.1 Browser/DOM Decoupling Checklist
- [x] **Zero DOM References**: Models must not import or reference `HTMLElement`, `window`, `document`, or `navigator`.
- [x] **Zero Web Storage Coupling**: Domain logic must not directly call `window.localStorage` or `window.sessionStorage`. All storage is mediated by `IWorkoutHistoryRepository`, `IChallengeRepository`, and `IUserRepository`.
- [x] **Zero MediaPipe Web API Leaks**: The AI Pose Coach domain contracts define abstract landmarks, rep events, and angles without depending on `@mediapipe/camera_utils` or WebGL contexts. Android will substitute Google ML Kit Pose Detection or MediaPipe Android SDK.
- [x] **Primitive Types Only**: Domain entities use primitive JSON-serializable types (`string`, `number`, `boolean`, arrays, plain objects) matching Kotlin `data class` serialization (`kotlinx.serialization`).

---

## 13. Minimal Feature Flags Architecture

A simple, typed configuration toggles capabilities across development, offline demonstration, and future cloud environments:

```typescript
export interface FeatureFlags {
  cloudSync: boolean;           // Default: false (Local-first)
  accounts: boolean;            // Default: false (Anonymous mode)
  serverLeaderboards: boolean;  // Default: false (Privacy-first)
  campusChallenges: boolean;    // Default: true (Local catalog)
  adaptiveHostelEngine: boolean;// Default: true (Active)
  examMode: boolean;            // Default: true (Active)
  aiPoseCoach: boolean;         // Default: true (Active)
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  cloudSync: false,
  accounts: false,
  serverLeaderboards: false,
  campusChallenges: true,
  adaptiveHostelEngine: true,
  examMode: true,
  aiPoseCoach: true,
};
```

---

## 14. Unresolved Decisions & Open Questions

The following decisions are intentionally deferred until Phase 7:
1. **Campus Domain Verification**: Whether `.edu.in` or college email verification should be required to join campus-specific wings, or if self-declared hostel wing selection is sufficient.
2. **End-to-End Encryption for Biometrics**: Evaluating whether physical metrics (height/weight) should be encrypted client-side using a user-derived WebCrypto key prior to cloud sync.
3. **P2P Local Mesh (WebRTC/Wi-Fi Direct)**: Exploring local dormitory peer-to-peer sync without an internet connection for roommate challenge leaderboards.
