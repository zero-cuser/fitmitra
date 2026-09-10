# Project Memory & Architecture Decision Record (ADR)

## Project: FitMitra
*AI-Powered Student Fitness & Campus Wellness Platform*  
*Comprehensive System Memory, Architecture Decisions, Biomechanical Formulas, State Models, and Changelog*

---

## 1. Project Background & Core Constraints

* **Hackathon Problem Statement:** Student Innovation — Ideas that can boost fitness activities and assist in keeping fit.
* **Target Audience:** College and university students living in dorms, hostels, and shared flats.
* **User Realities:**
  1. Tiny dorm rooms (often less than 2m × 2m free floor space).
  2. Heavy sedentary desk study (6–12 hours coding/reading with cervical spine compression and forward head crane).
  3. Strict budget constraints (cannot afford expensive gym memberships, personal trainers, or wearable bands).
  4. Institutional hostel mess food (carb-dominant, protein-poor, irregular eating hours).
  5. High academic burnout & exam anxiety.
* **Engineering Principles:**
  * **100% Client-Side:** Zero backend servers required. Edge AI inference in the browser. Zero API key friction for judges.
  * **Privacy-by-Design:** No webcam video frames or biometric points are ever uploaded to any network or cloud server.
  * **Infallible Demo Resilience:** Every camera-driven feature has an interactive simulation fallback so presentations never fail even if cameras or permissions are unavailable.

---

## 2. Architecture Decision Records (ADR Log)

### ADR 001: Client-Side Edge Computer Vision vs Cloud APIs
* **Decision:** Run all pose estimation and trigonometric kinematics directly inside the client browser using WebRTC, Canvas API, and MediaPipe Pose.
* **Rationale:**
  * Cloud streaming adds >200ms latency, making synchronous audio coaching impossible.
  * Cloud vision APIs incur ongoing hosting costs incompatible with a student budget.
  * Dorm webcams must strictly respect student privacy.

### ADR 002: Web Speech Synthesis API with 4-Second Throttling
* **Decision:** Utilize native `window.speechSynthesis` with an athletic speech rate (`1.05`) and an explicit **4000ms throttle timer**.
* **Rationale:**
  * Allows students to exercise looking away from their laptop screens.
  * Prevents speech overlap or stutter when rep state transitions occur rapidly.

### ADR 003: Unified State Persistence Layer (`FitnessContext.jsx`)
* **Decision:** Centralized state in React Context with automatic synchronization to `localStorage.getItem('FITMITRA_STATE_V1')`.
* **Rationale:**
  * Preserves user level, FitCoins, streaks, logged mess meals, and completed quests across page refreshes.
  * Provides a 1-click `resetData()` helper for hackathon judges to reset or reload demo states cleanly.

### ADR 004: CameraView Viewport State Machine
* **Decision:** Manage the viewport using a strict 5-state state machine: `'idle' | 'requesting' | 'active' | 'simulating' | 'error'`.
* **Rationale:**
  * **`'idle'`:** Canvas is completely wiped. No skeleton lines or `160°` badges appear before the camera starts. Displays a sleek aperture empty-state with "Enable Camera" and "Try Interactive Simulation".
  * **`'requesting'`:** Renders an animated spinner state while waiting for browser permission.
  * **`'active'`:** Streams webcam at 720p/1080p, runs MediaPipe, and mounts skeletal overlay.
  * **`'simulating'`:** Generates synthetic 33-landmark movement with fine-control flexion slider.
  * **`'error'`:** Catches `NotAllowedError` or missing camera devices with inline recovery options.

### ADR 005: Dual Integration of MediaPipe Pose (NPM + CDN Fallback)
* **Decision:** Install `@mediapipe/pose` via npm, while including global CDN script tags in `index.html`.
* **Rationale:**
  * Ensures that if Vite bundler encounters CommonJS or WASM worker resolution quirks, `window.Pose` acts as an instantaneous browser fallback.

### ADR 006: Biomechanical Angle & Alignment Standards for 5 Presets
* **Decision:** Standardize vector kinematics for 5 distinct exercise presets with confidence gating (`minConfidence > 0.65`).
* **Rationale:**
  * Provides comprehensive workout coverage (Lower body, Upper body, Cardio, Legs, Core).
  * Automatically pauses rep counting and shows `"Step back into frame"` if key joints are obstructed.

