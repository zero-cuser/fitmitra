'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DailyCalorieRecord, ExerciseKey, FormFault, LoggedMeal, MessMenuItem, TelemetryResult, WorkoutState } from '@/types/fitness';
import { EXERCISE_CATALOG } from '@/data/exercises';
import { sounds } from '@/utils/soundEffects';
import { coachVoice } from '@/utils/voiceCoach';
import confetti from 'canvas-confetti';

interface WorkoutContextType extends WorkoutState {
  setSelectedExercise: (exercise: ExerciseKey) => void;
  setTargetReps: (target: number) => void;
  recordRep: (increment?: number) => void;
  handleTelemetry: (result: TelemetryResult) => void;
  resetSession: () => void;
  toggleSound: () => void;
  toggleVoiceCoach: () => void;
  activeFaults: FormFault[];
  isTracking: boolean;
  setIsTracking: (tracking: boolean) => void;
  // Nutrition and Weekly Calorie Chart State
  weeklyCalorieHistory: DailyCalorieRecord[];
  loggedMeals: LoggedMeal[];
  logMeal: (item: MessMenuItem) => void;
  removeMeal: (id: string) => void;
  caloriesBurnedToday: number;
  caloriesGainedToday: number;
  proteinGainedToday: number;
  postureScoreToday: number;
  setPostureScoreToday: (score: number) => void;
}

const STORAGE_KEY_WORKOUT = 'FITMITRA_WORKOUT_PROGRESS_V3';
const STORAGE_KEY_NUTRITION = 'FITMITRA_NUTRITION_V3';
const STORAGE_KEY_CALORIES_WEEK = 'FITMITRA_CALORIES_WEEK_V3';

const INITIAL_WEEKLY_CALORIES: DailyCalorieRecord[] = [
  { day: 'Mon', date: 'Sept 7', caloriesBurned: 280, caloriesGained: 1850, netBalance: 1570 },
  { day: 'Tue', date: 'Sept 8', caloriesBurned: 340, caloriesGained: 1920, netBalance: 1580 },
  { day: 'Wed', date: 'Sept 9', caloriesBurned: 190, caloriesGained: 1780, netBalance: 1590 },
  { day: 'Thu', date: 'Sept 10', caloriesBurned: 410, caloriesGained: 2050, netBalance: 1640 },
  { day: 'Fri', date: 'Sept 11', caloriesBurned: 310, caloriesGained: 1890, netBalance: 1580 },
  { day: 'Sat', date: 'Sept 12', caloriesBurned: 480, caloriesGained: 2100, netBalance: 1620 },
  { day: 'Sun', date: 'Today', caloriesBurned: 120, caloriesGained: 650, netBalance: 530 }
];

