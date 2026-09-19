import type { FitnessGoal, UserProfile } from '../types/fitness';

export type AuthStatus = 'authenticated' | 'guest' | 'logged_out';

export interface BodyMetricsInput {
  age: number;
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active';
}

export const STORAGE_KEY_USER = 'FITMITRA_AUTH_USER_V3';
export const STORAGE_KEY_FRIENDS = 'FITMITRA_FRIENDS_V3';
export const STORAGE_KEY_AUTH_STATUS = 'FITMITRA_AUTH_STATUS_V3';

export const calculateCalorieAndWaterNeeds = (
  gender: 'male' | 'female' | 'other',
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active',
  goalInput: FitnessGoal | FitnessGoal[]
) => {
  // Mifflin-St Jeor Equation
  const s = gender === 'female' ? -161 : gender === 'male' ? 5 : -78;
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + s);

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725
  };
  const mult = activityMultipliers[activityLevel] || 1.375;
  const tdee = Math.round(bmr * mult);

  const goalsArray = Array.isArray(goalInput) ? goalInput : [goalInput];
  let calorieAdjustment = 0;

  if (goalsArray.includes('fat_loss') || goalsArray.includes('toning')) {
    calorieAdjustment -= 350;
  }
  if (goalsArray.includes('strength') || goalsArray.includes('athletic')) {
    calorieAdjustment += 250;
  }
  if (goalsArray.includes('cardio')) {
    calorieAdjustment += 150;
  }

  const targetCalories = Math.max(1350, tdee + calorieAdjustment);
  const targetWaterMl = Math.round(weightKg * 35); // 35 ml per kg bodyweight

  return { bmr, tdee, targetCalories, targetWaterMl };
};

export const validateUserProfile = (data: unknown): UserProfile | null => {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Partial<UserProfile>;
  if (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.email === 'string'
  ) {
    return data as UserProfile;
  }
  return null;
};
