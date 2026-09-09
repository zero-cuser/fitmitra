import React, { useState, useEffect } from 'react';
import { useFitness } from '../../context/FitnessContext';
import { DORM_ROUTINES } from '../../data/exercises';
import { coachVoice } from '../../utils/voiceCoach';
import { playCountdown, playWorkoutComplete } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import {
  Flame,
  Clock,
  Sparkles,
  Play,
  CheckCircle2,
  X,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const WorkoutHub = () => {
  const { recordReps, user } = useFitness();
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Active workout timer
  useEffect(() => {
    let interval;
    if (activeRoutine && !isPaused && !isCompleted && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev === 4 && user.soundEnabled) playCountdown();
          return prev - 1;
        });
      }, 1000);
    } else if (activeRoutine && secondsRemaining === 0 && !isCompleted) {
      // Step to next exercise or finish
      if (exerciseIndex < activeRoutine.exercises.length - 1) {
        setExerciseIndex(prev => prev + 1);
        setSecondsRemaining(35);
        coachVoice.speak(`Next exercise: ${activeRoutine.exercises[exerciseIndex + 1].name}`, true);
      } else {
        // Complete routine
        setIsCompleted(true);
        if (user.soundEnabled) playWorkoutComplete();
        confetti({ particleCount: 100, spread: 80 });
        coachVoice.speak(`Workout completed! ${activeRoutine.title} finished! Outstanding energy!`, true);
        recordReps(activeRoutine.id, 20, 2.5); // award calories and coins
      }
    }
    return () => clearInterval(interval);
  }, [activeRoutine, isPaused, isCompleted, secondsRemaining, exerciseIndex, user.soundEnabled, recordReps]);

  const handleStartRoutine = (routine) => {
    setActiveRoutine(routine);
    setExerciseIndex(0);
    setSecondsRemaining(30);
    setIsPaused(false);
    setIsCompleted(false);
    coachVoice.speak(`Starting ${routine.title}. Let's get moving!`, true);
  };

  const handleCloseModal = () => {
    setActiveRoutine(null);
    setIsCompleted(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Zap className="w-4 h-4" />
            <span>2m × 2m Dorm Room Space</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Dorm Room Workout Hub</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Zero equipment needed. High-density bodyweight circuits engineered specifically to fit between your hostel bed and study desk.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300">Quiet Footwork (No Floor Banging)</span>
        </div>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DORM_ROUTINES.map((routine) => (
          <div
            key={routine.id}
            className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10 transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {routine.badge}
                </span>
                <div className="flex items-center space-x-1 text-xs text-orange-400 font-bold">
                  <Flame className="w-4 h-4" />
                  <span>~{routine.calBurn} kcal</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">{routine.title}</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{routine.desc}</p>

              {/* Exercises Preview List */}
              <div className="space-y-2 border-t border-slate-800/80 pt-3 mb-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Circuit Breakdown:</span>
                {routine.exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">• {ex.name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{ex.reps}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStartRoutine(routine)}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/25 flex items-center justify-center space-x-2 transition-all"
            >
              <Play className="w-4 h-4" />
              <span>Start Routine ({routine.duration})</span>
            </button>
          </div>
        ))}
      </div>

      {/* Interactive Workout Modal */}
      {activeRoutine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {!isCompleted ? (
              <div className="space-y-6 text-center">
                <div>
                  <span className="text-xs uppercase font-bold text-purple-400 tracking-wider">
                    {activeRoutine.title} • Step {exerciseIndex + 1} of {activeRoutine.exercises.length}
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {activeRoutine.exercises[exerciseIndex].name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Pace: {activeRoutine.exercises[exerciseIndex].reps}
                  </p>
                </div>

                {/* Big Countdown Timer */}
                <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-4 border-purple-500/30 flex items-center justify-center bg-purple-950/20">
                    <span className="text-5xl font-black font-mono text-white">{secondsRemaining}s</span>
                  </div>
                </div>

                {/* Next exercise teaser */}
                {exerciseIndex < activeRoutine.exercises.length - 1 && (
                  <div className="text-xs text-slate-400">
                    Up next: <span className="text-slate-200 font-semibold">{activeRoutine.exercises[exerciseIndex + 1].name}</span>
                  </div>
                )}

                {/* Controls */}
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={() => setSecondsRemaining(0)}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm"
                  >
                    Skip to Next
                  </button>
                </div>
              </div>
            ) : (
              /* Completion Screen */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white">Workout Crushed!</h3>
                <p className="text-xs text-slate-300 max-w-xs mx-auto">
                  You successfully completed the {activeRoutine.title}! Your metabolism is firing on all cylinders.
                </p>

                <div className="inline-flex items-center space-x-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-xs">
                  <span className="text-purple-400 font-bold">+50 FitCoins</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">~{activeRoutine.calBurn} kcal burned</span>
                </div>

                <div>
                  <button
                    onClick={handleCloseModal}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
