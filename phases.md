# Development Roadmap & Execution Phases

## Project: FitMitra
*Student Innovation Hackathon — Development Phases*

---

## Phase 1: Foundation & Project Blueprints (Completed)
- [x] Create Product Requirements Document (`prd.md`).
- [x] Create System Architecture & Tech Stack Document (`techstack.md`).
- [x] Create Project Phases Document (`phases.md`).
- [x] Create Project Memory & Context Document (`memory.md`).
- [x] Create Comprehensive Readme (`README.md`).

---

## Phase 2: Application Scaffolding & Core Design System
- [ ] Initialize Vite + React project inside `fitmitra/`.
- [ ] Configure Tailwind CSS with high-energy modern dark-neon athletic theme.
- [ ] Set up Lucide React icon suite.
- [ ] Establish global application state (`FitnessContext.jsx`) for:
  - User profile (Name, Year, Hostel/Wing, Target Goal).
  - FitCoins balance, daily streaks, unlocked badges.
  - Workout history and logged meals.
- [ ] Implement responsive top navigation bar with live streak flames, level badge, and FitCoin counter.

---

## Phase 3: AI Computer Vision Pose Coach & Voice Engine
- [ ] Implement browser webcam access with permissions handling, mirrored video stream, and fallback simulator mode.
- [ ] Integrate HTML5 Canvas overlay for real-time skeletal line drawing.
- [ ] Implement Vector Kinematics module (`AngleMath.js`):
  - 3-point joint angle calculation (knee angle, elbow angle, spine inclination).
  - Repetition state machine (`state: UP -> DOWN -> REP_COMPLETE`).
  - Squat depth validation, push-up chest depth, jumping jack extension.
- [ ] Implement Web Speech Synthesis Coach (`voiceCoach.js`):
  - Voice cues on rep completion, form warnings ("Lower your hips!", "Keep back straight!"), and positive reinforcement.

---

## Phase 4: Study Posture Sentinel & Pomodoro Fitness
- [ ] Develop Desk Posture Sentinel:
  - Detects slouching or forward head crane during study sessions.
  - Audio and visual soft chime reminder to correct posture.
- [ ] Build Study Break Pomodoro Mode:
  - 25/50 minute study timer with automated 2-minute micro-stretch triggers.
  - Step-by-step stretch guides (Neck rolls, Desk shoulder stretches, Spinal twists).

---

## Phase 5: Dorm-Adapted Workout Hub
- [ ] Build curated library of equipment-free, dorm-space routines (5-min, 10-min, 15-min).
- [ ] Create interactive workout player with countdown timers, audio cues, rep targets, and completion reward screen (awarding FitCoins and XP).

---

## Phase 6: Hostel Mess Smart-Logger & Budget Protein Hacks
- [ ] Create searchable student mess menu database with calorie, protein, carb, and fat breakdowns.
- [ ] Implement 1-click meal logging with daily macro progress rings.
- [ ] Build ₹100 Budget Protein Calculator & Hostel Survival Guide:
  - Practical student staples (Sattu, Boiled eggs, Soya chunks, Roasted chana, Sprouts).
  - Cost per gram of protein calculator.

---

## Phase 7: Campus Gamification, Social Squads & Exam Stress Relief
- [ ] Implement Hostel Wing / Campus Leaderboard with simulated dynamic student squads.
- [ ] Implement Daily Student Quest checklist (e.g. "Complete 20 squats", "Log mess lunch", "Do 4-7-8 breathing").
- [ ] Develop 4-7-8 Guided Box Breathing animation with soothing rhythm pacing for exam stress relief.
- [ ] Implement Hydration Logger (250ml / 500ml quick add) and 20-20-20 Eye Strain Guard.

---

## Phase 8: Verification, Polish & Demo Readiness
- [ ] Run full project build (`npm.cmd run build`) to ensure zero bundle or syntax errors.
- [ ] Test cross-tab persistence via LocalStorage.
- [ ] Ensure seamless camera fallback so the app is 100% demoable even in environments without webcams.
- [ ] Stage and commit initial release to Git repository.
