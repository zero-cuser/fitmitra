'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { FitnessGoal, UserProfile } from '@/types/fitness';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (name: string, email: string, password: string, goal: FitnessGoal) => { success: boolean; error?: string };
  logout: () => void;
  updateGoal: (goal: FitnessGoal) => void;
}

const STORAGE_KEY = 'FITMITRA_AUTH_USER_V2';

const DEFAULT_USER: UserProfile = {
  id: 'usr_student_01',
  name: 'Aarav Sharma',
  email: 'aarav.student@univ.edu.in',
  goal: 'posture',
  joinedDate: 'Sept 2026',
  avatarColor: 'from-emerald-500 to-teal-700'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      } else {
        // Initial default student profile
        setUser(DEFAULT_USER);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USER));
      }
    } catch {
      setUser(DEFAULT_USER);
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
      return { success: false, error: 'Please provide both email and password.' };
    }
    if (password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    // Dynamic mock user matching login email
    const namePart = email.split('@')[0];
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const loggedUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: user?.email === email ? user.name : formattedName,
      email,
      goal: user?.goal || 'posture',
      joinedDate: 'Sept 2026',
      avatarColor: 'from-cyan-500 to-blue-700'
    };

    setUser(loggedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const signup = (name: string, email: string, password: string, goal: FitnessGoal) => {
    if (!name.trim() || !email.trim() || !password) {
      return { success: false, error: 'All fields are required.' };
    }
    if (!email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      goal,
      joinedDate: 'Sept 2026',
      avatarColor: 'from-emerald-500 to-cyan-700'
    };

    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateGoal = (goal: FitnessGoal) => {
    if (!user) return;
    const updated = { ...user, goal };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        signup,
        logout,
        updateGoal
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
