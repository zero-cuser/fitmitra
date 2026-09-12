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

type ViewMode = 'compare' | 'intake' | 'burned' | 'progress';

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

  // The iconic "This is progress" trajectory:
  // Modeled based on cumulative weekly fitness net consistency
  const getProgressPoints = () => {
    let cumulative = 22;
    const points: { x: number; y: number; val: number }[] = [];
    weeklyCalorieHistory.forEach((d, i) => {
      const x = paddingLeft + i * stepX;
      // Zigzag progression formula: workout days boost progress, rest days dip slightly but trend higher
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

  // Create SVG path string from points (with clean zig-zag line segments matching user sketch)
  const buildPath = (pts: { x: number; y: number }[]) => {
    if (!pts.length) return '';
    return pts.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Weekly Progress Tracker</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Intake vs. Burned Calories
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily caloric comparison & progression curve. Progress fluctuates, but consistency builds results.
          </p>
        </div>

        {/* Filter View Selector - Mobile Friendly */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              viewMode === 'compare'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Compare Both
          </button>
          <button
            onClick={() => setViewMode('intake')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              viewMode === 'intake'
                ? 'bg-amber-500 text-black shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Intake
          </button>
          <button
            onClick={() => setViewMode('burned')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              viewMode === 'burned'
                ? 'bg-emerald-500 text-black shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Burned
          </button>
          <button
            onClick={() => setViewMode('progress')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
              viewMode === 'progress'
                ? 'bg-cyan-500 text-black shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            This is Progress
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400">Total Intake (Week)</span>
            <Utensils className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-amber-400">
            {totalIntakeWeek.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span>
          </p>
          <span className="text-[10px] text-slate-500">Avg {meanIntake} kcal/day</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400">Total Burned (Week)</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-emerald-400">
            {totalBurnedWeek.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span>
          </p>
          <span className="text-[10px] text-slate-500">Avg {meanBurned} kcal/day</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400">Weekly Energy Gap</span>
            {netWeekly > 0 ? (
              <TrendingUp className="w-4 h-4 text-amber-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <p className="text-lg sm:text-2xl font-black text-white">
            {netWeekly > 0 ? `+${netWeekly.toLocaleString()}` : netWeekly.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">kcal</span>
          </p>
          <span className="text-[10px] text-slate-500">
            {netWeekly > 0 ? 'Fuel for active days' : 'Calorie deficit zone'}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400">Workout Consistency</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-cyan-400">
            {activeDaysCount} <span className="text-xs font-normal text-slate-500">/ 7 days active</span>
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Trending Upward!
          </span>
        </div>
      </div>

      {/* GRAPH CANVAS WITH CARTESIAN ARROWS (Directly inspired by "This is Progress" Drawing) */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-6 relative overflow-hidden space-y-3">
        
        {/* Graph Legend & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs px-1">
          <div className="flex items-center space-x-4">
            {(viewMode === 'compare' || viewMode === 'intake') && (
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-amber-400 rounded-full" />
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                <span className="text-amber-300 font-semibold text-[11px]">Intake Calories</span>
              </div>
            )}
            {(viewMode === 'compare' || viewMode === 'burned') && (
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <span className="text-emerald-300 font-semibold text-[11px]">Burned Calories</span>
              </div>
            )}
            {(viewMode === 'compare' || viewMode === 'progress') && (
              <div className="flex items-center space-x-1.5">
                <span className="w-4 border-b-2 border-dashed border-cyan-400" />
                <span className="text-cyan-300 font-bold text-[11px]">Progress Trajectory</span>
              </div>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
            Tap any day node to compare
          </span>
        </div>

        {/* SVG Coordinate Graph Container */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] min-h-[230px] max-h-[380px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Arrow Head Marker for Y-Axis (pointing up) */}
              <marker
                id="arrow-y"
                viewBox="0 0 10 10"
                refX="5"
                refY="3"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>

              {/* Arrow Head Marker for X-Axis (pointing right) */}
              <marker
                id="arrow-x"
                viewBox="0 0 10 10"
                refX="5"
                refY="3"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>

              {/* Linear Gradients for Curves */}
              <linearGradient id="intakeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>

              <linearGradient id="burnedGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>

              <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Guidelines */}
            {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
              const yPos = paddingTop + plotHeight * (1 - frac);
              return (
                <g key={idx} opacity={0.15}>
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={paddingLeft + plotWidth}
                    y2={yPos}
                    stroke="#cbd5e1"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* CARTESIAN AXES WITH ARROWS (As in user's image) */}
            {/* Vertical Y-Axis with arrow at top */}
            <line
              x1={paddingLeft}
              y1={paddingTop + plotHeight + 6}
              x2={paddingLeft}
              y2={paddingTop - 18}
              stroke="#64748b"
              strokeWidth="2"
              markerEnd="url(#arrow-y)"
            />

            {/* Horizontal X-Axis with arrow at right */}
            <line
              x1={paddingLeft - 6}
              y1={paddingTop + plotHeight}
              x2={paddingLeft + plotWidth + 24}
              y2={paddingTop + plotHeight}
              stroke="#64748b"
              strokeWidth="2"
              markerEnd="url(#arrow-x)"
            />

            {/* Y-Axis Label */}
            <text
              x={paddingLeft - 8}
              y={paddingTop - 24}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              kcal ↑
            </text>

            {/* X-Axis Days / Arrow Label */}
            <text
              x={paddingLeft + plotWidth + 32}
              y={paddingTop + plotHeight + 4}
              textAnchor="start"
              fill="#94a3b8"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              Days →
            </text>

            {/* Selected Day Vertical Guide Line */}
            {selectedDayIdx !== null && (
              <line
                x1={paddingLeft + selectedDayIdx * stepX}
                y1={paddingTop}
                x2={paddingLeft + selectedDayIdx * stepX}
                y2={paddingTop + plotHeight}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.6"
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
                className="filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
              />
            )}

            {/* 2. BURNED CURVE */}
            {(viewMode === 'compare' || viewMode === 'burned') && (
              <path
                d={buildPath(burnedPoints)}
                fill="none"
                stroke="url(#burnedGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)]"
              />
            )}

            {/* 3. 'THIS IS PROGRESS' TRAJECTORY LINE (ZIG-ZAG PROGRESSION AS IN DRAWING) */}
            {(viewMode === 'compare' || viewMode === 'progress') && (
              <path
                d={buildPath(progressPoints)}
                fill="none"
                stroke="url(#progressGrad)"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]"
              />
            )}

            {/* INTERACTIVE DATA NODES */}
            {weeklyCalorieHistory.map((d, i) => {
              const x = paddingLeft + i * stepX;
              const isSelected = i === selectedDayIdx;
              const ip = intakePoints[i];
              const bp = burnedPoints[i];
              const pp = progressPoints[i];

              return (
                <g
                  key={d.day}
                  onClick={() => setSelectedDayIdx(i)}
                  className="cursor-pointer transition-transform"
                >
                  {/* Broad click target for touch/mobile devices */}
                  <rect
                    x={x - stepX / 2}
                    y={paddingTop}
                    width={stepX}
                    height={plotHeight + paddingBottom}
                    fill="transparent"
                  />

                  {/* Intake Node */}
                  {(viewMode === 'compare' || viewMode === 'intake') && (
                    <circle
                      cx={ip.x}
                      cy={ip.y}
                      r={isSelected ? 6 : 4}
                      fill="#f59e0b"
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-all hover:scale-125"
                    />
                  )}

                  {/* Burned Node */}
                  {(viewMode === 'compare' || viewMode === 'burned') && (
                    <circle
                      cx={bp.x}
                      cy={bp.y}
                      r={isSelected ? 6 : 4}
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-all hover:scale-125"
                    />
                  )}

                  {/* Progress Node */}
                  {(viewMode === 'compare' || viewMode === 'progress') && (
                    <circle
                      cx={pp.x}
                      cy={pp.y}
                      r={isSelected ? 5 : 3.5}
                      fill="#38bdf8"
                      stroke="#0284c7"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* X-Axis Tick Label */}
                  <text
                    x={x}
                    y={paddingTop + plotHeight + 18}
                    textAnchor="middle"
                    fill={isSelected ? '#38bdf8' : '#94a3b8'}
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
                    fill={isSelected ? '#cbd5e1' : '#64748b'}
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

        {/* Selected Day Direct Comparison Card (Mobile Optimized) */}
        {selectedDay && (
          <div className="mt-2 p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex flex-col items-center justify-center font-bold text-xs">
                <span className="text-white leading-none">{selectedDay.day}</span>
                <span className="text-[9px] text-slate-400 leading-tight mt-0.5">{selectedDay.date}</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>Day Caloric Comparison</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {selectedDay.date}
                  </span>
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-0.5">
                  <span>
                    Intake: <strong className="text-amber-400">{selectedDay.caloriesGained.toLocaleString()} kcal</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Burned: <strong className="text-emerald-400">{selectedDay.caloriesBurned.toLocaleString()} kcal</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Net Energy Status Pill */}
            <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
              <span className="text-[11px] text-slate-400">Net Energy:</span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                  selectedDay.netBalance <= 1600
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                {selectedDay.netBalance > 0 ? `+${selectedDay.netBalance} kcal` : `${selectedDay.netBalance} kcal`}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* ICONIC MOTIF FOOTER - DIRECTLY HONORING THE USER'S ATTACHED SKETCH */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-sm font-extrabold text-white tracking-wide flex items-center justify-center sm:justify-start gap-2">
              <span>This is progress</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                Zig-Zag Momentum
              </span>
            </h5>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
              Fitness is not a straight line. Daily calorie intake and workout burn fluctuate with study exams and recovery days, but staying consistent drives long-term transformation.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>On Track</span>
          </span>
        </div>
      </div>

    </div>
  );
};
