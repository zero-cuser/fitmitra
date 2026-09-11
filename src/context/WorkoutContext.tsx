'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ExerciseKey, FormFault, TelemetryResult, WorkoutState } from '@/types/fitness';
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
}

const STORAGE_KEY = 'FITMITRA_WORKOUT_PROGRESS_V2';

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedExercise, setSelectedExerciseState] = useState<ExerciseKey>('squats');
  const [sessionReps, setSessionReps] = useState(0);
  const [targetReps, setTargetReps] = useState(EXERCISE_CATALOG.squats.defaultTarget);
  const [currentStage, setCurrentStage] = useState<'up' | 'down'>('up');
  const [liveAngle, setLiveAngle] = useState(160);
  const [activeFaults, setActiveFaults] = useState<FormFault[]>([]);
  const [streakDays, setStreakDays] = useState(4);
  const [xp, setXp] = useState(140);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceCoachEnabled, setVoiceCoachEnabled] = useState(true);
  const [isTracking, setIsTracking] = useState(false);

  // Load progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.xp === 'number') setXp(parsed.xp);
        if (typeof parsed.streakDays === 'number') setStreakDays(parsed.streakDays);
        if (typeof parsed.soundEnabled === 'boolean') setSoundEnabled(parsed.soundEnabled);
        if (typeof parsed.voiceCoachEnabled === 'boolean') {
          setVoiceCoachEnabled(parsed.voiceCoachEnabled);
          coachVoice.setEnabled(parsed.voiceCoachEnabled);
        }
      }
    } catch {}
  }, []);

  // Save progress
  const saveProgress = useCallback((newXp: number, newStreak: number) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          xp: newXp,
          streakDays: newStreak,
          soundEnabled,
          voiceCoachEnabled
        })
      );
    } catch {}
  }, [soundEnabled, voiceCoachEnabled]);

  const level = Math.floor(xp / 100) + 1;

  const setSelectedExercise = (exercise: ExerciseKey) => {
    setSelectedExerciseState(exercise);
    setSessionReps(0);
    setTargetReps(EXERCISE_CATALOG[exercise].defaultTarget);
    setCurrentStage(exercise === 'plank' ? 'down' : 'up');
    setLiveAngle(exercise === 'plank' ? 0 : 160);
    setActiveFaults([]);
    coachVoice.speak(`Switched to ${EXERCISE_CATALOG[exercise].shortName}`, true);
  };

  const recordRep = useCallback((increment = 1) => {
    setSessionReps((prev) => {
      const next = prev + increment;
      const config = EXERCISE_CATALOG[selectedExercise];

      // Audio and speech feedback
      if (soundEnabled) sounds.playRepSuccess();
      coachVoice.speakRep(next, config.metricUnit);

      // Encouragement at milestones
      if (next % 5 === 0 && next !== targetReps) {
        coachVoice.speakEncouragement();
      }

      // Goal celebration
      if (next >= targetReps && prev < targetReps) {
        if (soundEnabled) sounds.playWorkoutComplete();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        coachVoice.speak(`Target reached! Outstanding set of ${targetReps} ${config.shortName}!`, true);
      }

      // Award +10 XP per rep
      setXp((prevXp) => {
        const updatedXp = prevXp + 10 * increment;
        saveProgress(updatedXp, streakDays);
        return updatedXp;
      });

      return next;
    });
  }, [selectedExercise, soundEnabled, targetReps, streakDays, saveProgress]);

  const handleTelemetry = useCallback((telemetry: TelemetryResult) => {
    setLiveAngle(telemetry.angle);
    setCurrentStage(telemetry.stage);
    setActiveFaults(telemetry.formFaults || []);

    if (telemetry.formCue) {
      coachVoice.speakFormCue(telemetry.formCue);
    }

    if (telemetry.repCompleted) {
      recordRep(1);
    }
  }, [recordRep]);

  const resetSession = () => {
    setSessionReps(0);
    setCurrentStage(selectedExercise === 'plank' ? 'down' : 'up');
    setActiveFaults([]);
    coachVoice.speak('Session reset. Ready when you are.', true);
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ xp, streakDays, soundEnabled: next, voiceCoachEnabled })
      );
      return next;
    });
  };

  const toggleVoiceCoach = () => {
    setVoiceCoachEnabled((prev) => {
      const next = !prev;
      coachVoice.setEnabled(next);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ xp, streakDays, soundEnabled, voiceCoachEnabled: next })
      );
      return next;
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
        setIsTracking,
        setSelectedExercise,
        setTargetReps,
        recordRep,
        handleTelemetry,
        resetSession,
        toggleSound,
        toggleVoiceCoach
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
