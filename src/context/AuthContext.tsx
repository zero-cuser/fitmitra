'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { FitnessGoal, Friend, UserProfile } from '@/types/fitness';

import {
  BodyMetricsInput,
  calculateCalorieAndWaterNeeds,
  STORAGE_KEY_USER,
  STORAGE_KEY_FRIENDS,
  STORAGE_KEY_AUTH_STATUS,
  validateUserProfile
} from './authStorage';
export type { BodyMetricsInput };
export {
  calculateCalorieAndWaterNeeds,
  STORAGE_KEY_USER,
  STORAGE_KEY_FRIENDS,
  STORAGE_KEY_AUTH_STATUS,
  validateUserProfile
};

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  friends: Friend[];
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (
    name: string,
    username: string,
    email: string,
    password: string,
    goal: FitnessGoal | FitnessGoal[],
    metrics?: BodyMetricsInput
  ) => { success: boolean; error?: string };
  logout: () => void;
  loginAsGuest: () => void;
  updateGoal: (goal: FitnessGoal) => void;
  addFriend: (usernameOrCode: string) => { success: boolean; message: string };
  cheerFriend: (friendId: string) => void;
}


const DEFAULT_USER: UserProfile = {
  id: 'usr_student_01',
  name: 'Aarav Sharma',
  username: 'aarav_fit',
  email: 'aarav.sharma@campus.edu.in',
  goal: 'strength',
  goals: ['strength', 'fat_loss'],
  joinedDate: 'Sept 2026',
  avatarColor: 'from-emerald-500 to-teal-700',
  age: 20,
  gender: 'male',
  heightCm: 175,
  weightKg: 68,
  activityLevel: 'moderate',
  calculatedBmr: 1675,
  targetDailyCalories: 2200,
  targetWaterMl: 2500
};

