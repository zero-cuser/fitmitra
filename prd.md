# Product Requirements Document (PRD)

## Project Title
**FitMitra: The AI-Powered Student Fitness & Campus Wellness Companion**

## Tagline
*Healthy Mind, Active Body — Engineered for Campus Life.*

---

## 1. Problem Statement
College and university students face unique, compounding barriers to staying physically active and healthy:
1. **Prolonged Sedentary Study Marathons**: 8–12 hours hunched over laptops and desks leading to "tech neck", poor spinal alignment, eye fatigue, and lethargy.
2. **Space & Equipment Constraints**: Hostel rooms and dorms have virtually no spare floor space (often less than 2m × 2m) and zero gym equipment.
3. **Financial & Intimidation Barriers**: Commercial gym memberships and personal trainers are too expensive for student budgets; beginners feel intimidated or lack form guidance.
4. **Hostel Mess Food Realities**: Students rely on institutional mess food which is typically carbohydrate-heavy and protein-deficient, without simple ways to track or supplement nutrition affordably.
5. **Exam Burnout & Anxiety**: Chronic academic stress coupled with poor recovery habits (irregular sleep, dehydration) erodes mental and physical health.
6. **Lack of Peer Accountability**: Solitary fitness apps lack the campus-specific social context, friendly competition, and gamified incentives that motivate students.

---

## 2. Target Audience & Personas
- **The Crammer (Rahul, 20, CS Undergrad)**: Spends 10 hours a day coding and studying; suffers from chronic neck strain, back stiffness, and brain fog during exam weeks.
- **The Budget Fitness Beginner (Priya, 19, 1st Year)**: Wants to exercise in her dorm room without buying gear or expensive gym memberships; worries about doing squats or planks with incorrect form.
- **The Hostel Mess Resident (Aman, 21, Final Year)**: Eats whatever the college mess serves; struggles to hit protein goals on a ₹100/day allowance and wants practical food hacks.

---

## 3. Product Vision & Value Proposition
FitMitra is an all-in-one, intelligent student fitness web companion that transforms any dorm room or study desk into an interactive fitness and wellness studio. By combining **client-side AI computer vision** (zero hardware cost), **dorm-adapted micro-workouts**, **campus mess nutrition intelligence**, and **gamified social squads**, FitMitra seamlessly integrates fitness into academic routines.

---

## 4. Key Functional Requirements

### 4.1 AI Computer Vision Pose Coach (Webcam Powered)
- **Zero-Hardware In-Browser Tracking**: Uses MediaPipe / Pose Detection via the user's standard laptop/phone webcam.
- **Real-Time Repetition Counting**: Automatically tracks and increments repetitions for core bodyweight movements (Squats, Push-Ups, Jumping Jacks).
- **Intelligent Form Feedback**: Computes joint angles in real time (e.g. knee flexion angle for squat depth, elbow flexion for pushup lockout) and alerts the user to posture flaws (e.g., "Go deeper!", "Chest up!").
- **Real-Time Voice Coaching**: Uses Web Speech Synthesis to provide immediate audible feedback so students don't need to stare at their screen during movement.
- **Privacy First**: 100% client-side video processing; no video feed or camera images ever leave the student's browser.
- **Camera Fallback / Simulator**: Built-in interactive simulator for testing and environments without webcam access.

### 4.2 Study Posture Sentinel & Pomodoro Fitness
- **Slouch & Forward-Head Detection**: Monitors study posture via webcam or timer; alerts students when they hunch or crane their neck toward the screen.
- **Pomodoro Micro-Workouts**: Integrates with study timers (25m study / 50m study) to prompt 2-minute energizing micro-stretches (Desk Neck Reliever, Doorway Chest Opener, Seated Spinal Twist).

### 4.3 Dorm-Friendly No-Equipment Workout Hub
- **Space-Efficient Routines**: Curated exercises requiring only a 2m × 2m space and zero equipment.
- **Filterable Workout Modes**:
  - *Pre-Exam Stress Buster* (5 mins)
  - *Dorm Room HIIT Ignite* (10 mins)
  - *Full Body Strength Booster* (15 mins)
  - *Bedtime Spine & Hip Relief* (7 mins)
- **Guided Timer & Form Cues**: Countdown timers, visual previews, and step-by-step guidance.

### 4.4 Hostel Mess Smart-Logger & ₹100 Budget Protein Guide
- **Pre-Loaded Mess Food Database**: Calorie and macro breakdowns for typical college mess menus (Roti, Dal Tadka, Rajma-Chawal, Paneer Bhurji, Boiled Eggs, Poha, Maggi, Hostel Chai).
- **Daily Macro & Calorie Targets**: Student-friendly daily tracker with visual progress rings.
- **Budget Protein Hacks**: Practical guides to hitting 60–80g protein under ₹50–₹100/day (Sattu drink, roasted chana, soya chunks, boiled eggs, sprouts).

### 4.5 Campus Gamification & Social Squads
- **FitCoins & XP Economy**: Earn FitCoins for workouts completed, posture breaks taken, and mess meals logged.
- **Daily Streak System**: Visual flame streak counter with streak protections and milestone badges.
- **Hostel Wing Leaderboards**: Simulated campus dorm rivalry (e.g., Wing A vs Wing B vs Off-Campus) driving friendly peer pressure.
- **Daily Student Quests**: Daily micro-challenges (e.g., "Complete 20 Dorm Squats", "Log 2L Water", "Take 2 Posture Breaks").

### 4.6 Exam Stress & Mental-Physical Balance
- **4-7-8 Guided Box Breathing**: Calming visual circle with inhale, hold, and exhale pacing for pre-exam anxiety.
- **Hydration Tracker**: Quick 250ml/500ml water logging with daily 2.5L targets.
- **20-20-20 Eye Strain Guard**: Reminds students to look 20 feet away every 20 minutes of study.

---

## 5. Non-Functional Requirements
- **Performance**: High FPS (30-60 FPS) canvas rendering without lagging the browser.
- **Accessibility**: High contrast modern athletic UI, keyboard accessible, responsive across smartphones, tablets, and laptops.
- **Zero Configuration**: Works immediately out of the box with zero server setup or required cloud credentials.
- **Privacy & Security**: All personal data and video frames stay in the browser LocalStorage / memory.

---

## 6. Success & Hackathon Judging Metrics
1. **Innovation & Originality**: Novel adaptation of AI vision specifically to the student lifestyle (slouching while studying + dorm workouts + mess macros).
2. **Technical Execution**: Seamless integration of in-browser computer vision, speech synthesis, reactive state, and responsive styling.
3. **Usability & UX**: Polished, energetic dark-neon interface that appeals to college students.
4. **Feasibility & Scalability**: Zero cloud infrastructure costs, highly scalable client-side architecture.
