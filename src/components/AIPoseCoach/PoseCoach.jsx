import React, { useState, useEffect, useRef } from 'react';
import { useFitness } from '../../context/FitnessContext';
import { AI_EXERCISES } from '../../data/exercises';
import { CameraView } from './CameraView';
import { coachVoice } from '../../utils/voiceCoach';
import { playRepSuccess, playWorkoutComplete } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import {
  Activity,
  Flame,
  Award,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Info,
  Zap,
  ShieldCheck,
  Target,
  Clock
} from 'lucide-react';

export const PoseCoach = () => {
  const { user, recordReps, toggleVoiceCoach } = useFitness();
  const [selectedExercise, setSelectedExercise] = useState('squats');
  const [currentAngle, setCurrentAngle] = useState(160);
  const [currentStage, setCurrentStage] = useState('up');
  const [sessionCount, setSessionCount] = useState(0); // reps or seconds
  const [targetCount, setTargetCount] = useState(15);
  const [formCue, setFormCue] = useState('Stand in frame to begin');
  const [isTracking, setIsTracking] = useState(false);
  const [isRepPulse, setIsRepPulse] = useState(false);

  const activeExerciseData = AI_EXERCISES[selectedExercise] || AI_EXERCISES.squats;
  const isHoldExercise = activeExerciseData.metricUnit === 'seconds';

  // Update target when exercise changes
  useEffect(() => {
    setTargetCount(activeExerciseData.defaultTargetReps);
    setSessionCount(0);
    setCurrentStage(selectedExercise === 'jumpingJacks' ? 'down' : 'up');
    setFormCue(`Ready for ${activeExerciseData.shortName}`);
  }, [selectedExercise, activeExerciseData]);

  // Handle real-time telemetry from CameraView (MediaPipe or Simulation)
  const handleTelemetryUpdate = (evalResult) => {
    if (!evalResult) return;

    if (evalResult.angle !== undefined) {
      setCurrentAngle(evalResult.angle);
    }

    if (evalResult.stage && evalResult.stage !== currentStage) {
      setCurrentStage(evalResult.stage);
    }

    if (evalResult.formCue) {
      setFormCue(evalResult.formCue);
      // Voice feedback throttled to once per 4 seconds
      coachVoice.speakFormCue(evalResult.formCue);
    }

    // Plank isometric hold progression (accumulates hold seconds)
    if (isHoldExercise) {
      if (evalResult.isGoodForm && evalResult.inFrame) {
        // Will be managed or incremented periodically
      }
    } else {
      // Dynamic rep count for Squats, Push-ups, Jumping Jacks, Lunges
      if (evalResult.repCompleted) {
        triggerRepCompletion();
      }
    }
  };

  // Trigger repetition completion with animation, sound, and +10 XP
  const triggerRepCompletion = (increment = 1) => {
    const nextCount = sessionCount + increment;
    setSessionCount(nextCount);

    // 1. Animated pulse effect on counter
    setIsRepPulse(true);
    setTimeout(() => setIsRepPulse(false), 450);

    // 2. Audio Chime
    if (user.soundEnabled) {
      playRepSuccess();
    }

    // 3. Award +10 XP and progress towards goal
    recordReps(selectedExercise, increment, activeExerciseData.calPerRep);

    // 4. Voice coaching cues
    coachVoice.speakRep(nextCount, activeExerciseData.metricUnit);

    if (nextCount % 5 === 0 && nextCount !== targetCount) {
      coachVoice.speakEncouragement();
    }

    if (nextCount >= targetCount && sessionCount < targetCount) {
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      if (user.soundEnabled) playWorkoutComplete();
      coachVoice.speak(`Goal reached! Outstanding set of ${targetCount} ${activeExerciseData.shortName}!`, true);
    }
  };

  const handleManualRep = () => {
    triggerRepCompletion(isHoldExercise ? 5 : 1);
  };

  const handleResetSession = () => {
    setSessionCount(0);
    setCurrentStage(selectedExercise === 'jumpingJacks' ? 'down' : 'up');
    setFormCue('Session reset. Ready to go!');
  };

  const progressPercent = Math.min(Math.round((sessionCount / targetCount) * 100), 100);
  const estCalories = (sessionCount * activeExerciseData.calPerRep).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Zap className="w-4 h-4" />
            <span>MediaPipe Client-Side Vision AI</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">AI Vision Rep & Biometric Form Coach</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Real-time biometric skeleton analysis with MediaPipe. Live joint angle calculations, color-coded form feedback, and audio coaching.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={toggleVoiceCoach}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
              user.voiceCoachEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle voice coaching"
          >
            {user.voiceCoachEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{user.voiceCoachEnabled ? 'Voice Coach On' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* 5 Distinct Exercise Preset Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.keys(AI_EXERCISES).map((key) => {
          const ex = AI_EXERCISES[key];
          const isSelected = selectedExercise === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedExercise(key)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm text-white">{ex.shortName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                  {ex.level.split(' ')[0]}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{ex.targetMuscles}</p>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Camera/Simulator + Live Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera View with Dynamic Pose & Skeleton (7 cols) */}
        <div className="lg:col-span-7">
          <CameraView
            exerciseKey={selectedExercise}
            onTelemetryUpdate={handleTelemetryUpdate}
            currentStage={currentStage}
            isTracking={isTracking}
            setIsTracking={setIsTracking}
          />
        </div>

        {/* Right Column: Live Telemetry & Progress (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Rep Count Card with Animated Pulse */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                  {isHoldExercise ? 'Hold Duration' : 'Completed Reps'}
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span
                    className={`text-5xl font-black font-mono text-white transition-transform duration-200 inline-block ${
                      isRepPulse ? 'scale-125 text-emerald-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'scale-100'
                    }`}
                  >
                    {sessionCount}
                  </span>
                  <span className="text-slate-400 font-semibold text-sm">
                    / {targetCount} {activeExerciseData.metricUnit}
                  </span>
                </div>
              </div>

              <div className="flex space-x-1.5">
                <button
                  onClick={handleManualRep}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700 transition-all hover:border-emerald-500/40"
                  title="Manually increment rep for testing"
                >
                  {isHoldExercise ? '+5s Hold' : '+1 Rep'}
                </button>
                <button
                  onClick={handleResetSession}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all"
                  title="Reset counter"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Set Progress</span>
                <span className="font-semibold text-emerald-400">{progressPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-300 shadow-md shadow-emerald-500/50"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Sub stats: Calories and Joint Angle */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800/80">
              <div className="flex items-center space-x-3 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Calories Burned</div>
                  <div className="text-sm font-bold text-slate-100">{estCalories} kcal</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    {isHoldExercise ? 'Spine Deviation' : 'Joint Flexion'}
                  </div>
                  <div className="text-sm font-bold text-slate-100">{currentAngle}°</div>
                </div>
              </div>
            </div>

            {/* Live Form Guidance Message */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">Coach Feedback:</span>
              <span className="font-semibold text-emerald-400 text-right">{formCue}</span>
            </div>
          </div>

          {/* Dynamic Bio-Mechanical Form Guard */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-300 font-semibold text-xs uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Bio-Mechanical Form Guard ({activeExerciseData.shortName})</span>
            </div>

            <ul className="space-y-2 text-xs text-slate-300">
              {activeExerciseData.instructions.map((step, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">XP Reward:</span>
              <span className="text-purple-400 font-bold">+10 XP per repetition</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
