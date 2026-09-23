'use client';

import React, { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import {
  Flame,
  Utensils,
  TrendingUp,
  TrendingDown,
  Calendar,
  Zap,
  CheckCircle2,
  Info,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

type ViewMode = 'compare' | 'intake' | 'burned';

export const WeeklyCalorieChart: React.FC = () => {
  const { weeklyCalorieHistory } = useWorkout();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(weeklyCalorieHistory.length - 1);
  const [viewMode, setViewMode] = useState<ViewMode>('compare');

  // Computed metrics
  const totalBurnedWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesBurned, 0);
  const totalIntakeWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesGained, 0);
  const meanBurned = Math.round(totalBurnedWeek / (weeklyCalorieHistory.length || 1));
  const meanIntake = Math.round(totalIntakeWeek / (weeklyCalorieHistory.length || 1));
  const netWeekly = totalIntakeWeek - totalBurnedWeek;
  const activeDaysCount = weeklyCalorieHistory.filter((d) => d.caloriesBurned >= 150).length;

  const selectedDay = weeklyCalorieHistory[selectedDayIdx] || weeklyCalorieHistory[weeklyCalorieHistory.length - 1];

  // Maximum scale calculation with safe padding
  const maxIntake = Math.max(...weeklyCalorieHistory.map((d) => d.caloriesGained), 2200);
  const maxBurned = Math.max(...weeklyCalorieHistory.map((d) => d.caloriesBurned), 500);

  // SVG dimensions for responsive coordinate plane
  const svgWidth = 640;
  const svgHeight = 280;
  const paddingLeft = 58;
  const paddingRight = 40;
  const paddingTop = 36;
  const paddingBottom = 48;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const numPoints = weeklyCalorieHistory.length;
  const stepX = plotWidth / (numPoints - 1 || 1);

  // Normalization helpers
  const scaleYIntake = (val: number) => {
    const yMax = Math.ceil(maxIntake / 400) * 400;
    const ratio = Math.max(0, Math.min(1, val / yMax));
    return paddingTop + plotHeight - ratio * plotHeight;
  };

  const scaleYBurned = (val: number) => {
    const yMax = Math.ceil(maxBurned / 100) * 100;
    const ratio = Math.max(0, Math.min(1, val / yMax));
    return paddingTop + plotHeight - ratio * plotHeight;
  };

  const getProgressPoints = () => {
    let cumulative = 22;
    const points: { x: number; y: number; val: number }[] = [];
    weeklyCalorieHistory.forEach((d, i) => {
      const x = paddingLeft + i * stepX;
      const delta = d.caloriesBurned >= 250 ? 15 : d.caloriesBurned >= 150 ? 7 : -6;
      cumulative = Math.max(15, Math.min(95, cumulative + delta + i * 3.5));
      const y = paddingTop + plotHeight - (cumulative / 100) * plotHeight;
      points.push({ x, y, val: Math.round(cumulative) });
    });
    return points;
  };

  const intakePoints = weeklyCalorieHistory.map((d, i) => ({
    x: paddingLeft + i * stepX,
    y: scaleYIntake(d.caloriesGained),
    val: d.caloriesGained,
    day: d.day,
    date: d.date
  }));

  const burnedPoints = weeklyCalorieHistory.map((d, i) => ({
    x: paddingLeft + i * stepX,
    y: scaleYBurned(d.caloriesBurned),
    val: d.caloriesBurned,
    day: d.day,
    date: d.date
  }));

  const progressPoints = getProgressPoints();

  const buildPath = (pts: { x: number; y: number }[]) => {
    if (!pts.length) return '';
    return pts.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '');
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-bright text-xs font-semibold mb-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Weekly Progress Tracker</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
            Intake vs. Burned Calories
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Daily caloric comparison & progression curve. Progress fluctuates, but consistency builds results.
          </p>
        </div>

        {/* Filter View Selector - Mobile Friendly */}
        <div className="flex items-center bg-surface-elevated p-1 rounded-2xl border border-border-subtle text-xs self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              viewMode === 'compare'
                ? 'bg-primary text-white shadow-sm border border-primary-bright/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Compare Both
          </button>
          <button
            onClick={() => setViewMode('intake')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              viewMode === 'intake'
                ? 'bg-warning text-black shadow-sm font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Intake
          </button>
          <button
            onClick={() => setViewMode('burned')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              viewMode === 'burned'
                ? 'bg-success text-black shadow-sm font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Burned
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-elevated border border-border-subtle">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-text-muted">Total Intake (Week)</span>
            <Utensils className="w-4 h-4 text-warning" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-warning">
            {totalIntakeWeek.toLocaleString()} <span className="text-xs font-normal text-text-muted">kcal</span>
          </p>
          <span className="text-[10px] text-text-muted">Avg {meanIntake} kcal/day</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-elevated border border-border-subtle">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-text-muted">Total Burned (Week)</span>
            <Flame className="w-4 h-4 text-primary-bright" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-primary-bright">
            {totalBurnedWeek.toLocaleString()} <span className="text-xs font-normal text-text-muted">kcal</span>
          </p>
          <span className="text-[10px] text-text-muted">Avg {meanBurned} kcal/day</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-elevated border border-border-subtle">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-text-muted">Weekly Energy Gap</span>
            {netWeekly > 0 ? (
              <TrendingUp className="w-4 h-4 text-warning" />
            ) : (
              <TrendingDown className="w-4 h-4 text-success" />
            )}
          </div>
          <p className="text-lg sm:text-2xl font-black text-text-primary">
            {netWeekly > 0 ? `+${netWeekly.toLocaleString()}` : netWeekly.toLocaleString()}{' '}
            <span className="text-xs font-normal text-text-muted">kcal</span>
          </p>
          <span className="text-[10px] text-text-muted">
            {netWeekly > 0 ? 'Fuel for active days' : 'Calorie deficit zone'}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-elevated border border-border-subtle">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-text-muted">Workout Consistency</span>
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-accent">
            {activeDaysCount} <span className="text-xs font-normal text-text-muted">/ 7 days active</span>
          </p>
          <span className="text-[10px] text-success font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Trending Upward!
          </span>
        </div>
      </div>

      {/* SVG Coordinate Graph Container */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-elevated border border-border-subtle">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1.5 rounded-full bg-warning" />
              <span className="text-text-secondary font-semibold">Calories In</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1.5 rounded-full bg-primary-bright" />
              <span className="text-text-secondary font-semibold">Exercise Burned</span>
            </div>
          </div>
          <span className="text-text-muted text-[11px]">Click any point to inspect day</span>
        </div>

        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] min-h-[230px] max-h-[380px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker
                id="arrow-y"
                viewBox="0 0 10 10"
                refX="5"
                refY="3"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#AAB6C5" />
              </marker>

              <marker
                id="arrow-x"
                viewBox="0 0 10 10"
                refX="5"
                refY="3"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#AAB6C5" />
              </marker>

              <linearGradient id="intakeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>

              <linearGradient id="burnedGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3866FF" />
                <stop offset="100%" stopColor="#4A7BFF" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Guidelines */}
            {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
              const yPos = paddingTop + plotHeight * (1 - frac);
              return (
                <g key={idx} opacity={0.12}>
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={paddingLeft + plotWidth}
                    y2={yPos}
                    stroke="#ffffff"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Axes */}
            <line
              x1={paddingLeft}
              y1={paddingTop + plotHeight + 6}
              x2={paddingLeft}
              y2={paddingTop - 18}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="2"
              markerEnd="url(#arrow-y)"
            />

            <line
              x1={paddingLeft - 6}
              y1={paddingTop + plotHeight}
              x2={paddingLeft + plotWidth + 24}
              y2={paddingTop + plotHeight}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="2"
              markerEnd="url(#arrow-x)"
            />

            <text
              x={paddingLeft - 8}
              y={paddingTop - 24}
              textAnchor="end"
              fill="#AAB6C5"
              fontSize="10"
              fontWeight="bold"
            >
              kcal ↑
            </text>

            <text
              x={paddingLeft + plotWidth + 32}
              y={paddingTop + plotHeight + 4}
              textAnchor="start"
              fill="#AAB6C5"
              fontSize="10"
              fontWeight="bold"
            >
              Days →
            </text>

            {/* Selected Day Guide */}
            {selectedDayIdx !== null && (
              <line
                x1={paddingLeft + selectedDayIdx * stepX}
                y1={paddingTop}
                x2={paddingLeft + selectedDayIdx * stepX}
                y2={paddingTop + plotHeight}
                stroke="#4A7BFF"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.8"
              />
            )}

            {/* 1. INTAKE CURVE */}
            {(viewMode === 'compare' || viewMode === 'intake') && (
              <path
                d={buildPath(intakePoints)}
                fill="none"
                stroke="url(#intakeGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* 2. BURNED CURVE */}
            {(viewMode === 'compare' || viewMode === 'burned') && (
              <path
                d={buildPath(burnedPoints)}
                fill="none"
                stroke="url(#burnedGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* INTERACTIVE DATA POINTS */}
            {weeklyCalorieHistory.map((d, i) => {
              const x = paddingLeft + i * stepX;
              const yIntake = scaleYIntake(d.caloriesGained);
              const yBurned = scaleYBurned(d.caloriesBurned);
              const isSelected = selectedDayIdx === i;

              return (
                <g key={i} className="cursor-pointer" onClick={() => setSelectedDayIdx(i)}>
                  {/* Invisible hit target for easy tapping */}
                  <rect
                    x={x - stepX / 2}
                    y={paddingTop}
                    width={stepX}
                    height={plotHeight + 35}
                    fill="transparent"
                  />

                  {/* Intake Node */}
                  {(viewMode === 'compare' || viewMode === 'intake') && (
                    <circle
                      cx={x}
                      cy={yIntake}
                      r={isSelected ? 6 : 4}
                      fill="#f59e0b"
                      stroke="#0D1726"
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                  )}

                  {/* Burned Node */}
                  {(viewMode === 'compare' || viewMode === 'burned') && (
                    <circle
                      cx={x}
                      cy={yBurned}
                      r={isSelected ? 6.5 : 4.5}
                      fill="#4A7BFF"
                      stroke="#0D1726"
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                  )}

                  {/* Day Label */}
                  <text
                    x={x}
                    y={paddingTop + plotHeight + 18}
                    textAnchor="middle"
                    fill={isSelected ? '#4A7BFF' : '#AAB6C5'}
                    fontSize={isSelected ? '11' : '10'}
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    className="select-none"
                  >
                    {d.day}
                  </text>

                  {/* Date Sub-label */}
                  <text
                    x={x}
                    y={paddingTop + plotHeight + 30}
                    textAnchor="middle"
                    fill={isSelected ? '#F8FAFC' : '#64748B'}
                    fontSize="9"
                    className="select-none"
                  >
                    {d.date.replace('Sept ', '9/')}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Day Direct Comparison Card */}
        {selectedDay && (
          <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-surface border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle flex flex-col items-center justify-center font-bold text-xs">
                <span className="text-text-primary leading-none">{selectedDay.day}</span>
                <span className="text-[9px] text-text-muted leading-tight mt-0.5">{selectedDay.date}</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>Day Caloric Comparison</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary font-mono border border-border-subtle">
                    {selectedDay.date}
                  </span>
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary mt-0.5">
                  <span>
                    Intake: <strong className="text-warning">{selectedDay.caloriesGained.toLocaleString()} kcal</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Burned: <strong className="text-primary-bright">{selectedDay.caloriesBurned.toLocaleString()} kcal</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Net Energy Status Pill */}
            <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-border-subtle pt-2 sm:pt-0">
              <span className="text-[11px] text-text-muted">Net Energy:</span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                  selectedDay.netBalance <= 1600
                    ? 'bg-success/15 text-success border border-success/30'
                    : 'bg-warning/15 text-warning border border-warning/30'
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
