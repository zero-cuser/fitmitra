'use client';

import React, { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { ExerciseKey } from '@/types/fitness';
import { EXERCISE_CATALOG } from '@/data/exercises';
import {
  Activity,
  Dumbbell,
  Zap,
  Flame,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  Maximize2,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export type WorkoutCategoryFilter = 'All' | 'Strength' | 'Cardio' | 'Flexibility';

interface WorkoutMetadata {
  id: ExerciseKey;
  filterCategory: 'Strength' | 'Cardio' | 'Flexibility';
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment: string;
  spaceRequirement: string;
  intensity: 'Low' | 'Moderate' | 'High';
  icon: React.ReactNode;
  accentColor: string;
  summary: string;
}

export const WORKOUT_METADATA: Record<ExerciseKey, WorkoutMetadata> = {
  squats: {
    id: 'squats',
    filterCategory: 'Strength',
    duration: '4-5 min',
    difficulty: 'Beginner',
    equipment: 'Zero Equipment',
    spaceRequirement: '1 Arm Span (Minimal)',
    intensity: 'Moderate',
    icon: <Activity className="w-5 h-5 text-primary-bright" />,
    accentColor: 'from-primary/20 via-primary/5 to-transparent',
    summary: 'Build lower body power, glute drive, and core stability.'
  },
  pushups: {
    id: 'pushups',
    filterCategory: 'Strength',
    duration: '4-6 min',
    difficulty: 'Intermediate',
    equipment: 'Floor or Desk Edge',
    spaceRequirement: 'Mat Length (Compact)',
    intensity: 'Moderate',
    icon: <Dumbbell className="w-5 h-5 text-accent" />,
    accentColor: 'from-accent/20 via-accent/5 to-transparent',
    summary: 'Upper-body pressing strength for chest, triceps, and anterior delts.'
  },
  jumpingJacks: {
    id: 'jumpingJacks',
    filterCategory: 'Cardio',
    duration: '3-4 min',
    difficulty: 'Beginner',
    equipment: 'Zero Equipment',
    spaceRequirement: '2x2m Clear Space',
    intensity: 'High',
    icon: <Zap className="w-5 h-5 text-warning" />,
    accentColor: 'from-warning/20 via-warning/5 to-transparent',
    summary: 'High-energy cardiovascular conditioning and calorie burn.'
  },
  lunges: {
    id: 'lunges',
    filterCategory: 'Strength',
    duration: '5-6 min',
    difficulty: 'Intermediate',
    equipment: 'Zero Equipment',
    spaceRequirement: '2 Paces Forward',
    intensity: 'Moderate',
    icon: <Flame className="w-5 h-5 text-secondary" />,
    accentColor: 'from-secondary/20 via-secondary/5 to-transparent',
    summary: 'Unilateral leg balance, hamstring engagement, and quad strength.'
  },
  plank: {
    id: 'plank',
    filterCategory: 'Flexibility',
    duration: '3-4 min',
    difficulty: 'Intermediate',
    equipment: 'Floor or Mat',
    spaceRequirement: 'Prone Body Length',
    intensity: 'Moderate',
    icon: <Shield className="w-5 h-5 text-success" />,
    accentColor: 'from-success/20 via-success/5 to-transparent',
    summary: 'Isometric transverse abdominis recruitment and spine protection.'
  }
};

const EXERCISE_ORDER: ExerciseKey[] = ['squats', 'pushups', 'jumpingJacks', 'lunges', 'plank'];

interface WorkoutDiscoveryProps {
  onStartWorkout: (exerciseId: ExerciseKey) => void;
}

export const WorkoutDiscovery: React.FC<WorkoutDiscoveryProps> = ({ onStartWorkout }) => {
  const { selectedExercise, setSelectedExercise } = useWorkout();
  const [activeFilter, setActiveFilter] = useState<WorkoutCategoryFilter>('All');

  const filters: WorkoutCategoryFilter[] = ['All', 'Strength', 'Cardio', 'Flexibility'];

  const filteredExercises = EXERCISE_ORDER.filter((key) => {
    if (activeFilter === 'All') return true;
    return WORKOUT_METADATA[key].filterCategory === activeFilter;
  });

  const handleSelectAndStart = (id: ExerciseKey) => {
    setSelectedExercise(id);
    onStartWorkout(id);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-primary-bright shadow-[0_0_8px_rgba(74,123,255,0.6)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary-bright">
              Discovery Engine
            </span>
          </div>
          <h2 className="text-2xl font-black text-text-primary tracking-tight">
            Workout Discovery
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Choose a routine optimized for student dorms, zero equipment, and real-time AI guidance.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface border border-border-subtle overflow-x-auto scrollbar-none">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary-bright/30'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workout Discovery Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExercises.map((id) => {
          const config = EXERCISE_CATALOG[id];
          const meta = WORKOUT_METADATA[id];
          const isSelected = selectedExercise === id;

          const difficultyBadgeColor =
            meta.difficulty === 'Beginner'
              ? 'success'
              : meta.difficulty === 'Intermediate'
              ? 'warning'
              : 'danger';

          return (
            <Card
              key={id}
              variant={isSelected ? 'interactive' : 'default'}
              className={`flex flex-col justify-between p-5 rounded-3xl transition-all duration-300 relative overflow-hidden group ${
                isSelected
                  ? 'border-primary/60 bg-gradient-to-b from-surface-elevated to-surface shadow-xl shadow-primary/10'
                  : 'hover:border-border-strong hover:bg-surface-elevated'
              }`}
            >
              {/* Subtle Ambient Color Wave */}
              <div
                className={`absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl ${meta.accentColor} rounded-full blur-2xl pointer-events-none opacity-50 group-hover:opacity-80 transition-opacity`}
              />

              <div>
                {/* Top Row: Icon + Category & Difficulty */}
                <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                      {meta.icon}
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                        {meta.filterCategory}
                      </span>
                      <p className="text-xs font-bold text-text-secondary">
                        {config.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Badge color={difficultyBadgeColor} size="sm">
                      {meta.difficulty}
                    </Badge>
                  </div>
                </div>

                {/* Workout Title */}
                <div className="mb-2 relative z-10">
                  <h3 className="text-lg font-black text-text-primary tracking-tight group-hover:text-primary-bright transition-colors">
                    {config.name}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1">
                    {meta.summary}
                  </p>
                </div>

                {/* Key Metadata Badges */}
                <div className="grid grid-cols-2 gap-2 my-4 relative z-10">
                  <div className="p-2.5 rounded-xl bg-surface/70 border border-border-subtle flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Duration</p>
                      <p className="text-xs font-bold text-text-primary truncate">{meta.duration}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface/70 border border-border-subtle flex items-center space-x-2">
                    <Dumbbell className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Equipment</p>
                      <p className="text-xs font-bold text-text-primary truncate">{meta.equipment}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface/70 border border-border-subtle flex items-center space-x-2 col-span-2">
                    <Maximize2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Space Needed</p>
                      <p className="text-xs font-bold text-text-primary truncate">{meta.spaceRequirement}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 relative z-10">
                <Button
                  variant={isSelected ? 'primary' : 'outline'}
                  size="md"
                  onClick={() => handleSelectAndStart(id)}
                  className="w-full flex items-center justify-center space-x-2 font-black py-3 rounded-2xl"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Start AI Pose Coach</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