const INITIAL_CAMPUS_FRIENDS: Friend[] = [
  {
    id: 'fr_01',
    name: 'Rahul Sen',
    username: 'rahul_sen',
    hostelWing: 'Aryabhatta Wing A (Room 210)',
    avatarColor: 'from-blue-500 to-indigo-600',
    statusText: 'Crushing 40 squats before evening study',
    isOnline: true,
    cheerCount: 14,
    todayStats: {
      repsCompleted: 45,
      caloriesBurned: 165,
      caloriesGained: 680,
      postureScore: 88,
      streakDays: 7,
      favoriteExercise: 'Squats'
    }
  },
  {
    id: 'fr_02',
    name: 'Priya Patel',
    username: 'priya_p',
    hostelWing: 'Sarojini Wing C (Room 108)',
    avatarColor: 'from-purple-500 to-pink-600',
    statusText: 'In deep study mode • Posture Sentinel on',
    isOnline: true,
    cheerCount: 22,
    todayStats: {
      repsCompleted: 30,
      caloriesBurned: 120,
      caloriesGained: 520,
      postureScore: 94,
      streakDays: 12,
      favoriteExercise: 'Plank'
    }
  },
  {
    id: 'fr_03',
    name: 'Aditya Verma',
    username: 'aditya_v',
    hostelWing: 'Ramanujan Wing B (Room 312)',
    avatarColor: 'from-amber-500 to-orange-600',
    statusText: 'Exam prep • Doing 2-min Pomodoro lunges',
    isOnline: false,
    cheerCount: 9,
    todayStats: {
      repsCompleted: 24,
      caloriesBurned: 95,
      caloriesGained: 740,
      postureScore: 78,
      streakDays: 4,
      favoriteExercise: 'Push-ups'
    }
  },
  {
    id: 'fr_04',
    name: 'Sneha Kulkarni',
    username: 'sneha_k',
    hostelWing: 'Gargi Wing D (Room 402)',
    avatarColor: 'from-cyan-500 to-teal-600',
    statusText: 'Just completed 4-7-8 pre-exam breathing reset',
    isOnline: true,
    cheerCount: 31,
    todayStats: {
      repsCompleted: 50,
      caloriesBurned: 190,
      caloriesGained: 610,
      postureScore: 91,
      streakDays: 15,
      favoriteExercise: 'Jumping Jacks'
    }
  }
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>(INITIAL_CAMPUS_FRIENDS);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  // Initialize from LocalStorage
  useEffect(() => {
    try {
      const authStatus = localStorage.getItem(STORAGE_KEY_AUTH_STATUS);

      if (authStatus === 'logged_out') {
        // Explicit logout was triggered: keep session unauthenticated across reloads
        setUser(null);
      } else {
        const savedUser = localStorage.getItem(STORAGE_KEY_USER);
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          const validUser = validateUserProfile(parsed);
          if (validUser) {
            setUser(validUser);
          } else {
            setUser(null);
          }
        } else if (!authStatus) {
          // First visit: initialize demo user for seamless evaluation
          setUser(DEFAULT_USER);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(DEFAULT_USER));
          localStorage.setItem(STORAGE_KEY_AUTH_STATUS, 'guest');
        } else {
          setUser(null);
        }
      }

      const savedFriends = localStorage.getItem(STORAGE_KEY_FRIENDS);
      if (savedFriends) {
        const parsedFriends = JSON.parse(savedFriends);
        if (Array.isArray(parsedFriends) && parsedFriends.length > 0) {
          setFriends(parsedFriends);
        }
      } else {
        localStorage.setItem(STORAGE_KEY_FRIENDS, JSON.stringify(INITIAL_CAMPUS_FRIENDS));
      }
    } catch {
      setUser(null);
    }
  }, []);

  const openAuthModal = (tab: 'login' | 'signup' = 'signup') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = (email: string, password: string) => {
    if (!email || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }
    if (password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    const usernamePart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const namePart = usernamePart.charAt(0).toUpperCase() + usernamePart.slice(1);

    const loggedUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: user?.email === email ? user.name : namePart,
      username: usernamePart,
      email,
      hostelWing: user?.hostelWing || 'Aryabhatta Wing A',
      goal: user?.goal || 'strength',
      goals: user?.goals || ['strength'],
      joinedDate: 'Sept 2026',
      avatarColor: 'from-cyan-500 to-blue-700'
    };

    setUser(loggedUser);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(loggedUser));
      localStorage.setItem(STORAGE_KEY_AUTH_STATUS, 'authenticated');
    } catch {}
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const signup = (
    name: string,
    username: string,
    email: string,
    password: string,
    goal: FitnessGoal | FitnessGoal[],
    metrics?: BodyMetricsInput
  ) => {
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      return { success: false, error: 'All fields are required.' };
    }
    if (!email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

    const colors = [
      'from-emerald-500 to-teal-700',
      'from-cyan-500 to-blue-700',
      'from-violet-500 to-purple-700',
      'from-amber-500 to-orange-700'
    ];
    const pickedColor = colors[Math.floor(Math.random() * colors.length)];

    const goalsArray = Array.isArray(goal) ? goal : [goal];
    const primaryGoal = goalsArray[0] || 'strength';

    let calc = {
      bmr: 1650,
      tdee: 2200,
      targetCalories: 2200,
      targetWaterMl: 2500
    };

    if (metrics) {
      calc = calculateCalorieAndWaterNeeds(
        metrics.gender,
        metrics.weightKg,
        metrics.heightCm,
        metrics.age,
        metrics.activityLevel,
        goalsArray
      );
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      username: cleanUsername,
      email: email.trim(),
      goal: primaryGoal,
      goals: goalsArray,
      joinedDate: 'Sept 2026',
      avatarColor: pickedColor,
      age: metrics?.age || 20,
      gender: metrics?.gender || 'male',
      heightCm: metrics?.heightCm || 175,
      weightKg: metrics?.weightKg || 68,
      activityLevel: metrics?.activityLevel || 'moderate',
      calculatedBmr: calc.bmr,
      targetDailyCalories: calc.targetCalories,
      targetWaterMl: calc.targetWaterMl
    };

    setUser(newUser);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
      localStorage.setItem(STORAGE_KEY_AUTH_STATUS, 'authenticated');
    } catch {}
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const loginAsGuest = () => {
    setUser(DEFAULT_USER);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(DEFAULT_USER));
      localStorage.setItem(STORAGE_KEY_AUTH_STATUS, 'guest');
    } catch {}
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.setItem(STORAGE_KEY_AUTH_STATUS, 'logged_out');
    } catch {}
    setUser(null);
  };

  const updateGoal = (goal: FitnessGoal) => {
    if (!user) return;
    const updated = { ...user, goal };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
  };

  const addFriend = (usernameOrCode: string) => {
    const clean = usernameOrCode.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      return { success: false, message: 'Please enter a valid username or wing code.' };
    }

    const exists = friends.some((f) => f.username.toLowerCase() === clean);
    if (exists) {
      return { success: false, message: `@${clean} is already in your campus friend network!` };
    }

    const newFriend: Friend = {
      id: `fr_${Date.now()}`,
      name: clean.charAt(0).toUpperCase() + clean.slice(1),
      username: clean,
      hostelWing: 'Campus Hostel Wing',
      avatarColor: 'from-emerald-500 to-indigo-600',
      statusText: 'Just joined FitMitra campus network',
      isOnline: true,
      cheerCount: 1,
      todayStats: {
        repsCompleted: 15,
        caloriesBurned: 60,
        caloriesGained: 450,
        postureScore: 85,
        streakDays: 1,
        favoriteExercise: 'Squats'
      }
    };

    const updated = [newFriend, ...friends];
    setFriends(updated);
    try {
      localStorage.setItem(STORAGE_KEY_FRIENDS, JSON.stringify(updated));
    } catch {}

    return { success: true, message: `Connected with @${clean}! You can now compare daily fitness stats.` };
  };

  const cheerFriend = (friendId: string) => {
    setFriends((prev) => {
      const updated = prev.map((f) => {
        if (f.id === friendId) {
          return { ...f, cheerCount: f.cheerCount + 1 };
        }
        return f;
      });
      try {
        localStorage.setItem(STORAGE_KEY_FRIENDS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAuthModalOpen,
        authModalTab,
        friends,
        openAuthModal,
        closeAuthModal,
        login,
        signup,
        logout,
        loginAsGuest,
        updateGoal,
        addFriend,
        cheerFriend
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
