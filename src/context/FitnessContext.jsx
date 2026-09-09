import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { coachVoice } from '../utils/voiceCoach';
import { playRepSuccess, playWorkoutComplete } from '../utils/soundEffects';

const FitnessContext = createContext();

const STORAGE_KEY = 'FITMITRA_STATE_V1';

const DEFAULT_STATE = {
  user: {
    name: 'Aman Verma',
    college: 'Delhi Technological Univ (DTU)',
    hostel: 'Aryabhatta Hostel (Wing A)',
    roomNo: 'B-204',
    level: 2,
    xp: 340,
    nextLevelXp: 500,
    fitCoins: 160,
    currentStreak: 4,
    soundEnabled: true,
    voiceCoachEnabled: true,
  },
  todayStats: {
    waterMl: 1500,
    waterTargetMl: 2500,
    caloriesBurned: 185,
    repsCompleted: 35,
    postureBreaksTaken: 3,
    mindfulMinutes: 8,
  },
  loggedMeals: [
    {
      id: 'm_init_1',
      name: 'Dal Tadka + 2 Roti',
      category: 'Hostel Mess',
      calories: 350,
      protein: 13,
      carbs: 58,
      fat: 7,
      timestamp: '12:45 PM'
    },
    {
      id: 'm_init_2',
      name: 'Boiled Eggs (2 whole)',
      category: 'Student Protein',
      calories: 155,
      protein: 13,
      carbs: 1,
      fat: 11,
      timestamp: '05:30 PM'
    }
  ],
  completedQuests: ['q1'],
};

export const FitnessProvider = ({ children }) => {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load from localStorage", e);
    }
    return DEFAULT_STATE;
  });

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }, [state]);

  // Sync voice coach setting
  useEffect(() => {
    coachVoice.toggle(state.user.voiceCoachEnabled);
  }, [state.user.voiceCoachEnabled]);

  const addXpAndCoins = (xpToAdd, coinsToAdd) => {
    setState(prev => {
      let newXp = prev.user.xp + xpToAdd;
      let newLevel = prev.user.level;
      let newNextXp = prev.user.nextLevelXp;

      if (newXp >= newNextXp) {
        newLevel += 1;
        newXp = newXp - newNextXp;
        newNextXp = Math.round(newNextXp * 1.5);
        // Level up celebration!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        coachVoice.speak(`Congratulations! You reached Level ${newLevel}!`, true);
      }

      return {
        ...prev,
        user: {
          ...prev.user,
          xp: newXp,
          level: newLevel,
          nextLevelXp: newNextXp,
          fitCoins: prev.user.fitCoins + coinsToAdd
        }
      };
    });
  };

  const recordReps = (exerciseKey, count, calPerRep = 0.35) => {
    if (count <= 0) return;
    const calories = Math.round(count * calPerRep);

    setState(prev => ({
      ...prev,
      todayStats: {
        ...prev.todayStats,
        repsCompleted: prev.todayStats.repsCompleted + count,
        caloriesBurned: prev.todayStats.caloriesBurned + calories
      }
    }));

    if (state.user.soundEnabled) playRepSuccess();
    addXpAndCoins(count * 3, Math.ceil(count / 2));
  };

  const logWater = (amountMl) => {
    setState(prev => ({
      ...prev,
      todayStats: {
        ...prev.todayStats,
        waterMl: Math.min(prev.todayStats.waterMl + amountMl, 5000)
      }
    }));
    addXpAndCoins(10, 5);
  };

  const logMeal = (meal) => {
    const newEntry = {
      ...meal,
      id: 'meal_' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setState(prev => ({
      ...prev,
      loggedMeals: [newEntry, ...prev.loggedMeals]
    }));

    addXpAndCoins(15, 10);
  };

  const deleteMeal = (id) => {
    setState(prev => ({
      ...prev,
      loggedMeals: prev.loggedMeals.filter(m => m.id !== id)
    }));
  };

  const logPostureBreak = () => {
    setState(prev => ({
      ...prev,
      todayStats: {
        ...prev.todayStats,
        postureBreaksTaken: prev.todayStats.postureBreaksTaken + 1
      }
    }));
    if (state.user.soundEnabled) playWorkoutComplete();
    addXpAndCoins(20, 15);
  };

  const logMindfulSession = (minutes = 3) => {
    setState(prev => ({
      ...prev,
      todayStats: {
        ...prev.todayStats,
        mindfulMinutes: prev.todayStats.mindfulMinutes + minutes
      }
    }));
    addXpAndCoins(25, 15);
  };

  const claimQuest = (questId, coins, xp) => {
    if (state.completedQuests.includes(questId)) return;
    setState(prev => ({
      ...prev,
      completedQuests: [...prev.completedQuests, questId]
    }));
    addXpAndCoins(xp, coins);
    confetti({ particleCount: 50, spread: 60 });
  };

  const toggleVoiceCoach = () => {
    setState(prev => ({
      ...prev,
      user: {
        ...prev.user,
        voiceCoachEnabled: !prev.user.voiceCoachEnabled
      }
    }));
  };

  const toggleSound = () => {
    setState(prev => ({
      ...prev,
      user: {
        ...prev.user,
        soundEnabled: !prev.user.soundEnabled
      }
    }));
  };

  const resetData = () => {
    setState(DEFAULT_STATE);
  };

  return (
    <FitnessContext.Provider value={{
      user: state.user,
      todayStats: state.todayStats,
      loggedMeals: state.loggedMeals,
      completedQuests: state.completedQuests,
      recordReps,
      logWater,
      logMeal,
      deleteMeal,
      logPostureBreak,
      logMindfulSession,
      claimQuest,
      toggleVoiceCoach,
      toggleSound,
      resetData
    }}>
      {children}
    </FitnessContext.Provider>
  );
};

export const useFitness = () => {
  const context = useContext(FitnessContext);
  if (!context) throw new Error("useFitness must be used within a FitnessProvider");
  return context;
};
