# FitMitra Architecture Specification: Android Extraction & Portability Audit

**Phase**: 7 — Android Architecture Extraction  
**Status**: Adopted & Implemented  
**Date**: October 2026  
**Target Environments**: 
- **Web Client**: Next.js 14 App Router, React 18, Web Audio, Web Speech, MediaPipe Web WASM, Tailwind CSS
- **Future Native Android Client**: Kotlin, Jetpack Compose, CameraX, Google ML Kit / MediaPipe Android, SoundPool, Android TTS, Jetpack DataStore / Room

---

## 1. Executive Summary & Extraction Architecture

FitMitra's core value proposition—intelligent, on-device pose coaching, adaptive hostel room workout constraint solving, and exam study resets—is completely independent of any web browser or UI framework.

The Phase 7 extraction establishes a strict unidirectional boundary:

```text
                      +---------------------------------------+
                      |         FitMitra Domain / Core        |
                      |   (Pure TypeScript / Kotlin Correlate)|
                      | - Exercise Catalog & Biomechanics     |
                      | - Rep Detection & Kinematic Math      |
                      | - Adaptive Hostel Constraint Solver   |
                      | - Exam Mode Study Break Rules         |
                      | - Campus Challenge Event Logic        |
                      | - Progress, Streak & Calorie Formulas |
                      +-------------------+-------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
        +-------------------------------+   +-------------------------------+
        |    Web Application Layer      |   |    Android App Layer (Future) |
        |        (Next.js / React)      |   |      (Kotlin / Compose)       |
        | - Camera: navigator.mediaDevices | - Camera: CameraX               |
        | - Pose: MediaPipe Web WASM    |   | - Pose: ML Kit / MediaPipe SDK|
        | - Audio: Web Audio API        |   | - Audio: SoundPool / Oboe     |
        | - Speech: SpeechSynthesis API |   | - Speech: Android TextToSpeech|
        | - Storage: WebLocalStorage    |   | - Storage: Room / DataStore   |
        | - UI: React 18 + Tailwind     |   | - UI: Jetpack Compose         |
        +-------------------------------+   +-------------------------------+
```

The domain layer contains **zero imports** of React, Next.js, DOM APIs, Canvas, Web Audio, Web Speech, or browser storage.

---

## 2. Platform Capability Mapping Matrix

| Capability | Current Web Implementation | Future Native Android Implementation | Domain Abstraction Interface | Portability Status |
| :--- | :--- | :--- | :--- | :--- |
| **UI Framework** | Next.js 14 App Router, React 18, Tailwind CSS | Jetpack Compose, Material 3, Android Views | Decoupled UI / Presentation Layer | Isolated to Web client |
| **Camera Feed** | `navigator.mediaDevices.getUserMedia()` | Android CameraX (`ProcessCameraProvider`) | `ICameraProvider` | Abstracted in `src/platform/` |
| **Pose Detection** | `@mediapipe/pose` (WebAssembly + WebGL) | Google ML Kit Pose Detection or MediaPipe Tasks Vision Android | `IPoseDetector`, `PoseFrame`, `PoseLandmark` | Abstracted in `src/platform/` |
| **Visual Skeleton Rendering** | HTML5 `<canvas>` 2D Context | Android Compose Canvas / SurfaceView graphics | Event emission (`TelemetryResult`) | Web-only rendering retained |
| **Audio Effects** | Web Audio API (`AudioContext`, OscillatorNode) | Android `SoundPool` / `AudioTrack` | `IAudioPlayer`, `AudioCue` | Abstracted in `src/platform/` |
| **Voice Coach** | Web Speech API (`window.speechSynthesis`) | Android `android.speech.tts.TextToSpeech` | `ISpeechProvider` | Abstracted in `src/platform/` |
| **Persistent Storage** | Browser `window.localStorage` via `storageSafety.ts` | Jetpack DataStore / Room SQLite Database | `IAppStorage`, `IWorkoutHistoryRepository` | Abstracted in `src/domain/repositories/` |
| **Elapsed Time Tracking** | `Date.now()` delta math + `requestAnimationFrame` | `SystemClock.elapsedRealtime()` + Kotlin Coroutines | `ElapsedTimerController` | Pure domain in `src/domain/exam/` |
| **Frame Loop Pump** | `requestAnimationFrame` / `cancelAnimationFrame` | CameraX `ImageAnalysis.Analyzer` frame callback | `FramePumpController` | Abstracted in `src/platform/` |

---

## 3. Comprehensive Browser API Audit & Classification

A codebase-wide audit cataloged every browser-specific API and classified its extraction path:

