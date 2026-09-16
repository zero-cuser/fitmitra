'use client';

import React, { useState, useMemo } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { useAuth } from '@/context/AuthContext';
import { ExerciseKey } from '@/types/fitness';
import {
  Sparkles,
  Bot,
  Maximize2,
  Volume2,
  VolumeX,
  Clock,
  Dumbbell,
  Compass,
  CheckCircle2,
  Play,
  Flame,
  Shield,
  Layers,
  Zap,
  ArrowRight,
  Info
} from 'lucide-react';

type SpaceType = 'tight_dorm' | 'room_floor' | 'wide_room' | 'gym';
type EquipmentType = 'none' | 'chair' | 'backpack' | 'dumbbells' | 'bands';
type NoiseLevel = 'silent' | 'normal';
type DurationType = '5m' | '15m' | '30m';

interface RecommendedExercise {
  id: string;
  name: string;
  baseExerciseKey?: ExerciseKey;
  targetMuscles: string;
  setsReps: string;
  estCalories: number;
  spaceFitNote: string;
  equipmentNote: string;
  formCue: string;
  isCameraTrackable: boolean;
}

export const AIWorkoutAdvisor: React.FC = () => {
  const { setSelectedExercise } = useWorkout();
  const { user } = useAuth();

  // User input states
  const [selectedSpace, setSelectedSpace] = useState<SpaceType>('tight_dorm');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType[]>(['none', 'chair']);
  const [noiseLevel, setNoiseLevel] = useState<NoiseLevel>('silent');
  const [duration, setDuration] = useState<DurationType>('15m');
  const [targetFocus, setTargetFocus] = useState<'full_body' | 'lower' | 'upper' | 'core'>('full_body');
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleEquipment = (eq: EquipmentType) => {
    setSelectedEquipment((prev) => {
      if (eq === 'none') return ['none'];
      const filtered = prev.filter((e) => e !== 'none');
      if (filtered.includes(eq)) {
        const next = filtered.filter((e) => e !== eq);
        return next.length ? next : ['none'];
      }
      return [...filtered, eq];
    });
  };

  // AI Generation Algorithm
  const workoutPlan: RecommendedExercise[] = useMemo(() => {
    const list: RecommendedExercise[] = [];
    const isTight = selectedSpace === 'tight_dorm';
    const isSilent = noiseLevel === 'silent';
    const hasChair = selectedEquipment.includes('chair');
    const hasBackpack = selectedEquipment.includes('backpack');
    const hasBands = selectedEquipment.includes('bands');
    const hasDumbbells = selectedEquipment.includes('dumbbells');

    // 1. Lower Body / Squat / Lunge
    if (targetFocus === 'full_body' || targetFocus === 'lower') {
      if (hasBackpack) {
        list.push({
          id: 'ex_1',
          name: 'Backpack Weighted Squats',
          baseExerciseKey: 'squats',
          targetMuscles: 'Quads, Glutes & Upper Back',
          setsReps: duration === '5m' ? '2 sets × 12 reps' : '3 sets × 15 reps',
          estCalories: 45,
          spaceFitNote: 'Requires only 2×2 ft standing space beside your bed',
          equipmentNote: 'Fill backpack with 3–5 books for progressive overload',
          formCue: 'Hug bag to chest or wear snug on back; keep heels glued to floor',
          isCameraTrackable: true
        });
      } else {
        list.push({
          id: 'ex_1',
          name: 'Bodyweight Tempo Squats',
          baseExerciseKey: 'squats',
          targetMuscles: 'Quads & Glute Strength',
          setsReps: duration === '5m' ? '2 sets × 12 reps' : duration === '15m' ? '3 sets × 15 reps' : '4 sets × 20 reps',
          estCalories: 40,
          spaceFitNote: 'Zero lateral travel, 100% stationary footprint',
          equipmentNote: 'Zero equipment needed',
          formCue: 'Lower down for 3 seconds, pause 1s at bottom, drive up with power',
          isCameraTrackable: true
        });
      }

      // Static / Alternating Lunges
      list.push({
        id: 'ex_2',
        name: isTight ? 'Stationary Split Lunges' : 'Alternating Reverse Lunges',
        baseExerciseKey: 'lunges',
        targetMuscles: 'Hamstrings, Quads & Balance',
        setsReps: duration === '5m' ? '2 sets × 10/leg' : '3 sets × 12/leg',
        estCalories: 48,
        spaceFitNote: isTight ? 'Stationary split stance fits between bed & study desk' : 'Minimal floor space needed',
        equipmentNote: hasBands ? 'Loop band under front foot for added resistance' : 'Bodyweight balance',
        formCue: 'Step back softly; keep front knee directly stacked above ankle',
        isCameraTrackable: true
      });
    }

    // 2. Upper Body / Push
    if (targetFocus === 'full_body' || targetFocus === 'upper') {
      if (hasChair && isTight) {
        list.push({
          id: 'ex_3',
          name: 'Desk / Chair Incline Push-ups',
          baseExerciseKey: 'pushups',
          targetMuscles: 'Chest, Shoulders & Triceps',
          setsReps: duration === '5m' ? '2 sets × 10 reps' : '3 sets × 14 reps',
          estCalories: 38,
          spaceFitNote: 'Uses your study desk or dorm chair; keeps floor completely clear',
          equipmentNote: 'Sturdy study table or non-slip dorm chair',
          formCue: 'Elbows tucked 45° to body; rigid plank line from crown to heels',
          isCameraTrackable: true
        });
      } else {
        list.push({
          id: 'ex_3',
          name: 'Floor Standard Push-ups',
          baseExerciseKey: 'pushups',
          targetMuscles: 'Pectorals, Anterior Deltoid & Core',
          setsReps: duration === '5m' ? '2 sets × 10 reps' : '3 sets × 12–15 reps',
          estCalories: 42,
          spaceFitNote: 'Requires a standard 5×2 ft yoga mat length',
          equipmentNote: 'Bodyweight floor resistance',
          formCue: 'Lower chest until elbows hit 90°; avoid hip sag',
          isCameraTrackable: true
        });
      }
    }

    // 3. Core Stability
    if (targetFocus === 'full_body' || targetFocus === 'core') {
      list.push({
        id: 'ex_4',
        name: 'Isometric Forearm Plank',
        baseExerciseKey: 'plank',
        targetMuscles: 'Transverse Abdominis & Deep Core',
        setsReps: duration === '5m' ? '2 sets × 30s' : duration === '15m' ? '3 sets × 45s' : '4 sets × 60s',
        estCalories: 35,
        spaceFitNote: 'Completely stationary & 100% silent (no impact)',
        equipmentNote: 'Floor or dorm bed mattress',
        formCue: 'Squeeze glutes tight; imagine pulling elbows towards toes',
        isCameraTrackable: true
      });
    }

    // 4. Cardio / Metabolic Burn
    if (targetFocus === 'full_body') {
      if (isSilent) {
        list.push({
          id: 'ex_5',
          name: 'Silent Shadow Jacks (No-Hop)',
          baseExerciseKey: 'jumpingJacks',
          targetMuscles: 'Shoulders, Calves & Aerobic Heart Rate',
          setsReps: duration === '5m' ? '2 sets × 30s' : '3 sets × 45s',
          estCalories: 50,
          spaceFitNote: 'Step-out side tap instead of jump; zero thumping on floor',
          equipmentNote: 'Roommate-friendly silent cardio',
          formCue: 'Alternate wide side toe taps while bringing hands overhead into wide V',
          isCameraTrackable: true
        });
      } else {
        list.push({
          id: 'ex_5',
          name: 'Cardio Jumping Jacks',
          baseExerciseKey: 'jumpingJacks',
          targetMuscles: 'Full Body Cardio & Calves',
          setsReps: duration === '5m' ? '2 sets × 25 reps' : '3 sets × 35 reps',
          estCalories: 60,
          spaceFitNote: 'Needs 4×4 ft space to safely spread arms and feet',
          equipmentNote: 'Cardiovascular speed',
          formCue: 'Land softly on balls of feet; rhythmic arm abduction past 135°',
          isCameraTrackable: true
        });
      }
    }

    return list;
  }, [selectedSpace, selectedEquipment, noiseLevel, duration, targetFocus]);

  const totalEstCalories = workoutPlan.reduce((acc, ex) => acc + ex.estCalories, 0);

  const handleStartInCamera = (key?: ExerciseKey) => {
    if (key) {
      setSelectedExercise(key);
      // Scroll smoothly up to the Camera viewport
      const cam = document.getElementById('camera-viewport-top');
      if (cam) {
        cam.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const applyPreset = (space: SpaceType, eq: EquipmentType[], noise: NoiseLevel, dur: DurationType, focus: any) => {
    setIsGenerating(true);
    setSelectedSpace(space);
    setSelectedEquipment(eq);
    setNoiseLevel(noise);
    setDuration(dur);
    setTargetFocus(focus);
    setTimeout(() => setIsGenerating(false), 300);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Bot className="w-3.5 h-3.5" />
            <span>AI Spatial & Equipment Architect</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Smart Exercise & Room Advisor
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select your available room space, dorm gear, and noise constraints. AI crafts workouts you can track live in camera.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyPreset('tight_dorm', ['none', 'chair'], 'silent', '15m', 'full_body')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-semibold transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Dorm Bedside (Silent)</span>
          </button>
          <button
            onClick={() => applyPreset('room_floor', ['none'], 'normal', '5m', 'full_body')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-semibold transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>5-Min Quick Blast</span>
          </button>
        </div>
      </div>

      {/* Input Parameters Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
        
        {/* 1. Available Space */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Maximize2 className="w-3 h-3 text-cyan-400" />
            <span>Available Space</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              onClick={() => setSelectedSpace('tight_dorm')}
              className={`p-2 rounded-xl border text-left transition-all ${
                selectedSpace === 'tight_dorm'
                  ? 'border-cyan-500 bg-cyan-500/15 text-white font-bold'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[11px]">Bedside (~2×2 ft)</div>
              <div className="text-[9px] text-slate-500 font-normal">Compact dorm</div>
            </button>
            <button
              onClick={() => setSelectedSpace('room_floor')}
              className={`p-2 rounded-xl border text-left transition-all ${
                selectedSpace === 'room_floor'
                  ? 'border-cyan-500 bg-cyan-500/15 text-white font-bold'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[11px]">Floor (~5×5 ft)</div>
              <div className="text-[9px] text-slate-500 font-normal">Mat / Open area</div>
            </button>
          </div>
        </div>

        {/* 2. Available Equipment */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Dumbbell className="w-3 h-3 text-emerald-400" />
            <span>Equipment / Props</span>
          </label>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'none', label: 'Bodyweight Only' },
              { id: 'chair', label: 'Desk / Chair' },
              { id: 'backpack', label: 'Book Backpack' },
              { id: 'bands', label: 'Bands' }
            ].map((eq) => {
              const active = selectedEquipment.includes(eq.id as EquipmentType);
              return (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id as EquipmentType)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {eq.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Noise / Roommate Sensitivity */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            {noiseLevel === 'silent' ? (
              <VolumeX className="w-3 h-3 text-amber-400" />
            ) : (
              <Volume2 className="w-3 h-3 text-slate-400" />
            )}
            <span>Dorm Noise Filter</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              onClick={() => setNoiseLevel('silent')}
              className={`p-2 rounded-xl border text-left transition-all ${
                noiseLevel === 'silent'
                  ? 'border-amber-500 bg-amber-500/15 text-white font-bold'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[11px] flex items-center gap-1">
                <span>🤫 Zero-Noise</span>
              </div>
              <div className="text-[9px] text-slate-500 font-normal">Roommate sleeping</div>
            </button>
            <button
              onClick={() => setNoiseLevel('normal')}
              className={`p-2 rounded-xl border text-left transition-all ${
                noiseLevel === 'normal'
                  ? 'border-cyan-500 bg-cyan-500/15 text-white font-bold'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[11px]">Dynamic Jumps</div>
              <div className="text-[9px] text-slate-500 font-normal">Full energy</div>
            </button>
          </div>
        </div>

        {/* 4. Workout Duration & Focus */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-teal-400" />
            <span>Time & Focus</span>
          </label>
          <div className="flex items-center gap-1 text-xs">
            {(['5m', '15m', '30m'] as DurationType[]).map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`flex-1 py-1.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                  duration === d
                    ? 'border-teal-500 bg-teal-500/20 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* AI Reasoning Summary Bar */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            AI generated a <strong>{duration}</strong> routine tailored for{' '}
            <span className="text-cyan-300 font-semibold">
              {selectedSpace === 'tight_dorm' ? 'Tight Bedside (2×2 ft)' : 'Floor Mat (5×5 ft)'}
            </span>{' '}
            with{' '}
            <span className="text-emerald-300 font-semibold">
              {noiseLevel === 'silent' ? 'Zero Floor Noise' : 'Standard Cadence'}
            </span>.
          </span>
        </div>

        <div className="flex items-center space-x-3 text-slate-400 shrink-0">
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <Flame className="w-3.5 h-3.5" />
            ~{totalEstCalories} kcal burn
          </span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">
            {workoutPlan.length} Exercises ready
          </span>
        </div>
      </div>

      {/* Recommended Exercise Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {workoutPlan.map((ex, idx) => (
          <div
            key={ex.id}
            className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-0.5">
                    Exercise {idx + 1}
                  </span>
                  <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {ex.name}
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-amber-400 shrink-0 border border-slate-700/80">
                  {ex.setsReps}
                </span>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1">
                <span className="text-slate-300 font-medium">Muscles:</span> {ex.targetMuscles}
              </p>

              {/* Spatial Adaptation Note */}
              <div className="mt-2.5 p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] space-y-1">
                <div className="text-cyan-400/90 flex items-center gap-1 font-medium">
                  <Maximize2 className="w-3 h-3" />
                  <span>{ex.spaceFitNote}</span>
                </div>
                <div className="text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{ex.formCue}</span>
                </div>
              </div>
            </div>

            {/* Direct Camera Track Button */}
            {ex.isCameraTrackable && ex.baseExerciseKey && (
              <button
                onClick={() => handleStartInCamera(ex.baseExerciseKey)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-slate-800 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.99] shadow-sm shadow-emerald-500/10"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>Track Reps in AI Pose Coach</span>
              </button>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};