### ADR 007: React ErrorBoundary & Universal Host Binding
* **Decision:** Wrap `<App />` in `<ErrorBoundary />` and configure Vite server with `host: true` (`0.0.0.0`).
* **Rationale:**
  * Catches any unexpected runtime exception gracefully with a recovery screen rather than a blank page.
  * `host: true` resolves IPv6 `::1` vs IPv4 `127.0.0.1` binding issues on Windows machines, preventing connection refused errors.

---

## 3. Biomechanical Kinematics Matrix (5 Exercise Presets)

$$\text{Angle } \theta = |\text{atan2}(C_y - B_y, C_x - B_x) - \text{atan2}(A_y - B_y, A_x - B_x)| \times \frac{180}{\pi}$$

| Preset | Target Muscle Group | Tracked Landmark Vector | Inflection Thresholds | Form Fault Trigger & Tooltip | XP / Calorie Reward |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Squats** | Quads, Glutes, Hamstrings | Hip ($A$) $\to$ Knee ($B$) $\to$ Ankle ($C$) | Rep Depth: $\theta \le 90^\circ$<br>Lockout: $\theta \ge 160^\circ$ | Knee $> 95^\circ$ in bottom: `⚠️ Go deeper below 90°`<br>Torso $< 65^\circ$: `⚠️ Chest up, back straight!` | +10 XP<br>0.35 kcal/rep |
| **Push-ups** | Pectorals, Triceps, Core | Shoulder $\to$ Elbow $\to$ Wrist<br>Shoulder $\to$ Hip $\to$ Ankle | Rep Depth: $\theta \le 90^\circ$<br>Lockout: $\theta \ge 160^\circ$ | Elbow $> 95^\circ$: `⚠️ Lower chest deeper!`<br>Spine deviation $> 18^\circ$: `⚠️ Keep hips aligned!` | +10 XP<br>0.45 kcal/rep |
| **Jumping Jacks** | Calves, Deltoids, Cardio | Hip $\to$ Shoulder $\to$ Wrist | Overhead: $\theta \ge 135^\circ$<br>Sides: $\theta \le 45^\circ$ | Arm abduction $< 120^\circ$: `⚠️ Raise arms overhead!` | +10 XP<br>0.20 kcal/rep |
| **Lunges** | Quads, Glutes, Calves | Hip $\to$ Knee $\to$ Ankle (Front Leg) | Bottom: $\theta \le 92^\circ$<br>Standing: $\theta \ge 155^\circ$ | Front knee $> 105^\circ$: `⚠️ Lower front knee to 90°` | +10 XP<br>0.38 kcal/rep |
| **Desk Plank** | Rectus Abdominis, Core | Shoulder $\to$ Hip $\to$ Ankle line | Spine straightness: Deviation $\le 15^\circ$ from $180^\circ$ | Deviation $> 15^\circ$: `⚠️ Lift hips up!` or `⚠️ Lower hips straight!` | +10 XP / 5s<br>0.15 kcal/sec |

---

## 4. Visual Design System & Color Tokens

* **Canvas Skeletal Wireframes:**
  * **Correct Alignment / Good Form:** `#10b981` (Neon Emerald Green), line width: `4px`.
  * **Fault Detected / Bad Form:** `#ef4444` (Crimson / Amber Red), line width: `5px`.
  * **Joint Nodes:** Circle radius `7px` with white center dot (`3px`).
  * **Floating Tooltip Badges:** Rounded pill `rgba(239, 68, 68, 0.92)` with `1.5px` white border floating at $(x+15, y-14)$.
* **Global Theme Palette:**
  * **Deep Background:** `#070b14` (Deep Space Slate)
  * **Glass Cards:** `background: rgba(15, 23, 42, 0.65)`, `backdrop-filter: blur(16px)`, `border: 1px solid rgba(255, 255, 255, 0.08)`
  * **Brand Accents:**
    * Neon Lime / Energy: `#22c55e`
    * Cyber Cyan / Vision AI: `#06b6d4`
    * Electric Purple / XP & Coins: `#a855f7`
    * Sunset Orange / Streaks: `#f97316`

---

## 5. State Data Schemas

