'use client';

import React from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { ExerciseKey } from '@/types/fitness';
import { EXERCISE_CATALOG } from '@/data/exercises';
import { Activity, Shield, Dumbbell, Flame, Zap } from 'lucide-react';

export const ExerciseTabs: React.FC = () => {
  const { selectedExercise, setSelectedExercise } = useWorkout();

  const exercises: { id: ExerciseKey; icon: React.ReactNode; tag: string }[] = [
    {
      id: 'squats',
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      tag: 'Legs / Core'
    },
    {
      id: 'pushups',
      icon: <Dumbbell className="w-4 h-4 text-cyan-400" />,
      tag: 'Chest / Triceps'
    },
    {
      id: 'jumpingJacks',
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      tag: 'Cardio Burn'
    },
    {
      id: 'lunges',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      tag: 'Quads / Glutes'
    },
    {
      id: 'plank',
      icon: <Shield className="w-4 h-4 text-teal-400" />,
      tag: 'Core Isometric'
    }
  ];

  return (
    <div className="w-full bg-slate-900/70 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800/80 shadow-md">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {exercises.map(({ id, icon, tag }) => {
          const config = EXERCISE_CATALOG[id];
          const isSelected = selectedExercise === id;

          return (
            <button
              key={id}
              onClick={() => setSelectedExercise(id)}
              className={`flex items-center space-x-2.5 p-2.5 sm:py-3 sm:px-3 rounded-xl text-left transition-all duration-200 relative overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-slate-800/60 border border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {/* Left active accent bar */}
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-400 rounded-r-full" />
              )}

              <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/70 text-slate-400'}`}>
                {icon}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-1">
                  <span className={`text-xs font-bold leading-tight truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {config?.shortName || id}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight truncate mt-0.5">
                  {tag}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
