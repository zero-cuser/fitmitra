'use client';

import React, { useState, useEffect } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { 
  ShieldCheck, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  Activity, 
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';

interface PostureExercise {
  id: string;
  name: string;
  targetArea: string;
  durationOrReps: string;
  durationSeconds: number;
  whyItMatters: string;
  steps: string[];
  emoji: string;
  accentColor: string;
}

export const PostureSentinel: React.FC = () => {
  const { postureScoreToday, setPostureScoreToday, soundEnabled } = useWorkout();

  // Curated Mobile-Friendly Posture Correction Exercises
  const postureExercises: PostureExercise[] = [
    {
      id: 'chin-tuck',
      name: 'Cervical Spine Retraction (Chin Tucks)',
      targetArea: 'Cervical Spine & Deep Neck Flexors',
      durationOrReps: '10 reps • 3s hold each',
      durationSeconds: 30,
      whyItMatters: 'Directly reverses tech-neck by restoring the natural cervical lordosis and unloading cranial weight from upper vertebrae.',
      steps: [
        'Sit tall with your shoulders relaxed and back against your chair.',
        'Without tilting your head up or down, pull your chin straight backward as if making a double chin.',
        'Hold the contraction firmly for 3 seconds, feeling the stretch at the base of your skull.',
        'Release gently forward and repeat for 10 controlled reps.'
      ],
      emoji: '🧘',
      accentColor: 'from-cyan-500/20 to-teal-500/10 border-cyan-500/30 text-cyan-400'
    },
    {
      id: 'chest-opener',
      name: 'Desk Doorway Chest & Pectoral Opener',
      targetArea: 'Pectoralis Major & Anterior Deltoids',
      durationOrReps: '30s steady hold',
      durationSeconds: 30,
      whyItMatters: 'Counters hunched, internally rotated shoulders caused by typing on laptops and looking down at smartphones.',
      steps: [
        'Place your elbows or palms against a doorway or the backrest of your chair at shoulder height.',
        'Gently step forward with one foot until you feel a deep, opening stretch across your chest and front shoulders.',
        'Keep your ribs pulled down and breathe deeply for 30 seconds.',
        'Switch lead leg and repeat.'
      ],
      emoji: '👐',
      accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
    },
    {
      id: 'thoracic-twist',
      name: 'Thoracic Seated Chair Twist',
      targetArea: 'Thoracic Spine & Oblique Rotation',
      durationOrReps: '15s each side',
      durationSeconds: 30,
      whyItMatters: 'Rotational decompression increases spinal synovial fluid circulation and frees up stiff mid-back joints after long sitting.',
      steps: [
        'Sit with feet flat on the floor and spine elongated.',
        'Place your right hand on your left knee and grasp the chair back with your left hand.',
        'Inhale tall, then exhale as you gently twist through your ribcage toward the left.',
        'Hold for 15 seconds, switch sides, and repeat smoothly.'
      ],
      emoji: '🔄',
      accentColor: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400'
    },
    {
      id: 'upper-trap-release',
      name: 'Upper Trapezius & Neck Relief',
      targetArea: 'Upper Trapezius & Levator Scapulae',
      durationOrReps: '20s each side',
      durationSeconds: 40,
      whyItMatters: 'Relieves chronic tension headaches and tight neck knots caused by sustained study stress.',
      steps: [
        'Anchor your right hand under the chair seat to keep the right shoulder pinned down.',
        'Gently tilt your left ear toward your left shoulder using minimal hand assistance.',
        'Hold for 20 seconds, feeling the long stretch down the right side of your neck.',
        'Repeat on the opposite side.'
      ],
      emoji: '💆',
      accentColor: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400'
    },
    {
      id: 'wall-angels',
      name: 'Wall Angels / Scapular Squeeze',
      targetArea: 'Rhomboids, Lower Trapezius & Scapula',
      durationOrReps: '10 reps • 2s hold at top',
      durationSeconds: 30,
      whyItMatters: 'Activates postural stabilizer muscles to maintain upright alignment automatically without conscious slouch fatigue.',
      steps: [
        'Stand against a flat wall with heels 4 inches out, pressing lower back, head, and elbows against the surface.',
        'Slowly slide your arms upward into a "Y" shape while keeping wrists and elbows pinned to the wall.',
        'Squeeze your shoulder blades together firmly at the top for 2 seconds.',
        'Slide back down into a "W" shape and repeat.'
      ],
      emoji: '🦅',
      accentColor: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400'
    }
  ];

  // Routine Player State
  const [isPlayingRoutine, setIsPlayingRoutine] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [routineSecondsLeft, setRoutineSecondsLeft] = useState(30);
  const [isRoutinePaused, setIsRoutinePaused] = useState(false);
  const [routineCompleted, setRoutineCompleted] = useState(false);

  // Pomodoro Focus Timer State
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [studyBlocksCompleted, setStudyBlocksCompleted] = useState(2);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'exercises' | 'routine' | 'pomodoro'>('exercises');

  // Start guided routine
  const startRoutine = (startIndex = 0) => {
    setCurrentExerciseIndex(startIndex);
    setRoutineSecondsLeft(postureExercises[startIndex]?.durationSeconds || 30);
    setIsPlayingRoutine(true);
    setIsRoutinePaused(false);
    setRoutineCompleted(false);
    setActiveTab('routine');

    if (soundEnabled && typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch {
        // audio context fallback
      }
    }
  };

  // Next exercise in routine
  const nextExercise = () => {
    if (currentExerciseIndex < postureExercises.length - 1) {
      const nextIdx = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIdx);
      setRoutineSecondsLeft(postureExercises[nextIdx].durationSeconds);
    } else {
      // Completed routine!
      setIsPlayingRoutine(false);
      setRoutineCompleted(true);
      setPostureScoreToday(Math.min(100, postureScoreToday + 5));
    }
  };

  // Routine countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingRoutine && !isRoutinePaused && routineSecondsLeft > 0) {
      interval = setInterval(() => {
        setRoutineSecondsLeft((prev) => {
          if (prev <= 1) {
            nextExercise();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingRoutine, isRoutinePaused, routineSecondsLeft, currentExerciseIndex]);

  // Pomodoro countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setStudyBlocksCompleted((c) => c + 1);
            startRoutine(0); // Trigger stretch routine automatically!
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentExercise = postureExercises[currentExerciseIndex] || postureExercises[0];

  return (
    <div className="space-y-6">
      
      {/* Header Banner - Mobile-first ergonomic suite */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Mobile-Optimized Ergonomics</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Posture Correction & Mobility Studio
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Zero camera setup, zero battery drain. Targeted mobility exercises and guided micro-stretch breaks engineered to reverse desk-slouch and phone tech-neck.
            </p>
          </div>

          {/* Quick 1-Tap Action Button */}
          <button
            onClick={() => startRoutine(0)}
            className="py-3 px-6 rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center space-x-2 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 shadow-emerald-500/20 self-start sm:self-auto"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start 2-Min Posture Reset</span>
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Posture Health Score</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-teal-400">{postureScoreToday}%</span>
              <span className="text-[10px] text-emerald-400 font-medium">Optimal spinal resilience</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Targeted Exercises</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-cyan-400">{postureExercises.length} Routines</span>
              <span className="text-[10px] text-slate-500">Cervical, Pectoral & Thoracic</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Deep Work Pomodoros</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-amber-400">{studyBlocksCompleted} Blocks</span>
              <span className="text-[10px] text-slate-500">Auto stretch breaks synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('exercises')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'exercises' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Exercise Library
        </button>
        <button
          onClick={() => setActiveTab('routine')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'routine' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Guided Routine Player {isPlayingRoutine && '🔥'}
        </button>
        <button
          onClick={() => setActiveTab('pomodoro')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pomodoro' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          25m Pomodoro Study Lock
        </button>
      </div>

      {/* VIEW 1: EXERCISE LIBRARY */}
      {activeTab === 'exercises' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-bold text-white">Targeted Posture Correction Exercises</h4>
            <span className="text-xs text-slate-400">Tap any routine to practice</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {postureExercises.map((ex, idx) => (
              <div
                key={ex.id}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-xl shadow-inner">
                        {ex.emoji}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white leading-snug">{ex.name}</h5>
                        <span className="text-[11px] font-medium text-teal-400">{ex.targetArea}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 whitespace-nowrap border border-slate-700">
                      {ex.durationOrReps}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {ex.whyItMatters}
                  </p>

                  {/* Step cues */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                    {ex.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start space-x-2">
                        <span className="text-teal-400 font-bold shrink-0">{sIdx + 1}.</span>
                        <span className="text-slate-400 leading-tight">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => startRoutine(idx)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-300 flex items-center justify-center space-x-2 border border-slate-700"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Practice This Stretch</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: GUIDED ROUTINE PLAYER */}
      {activeTab === 'routine' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          {routineCompleted ? (
            <div className="text-center py-8 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                <Award className="w-8 h-8" />
              </div>
              <h4 className="text-2xl font-black text-white">Posture Reset Complete!</h4>
              <p className="text-xs text-slate-400">
                You just released cervical compression, opened your chest, and reactivated your spine stabilizers.
              </p>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-bold">
                +5% added to today&apos;s Posture Health Score! 🏆
              </div>
              <button
                onClick={() => startRoutine(0)}
                className="py-3 px-6 rounded-2xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md"
              >
                Restart Routine
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-xl mx-auto text-center">
              
              {/* Exercise Index & Indicator */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-teal-400">
                  Exercise {currentExerciseIndex + 1} of {postureExercises.length}
                </span>
                <span>{currentExercise.durationOrReps}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-teal-400 h-full transition-all duration-300"
                  style={{ width: `${((currentExerciseIndex + 1) / postureExercises.length) * 100}%` }}
                />
              </div>

              {/* Current Active Exercise Card */}
              <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="text-4xl">{currentExercise.emoji}</div>
                <div>
                  <h4 className="text-lg font-black text-white">{currentExercise.name}</h4>
                  <span className="text-xs text-teal-400 font-semibold">{currentExercise.targetArea}</span>
                </div>

                <div className="py-2">
                  <span className="text-5xl sm:text-6xl font-black font-mono text-white tracking-tight">
                    {routineSecondsLeft}s
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">Time Remaining</p>
                </div>

                <p className="text-xs text-slate-400 italic">
                  &ldquo;{currentExercise.whyItMatters}&rdquo;
                </p>

                {/* Step Instructions */}
                <div className="text-left p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  {currentExercise.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-teal-400 font-bold shrink-0">{idx + 1}.</span>
                      <span className="text-slate-400 leading-snug">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Player Controls */}
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setIsRoutinePaused(!isRoutinePaused)}
                  className="py-3 px-6 rounded-2xl text-xs font-bold transition-all bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center space-x-2"
                >
                  {isRoutinePaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{isRoutinePaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  onClick={nextExercise}
                  className="py-3 px-6 rounded-2xl text-xs font-bold transition-all bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md flex items-center space-x-2"
                >
                  <span>{currentExerciseIndex === postureExercises.length - 1 ? 'Finish Routine' : 'Next Stretch'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* VIEW 3: 25M POMODORO STUDY LOCK */}
      {activeTab === 'pomodoro' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-4">
            <Clock className="w-8 h-8 mx-auto text-teal-400" />
            <h4 className="text-xl font-bold text-white">Academic Deep-Work Block</h4>
            <p className="text-xs text-slate-400">
              Lock in for 25 minutes of high-focus study. FitMitra will automatically launch the 2-minute posture stretch sequence when your timer finishes.
            </p>

            <div className="py-6">
              <span className="text-6xl font-black tracking-tight text-white font-mono">
                {formatTime(timerSeconds)}
              </span>
            </div>

            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`py-3 px-6 rounded-2xl font-bold text-xs shadow-md transition-all ${
                  isTimerRunning
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {isTimerRunning ? 'Pause Block' : 'Start 25m Focus Block'}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(25 * 60);
                }}
                className="py-3 px-4 rounded-2xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
              Completed study blocks today: <strong className="text-teal-400">{studyBlocksCompleted}</strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
