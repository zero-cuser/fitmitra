# FitMitra Architecture Specification: Android Production Readiness & Feature Porting

**Phase**: 9 — Android Production Architecture & Core Feature Porting  
**Package Namespace**: `com.fitmitra`  
**Status**: Implemented & Verified  
**Date**: October 2026  

---

## 1. Executive Summary

FitMitra Phase 9 transitions the native Android implementation from an exploratory technical spike into a **production-oriented architecture foundation**.

The Android client (`com.fitmitra`) now natively executes the primary end-to-end workout pipeline:
1. **Home Screen** (Daily streak, lifetime totals, Level/XP progression, quick starts)
2. **Adaptive Hostel Workout Selection** (Deterministic constraint solver for duration, space, noise, equipment)
3. **Workout Setup** (Phone placement tips, noise/space requirements, on-device privacy guarantee)
4. **AI Pose Coach** (Real-time CameraX preview, on-device ML Kit pose detection, landmark normalization, rep state machine, audio chirps, voice coaching, discreet telemetry)
5. **Session Completion** (Celebratory summary, reps, duration, calories, XP rewards, streak retention)
6. **Progress & Streaks** (Lifetime metrics, daily streak calculations, DataStore persistence)
7. **Exam Mode** (2-min Reset, 5-min Break, 10-min Recharge with drift-free `ElapsedTimerController`)
8. **Campus Challenges** (Hostel 100 Squat Sprint, Midnight Desk Reset, 7-Day Consistency Run)

---

## 2. Layered Architecture

```text
com.fitmitra
├── MainActivity.kt                      [Single Activity host with EdgeToEdge]
├── navigation/
│   ├── Screen.kt                        [Type-safe Screen sealed interface & AppNavigationState]
│   └── FitMitraApp.kt                   [Root composable, DI wiring, backstack routing]
├── core/
│   ├── theme/
│   │   ├── FitMitraColors.kt            [Dark & Energetic color design tokens matching web]
│   │   └── FitMitraTheme.kt             [Material 3 dark color scheme mapping]
│   ├── domain/
│   │   ├── models/
│   │   │   ├── DomainTypes.kt           [ExerciseKey, Goals, Space, Noise, Constraints, Summaries]
│   │   │   └── PoseContracts.kt         [Normalized PoseLandmark, PoseFrame, WorkoutFeedbackEvent]
│   │   ├── exercises/
│   │   │   └── ExerciseCatalog.kt       [5 catalog exercises with exact web domain threshold parity]
│   │   ├── pose/
│   │   │   ├── AngleMath.kt             [2D planar angle math, EMA smoothing, confidence gating]
│   │   │   └── ExerciseTracker.kt       [Universal deterministic kinematic tracker for all 5 exercises]
│   │   ├── workouts/
│   │   │   └── WorkoutRules.kt          [Calories per rep, XP progression curves, session summaries]
│   │   ├── adaptive/
│   │   │   └── AdaptiveEngine.kt        [Deterministic hostel constraint solver]
│   │   ├── exam/
│   │   │   ├── ExamEngine.kt            [2m Reset, 5m Break, 10m Recharge activity configurations]
│   │   │   └── ElapsedTimer.kt          [Wall-clock delta timer controller preventing drift]
│   │   ├── challenges/
│   │   │   └── ChallengeRules.kt        [Campus challenges, percentages, idempotent activity recorder]
│   │   └── progress/
│   │       └── ProgressStats.kt         [Current streak, longest streak, weekly aggregation]
│   └── platform/
│       ├── interfaces/
│       │   ├── CameraProvider.kt        [ICameraProvider contract]
│       │   ├── PoseDetector.kt          [IPoseDetector analyzer contract]
│       │   ├── AudioPlayer.kt           [IAudioPlayer & AudioCue contract]
│       │   ├── SpeechProvider.kt        [ISpeechProvider voice coach contract]
│       │   └── AppStorage.kt            [IAppStorage asynchronous key-value contract]
│       └── android/
│           ├── CameraXProvider.kt       [CameraX streaming with STRATEGY_KEEP_ONLY_LATEST]
│           ├── CoordinateNormalizer.kt  [Normalized [0, 1] domain coordinate mapper with mirroring]
│           ├── MlKitPoseDetector.kt     [100% on-device ML Kit pose detection in STREAM_MODE]
│           ├── AndroidAudioPlayer.kt    [Low-latency synthesized tones via Android ToneGenerator]
│           ├── AndroidSpeechProvider.kt [Android TextToSpeech engine with 4-second lockout throttle]
│           └── DataStoreAppStorage.kt   [Asynchronous, thread-safe Jetpack Preferences DataStore]
└── feature/
    ├── home/
    │   ├── HomeScreen.kt
    │   └── HomeViewModel.kt
    ├── workout/
    │   ├── selection/
    │   │   ├── WorkoutSelectionScreen.kt
    │   │   └── WorkoutSelectionViewModel.kt
    │   └── setup/
    │       └── WorkoutSetupScreen.kt
    ├── posecoach/
    │   ├── PoseCoachScreen.kt
    │   └── PoseCoachViewModel.kt
    ├── completion/
    │   └── CompletionScreen.kt
    ├── progress/
    │   ├── ProgressScreen.kt
    │   └── ProgressViewModel.kt
    ├── exam/
    │   ├── ExamScreen.kt
    │   └── ExamViewModel.kt
    └── challenges/
        ├── ChallengesScreen.kt
        └── ChallengesViewModel.kt
```

