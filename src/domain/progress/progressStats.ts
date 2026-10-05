/**
 * FitMitra Platform-Neutral Progress & Streak Statistics
 * 
 * Pure functions calculating streaks, weekly summaries, and nutritional balances.
 * Free of DOM, LocalStorage, React state, or browser clock dependencies.
 */

import type { DailyCalorieRecord, LoggedMeal, ProgressSummary, StreakSummary } from '../models/domainTypes.ts';

/**
 * Calculates user workout streak from a series of activity timestamps.
 * 
 * @param activityDateStrings Array of YYYY-MM-DD strings or ISO timestamps.
 * @param referenceDate Optional YYYY-MM-DD reference date (defaults to today in UTC).
 */
export function calculateStreak(
  activityDateStrings: string[],
  referenceDate?: string
): StreakSummary {
  if (!activityDateStrings || activityDateStrings.length === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastActiveDate: '',
      isStreakActiveToday: false
    };
  }

  // Normalize all dates to YYYY-MM-DD
  const uniqueDates = Array.from(
    new Set(
      activityDateStrings
        .filter(Boolean)
        .map((d) => d.split('T')[0])
    )
  ).sort().reverse(); // Descending order (newest first)

  if (uniqueDates.length === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastActiveDate: '',
      isStreakActiveToday: false
    };
  }

  const todayStr = referenceDate || new Date().toISOString().split('T')[0];
  const lastActiveDate = uniqueDates[0];
  const isStreakActiveToday = lastActiveDate === todayStr;

  // Helper to parse YYYY-MM-DD into UTC epoch days
  const toEpochDays = (dateStr: string): number => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
  };

  const todayDays = toEpochDays(todayStr);
  const lastActiveDays = toEpochDays(lastActiveDate);

  // If last active was before yesterday, the current streak is broken
  const daysSinceLastActive = todayDays - lastActiveDays;
  let currentStreakDays = 0;

  if (daysSinceLastActive <= 1) {
    // Current streak is alive
    currentStreakDays = 1;
    let expectedDay = lastActiveDays;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDay = toEpochDays(uniqueDates[i]);
      if (prevDay === expectedDay - 1) {
        currentStreakDays++;
        expectedDay = prevDay;
      } else {
        break;
      }
    }
  }

  // Calculate longest historical streak
  let longestStreakDays = 0;
  let runningStreak = 0;
  let previousDay: number | null = null;

  for (let i = uniqueDates.length - 1; i >= 0; i--) {
    const currentDay = toEpochDays(uniqueDates[i]);
    if (previousDay === null || currentDay === previousDay + 1) {
      runningStreak++;
    } else if (currentDay !== previousDay) {
      runningStreak = 1;
    }
    longestStreakDays = Math.max(longestStreakDays, runningStreak);
    previousDay = currentDay;
  }

  return {
    currentStreakDays,
    longestStreakDays: Math.max(longestStreakDays, currentStreakDays),
    lastActiveDate,
    isStreakActiveToday
  };
}

/**
 * Calculates aggregated nutrition intake totals from logged meals.
 */
export function calculateNutritionSummary(meals: LoggedMeal[]): {
  totalCalories: number;
  totalProtein: number;
  mealCount: number;
} {
  if (!meals || meals.length === 0) {
    return { totalCalories: 0, totalProtein: 0, mealCount: 0 };
  }

  let totalCalories = 0;
  let totalProtein = 0;

  for (const m of meals) {
    totalCalories += m.calories || 0;
    totalProtein += m.protein || 0;
  }

  return {
    totalCalories,
    totalProtein,
    mealCount: meals.length
  };
}

/**
 * Computes weekly progress totals from 7-day calorie records.
 */
export function calculateWeeklyProgress(
  records: DailyCalorieRecord[],
  xpTotal = 180,
  streakDays = 5
): ProgressSummary {
  const safeRecords = Array.isArray(records) ? records : [];

  let weeklyCaloriesBurned = 0;
  let weeklyCaloriesGained = 0;
  let activeDaysCount = 0;

  for (const r of safeRecords) {
    weeklyCaloriesBurned += r.caloriesBurned || 0;
    weeklyCaloriesGained += r.caloriesGained || 0;
    if (r.caloriesBurned && r.caloriesBurned > 100) {
      activeDaysCount++;
    }
  }

  // Assume avg 15 minutes per active day
  const weeklyTotalMinutes = activeDaysCount * 15;
  const currentLevel = Math.floor(Math.max(0, xpTotal) / 100) + 1;

  return {
    weeklyWorkoutsCount: activeDaysCount,
    weeklyTotalMinutes,
    weeklyCaloriesBurned,
    weeklyCaloriesGained,
    currentStreakDays: streakDays,
    xpTotal,
    currentLevel
  };
}
