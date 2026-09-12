'use client';

import React, { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { Flame, Utensils, TrendingUp, Sparkles, Activity, CheckCircle2 } from 'lucide-react';

type ViewMode = 'all' | 'comparison' | 'progress';

export const WeeklyCalorieChart: React.FC = () => {
  const { weeklyCalorieHistory } = useWorkout();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(weeklyCalorieHistory.length - 1);
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // Compute weekly totals & statistics
  const totalBurnedWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesBurned, 0);
  const totalGainedWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesGained, 0);
  const meanIntake = Math.round(totalGainedWeek / (weeklyCalorieHistory.length || 1));
  const meanBurned = Math.round(totalBurnedWeek / (weeklyCalorieHistory.length || 1));
  const netWeeklyBalance = totalGainedWeek - totalBurnedWeek;

  const selectedDay = weeklyCalorieHistory[selectedDayIndex] || weeklyCalorieHistory[weeklyCalorieHistory.length - 1];

  // SVG Chart Dimensions & Padding
  const svgWidth = 800;
  const svgHeight = 340;
  const paddingLeft = 70;
  const paddingRight = 55;
  const paddingTop = 40;
  const paddingBottom = 60;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Max value for calorie scale (Intake / Burned)
  const maxCalorie = 2400;

  // Compute Progress Index values (The zigzag upward progress curve from the user's sketch)
  // Up -> small dip -> up higher -> small dip -> up higher -> final surge!
  const progressIndexBase = [32, 54, 46, 68, 62, 85, 96];
  const progressPoints = weeklyCalorieHistory.map((d, i) => {
    const bonus = Math.min(10, Math.round(d.caloriesBurned / 60));
    const score = Math.min(100, (progressIndexBase[i % progressIndexBase.length] || 50) + bonus);
    return score;
  });

  // Calculate coordinates for points
  const numDays = weeklyCalorieHistory.length;
  const stepX = chartWidth / (numDays - 1 || 1);

  const getX = (index: number) => paddingLeft + index * stepX;
  const getYCalorie = (kcal: number) => {
    const clamped = Math.max(0, Math.min(maxCalorie, kcal));
    return paddingTop + chartHeight - (clamped / maxCalorie) * chartHeight;
  };

  const getYProgress = (score: number) => {
    return paddingTop + chartHeight - (score / 100) * chartHeight;
  };

  // Generate SVG Path for Intake (Amber Line)
  const intakePath = weeklyCalorieHistory.reduce((acc, d, i) => {
    const x = getX(i);
    const y = getYCalorie(d.caloriesGained);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Generate SVG Area for Intake (Gradient Fill)
  const intakeArea = `${intakePath} L ${getX(numDays - 1)} ${paddingTop + chartHeight} L ${getX(0)} ${paddingTop + chartHeight} Z`;

  // Generate SVG Path for Burned (Cyan Line)
  const burnedPath = weeklyCalorieHistory.reduce((acc, d, i) => {
    const x = getX(i);
    const y = getYCalorie(d.caloriesBurned);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Generate SVG Area for Burned (Cyan Fill)
  const burnedArea = `${burnedPath} L ${getX(numDays - 1)} ${paddingTop + chartHeight} L ${getX(0)} ${paddingTop + chartHeight} Z`;

  // Generate The Iconic Dashed Zigzag Upward Progress Path ("This is progress")
  const progressDashedPath = progressPoints.reduce((acc, score, i) => {
    const x = getX(i);
    const y = getYProgress(score);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
      
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Energy Trajectory & Progress Curve</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Weekly Calorie Intake vs. Burned
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Compare daily nutritional food intake against calories burned through workouts & activity.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All & Progress
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === 'comparison'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Intake vs Burned
          </button>
          <button
            onClick={() => setViewMode('progress')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === 'progress'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Progress Trajectory
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Pill Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-amber-400/90 mb-1">
            <Utensils className="w-3.5 h-3.5" />
            <span>Weekly Intake</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-400">
            {totalGainedWeek.toLocaleString()} <span className="text-xs font-normal text-slate-400">kcal</span>
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">Avg {meanIntake} kcal/day</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-cyan-400/90 mb-1">
            <Flame className="w-3.5 h-3.5" />
            <span>Weekly Burned</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-cyan-400">
            {totalBurnedWeek.toLocaleString()} <span className="text-xs font-normal text-slate-400">kcal</span>
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">Avg {meanBurned} kcal/day</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-400/90 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Net Energy Balance</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-white">
            {netWeeklyBalance > 0 ? `+${netWeeklyBalance.toLocaleString()}` : netWeeklyBalance.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">kcal</span>
          </span>
          <p className="text-[10px] text-emerald-400 mt-0.5">Sustained Fueling</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-teal-300 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Overall Trajectory</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-400">
            ↗ Climbing <span className="text-xs font-normal text-slate-400">+18%</span>
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">Consistent weekly surge</p>
        </div>
      </div>

      {/* Main SVG Graph Container with Axes, Arrows, Curves & The Iconic 'This is progress' Tag */}
      <div className="bg-[#080c16] rounded-3xl border border-slate-800/90 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        
        {/* Legend Indicators */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            {(viewMode === 'all' || viewMode === 'comparison') && (
              <>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                  <span className="text-amber-300">Calories Intake (Food)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                  <span className="text-cyan-300">Calories Burned (Exercise)</span>
                </div>
              </>
            )}
            {(viewMode === 'all' || viewMode === 'progress') && (
              <div className="flex items-center space-x-2">
                <span className="w-5 h-0.5 border-t-2 border-dashed border-emerald-400" />
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  Overall Fitness Trajectory (Zigzag Path)
                </span>
              </div>
            )}
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            Click / Hover any day point to inspect
          </span>
        </div>

        {/* SVG Drawing Canvas */}
        <div className="w-full overflow-x-auto no-scrollbar py-2">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full min-w-[640px] h-auto select-none"
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="amberGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="cyanGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>

              {/* Marker Arrow for Y Axis */}
              <marker
                id="arrowY"
                markerWidth="8"
                markerHeight="8"
                refX="4"
                refY="4"
                orient="auto"
              >
                <path d="M 1 7 L 4 1 L 7 7 Z" fill="#94a3b8" />
              </marker>

              {/* Marker Arrow for X Axis */}
              <marker
                id="arrowX"
                markerWidth="8"
                markerHeight="8"
                refX="4"
                refY="4"
                orient="auto"
              >
                <path d="M 1 1 L 7 4 L 1 7 Z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Background Grid Lines & Scale Numbers */}
            {[500, 1000, 1500, 2000].map((val) => {
              const y = getYCalorie(val);
              return (
                <g key={val}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 12}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Y Axis Line with Top Arrow */}
            <line
              x1={paddingLeft}
              y1={paddingTop + chartHeight}
              x2={paddingLeft}
              y2={paddingTop - 15}
              stroke="#64748b"
              strokeWidth="2.5"
              markerEnd="url(#arrowY)"
            />

            {/* Y Axis Label */}
            <text
              x={paddingLeft - 10}
              y={paddingTop - 22}
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="11"
              fontWeight="bold"
            >
              kcal ↑
            </text>

            {/* X Axis Line with Right Arrow */}
            <line
              x1={paddingLeft}
              y1={paddingTop + chartHeight}
              x2={svgWidth - paddingRight + 20}
              y2={paddingTop + chartHeight}
              stroke="#64748b"
              strokeWidth="2.5"
              markerEnd="url(#arrowX)"
            />

            {/* X Axis Label */}
            <text
              x={svgWidth - paddingRight + 35}
              y={paddingTop + chartHeight + 4}
              textAnchor="start"
              fill="#cbd5e1"
              fontSize="11"
              fontWeight="bold"
            >
              Days →
            </text>

            {/* CURVE 1: Calories Intake (Amber Filled Area + Smooth Polyline) */}
            {(viewMode === 'all' || viewMode === 'comparison') && (
              <>
                <path d={intakeArea} fill="url(#amberGlow)" />
                <path
                  d={intakePath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* CURVE 2: Calories Burned (Cyan Filled Area + Crisp Line) */}
            {(viewMode === 'all' || viewMode === 'comparison') && (
              <>
                <path d={burnedArea} fill="url(#cyanGlow)" />
                <path
                  d={burnedPath}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* CURVE 3: The Iconic Upward Zigzag Trajectory ("This is progress") */}
            {(viewMode === 'all' || viewMode === 'progress') && (
              <>
                <path
                  d={progressDashedPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray="7 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="drop-shadow(0px 0px 8px rgba(16, 185, 129, 0.6))"
                />
                {/* Nodes along the zigzag path */}
                {progressPoints.map((score, i) => {
                  const x = getX(i);
                  const y = getYProgress(score);
                  return (
                    <circle
                      key={`prog-node-${i}`}
                      cx={x}
                      cy={y}
                      r="4.5"
                      fill="#10b981"
                      stroke="#064e3b"
                      strokeWidth="2"
                    />
                  );
                })}
              </>
            )}

            {/* Interactive Day Vertical Slices & Node Points */}
            {weeklyCalorieHistory.map((d, i) => {
              const x = getX(i);
              const yIntake = getYCalorie(d.caloriesGained);
              const yBurned = getYCalorie(d.caloriesBurned);
              const isSelected = selectedDayIndex === i;

              return (
                <g
                  key={d.day}
                  className="cursor-pointer"
                  onClick={() => setSelectedDayIndex(i)}
                >
                  {/* Vertical Hairline Guide on Hover / Select */}
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartHeight}
                    stroke={isSelected ? '#10b981' : '#334155'}
                    strokeWidth={isSelected ? '2' : '1'}
                    strokeDasharray={isSelected ? 'none' : '3 3'}
                    opacity={isSelected ? '0.85' : '0.4'}
                  />

                  {/* Day Label on X Axis */}
                  <text
                    x={x}
                    y={paddingTop + chartHeight + 22}
                    textAnchor="middle"
                    fill={isSelected ? '#10b981' : '#94a3b8'}
                    fontSize="12"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {d.day}
                  </text>

                  {/* Date Sub-label */}
                  <text
                    x={x}
                    y={paddingTop + chartHeight + 36}
                    textAnchor="middle"
                    fill={isSelected ? '#34d399' : '#64748b'}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {d.date}
                  </text>

                  {/* Intake Node (Amber) */}
                  {(viewMode === 'all' || viewMode === 'comparison') && (
                    <circle
                      cx={x}
                      cy={yIntake}
                      r={isSelected ? '6.5' : '4.5'}
                      fill="#f59e0b"
                      stroke="#1e293b"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                  )}

                  {/* Burned Node (Cyan) */}
                  {(viewMode === 'all' || viewMode === 'comparison') && (
                    <circle
                      cx={x}
                      cy={yBurned}
                      r={isSelected ? '6.5' : '4.5'}
                      fill="#06b6d4"
                      stroke="#1e293b"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* The Motivational Signature Caption From The Uploaded Image */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col items-center justify-center text-center space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black text-sm tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="uppercase tracking-widest text-xs font-mono">This is progress</span>
          </div>
          <p className="text-xs text-slate-300 font-medium max-w-lg">
            Progress is not a straight line. Daily fluctuations and dips are completely normal—the overall habit trajectory is climbing steadily upward.
          </p>
        </div>
      </div>

      {/* Selected Day Direct Comparison Card */}
      {selectedDay && (
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex flex-col items-center justify-center font-bold">
              <span className="text-xs text-slate-400 leading-none">{selectedDay.day}</span>
              <span className="text-sm font-black text-white">{selectedDay.date.split(' ')[1] || '•'}</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedDay.day}, {selectedDay.date} Energy Balance</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  Day {selectedDayIndex + 1} of 7
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Intake: <strong className="text-amber-400">{selectedDay.caloriesGained} kcal</strong> • Burned:{' '}
                <strong className="text-cyan-400">{selectedDay.caloriesBurned} kcal</strong> • Net Balance:{' '}
                <strong className="text-white">
                  {selectedDay.netBalance > 0 ? `+${selectedDay.netBalance}` : selectedDay.netBalance} kcal
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 self-end md:self-auto text-xs">
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block">Daily Comparison</span>
              <span className="font-bold text-emerald-400">
                {selectedDay.caloriesBurned >= 300 ? '🔥 High Burn Milestone' : '🌱 Steady Consistency'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