const INITIAL_LOGGED_MEALS: LoggedMeal[] = [
  { id: 'lm_1', itemId: 'm1', name: 'Dal Tadka (1 bowl)', timestamp: '12:30 PM (Lunch)', calories: 160, protein: 7, icon: '🥣' },
  { id: 'lm_2', itemId: 'm2', name: 'Roti / Chapati (2x)', timestamp: '12:30 PM (Lunch)', calories: 190, protein: 6, icon: '🫓' },
  { id: 'lm_3', itemId: 'm16', name: 'Sattu Drink (Study Desk)', timestamp: '04:15 PM (Snack)', calories: 160, protein: 10, icon: '🥤' },
  { id: 'lm_4', itemId: 'm7', name: 'Boiled Eggs (2 whole eggs)', timestamp: '05:00 PM (Pre-Workout)', calories: 140, protein: 13, icon: '🥚' }
];

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedExercise, setSelectedExerciseState] = useState<ExerciseKey>('squats');
  const [sessionReps, setSessionReps] = useState(0);
  const [targetReps, setTargetReps] = useState(EXERCISE_CATALOG.squats.defaultTarget);
  const [currentStage, setCurrentStage] = useState<'up' | 'down'>('up');
  const [liveAngle, setLiveAngle] = useState(160);
  const [activeFaults, setActiveFaults] = useState<FormFault[]>([]);
  const [streakDays, setStreakDays] = useState(5);
  const [xp, setXp] = useState(180);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceCoachEnabled, setVoiceCoachEnabled] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [postureScoreToday, setPostureScoreToday] = useState(92);

  // Nutrition & Weekly Calorie Log
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>(INITIAL_LOGGED_MEALS);
  const [weeklyCalorieHistory, setWeeklyCalorieHistory] = useState<DailyCalorieRecord[]>(INITIAL_WEEKLY_CALORIES);

  // Load progress from localStorage
  useEffect(() => {
    try {
      const savedWorkout = localStorage.getItem(STORAGE_KEY_WORKOUT);
      if (savedWorkout) {
        const parsed = JSON.parse(savedWorkout);
        if (typeof parsed.xp === 'number') setXp(parsed.xp);
        if (typeof parsed.streakDays === 'number') setStreakDays(parsed.streakDays);
        if (typeof parsed.soundEnabled === 'boolean') setSoundEnabled(parsed.soundEnabled);
        if (typeof parsed.voiceCoachEnabled === 'boolean') {
          setVoiceCoachEnabled(parsed.voiceCoachEnabled);
          coachVoice.setEnabled(parsed.voiceCoachEnabled);
        }
      }

      const savedMeals = localStorage.getItem(STORAGE_KEY_NUTRITION);
      if (savedMeals) {
        setLoggedMeals(JSON.parse(savedMeals));
      }

      const savedWeekly = localStorage.getItem(STORAGE_KEY_CALORIES_WEEK);
      if (savedWeekly) {
        setWeeklyCalorieHistory(JSON.parse(savedWeekly));
      }
    } catch {}
  }, []);

  const caloriesGainedToday = loggedMeals.reduce((acc, m) => acc + m.calories, 0);
  const proteinGainedToday = loggedMeals.reduce((acc, m) => acc + m.protein, 0);
  
  // Real-time calculation of today's calories burned
  const currentWorkoutCalBurn = Math.round(sessionReps * (EXERCISE_CATALOG[selectedExercise]?.calPerRep || 0.3));
  const baseTodayBurn = 120; // baseline from earlier sets
  const caloriesBurnedToday = baseTodayBurn + currentWorkoutCalBurn;

  // Sync today's totals to the 7-day weekly history array
  useEffect(() => {
    setWeeklyCalorieHistory((prev) => {
      const updated = [...prev];
      const todayIndex = updated.length - 1;
      if (todayIndex >= 0) {
        const existing = updated[todayIndex];
        updated[todayIndex] = {
          ...existing,
          caloriesBurned: caloriesBurnedToday,
          caloriesGained: caloriesGainedToday,
          netBalance: caloriesGainedToday - caloriesBurnedToday
        };
      }
      try {
        localStorage.setItem(STORAGE_KEY_CALORIES_WEEK, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [caloriesBurnedToday, caloriesGainedToday]);

  const level = Math.floor(xp / 100) + 1;

  const setSelectedExercise = (exercise: ExerciseKey) => {
    const config = EXERCISE_CATALOG[exercise];
    if (!config) return;
    setSelectedExerciseState(exercise);
    setSessionReps(0);
    setTargetReps(config.defaultTarget);
    setCurrentStage(exercise === 'plank' ? 'down' : 'up');
    setLiveAngle(exercise === 'plank' ? 0 : 160);
    setActiveFaults([]);
    coachVoice.speak(`Switched to ${config.shortName}`, true);
  };

  const recordRep = useCallback(
    (increment = 1) => {
      setSessionReps((prev) => {
        const next = prev + increment;
        const config = EXERCISE_CATALOG[selectedExercise];

        if (soundEnabled) sounds.playRepSuccess();
        coachVoice.speakRep(next, config.metricUnit);

        if (next % 5 === 0 && next !== targetReps) {
          coachVoice.speakEncouragement();
        }

        if (next >= targetReps && prev < targetReps) {
          if (soundEnabled) sounds.playWorkoutComplete();
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          coachVoice.speak(`Set completed! Excellent ${config.shortName}!`, true);
        }

        return next;
      });

      setXp((prev) => {
        const newXp = prev + 10;
        try {
          localStorage.setItem(
            STORAGE_KEY_WORKOUT,
            JSON.stringify({ xp: newXp, streakDays, soundEnabled, voiceCoachEnabled })
          );
        } catch {}
        return newXp;
      });
    },
    [selectedExercise, targetReps, soundEnabled, streakDays, voiceCoachEnabled]
  );

  const handleTelemetry = useCallback(
    (result: TelemetryResult) => {
      setLiveAngle(Math.round(result.angle));
      setActiveFaults(result.formFaults || []);

      if (result.stage && result.stage !== currentStage) {
        setCurrentStage(result.stage);
      }

      if (result.formCue) {
        coachVoice.speakFormCue(result.formCue);
      }

      if (result.repCompleted) {
        recordRep(1);
      }
    },
    [currentStage, recordRep]
  );

  const resetSession = () => {
    setSessionReps(0);
    setCurrentStage(selectedExercise === 'jumpingJacks' ? 'down' : 'up');
    setActiveFaults([]);
    coachVoice.speak('Session reset. Ready when you are.', true);
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          STORAGE_KEY_WORKOUT,
          JSON.stringify({ xp, streakDays, soundEnabled: next, voiceCoachEnabled })
        );
      } catch {}
      return next;
    });
  };

  const toggleVoiceCoach = () => {
    setVoiceCoachEnabled((prev) => {
      const next = !prev;
      coachVoice.setEnabled(next);
      try {
        localStorage.setItem(
          STORAGE_KEY_WORKOUT,
          JSON.stringify({ xp, streakDays, soundEnabled, voiceCoachEnabled: next })
        );
      } catch {}
      return next;
    });
  };

  const logMeal = (item: MessMenuItem) => {
    const newMeal: LoggedMeal = {
      id: `meal_${Date.now()}`,
      itemId: item.id,
      name: item.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      calories: item.calories,
      protein: item.protein,
      icon: item.icon
    };

    setLoggedMeals((prev) => {
      const updated = [newMeal, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_NUTRITION, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (soundEnabled) sounds.playRepSuccess();
    coachVoice.speak(`Logged ${item.name.split('(')[0]}. +${item.protein}g protein!`, true);
  };

  const removeMeal = (id: string) => {
    setLoggedMeals((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_NUTRITION, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <WorkoutContext.Provider
      value={{
        selectedExercise,
        sessionReps,
        targetReps,
        currentStage,
        liveAngle,
        streakDays,
        xp,
        level,
        soundEnabled,
        voiceCoachEnabled,
        activeFaults,
        isTracking,
        weeklyCalorieHistory,
        loggedMeals,
        caloriesBurnedToday,
        caloriesGainedToday,
        proteinGainedToday,
        postureScoreToday,
        setSelectedExercise,
        setTargetReps,
        recordRep,
        handleTelemetry,
        resetSession,
        toggleSound,
        toggleVoiceCoach,
        setIsTracking,
        logMeal,
        removeMeal,
        setPostureScoreToday
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