### 3.1 Already Abstracted
1. **`localStorage` / `sessionStorage`**:
   - *Status*: Mediated by `IWorkoutHistoryRepository`, `IChallengeRepository`, `IUserRepository`, and `IAppStorage`.
   - *Domain Impact*: Zero direct calls from domain logic.
2. **Deterministic Elapsed Timers (`setInterval` drift prevention)**:
   - *Status*: Extracted into pure wall-clock timestamp delta calculations in `ElapsedTimerController`.
   - *Domain Impact*: Timer logic evaluates monotonic deltas without requiring browser timing threads.
3. **Kinematic Angle Math (`calculateAngle`, `smoothLandmarksEMA`)**:
   - *Status*: Pure Euclidean trigonometric functions in `src/domain/pose/angleMath.ts`.
   - *Domain Impact*: Operates on normalized $\{x, y, z\}$ coordinates regardless of input source.
4. **Adaptive Workout Constraint Solver**:
   - *Status*: Pure constraint satisfaction function in `src/domain/adaptive/`.
   - *Domain Impact*: 100% deterministic, zero dependencies.
5. **Campus Challenge Event Logic**:
   - *Status*: Pure activity processing function with deduplication in `src/domain/challenges/`.
   - *Domain Impact*: Processes domain records; storage is decoupled.

### 3.2 Abstracted in Phase 7 via Platform Interfaces
1. **Camera Provider**:
   - *Interface*: `ICameraProvider` (`src/platform/cameraProvider.ts`).
   - *Web Adapter*: `WebCameraProvider` wraps `navigator.mediaDevices.getUserMedia()`.
   - *Android Future*: Kotlin `CameraXProvider` implementing CameraX lifecycle.
2. **Audio & Sound Player**:
   - *Interface*: `IAudioPlayer` (`src/platform/audioPlayer.ts`).
   - *Web Adapter*: `WebAudioPlayer` using Web Audio API synthesis.
   - *Android Future*: Android `SoundPoolPlayer` playing local `.ogg`/`.wav` assets.
3. **Voice Coaching**:
   - *Interface*: `ISpeechProvider` (`src/platform/speechProvider.ts`).
   - *Web Adapter*: `WebSpeechProvider` using `window.speechSynthesis`.
   - *Android Future*: Android `AndroidTextToSpeechProvider`.
4. **Normalized Pose Pipeline**:
   - *Interface*: `IPoseDetector` (`src/platform/poseDetector.ts`).
   - *Normalized Data*: `PoseFrame`, `PoseLandmark` ($x, y, z, \text{visibility}$).
   - *Web Adapter*: Bridges `@mediapipe/pose` outputs to normalized `PoseFrame`.
   - *Android Future*: Bridges ML Kit `Pose` object to identical `PoseFrame`.

### 3.3 Web-Only and Intentionally Retained
1. **Canvas 2D Skeleton Drawing (`CameraView.tsx`)**:
   - Drawing skeletal lines on an HTML5 `<video>` overlay is strictly presentation logic. In Android, Compose Canvas drawing handles this natively.
2. **Next.js Static Export & Routing**:
   - `next/navigation`, `next/font`, and App Router layouts remain in the Next.js shell (`src/app/`, `src/components/`).
3. **Tailwind CSS & DOM Classes**:
   - Style tokens (`#080F19`, `#3866FF`) will be mapped to Android Jetpack Compose `Color` and `Theme` constants.

---

## 4. Domain Layer Purity Guarantee

To prevent regression during future development, the following architectural rule is established:

> **ARCHITECTURAL INVARIANT**:  
> No file in `src/domain/` may import:
> - `react` or `react-dom`
> - `next/*`
> - `canvas-confetti`
> - `@mediapipe/pose` or `@mediapipe/camera_utils`
> - Global browser references (`window`, `document`, `navigator`, `localStorage`)
> 
> All domain entities must be instantiable, executable, and testable inside a headless Node.js process without polyfills.

---

## 5. Android Migration Roadmap (Phase 8+)

When native Android development begins:
1. **Kotlin Multiplatform (KMP) or Direct Porting**:
   - Because all domain entities in `src/domain/` are pure algorithms and plain objects, they map 1:1 to Kotlin `data class` definitions and pure Kotlin functions.
2. **CameraX & ML Kit Wiring**:
   - Android will bind CameraX preview to a `SurfaceView` and forward image proxy buffers to ML Kit Pose Detection.
   - The resulting 33 landmarks will be passed directly into the ported Kotlin `evaluateExerciseTelemetry()` function.
3. **Jetpack Compose UI**:
   - Android will consume domain events (`RepCompleted`, `SetCompleted`, `FormFault`) to update Compose state (`remember`, `mutableStateOf`) and trigger `SoundPool` cues.