---

## 3. Platform Implementations & Concrete Adapters

### 3.1 Camera & Pose Pipeline
- **Streaming Pipeline**: `CameraXProvider` binds CameraX to the active `LifecycleOwner` and streams YUV-420-888 image proxies using `ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST`. This prevents memory leaks and frame buffer stalls if the device encounters a heavy frame.
- **On-Device Inference**: `MlKitPoseDetector` processes `InputImage` locally on CPU/GPU without cloud network calls.
- **Orientation & Normalization**: `CoordinateNormalizer` normalizes raw pixel coordinates into $[0, 1]$ relative coordinates and applies horizontal reflection for front-facing selfie cameras.

### 3.2 Feedback & Audio Systems
- **Audio Cues**: `AndroidAudioPlayer` uses the system `ToneGenerator` to synthesize instant affirmative rep beeps, countdown ticks, and workout completion sounds without audio asset loading overhead.
- **Voice Coaching**: `AndroidSpeechProvider` wraps Android `TextToSpeech` with a 4-second cooldown throttle for informational cues, while allowing rep completions and completion alerts to queue immediately.

### 3.3 Storage & Persistence
- **Jetpack DataStore**: `DataStoreAppStorage` asynchronously writes user streaks, lifetime workout counts, and XP totals to disk via Kotlin Coroutines.

---

## 4. Verification & Test Coverage

### 4.1 Android Test Suite
- Total Android Unit Tests: **44 passed, 0 failed** (Run duration: 2m 5s).
- Tested Modules:
  - `ExerciseCatalogTest`: Threshold validity, catalog completeness.
  - `AngleMathTest`: Planar geometry, EMA landmark filtering, confidence gating.
  - `WorkoutRulesTest`: Calorie formulas, XP formulas, level progression.
  - `AdaptiveEngineTest`: Duration scaling, noise exclusion (jumping jack filter), space exclusion.
  - `ExamEngineTest`: 120s Reset, 300s Break, 600s Recharge validity.
  - `ElapsedTimerTest`: Pause, resume, skip, wall-clock drift-free step execution.
  - `ChallengeRulesTest`: Percentage calculation, idempotent activity deduplication.
  - `ProgressStatsTest`: Streak continuity, broken streaks, weekly totals.
  - `ExerciseTrackerTest`: Biomechanical state machine transitions (UP -> DESCENDING -> DOWN -> ASCENDING -> UP) and rep debouncing.
  - `WorkoutSelectionViewModelTest`: Reactive solver updates.
  - `ExamViewModelTest`: Session state transitions.
  - `HomeViewModelTest`: Metric hydration.

### 4.2 Android Build Verification
- Task `:app:assembleDebug` completed successfully with `BUILD SUCCESSFUL` (18 executed, 18 up-to-date).

### 4.3 Web Regression Verification
- Web Test Suite (`npm test`): **248 passed, 0 failed** across 54 test suites.
- TypeScript Typecheck (`npx tsc --noEmit`): **0 errors**.
- Next.js Production Build (`npm run build`): Generated optimized static export with `out/.nojekyll` present.

---

## 5. Privacy & Offline Integrity

- **100% On-Device Pose Processing**: Video frames never leave the device. ML Kit runs locally in `STREAM_MODE`.
- **Zero Cloud Video Ingestion**: No network requests are made during camera analysis.
- **Local Persistence**: User workouts and streaks remain device-local in Jetpack DataStore.

---

## 6. Phase 10: Android Production Hardening, QA & Release Readiness

### 6.1 Production Defect Audit & Resolutions
During the Phase 10 audit, critical production defects were identified and systematically resolved:

1. **P0 — CameraX & ML Kit Resource Leak**:
   - *Defect*: `AndroidView.factory` in `PoseCoachScreen` instantiated `CameraXProvider` and `MlKitPoseDetector` without a disposal hook. Leaving the screen left camera streams and ML Kit executors running in background.
   - *Fix*: Wrapped both in `remember` and attached a `DisposableEffect(lifecycleOwner)` that invokes `cameraProvider.release()` and `poseDetector.close()` when the screen is disposed or unmounted.

