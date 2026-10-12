# FitMitra — Phase 11 Release Notes

**Build Identifier**: `1.0.0-rc1`  
**Version Code**: `1`  
**Target Platform**: Android 7.0+ (API 24 to 36)  
**Distribution Channel**: Internal Testing / Dogfood Release  
**Release Date**: October 2026  

---

## 1. Overview

FitMitra `1.0.0-rc1` is the first production release candidate of the native Android application designed specifically for students living in hostels, dormitories, and shared flats. It delivers an intelligent, privacy-first movement and fitness experience tailored to constrained spaces, low noise requirements, and study breaks.

---

## 2. Implemented Features

### 2.1 Adaptive Hostel Workout Engine
- **Deterministic Routine Generator**: Takes time constraints (2 to 30 minutes), room space restrictions (Tiny, Small, Medium, Large), noise tolerance (Silent, Low, Moderate, High), and available hostel equipment (Chair, Wall, Mat, None) to calculate optimal workout routines.
- **Explainable Constraints**: Displays transparent rationale for why each exercise was selected or excluded.

### 2.2 AI Pose Coach
- **On-Device Vision Pipeline**: Utilizes CameraX and Google ML Kit Pose Detection running entirely on-device in `STREAM_MODE`.
- **Universal Kinematic Tracker**: Evaluates 2D planar joint angles, EMA landmark smoothing, multi-tier confidence gating, and hysteresis threshold transitions for all 5 catalog exercises:
  - Bodyweight Squats (hip-knee-ankle flexion/extension)
  - Push-Ups (shoulder-elbow-wrist chain)
  - Forward Lunges (lead leg knee flexion)
  - Jumping Jacks (arm abduction / overhead reach)
  - Forearm Plank (isometric hold alignment and hip deviation detection)
- **Real-Time Coaching & Audio**: Low-latency affirmative audio cues synthesized via `ToneGenerator`, live voice prompts via Android `TextToSpeech` with a 4-second feedback throttle, and a one-tap mute button for silent midnight workouts.

### 2.3 Exam Mode
- **Quick Study Micro-Breaks**: 2-minute Reset, 5-minute Break, and 10-minute Recharge sessions designed to fit between intense study intervals.
- **Drift-Free Wall-Clock Timer**: Backed by `ElapsedTimerController` ensuring exact interval timing even if the UI experiences rendering frame pauses.

### 2.4 Campus Challenges
- **Built-in Hostel Challenges**:
  - *Hostel 100 Squat Sprint* (100 total squat reps)
  - *Midnight Desk Reset* (50 quiet movement reps)
  - *7-Day Exam Mode Streak* (7 consecutive active days)
- **Deduplicated Progress Tracking**: Challenges automatically update upon valid workout completion with idempotency guarantees.

### 2.5 Progress, Streaks & Gamification
- **True Calendar Streaks**: Evaluates consecutive calendar day intervals without multi-counting same-day workouts.
- **Lifetime Aggregates**: Tracks total completed workouts, total reps, estimated calories, and XP earned with level progression.
- **Zero-Value First Launch**: Clean defaults (0 workouts, 0 reps, 0 XP, Level 1) without misleading dummy data.

---

## 3. Permissions & System Access

FitMitra adheres to minimal privilege principles:

| Permission | Purpose | Network Access |
| :--- | :--- | :--- |
| `android.permission.CAMERA` | Exclusively for on-device real-time pose landmark detection | **None** |
| `android.permission.INTERNET` | **NOT REQUESTED** (Omitted from manifest) | **Blocked at OS Level** |

Camera frames are processed in volatile memory as direct byte buffers (`ImageProxy`) and immediately closed. No images, videos, or raw coordinates are ever saved to disk or transmitted over any network.

---

## 4. Offline Capabilities

- **100% Offline-First Architecture**: FitMitra requires zero internet connectivity to function.
- **Pre-Bundled ML Models**: ML Kit Pose Detection is declared via `com.google.mlkit.vision.DEPENDENCIES` metadata, ensuring models are present at installation.
- **Local Jetpack DataStore**: All user history, preferences, active challenges, and workout summaries persist locally in private app storage (`fitmitra_store.preferences_pb`).

---

## 5. Known Limitations (Acceptable for Internal Dogfood)

1. **Portrait Phone Placement**: The Pose Coach UI and coordinate normalizer are optimized for portrait orientation with the phone propped against a desk, books, or hostel bed post.
2. **Lighting Requirements**: As with all optical computer vision, very dim lighting (< 50 lux) can degrade landmark confidence scores. Testers should ensure basic room lighting.
3. **Audio Synthesis Flexibility**: Audio feedback utilizes synthesized system tones (`ToneGenerator`). Custom sampled sound packs will be introduced in subsequent updates.
4. **Local Device Isolation**: Workout history does not synchronize across multiple devices because FitMitra has no cloud backend.

---

## 6. Installation & Update Instructions

### Option A: Via ADB (Developer / Technical Testers)
1. Enable **Developer Options** and **USB Debugging** on the Android device.
2. Connect device via USB.
3. Install the signed test candidate:
   ```bash
   adb install -r C:\Users\lenovo\.gradle\fitmitra-build\app\outputs\apk\debug\app-debug.apk
   ```

### Option B: Local APK Sideloading
1. Transfer `app-debug.apk` to the device storage via USB or local file sharing.
2. Open Files/Downloads on the device and tap `app-debug.apk`.
3. If prompted, allow "Install from this source" in Android Settings.
4. Complete installation and launch **FitMitra** from the app launcher.

---

## 7. How to Report Bugs & Provide Feedback

Submit issues using the privacy-conscious feedback template documented in `docs/testing/real-world-validation-protocol.md`:
- Include device model, Android OS version, and exact reproduction steps.
- **Do NOT** attach photos of yourself or camera screen recordings.
- Report all findings to the FitMitra internal test coordinator.

---

## 8. Data Removal & Uninstallation

Testers have complete control over all data generated during testing:
- **Wipe All Workout Data**: Navigate to **Android Settings > Apps > FitMitra > Storage & Cache > Clear Storage**.
- **Full Removal**: Long-press FitMitra on the home screen and select **Uninstall**. This irreversibly destroys the local DataStore file.
