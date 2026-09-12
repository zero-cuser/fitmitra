'use client';

import React, { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { Flame, Utensils, TrendingUp, TrendingDown, Calendar, BarChart3, Activity, PieChart, Zap } from 'lucide-react';

type HistogramMode = 'daily' | 'distribution';

interface CalorieBin {
  label: string;
  range: string;
  min: number;
  max: number;
  days: string[];
  intakeCount: number;
  burnCount: number;
}

export const WeeklyCalorieChart: React.FC = () => {
  const { weeklyCalorieHistory, caloriesBurnedToday, caloriesGainedToday } = useWorkout();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(weeklyCalorieHistory.length - 1);
  const [histogramMode, setHistogramMode] = useState<HistogramMode>('daily');
  const [selectedBinIndex, setSelectedBinIndex] = useState<number | null>(null);

  // Compute weekly totals & statistics
  const totalBurnedWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesBurned, 0);
  const totalGainedWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesGained, 0);
  const meanIntake = Math.round(totalGainedWeek / (weeklyCalorieHistory.length || 1));
  const meanBurned = Math.round(totalBurnedWeek / (weeklyCalorieHistory.length || 1));
  const netWeeklyBalance = totalGainedWeek - totalBurnedWeek;
  const activeWorkoutDays = weeklyCalorieHistory.filter((d) => d.caloriesBurned >= 150).length;

  const selectedDay = weeklyCalorieHistory[selectedDayIndex] || weeklyCalorieHistory[weeklyCalorieHistory.length - 1];

  // Frequency Bins for Statistical Calorie Intake Histogram
  const CALORIE_BINS: CalorieBin[] = [
    { label: 'Deficit Zone', range: '< 1,700 kcal', min: 0, max: 1700, days: [], intakeCount: 0, burnCount: 0 },
    { label: 'Target Balance', range: '1,700 – 1,900 kcal', min: 1700, max: 1900, days: [], intakeCount: 0, burnCount: 0 },
    { label: 'Moderate Fuel', range: '1,900 – 2,100 kcal', min: 1900, max: 2100, days: [], intakeCount: 0, burnCount: 0 },
    { label: 'Surplus Peak', range: '> 2,100 kcal', min: 2100, max: 99999, days: [], intakeCount: 0, burnCount: 0 }
  ];

  weeklyCalorieHistory.forEach((d) => {
    CALORIE_BINS.forEach((bin) => {
      if (d.caloriesGained >= bin.min && d.caloriesGained < bin.max) {
        bin.intakeCount++;
        bin.days.push(d.day);
      }
    });
  });

  const maxCalorieValue = Math.max(
    ...weeklyCalorieHistory.flatMap((d) => [d.caloriesGained, d.caloriesBurned]),
    2400
  );

  const maxBinCount = Math.max(...CALORIE_BINS.map((b) => b.intakeCount), 4);

  // Generate SVG smooth density curve path for Daily Histogram
  const generateDensityCurve = () => {
    const width = 700;
    const height = 180;
    const stepX = width / (weeklyCalorieHistory.length - 1 || 1);

    const points = weeklyCalorieHistory.map((d, i) => {
      const x = i * stepX;
      const y = height - (d.caloriesGained / maxCalorieValue) * height;
      return { x, y };
    });

    if (points.length < 2) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
      
      {/* Section Header & Histogram Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Biometric Calorie Histogram</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Weekly Energy Distribution Histogram
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Statistical frequency & continuous bin distribution of calories burned vs. nutritional intake.
          </p>
        </div>

        {/* Mode Toggle & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Histogram Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setHistogramMode('daily')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                histogramMode === 'daily'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Daily Continuous
            </button>
            <button
              onClick={() => setHistogramMode('distribution')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                histogramMode === 'distribution'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Frequency Bins
            </button>
          </div>

          {/* Histogram Series Legend */}
          <div className="flex items-center space-x-3 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-300 font-medium">Burned</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <span className="text-slate-300 font-medium">Intake</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Statistical KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Total Burned (Week)</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">
            {totalBurnedWeek.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span>
          </p>
          <span className="text-[10px] text-slate-500">Mean: {meanBurned} kcal/day</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Total Intake (Week)</span>
            <Utensils className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400">
            {totalGainedWeek.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span>
          </p>
          <span className="text-[10px] text-slate-500">Mean: {meanIntake} kcal/day</span>
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
          <p className="text-xl sm:text-2xl font-black text-cyan-400">
            {activeWorkoutDays} <span className="text-xs font-normal text-slate-500">/ 7 days</span>
          </p>
          <span className="text-[10px] text-emerald-400 font-medium">Campus streak on fire! 🔥</span>
        </div>
      </div>

      {/* HISTOGRAM CANVAS CONTAINER */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 space-y-4 relative overflow-hidden">
        
        {/* Background Grid Scale lines */}
        <div className="absolute inset-x-5 top-8 bottom-16 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="w-full border-b border-slate-700 border-dashed" />
          <div className="w-full border-b border-slate-700 border-dashed" />
          <div className="w-full border-b border-slate-700 border-dashed" />
          <div className="w-full border-b border-slate-700 border-dashed" />
        </div>

        {/* 1. DAILY CONTINUOUS HISTOGRAM VIEW */}
        {histogramMode === 'daily' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
              <span className="font-semibold text-slate-300">Continuous 7-Day Histogram Bins (Touching Interval Columns)</span>
              <span>Y-Axis: Energy Units (0 – 2,400 kcal)</span>
            </div>

            {/* Histogram Columns Container */}
            <div className="h-64 sm:h-72 relative flex items-end pt-8 px-1">
              
              {/* Density Polygon Curve Overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 180">
                <defs>
                  <linearGradient id="densityGlow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <path
                  d={generateDensityCurve()}
                  fill="none"
                  stroke="url(#densityGlow)"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                  className="filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                />
              </svg>

              {/* Contiguous Touching Histogram Columns */}
              <div className="w-full h-52 sm:h-60 flex items-end border-b border-slate-700">
                {weeklyCalorieHistory.map((dayData, idx) => {
                  const burnedHeight = Math.max(6, Math.min(100, Math.round((dayData.caloriesBurned / maxCalorieValue) * 100)));
                  const gainedHeight = Math.max(6, Math.min(100, Math.round((dayData.caloriesGained / maxCalorieValue) * 100)));
                  const isSelected = idx === selectedDayIndex;

                  return (
                    <div
                      key={dayData.day}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`flex-1 h-full flex items-end justify-center cursor-pointer relative border-r border-slate-800/80 last:border-r-0 transition-colors group ${
                        isSelected ? 'bg-slate-800/30' : 'hover:bg-slate-900/40'
                      }`}
                    >
                      {/* Histogram Bin Columns (Flush, Touching Layout) */}
                      <div className="w-full flex items-end justify-center px-1 sm:px-2 gap-1 h-full">
                        
                        {/* Burned Bin Column */}
                        <div
                          style={{ height: `${burnedHeight}%` }}
                          className={`flex-1 rounded-t-sm bg-gradient-to-t from-emerald-600/90 to-teal-400/90 border-t border-x border-emerald-400/40 transition-all duration-300 relative ${
                            isSelected ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/30' : 'group-hover:brightness-110'
                          }`}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-emerald-400 bg-slate-900 px-1 py-0.5 rounded border border-emerald-500/40 pointer-events-none whitespace-nowrap z-20">
                            {dayData.caloriesBurned} kcal
                          </span>
                        </div>

                        {/* Intake Bin Column */}
                        <div
                          style={{ height: `${gainedHeight}%` }}
                          className={`flex-1 rounded-t-sm bg-gradient-to-t from-amber-600/90 to-orange-400/90 border-t border-x border-amber-400/40 transition-all duration-300 relative ${
                            isSelected ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/30' : 'group-hover:brightness-110'
                          }`}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-amber-400 bg-slate-900 px-1 py-0.5 rounded border border-amber-500/40 pointer-events-none whitespace-nowrap z-20">
                            {dayData.caloriesGained} kcal
                          </span>
                        </div>

                      </div>

                      {/* Bin Top Frequency Value Pill */}
                      {isSelected && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-extrabold text-white shadow-lg whitespace-nowrap z-20">
                          {dayData.caloriesGained} / {dayData.caloriesBurned}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Bin Boundaries */}
            <div className="flex border-t border-slate-800 pt-2 px-1">
              {weeklyCalorieHistory.map((d, idx) => (
                <div
                  key={d.day}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`flex-1 text-center cursor-pointer transition-colors ${
                    idx === selectedDayIndex ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="block text-xs uppercase tracking-wider">{d.day}</span>
                  <span className="block text-[10px] text-slate-500">{d.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. STATISTICAL FREQUENCY BINS VIEW */}
        {histogramMode === 'distribution' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
              <span className="font-semibold text-slate-300">Intake Frequency Distribution Bins</span>
              <span>Y-Axis: Day Frequency Count</span>
            </div>

            {/* Distribution Histogram Columns */}
            <div className="h-60 flex items-end gap-3 px-2 border-b border-slate-700 pb-2">
              {CALORIE_BINS.map((bin, idx) => {
                const heightPercent = Math.max(12, Math.round((bin.intakeCount / maxBinCount) * 100));
                const isSelected = selectedBinIndex === idx;

                return (
                  <div
                    key={bin.label}
                    onClick={() => setSelectedBinIndex(isSelected ? null : idx)}
                    className={`flex-1 flex flex-col items-center cursor-pointer transition-all ${
                      isSelected ? 'scale-105' : 'hover:opacity-90'
                    }`}
                  >
                    {/* Frequency Count Header */}
                    <span className="text-xs font-black text-amber-400 mb-1">
                      {bin.intakeCount} {bin.intakeCount === 1 ? 'day' : 'days'}
                    </span>

                    {/* Histogram Frequency Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-xl bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 border border-amber-300/40 relative shadow-lg ${
                        isSelected ? 'ring-2 ring-white shadow-amber-500/50' : ''
                      }`}
                    >
                      {/* Days Tag list inside bar */}
                      <div className="p-2 flex flex-wrap gap-1 justify-center">
                        {bin.days.map((d) => (
                          <span key={d} className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-bold text-white">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bin Range Labels */}
                    <div className="mt-2 text-center">
                      <span className="block text-xs font-bold text-slate-200">{bin.label}</span>
                      <span className="block text-[10px] text-slate-400">{bin.range}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Bin Inspector Card */}
        {selectedDay && histogramMode === 'daily' && (
          <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-bold text-sm">
                {selectedDay.day}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {selectedDay.day}, {selectedDay.date} Histogram Bin
                </h4>
                <p className="text-[11px] text-slate-400">
                  Burned: <strong className="text-emerald-400">{selectedDay.caloriesBurned} kcal</strong> • Intake: <strong className="text-amber-400">{selectedDay.caloriesGained} kcal</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">Daily Balance:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedDay.netBalance <= 1600
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
