'use client';

import React, { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { Flame, Utensils, TrendingUp, Calendar, Sparkles, Compass } from 'lucide-react';

type ChartTheme = 'classic' | 'cyber';

interface TrajectoryNode {
  day: string;
  date: string;
  type: 'start' | 'peak' | 'trough' | 'summit';
  x: number; // percentage 0-100
  y: number; // percentage 0-100 (height from bottom)
  caloriesBurned: number;
  caloriesGained: number;
  momentumScore: number;
  label: string;
  insight: string;
}

export const WeeklyCalorieChart: React.FC = () => {
  const { weeklyCalorieHistory } = useWorkout();
  const [theme, setTheme] = useState<ChartTheme>('classic');
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(6); // Default to latest day

  // Compute weekly totals & statistics
  const totalBurnedWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesBurned, 0);
  const totalGainedWeek = weeklyCalorieHistory.reduce((acc, d) => acc + d.caloriesGained, 0);
  const meanBurned = Math.round(totalBurnedWeek / (weeklyCalorieHistory.length || 1));
  const meanIntake = Math.round(totalGainedWeek / (weeklyCalorieHistory.length || 1));
  const netWeeklyBalance = totalGainedWeek - totalBurnedWeek;
  const activeWorkoutDays = weeklyCalorieHistory.filter((d) => d.caloriesBurned >= 150).length;

  // Build the authentic upward sawtooth / zigzag "This is progress" trajectory:
  // Starts near origin, climbs up (Peak 1), dips down (Trough 1), climbs higher (Peak 2),
  // dips down (Trough 2), climbs higher (Peak 3), dips down (Trough 3), surges to highest summit!
  const progressNodes: TrajectoryNode[] = [
    {
      day: weeklyCalorieHistory[0]?.day || 'Mon',
      date: weeklyCalorieHistory[0]?.date || 'Sep 06',
      type: 'peak',
      x: 18,
      y: 36,
      caloriesBurned: weeklyCalorieHistory[0]?.caloriesBurned || 240,
      caloriesGained: weeklyCalorieHistory[0]?.caloriesGained || 1850,
      momentumScore: 38,
      label: 'Initial Spark',
      insight: 'Week began with strong intent. First solid workout in the books!'
    },
    {
      day: weeklyCalorieHistory[1]?.day || 'Tue',
      date: weeklyCalorieHistory[1]?.date || 'Sep 07',
      type: 'trough',
      x: 32,
      y: 26,
      caloriesBurned: weeklyCalorieHistory[1]?.caloriesBurned || 120,
      caloriesGained: weeklyCalorieHistory[1]?.caloriesGained || 1920,
      momentumScore: 42,
      label: 'Active Recovery',
      insight: 'A planned low-strain day. Muscle tissue rebuilt while staying on track.'
    },
    {
      day: weeklyCalorieHistory[2]?.day || 'Wed',
      date: weeklyCalorieHistory[2]?.date || 'Sep 08',
      type: 'peak',
      x: 46,
      y: 56,
      caloriesBurned: weeklyCalorieHistory[2]?.caloriesBurned || 380,
      caloriesGained: weeklyCalorieHistory[2]?.caloriesGained || 1780,
      momentumScore: 65,
      label: 'Higher Climb',
      insight: 'Broke past Monday\'s peak! Rep consistency and cardio intensity surged.'
    },
    {
      day: weeklyCalorieHistory[3]?.day || 'Thu',
      date: weeklyCalorieHistory[3]?.date || 'Sep 09',
      type: 'trough',
      x: 60,
      y: 44,
      caloriesBurned: weeklyCalorieHistory[3]?.caloriesBurned || 190,
      caloriesGained: weeklyCalorieHistory[3]?.caloriesGained || 2050,
      momentumScore: 68,
      label: 'Mid-Week Dip',
      insight: 'Heavy study load caused a dip, but notice: this trough is far higher than Tuesday!'
    },
    {
      day: weeklyCalorieHistory[4]?.day || 'Fri',
      date: weeklyCalorieHistory[4]?.date || 'Sep 10',
      type: 'peak',
      x: 74,
      y: 76,
      caloriesBurned: weeklyCalorieHistory[4]?.caloriesBurned || 420,
      caloriesGained: weeklyCalorieHistory[4]?.caloriesGained || 1950,
      momentumScore: 84,
      label: 'Breakthrough Surge',
      insight: 'Hit new personal workout volume for the week! Energy and focus peaking.'
    },
    {
      day: weeklyCalorieHistory[5]?.day || 'Sat',
      date: weeklyCalorieHistory[5]?.date || 'Sep 11',
      type: 'trough',
      x: 88,
      y: 64,
      caloriesBurned: weeklyCalorieHistory[5]?.caloriesBurned || 260,
      caloriesGained: weeklyCalorieHistory[5]?.caloriesGained || 2150,
      momentumScore: 87,
      label: 'Weekend Rest',
      insight: 'Recharged mental energy with friends while keeping baseline momentum intact.'
    },
    {
      day: weeklyCalorieHistory[6]?.day || 'Sun',
      date: weeklyCalorieHistory[6]?.date || 'Sep 12',
      type: 'summit',
      x: 98,
      y: 96,
      caloriesBurned: weeklyCalorieHistory[6]?.caloriesBurned || 490,
      caloriesGained: weeklyCalorieHistory[6]?.caloriesGained || 1880,
      momentumScore: 98,
      label: 'Weekly Summit',
      insight: 'Finished at the highest fitness velocity of the week! Total growth verified.'
    }
  ];

  const selectedNode = progressNodes[selectedNodeIndex] || progressNodes[progressNodes.length - 1];

  // SVG coordinate transformation
  // SVG Canvas dimensions: 600 x 360
  // Origin: (x=60, y=300)
  // X-axis extends to x=580, y=300
  // Y-axis extends to x=60, y=20
  const svgWidth = 600;
  const svgHeight = 360;
  const originX = 60;
  const originY = 300;
  const plotWidth = 500;
  const plotHeight = 260;

  const toSvgCoords = (percentX: number, percentY: number) => {
    const x = originX + (percentX / 100) * plotWidth;
    const y = originY - (percentY / 100) * plotHeight;
    return { x, y };
  };

  // Build the SVG path string starting from origin (0,0) and traversing each node
  const pathD = (() => {
    let d = `M ${originX} ${originY}`;
    progressNodes.forEach((node) => {
      const { x, y } = toSvgCoords(node.x, node.y);
      d += ` L ${x} ${y}`;
    });
    return d;
  })();

  const isClassic = theme === 'classic';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
      
      {/* Header Banner & Style Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Progress Trajectory</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Weekly Fitness Momentum
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real growth isn&apos;t a straight line. Every peak and recovery dip propels you higher.
          </p>
        </div>

        {/* Theme Selector */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs self-start sm:self-auto">
          <button
            onClick={() => setTheme('classic')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
              isClassic
                ? 'bg-rose-500/20 border border-rose-400/40 text-rose-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Watercolor Sketch</span>
          </button>
          <button
            onClick={() => setTheme('cyber')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
              !isClassic
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Cyber Dark</span>
          </button>
        </div>
      </div>

      {/* 4 Weekly Statistical Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Total Burned (Week)</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">
            {totalBurnedWeek.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span>
          </p>
          <span className="text-[10px] text-slate-500">Avg {meanBurned} kcal/day</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Total Intake (Week)</span>
            <Utensils className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400">
            {totalGainedWeek.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span>
          </p>
          <span className="text-[10px] text-slate-500">Avg {meanIntake} kcal/day</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Net Weekly Intake</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">
            {netWeeklyBalance > 0 ? `+${netWeeklyBalance.toLocaleString()}` : netWeeklyBalance.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">kcal</span>
          </p>
          <span className="text-[10px] text-slate-500">Avg {Math.round(netWeeklyBalance / 7)} kcal/day net</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Workout Consistency</span>
            <Calendar className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-400">
            {activeWorkoutDays} <span className="text-xs font-normal text-slate-500">/ 7 days</span>
          </p>
          <span className="text-[10px] text-emerald-400 font-medium">Trajectory: +34% upward 🚀</span>
        </div>
      </div>

      {/* GRAPH CANVAS CONTAINER - Matches uploaded user image */}
      <div
        className={`rounded-3xl p-6 sm:p-8 transition-all duration-300 relative border overflow-hidden ${
          isClassic
            ? 'bg-gradient-to-br from-[#fff7f7] via-[#fef2f2] to-[#fae8ff] border-rose-200/80 shadow-2xl text-slate-800'
            : 'bg-slate-950/90 border-slate-800/90 shadow-2xl text-slate-100'
        }`}
      >
        {/* Soft atmospheric watercolor background blobs for classic mode */}
        {isClassic && (
          <>
            <div className="absolute top-2 left-6 w-72 h-72 rounded-full bg-rose-200/50 filter blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 right-10 w-80 h-80 rounded-full bg-pink-200/40 filter blur-3xl pointer-events-none" />
          </>
        )}

        <div className="relative z-10 flex flex-col items-center">
          
          {/* Main SVG Coordinate Graph */}
          <div className="w-full max-w-2xl aspect-[16/10] relative">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full overflow-visible select-none"
            >
              <defs>
                {/* Arrowhead marker for Y-axis (pointing UP) */}
                <marker
                  id="arrow-y"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="3"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path
                    d="M 0 6 L 5 0 L 10 6 z"
                    fill={isClassic ? '#1e293b' : '#38bdf8'}
                  />
                </marker>

                {/* Arrowhead marker for X-axis (pointing RIGHT) */}
                <marker
                  id="arrow-x"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path
                    d="M 0 0 L 10 5 L 0 10 z"
                    fill={isClassic ? '#1e293b' : '#38bdf8'}
                  />
                </marker>

                {/* Cyber gradient for glow */}
                <linearGradient id="cyberTrajectory" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>

              {/* Y-Axis Line with Top Arrowhead */}
              <line
                x1={originX}
                y1={originY}
                x2={originX}
                y2={22}
                stroke={isClassic ? '#1e293b' : '#38bdf8'}
                strokeWidth={isClassic ? '3' : '2.5'}
                markerEnd="url(#arrow-y)"
              />

              {/* X-Axis Line with Right Arrowhead */}
              <line
                x1={originX}
                y1={originY}
                x2={svgWidth - 20}
                y2={originY}
                stroke={isClassic ? '#1e293b' : '#38bdf8'}
                strokeWidth={isClassic ? '3' : '2.5'}
                markerEnd="url(#arrow-x)"
              />

              {/* Dashed Upward Zigzag Sawtooth Trajectory */}
              <path
                d={pathD}
                fill="none"
                stroke={isClassic ? '#1e293b' : 'url(#cyberTrajectory)'}
                strokeWidth={isClassic ? '3' : '3'}
                strokeDasharray={isClassic ? '8 6' : '7 4'}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />

              {/* Interactive Milestone Nodes (Troughs & Peaks) */}
              {progressNodes.map((node, idx) => {
                const { x, y } = toSvgCoords(node.x, node.y);
                const isSelected = selectedNodeIndex === idx;

                return (
                  <g
                    key={node.day}
                    onClick={() => setSelectedNodeIndex(idx)}
                    className="cursor-pointer group"
                  >
                    {/* Hover hotspot hit-area */}
                    <circle cx={x} cy={y} r="18" fill="transparent" />

                    {/* Outer pulse when selected */}
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r="11"
                        fill="none"
                        stroke={isClassic ? '#f43f5e' : '#38bdf8'}
                        strokeWidth="2"
                        className="animate-ping opacity-75"
                      />
                    )}

                    {/* Node circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? '6.5' : '4.5'}
                      fill={
                        isSelected
                          ? isClassic
                            ? '#f43f5e'
                            : '#38bdf8'
                          : isClassic
                          ? '#1e293b'
                          : '#0f172a'
                      }
                      stroke={
                        isClassic
                          ? isSelected
                            ? '#ffffff'
                            : '#1e293b'
                          : isSelected
                          ? '#ffffff'
                          : '#38bdf8'
                      }
                      strokeWidth="2"
                      className="transition-transform duration-200 group-hover:scale-125"
                    />

                    {/* Day label above/below node */}
                    <text
                      x={x}
                      y={node.type === 'trough' ? y + 18 : y - 12}
                      textAnchor="middle"
                      fill={
                        isSelected
                          ? isClassic
                            ? '#e11d48'
                            : '#38bdf8'
                          : isClassic
                          ? '#64748b'
                          : '#94a3b8'
                      }
                      fontSize={isSelected ? '12' : '10'}
                      fontWeight={isSelected ? '800' : '600'}
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {node.day}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* SIGNATURE CAPTION: "This is progress" - Exact match to uploaded reference */}
          <div className="mt-4 sm:mt-6 text-center">
            <h4
              className={`text-lg sm:text-2xl font-black tracking-tight ${
                isClassic
                  ? 'text-slate-800'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-rose-400'
              }`}
            >
              This is progress
            </h4>
            <p
              className={`text-xs mt-0.5 max-w-sm mx-auto ${
                isClassic ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Growth isn&apos;t linear. Every temporary dip is simply building leverage for the next higher peak.
            </p>
          </div>

        </div>

        {/* Interactive Selected Day Inspector Pill */}
        {selectedNode && (
          <div
            className={`mt-6 p-4 rounded-2xl border transition-all ${
              isClassic
                ? 'bg-white/80 border-rose-200/90 shadow-sm backdrop-blur-md'
                : 'bg-slate-900/90 border-slate-800 shadow-md'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm ${
                    isClassic
                      ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}
                >
                  {selectedNode.day}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs sm:text-sm font-black ${
                        isClassic ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {selectedNode.label} ({selectedNode.day}, {selectedNode.date})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        selectedNode.type === 'trough'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {selectedNode.type === 'trough' ? 'Recovery Dip' : 'Progress Peak'}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isClassic ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {selectedNode.insight}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end sm:self-auto text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400">Burned</span>
                  <strong className="text-emerald-500">{selectedNode.caloriesBurned} kcal</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Intake</span>
                  <strong className="text-amber-500">{selectedNode.caloriesGained} kcal</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Momentum</span>
                  <strong className="text-cyan-500">{selectedNode.momentumScore}%</strong>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 7-Day Micro Strip for quick tap navigation */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {progressNodes.map((node, idx) => {
          const isSelected = selectedNodeIndex === idx;
          return (
            <button
              key={node.day}
              onClick={() => setSelectedNodeIndex(idx)}
              className={`p-2 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-rose-500/20 border border-rose-400/40 text-rose-300 shadow-md'
                  : 'bg-slate-950/70 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className="block text-[11px] font-black">{node.day}</span>
              <span className="block text-[9px] text-slate-500 truncate">{node.type}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
