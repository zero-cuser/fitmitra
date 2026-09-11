'use client';

import React, { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { Flame, Utensils, TrendingUp, TrendingDown, Calendar, Info, Zap } from 'lucide-react';

export const WeeklyCalorieChart: React.FC = () => {
  const { weeklyCalorieHistory, caloriesBurnedToday, caloriesGainedToday } = useWorkout();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(weeklyCalorieHistory.length - 1);

  // Compute weekly totals
  const totalBurnedWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesBurned, 0);
  const totalGainedWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesGained, 0);
  const netWeeklyBalance = totalGainedWeek - totalBurnedWeek;
  const activeWorkoutDays = weeklyCalorieHistory.filter((d) => d.caloriesBurned >= 150).length;

  const selectedDay = weeklyCalorieHistory[selectedDayIndex] || weeklyCalorieHistory[weeklyCalorieHistory.length - 1];

  // Max value to scale bar heights relative to container (max ~ 2500 kcal)
  const maxCalorieValue = Math.max(
    ...weeklyCalorieHistory.flatMap((d) => [d.caloriesGained, d.caloriesBurned]),
    2400
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>7-Day Biometric Energy Balance</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Weekly Calories Burned vs. Gained
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Visual comparison of calories burned through workouts against daily nutritional intake.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 self-start sm:self-auto bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 text-xs">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300 font-medium">Burned (Workouts)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-md bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300 font-medium">Gained (Meals & Food)</span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Total Burned</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">{totalBurnedWeek.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span></p>
          <span className="text-[10px] text-slate-500">From AI vision reps & workouts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Total Gained</span>
            <Utensils className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400">{totalGainedWeek.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span></p>
          <span className="text-[10px] text-slate-500">From logged meals & snacks</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Net Weekly Intake</span>
            {netWeeklyBalance > 0 ? (
              <TrendingUp className="w-4 h-4 text-amber-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">
            {netWeeklyBalance > 0 ? `+${netWeeklyBalance.toLocaleString()}` : netWeeklyBalance.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">kcal</span>
          </p>
          <span className="text-[10px] text-slate-500">Avg {Math.round(netWeeklyBalance / 7)} kcal/day net</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Active Workout Days</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-cyan-400">{activeWorkoutDays} <span className="text-xs font-normal text-slate-500">/ 7 days</span></p>
          <span className="text-[10px] text-emerald-400 font-medium">Campus streak on fire! 🔥</span>
        </div>
      </div>

      {/* Visual Dual-Bar Graphical Chart */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        
        {/* Chart Bars Grid */}
        <div className="h-64 sm:h-72 flex items-end justify-between gap-2 sm:gap-4 pt-8 px-2">
          {weeklyCalorieHistory.map((dayData, idx) => {
            const burnedHeightPercent = Math.max(8, Math.min(100, Math.round((dayData.caloriesBurned / maxCalorieValue) * 100)));
            const gainedHeightPercent = Math.max(8, Math.min(100, Math.round((dayData.caloriesGained / maxCalorieValue) * 100)));
            const isSelected = idx === selectedDayIndex;

            return (
              <div
                key={dayData.day}
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex-1 flex flex-col items-center cursor-pointer transition-all group ${
                  isSelected ? 'scale-105' : 'opacity-85 hover:opacity-100'
                }`}
              >
                {/* Dual Bars Container */}
                <div className="w-full flex items-end justify-center space-x-1 sm:space-x-1.5 h-48 sm:h-56 relative">
                  
                  {/* Green Bar: Burned */}
                  <div
                    style={{ height: `${burnedHeightPercent}%` }}
                    className={`w-3 sm:w-5 rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-500 relative shadow-sm ${
                      isSelected ? 'ring-2 ring-emerald-400/50 shadow-emerald-500/30' : 'group-hover:brightness-110'
                    }`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-500/30 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {dayData.caloriesBurned}
                    </span>
                  </div>

                  {/* Amber Bar: Gained */}
                  <div
                    style={{ height: `${gainedHeightPercent}%` }}
                    className={`w-3 sm:w-5 rounded-t-lg bg-gradient-to-t from-amber-600 to-orange-400 transition-all duration-500 relative shadow-sm ${
                      isSelected ? 'ring-2 ring-amber-400/50 shadow-amber-500/30' : 'group-hover:brightness-110'
                    }`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-amber-500/30 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {dayData.caloriesGained}
                    </span>
                  </div>

                </div>

                {/* Day Labels */}
                <div className="mt-3 text-center">
                  <span
                    className={`block text-xs font-bold transition-colors ${
                      isSelected ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {dayData.day}
                  </span>
                  <span className="block text-[10px] text-slate-500">{dayData.date}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Inspector Card */}
        {selectedDay && (
          <div className="mt-2 p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-bold text-sm">
                {selectedDay.day}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {selectedDay.day}, {selectedDay.date} Breakdown
                </h4>
                <p className="text-[11px] text-slate-400">
                  Calories Burned: <strong className="text-emerald-400">{selectedDay.caloriesBurned} kcal</strong> • Food Intake: <strong className="text-amber-400">{selectedDay.caloriesGained} kcal</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">Daily Balance:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedDay.caloriesBurned >= 300
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {selectedDay.netBalance > 0 ? `+${selectedDay.netBalance} kcal` : `${selectedDay.netBalance} kcal`}
              </span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
