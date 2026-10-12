# FitMitra — Real-World Tester Validation Protocol

**Protocol Identifier**: `VAL-PROTO-P11`  
**Build Target**: `1.0.0-rc1` (Version Code `1`)  
**Status**: Active Internal Protocol  
**Date**: October 2026  

---

## 1. Purpose & Guiding Principles

This protocol defines a structured, repeatable test sequence for invited internal testers to validate the reliability, usability, and workout accuracy of FitMitra in real student environments (hostel rooms, study desks, quiet corridors).

### Privacy & Neutrality Principles:
1. **Neutral Observation**: Testers must record their actual, unbiased observations without prior expectations.
2. **Zero Media Uploads**: Never record or upload videos, photos of yourself, or biometric camera feeds.
3. **No Automated Tracking**: All feedback is collected manually via this document.

---

## 2. Test Execution Tasks

Please perform each of the following 12 tasks in order and record your findings in the tables below:

| # | Task | Description |
| :-: | :--- | :--- |
| **1** | **Install & Cold Launch** | Install `app-debug.apk`. Launch from app drawer. Verify initial launch screen loads smoothly without crash. |
| **2** | **Workout Navigation** | Navigate from Home to **Configure & Solve Routine**. Verify all interactive cards and buttons respond promptly. |
| **3** | **Adaptive Configuration** | Set constraints (Time, Space, Noise, Equipment). Tap **Solve Hostel Routine**. Verify generated routine displays with explanation points. |
| **4** | **Squat Session Execution** | Position phone against a book or desk shelf. Step back into camera view and perform a planned number of squats (e.g. 10 reps). |
| **5** | **Accuracy Verification** | Count your reps manually in your head while performing squats. At completion, record your observed count vs. the app's counted total. |
| **6** | **Pause & Resume** | During a workout session, tap **Pause**. Perform 2 reps while paused (should not count). Tap **Resume** and continue. |
| **7** | **Interruption & Resumption** | While Pose Coach is running, switch to another app or press Home for 5 seconds. Reopen FitMitra and verify camera stream resumes cleanly. |
| **8** | **Exam Mode Session** | Open **Exam Mode** from Home. Select **2 MIN — RESET**. Follow the timer and guided exercises. End break cleanly. |
| **9** | **Campus Challenge Tracking** | View **Campus Challenges**. Check progress before and after a workout session to verify progress bar updates. |
| **10** | **Progress & History Audit** | Open **Progress & Streaks**. Verify total workouts, reps, and streak days match your completed activities. |
| **11** | **Airplane Mode Audit** | Turn on **Airplane Mode** (disable Wi-Fi and Cellular). Repeat Tasks 3, 4, and 10 completely offline. |
| **12** | **Report Feedback** | Fill out the feedback log below for any friction, hesitation, UI confusion, or unexpected behavior encountered. |

---

## 3. Repetition Accuracy Recording Sheet

Please record your independent rep counts below. Keep your manually observed count strictly separate from the app's count:

| Tester ID | Device Model | Android Version | Exercise | Planned Reps | Manually Observed Reps | App-Counted Reps | Count Difference | Lighting / Framing Notes |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `[e.g. T-01]` | `[Device]` | `[Android 14]` | Squats | 10 | `[ ]` | `[ ]` | `[ ]` | `[e.g. Desk lamp, 2m away]` |
| `[e.g. T-02]` | `[Device]` | `[Android 13]` | Squats | 12 | `[ ]` | `[ ]` | `[ ]` | `[e.g. Overhead hostel light]` |
| `[e.g. T-03]` | `[Device]` | `[Android 15]` | Squats | 15 | `[ ]` | `[ ]` | `[ ]` | `[e.g. Bookshelf stand, 2.2m]` |
| `[e.g. T-04]` | `[Device]` | `[Android 12]` | Push-Ups | 10 | `[ ]` | `[ ]` | `[ ]` | `[e.g. Floor prop, side view]` |
| `[e.g. T-05]` | `[Device]` | `[Android 14]` | Lunges | 10 | `[ ]` | `[ ]` | `[ ]` | `[e.g. Room aisle, 2m distance]` |

---

## 4. Usability & User Experience Feedback Form

For each area, rate your experience from **1 (Poor / Confusing)** to **5 (Clear / Effortless)** and provide neutral notes:

| Feature / Screen | Rating (1-5) | What was clear? | What was confusing or difficult? |
| :--- | :---: | :--- | :--- |
| **Home Screen Clarity** | `[ ]` | | |
| **Hostel Routine Solver** | `[ ]` | | |
| **Camera Setup & Tips** | `[ ]` | | |
| **In-Workout Pose Coach** | `[ ]` | | |
| **Audio & Voice Prompts** | `[ ]` | | |
| **Pause & Exit Controls** | `[ ]` | | |
| **Workout Completion Summary** | `[ ]` | | |
| **Progress & Streaks Screen** | `[ ]` | | |
| **Exam Mode Micro-Breaks** | `[ ]` | | |
| **Campus Challenges Screen** | `[ ]` | | |

---

## 5. Privacy-Conscious Defect Report Template

If you encounter any bug, crash, or unexpected behavior, copy and fill out this template:

```markdown
### Bug Report

- **App Version**: 1.0.0-rc1 (Build 1)
- **Device Model**: [e.g. Google Pixel 7, Samsung Galaxy A54, etc.]
- **Android Version**: [e.g. Android 14 (API 34)]
- **Feature Being Tested**: [e.g. Adaptive Solver, Pose Coach, Exam Mode, Progress]
- **Reproducibility**: [Always / Sometimes / Once]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What did you expect to happen?]

**Actual Behavior**:
[What actually happened?]

**Optional Non-Sensitive Attachment**:
- UI screenshot showing UI error text (ensure no private personal info or faces are in frame)
- Terminal/ADB log snippet (ensure no personal identifiers or credentials are included)
```

---

## 6. Submission Guidelines

Send completed validation sheets directly to the internal release coordinator or commit them to the internal testing directory. Do not post bug reports with personal credentials or sensitive hostel information.