2. **P0 — Cancelled Workout Counted as Completed & Inflated Streak**:
   - *Defect*: Exiting workout early previously triggered `finishEarly()`, marking `isCompleted = true` and incrementing total workouts and daily streaks even with 0 reps.
   - *Fix*: Introduced explicit `cancelWorkout()` transitioning session state to `CANCELLED`. In `WorkoutRepository`, `recordCompletedSession` enforces `if (!summary.isCompleted) return false`, preventing cancelled workouts from entering summaries, streaks, or lifetime metrics.

3. **P0 — Same-Day Streak Inflation**:
   - *Defect*: Previous implementation incremented streak on every completed session (`store.putInt(streak + 1)`), so 3 workouts on the same day recorded a 3-day streak.
   - *Fix*: Integrated domain `ProgressStats.calculateStreak(completedTimestamps)`, deduplicating same-day workouts and strictly evaluating consecutive calendar days.

4. **P0 — Non-Idempotent Session Completion**:
   - *Defect*: Rapid button presses or multiple completion frames could fire `completeSession` repeatedly, saving multiple copies of the same session.
   - *Fix*: Added atomic `isCompletingOrDone` boolean gate in `PoseCoachViewModel` and session ID deduplication in `WorkoutRepository.recordCompletedSession` (`if (existing.any { it.id == summary.id }) return false`).

5. **P1 — Disconnected Campus Challenges**:
   - *Defect*: Challenges previously displayed static mock values.
   - *Fix*: Connected `ChallengesViewModel` to `WorkoutRepository.getChallengeParticipations()`, which persists and updates challenge states idempotently via `ChallengeRules.recordActivity`.

6. **P1 — Non-Zero First Launch Defaults**:
   - *Defect*: Fresh installations fell back to mock data (6 workouts, 4-day streak).
   - *Fix*: Enforced clean zero-value fallback on fresh installations (0 workouts, 0 reps, 0 calories, 0 XP, 0 streak).

7. **P1 — Unhandled Camera Streaming Failure**:
   - *Defect*: CameraX binding errors caused silent failures resulting in a black preview.
   - *Fix*: Added `FAILED` state to `WorkoutSessionState`, captured streaming exceptions in `reportCameraError(error)`, and surfaced an accessible error recovery card with "Retry Camera" and "Exit Workout" buttons.

8. **P2 — Missing Production ProGuard Rules & Manifest Security**:
   - *Fix*: Configured `proguard-rules.pro` with keep rules for domain models, CameraX, ML Kit, Compose, and DataStore. Set `android:allowBackup="false"`, `android:usesCleartextTraffic="false"`, and declared `<meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="pose" />` for Play Store install-time model delivery.

9. **P2 — Accessibility & Interactive Touch Target Standards**:
   - *Fix*: Added accessibility semantics (`Role.Button`, descriptive `contentDescription`), `LaunchedEffect` auto-refresh hooks, and enforced minimum 48dp touch targets across `HomeScreen`, `ProgressScreen`, `ChallengesScreen`, and `PoseCoachScreen`.

---

## 7. Final Verification & Test Matrix

| Test Suite | Result | Execution Time | Scope / Details |
| :--- | :--- | :--- | :--- |
| **Android Unit Tests** | **56 / 56 PASS** | 3m 10s | Domain rules, tracker state machines, `WorkoutRepository` idempotency, streak deduplication, `PoseCoachViewModel` transitions |
| **Android Debug APK** | **BUILD SUCCESS** | 3m 49s | `app-debug.apk` (88.7 MB) generated at `C:/Users/lenovo/.gradle/fitmitra-build/app/outputs/apk/debug/` |
| **Web Regression Tests** | **248 / 248 PASS** | 6.98s | 54 test suites: exercise kinematics, threshold validation, Adaptive Engine, Exam Mode, storage parsing |
| **TypeScript Typecheck** | **0 ERRORS** | ~18s | Complete strict typecheck via `npx tsc --noEmit` |
| **Next.js Production Build** | **SUCCESS** | ~35s | Static export generated in `out/`, verified `out/.nojekyll` |

---

## 8. Release Readiness Assessment

- **Stability**: Camera lifecycle and background tasks are fully bound to Android lifecycle owners. No thread or memory leaks.
- **Data Integrity**: Idempotent persistence layer guarantees no double-counting or streak inflation.
- **Privacy Compliance**: All pose detection and workout history remain strictly 100% on-device. No network egress.
- **Release Status**: **Production Hardened & Ready for Internal Controlled Release**.

