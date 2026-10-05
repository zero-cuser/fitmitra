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
