# FitMitra — Internal Tester Onboarding Guide

**Target Version**: `1.0.0-rc1` (Build 1)  
**Audience**: Internal Student Beta Testers & Dogfood Participants  
**Updated**: October 2026  

---

## 1. Supported Devices & Compatibility

Compatibility is grounded in automated and manual verification:

- **Minimum Android Version**: Android 7.0 (Nougat, API 24)
- **Target Android Version**: Android 16 (API 36)
- **Verified Platforms**:
  - Android 14 / 15 (ARM64 physical devices and emulators)
  - Android 12 / 13 (Standard 1080p and 720p aspect ratios)
- **Hardware Requirements**:
  - Front-facing selfie camera (minimum 720p recommended)
  - At least 2 GB RAM (3+ GB recommended for smooth 30 FPS ML inference)
  - Hardware accelerated OpenGL ES 2.0+ for Compose rendering

*Note: Compatibility is verified on modern ARM64 devices and API 34+ emulators. Testers on older 32-bit devices should report any performance discrepancies.*

---

## 2. Installation & Permissions

### Step 1: Install the Candidate Build
Obtain `app-debug.apk` from the internal distribution source and install it using ADB or your device's file manager:
```bash
adb install -r app-debug.apk
```

### Step 2: Grant Camera Permission
Upon the first launch of a workout session, Android will prompt:
> **"Allow FitMitra to take pictures and record video?"**
- Select: **"While using the app"** (or "Only this time").
- **Why this is requested**: FitMitra requires camera frame access exclusively to compute on-device skeletal joint positions via ML Kit. FitMitra has **no internet permission** in its manifest, meaning video cannot be transmitted anywhere.

---

## 3. Physical Setup & Phone Positioning

To achieve optimal pose tracking in compact hostel rooms:

1. **Phone Orientation**: Place the phone vertically (**Portrait Mode**).
2. **Support**: Prop the phone against a book, laptop screen, water bottle, or hostel desk shelf.
3. **Height**: Position the device approximately **0.8m to 1.2m above the floor** (desk or chair height).
4. **Distance**:
   - For **Squats & Lunges**: Stand **1.8m to 2.5m (6 to 8 feet)** away so hips, knees, and ankles are clearly visible.
   - For **Push-Ups & Planks**: Position the phone on the floor or a low shelf angled slightly down so your full horizontal profile is visible.
5. **Lighting**: Ensure normal room or desk lamp lighting. Avoid standing directly in front of a bright window (backlighting causes body silhouettes where joint landmarks are harder to detect).

---

## 4. Step-by-Step Test Scenarios

### Scenario 1: Complete an Adaptive Hostel Workout
1. Launch **FitMitra**.
2. Tap **"Configure & Solve Routine"** on the Home screen.
3. Set your constraints:
   - Time: `5 min`
   - Space: `Tiny (Bedside)`
   - Noise: `Silent (Midnight)`
   - Equipment: `None`
4. Tap **"Solve Hostel Routine"**.
5. Observe the generated routine (e.g. Bodyweight Squats). Tap **"Start Session"**.
6. Follow the setup tips, then tap **"Open Pose Coach"**.
7. Stand in view of the camera until tracking locks on. Complete 10 reps.
8. Verify that each rep triggers an affirmative audio chirp and rep increment.
9. Upon reaching 10 reps, observe automatic transition to the **Session Completion** screen.
10. Tap **"Back to Home"** and verify your lifetime stats and streak updated.

### Scenario 2: Test Pause & Resume
1. Start any workout.
2. In the top bar, tap the **Pause** button.
3. Verify the timer stops, voice confirms `"Workout paused"`, and the state displays `PAUSED`.
4. Perform 2 movements while paused. Verify **no reps are counted**.
5. Tap **Resume**. Confirm tracking resumes and timer continues.

### Scenario 3: Test Cancellation & Discarding
1. Start a workout session.
2. Perform 0 reps. Tap **Exit (X)**.
3. Tap **"Discard & Exit"**.
4. Check **Progress**: Verify total workouts and streak count **did not increment**.

### Scenario 4: Test Interruption & Recovery
1. While actively tracking in Pose Coach, press the device **Home** button or switch to another app (e.g., Settings or Messages).
2. Wait 5 seconds, then return to FitMitra.
3. Confirm that the camera preview restores cleanly without a black screen or crash.

### Scenario 5: Test Exam Mode
1. From Home, tap **"📚 Exam Mode"**.
2. Select **"2 MIN — RESET"**.
3. Tap **"Start Reset Session"**.
4. Observe the guided activities and timer countdown.
5. Tap **"End Break"** and confirm returning to Home cleanly.

### Scenario 6: Test Campus Challenges
1. From Home, tap **"🏆 Campus Challenges"**.
2. Inspect the **"Hostel 100 Squat Sprint"** card.
3. Tap **"Work on Challenge Now"** and perform a squat session.
4. Return to Campus Challenges and confirm your squats increased the progress bar and percentage.

---

## 5. Offline Testing Protocol

1. Enable **Airplane Mode** on your device (turn off both Wi-Fi and Mobile Data).
2. Launch FitMitra from a cold start (force close if running).
3. Execute Scenario 1 (Adaptive Workout + Squat Reps).
4. Verify:
   - Routine solves deterministically.
   - Camera and ML Kit inference run at full speed without network warnings.
   - Session completion and DataStore persistence work seamlessly.

---

## 6. Troubleshooting Common Issues

| Symptom | Cause | Remedy |
| :--- | :--- | :--- |
| **Black screen in Pose Coach** | Camera permission denied or occupied by another app | Ensure permission is granted in Settings > Apps > FitMitra > Permissions. Tap **"Retry Camera"** on screen. |
| **Reps not incrementing** | Full joint chain not visible to camera | Step back until head, hips, and knees fit within the camera frame. Ensure lighting is in front of you. |
| **No audio sounds** | Device volume muted or app muted | Check device media volume. Ensure the mute toggle in the top-right of Pose Coach is disabled. |
| **Stale stats on Home** | App was suspended in background | Returning to Home automatically refreshes stats; if frozen, swipe to Progress and return. |