### 5.1 Global Context Schema (`FITMITRA_STATE_V1`)
```json
{
  "user": {
    "name": "Aman Verma",
    "college": "Delhi Technological Univ (DTU)",
    "hostel": "Aryabhatta Hostel (Wing A)",
    "roomNo": "B-204",
    "level": 2,
    "xp": 340,
    "nextLevelXp": 500,
    "fitCoins": 160,
    "currentStreak": 4,
    "soundEnabled": true,
    "voiceCoachEnabled": true
  },
  "todayStats": {
    "waterMl": 1500,
    "waterTargetMl": 2500,
    "caloriesBurned": 185,
    "repsCompleted": 35,
    "postureBreaksTaken": 3,
    "mindfulMinutes": 8
  },
  "loggedMeals": [
    {
      "id": "m_init_1",
      "name": "Dal Tadka + 2 Roti",
      "category": "Hostel Mess",
      "calories": 350,
      "protein": 13,
      "carbs": 58,
      "fat": 7,
      "timestamp": "12:45 PM"
    }
  ],
  "completedQuests": ["q1"]
}
```

---

## 6. Execution Milestones & Git Changelog

* **Commit `c3b5ecc` (Initial Release):**
  * Created `prd.md`, `techstack.md`, `phases.md`, `memory.md`, `README.md`.
  * Scaffolded Vite + React 18 + Tailwind CSS + Lucide Icons.
  * Implemented PoseCoach, PostureSentinel, WorkoutHub, NutritionTracker, LeaderboardAndQuests, ExamStressReset.
* **Commit `0197c4d` (CameraView Viewport Refactor):**
  * Implemented 5-state state machine (`'idle' | 'requesting' | 'active' | 'simulating' | 'error'`).
  * Removed duplicate top-header button; added minimalist cyan aperture empty-state.
  * Built dedicated bottom HUD bar pinned to card bottom.
* **Commit `e6780ba` (MediaPipe Pose AI & 5 Presets Upgrade):**
  * Integrated `@mediapipe/pose` with real-time dynamic 33-landmark estimation.
  * Added 5 exercise presets (Squats, Push-ups, Jumping Jacks, Lunges, Plank).
  * Color-coded skeletal feedback (`#10b981` vs `#ef4444`) with floating canvas tooltips.
  * Added animated rep counter pulse, audio chimes, and +10 XP awards.
* **Commit `a7f2fc4` (Server Resilience & ErrorBoundary):**
  * Bound Vite dev server to all network interfaces (`host: true`).
  * Added `<ErrorBoundary />` component protecting against runtime crashes.
  * Implemented defensive MediaDevices guards and isolated MediaPipe `try...catch` blocks.

* **Commit `feb2b0b` (AI Context & Architecture Sync):**
  * Updated `README.md` and `memory.md` with complete collaborator guides and kinematics matrix.
* **Current Milestone (SIH Presentation & Permanent Deployment):**
  * Created `SIH_PITCH_AND_VIVA_QA.md` with 30s elevator pitch, 2-min jury pitch, evaluation metric alignments, and 9 high-stakes jury viva defense answers.
  * Added `defer` to MediaPipe CDN `<script>` tags in `index.html` to eliminate render-blocking delays.
  * Configured `base: './'` in `vite.config.js` for universal hosting compatibility.
  * Created `.github/workflows/deploy.yml` for automated 24/7 permanent deployment to GitHub Pages (`https://zero-cuser.github.io/fitmitra/`).
  * Re-verified local Vite server running at `http://localhost:3000/` (HTTP 200 OK).

---

## 7. Future Feature Roadmap (Backlog)

1. **The Study Toll (Pomodoro Fitness Lockout):**
   * Puts up a friendly lock-screen after 45 mins of study requiring 10 verified squats or 30s plank to unlock next block.
2. **Mess Thali AI Plate Scanner:**
   * Browser-based image recognition of hostel food plates to compute protein/carb deficits.
3. **Webcam PPG Heart Rate & Stress Monitor:**
   * Contactless pulse calculation via facial micro-color shifts in webcam video frames.
4. **FitBuddy Virtual Dorm Mascot (Tamagotchi Evolved):**
   * Pixel-art desktop pet that slumps when the user is sedentary and gets buff when workouts are completed.

---

## 8. Smart India Hackathon (SIH) Defense Strategy

* **Key Narrative for Evaluators:**
  * Frame FitMitra not as a "generic fitness app", but as a **student-centric institutional wellness tool** targeting the Indian higher education demographic.
  * Contrast with Western apps: FitMitra handles dal, roti, and sattu on ₹50-₹100/day budgets rather than avocado and whey protein.
  * Contrast with hardware wearables: FitMitra uses $0 hardware (existing student webcams) running client-side MediaPipe at 45–60 FPS with zero cloud bills.
  * Emphasize the **Fit India Movement** alignment for nationwide campus deployment.
