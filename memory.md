# Project Memory & Architecture Decision Log (ADR)

## Project: FitMitra
*System Memory, Context, State Models, and Design Tokens*

---

## 1. Project Background & Constraints
- **Hackathon Theme**: Student Innovation - Ideas that can boost fitness activities and assist in keeping fit.
- **Key Realities of Target Users**:
  - Small dorm/hostel rooms (limited floor space).
  - Low budget (no gym memberships or expensive wearable bands).
  - Heavy computer use and study hours (bad posture, screen fatigue).
  - Reliance on hostel mess food (high carb, low protein).
- **Technical Philosophy**:
  - 100% Client-Side execution. No API keys needed for evaluation or deployment.
  - Zero backend hosting requirement; can be deployed on GitHub Pages, Vercel, or Netlify instantly.
  - Resilience: Every camera-dependent feature must have a fallback / interactive simulation mode so live demo presentations never fail.

---

## 2. Key Architecture Decisions (ADR)

### ADR 001: Client-Side Computer Vision vs Server-Side Video Streaming
- **Decision**: Perform all pose estimation and kinematics directly on the client using HTML5 Canvas and mathematical vector calculations.
- **Rationale**:
  - Server-side video streaming introduces latency (>200ms) making real-time audio coaching impossible.
  - Cloud vision APIs cost money and require API keys.
  - Student privacy: Webcams in dorm rooms must NEVER transmit video feeds over the network.

### ADR 002: Web Speech Synthesis API for Real-Time Coaching
- **Decision**: Utilize standard `window.speechSynthesis` for spoken cues rather than external TTS APIs (ElevenLabs, Google Cloud TTS).
- **Rationale**:
  - Zero latency, runs offline, zero cost.
  - Allows students to workout while looking away from the screen, keeping audio instructions synced to their movement.

### ADR 003: State Persistence Layer
- **Decision**: Standardized `LocalStorage` key (`FITMITRA_STATE_V1`) managed through a unified React Context provider (`FitnessContext.jsx`).
- **Rationale**:
  - Preserves user streaks, FitCoins, logged meals, and unlocked achievements between browser refreshes.
  - Enables easy 1-click "Reset Demo Data" or "Load Sample Data" for hackathon judges.

---

## 3. Data Schemas & State Structure

### 3.1 User Profile & Stats Schema
```json
{
  "user": {
    "name": "Arjun Sharma",
    "campus": "NIT Campus",
    "hostel": "Aryabhatta Hostel - Wing B",
    "level": 3,
    "xp": 420,
    "nextLevelXp": 600,
    "fitCoins": 185,
    "currentStreak": 5,
    "longestStreak": 12,
    "lastActiveDate": "2026-09-09"
  },
  "todayStats": {
    "waterMl": 1750,
    "waterTargetMl": 2500,
    "caloriesBurned": 240,
    "repsCompleted": 45,
    "postureBreaksTaken": 4,
    "mindfulMinutes": 10
  }
}
```

### 3.2 Mess Meal Record Schema
```json
{
  "id": "meal_17258900",
  "mealType": "Lunch",
  "foodName": "Rajma Chawal + Curd",
  "calories": 480,
  "protein": 18,
  "carbs": 74,
  "fat": 12,
  "timestamp": "13:30"
}
```

---

## 4. UI Design System Tokens
- **Background**: `#070b14` (Deep Space Dark)
- **Card Background**: `#0f172a` with `border: rgba(255, 255, 255, 0.08)` and subtle backdrop blur
- **Brand Colors**:
  - Neon Lime / Success: `#22c55e` (Energy, active exercise)
  - Cyber Cyan / Tech: `#06b6d4` (AI vision, accuracy)
  - Electric Purple / Gamification: `#a855f7` (FitCoins, levels)
  - Sunset Orange / Streaks: `#f97316` (Streak flames, calories)
- **Typography**: Inter / Outfit font family with high legibility.
