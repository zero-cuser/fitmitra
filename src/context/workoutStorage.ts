import type { DailyCalorieRecord } from '../types/fitness';
 
export const STORAGE_KEY_WORKOUT = 'FITMITRA_WORKOUT_PROGRESS_V3';
export const STORAGE_KEY_NUTRITION = 'FITMITRA_NUTRITION_V3';
export const STORAGE_KEY_CALORIES_WEEK = 'FITMITRA_CALORIES_WEEK_V3';
export const STORAGE_KEY_WATER = 'FITMITRA_WATER_V3';

export const validateWeeklyCalorieRecords = (data: unknown): DailyCalorieRecord[] | null => {
  if (!Array.isArray(data) || data.length === 0) return null;
  const valid = data.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as any).day === 'string' &&
      typeof (item as any).date === 'string' &&
      typeof (item as any).caloriesBurned === 'number' &&
      typeof (item as any).caloriesGained === 'number' &&
      typeof (item as any).netBalance === 'number'
  );
  return valid ? (data as DailyCalorieRecord[]) : null;
};
