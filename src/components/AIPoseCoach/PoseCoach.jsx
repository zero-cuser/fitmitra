import React, { useState } from 'react';
import { useFitness } from '../../context/FitnessContext';
import { AI_EXERCISES } from '../../data/exercises';
import { CameraView } from './CameraView';
import { processSquatRep, processPushupRep, processJumpingJackRep } from './AngleMath';
import { coachVoice } from '../../utils/voiceCoach';
import {
  Activity,
  Flame,
  Award,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Info,
  Zap
} from 'lucide-react';

export const PoseCoach = () => {
  const { user, recordReps, toggleVoiceCoach } = useFitness();
  const [selectedExercise, setSelectedExercise] = useState('squats');
  const [currentAngle, setCurrentAngle] = useState(160);
  const [currentStage, setCurrentStage] = useState('up');
  const [sessionReps, setSessionReps] = useState(0);
  const [targetReps, setTargetReps] = useState(15);
  const [formCue, setFormCue] = useState('Stand in frame to begin');
  const [isTracking, setIsTracking] = useState(false);

  const activeExerciseData = AI_EXERCISES[selectedExercise];

  // Process angle changes from Camera or Simulator
  const handleAngleUpdate = (angle) => {
    setCurrentAngle(angle);

    let result;
    if (selectedExercise === 'squats') {
      result = processSquatRep(angle, currentStage);
    } else if (selectedExercise === 'pushups') {
      result = processPushupRep(angle, currentStage);
    } else {
      result = processJumpingJackRep(angle, currentStage);
    }

    if (result.newStage !== currentStage) {
      setCurrentStage(result.newStage);
    }

    if (result.formCue) {
      setFormCue(result.formCue);
    }

    if (result.repCompleted) {
      const newRepTotal = sessionReps + 1;
      setSessionReps(newRepTotal);
      recordReps(selectedExercise, 1, activeExerciseData.calPerRep);
      coachVoice.speakRep(newRepTotal);

      if (newRepTotal % 5 === 0) {
        coachVoice.speakEncouragement();
      }

      if (newRepTotal === targetReps) {
        coachVoice.speak(`Goal achieved! ${targetReps} reps crushed! Outstanding work!`, true);
      }
    }
  };

  const handleManualRep = () => {
    const newRepTotal = sessionReps + 1;
    setSessionReps(newRepTotal);
    recordReps(selectedExercise, 1, activeExerciseData.calPerRep);
    coachVoice.speakRep(newRepTotal);
  };

  const handleResetSession = () => {
    setSessionReps(0);
    setCurrentStage('up');
    setFormCue('Session reset. Ready to go!');
  };

  const progressPercent = Math.min(Math.round((sessionReps / targetReps) * 100), 100);
  const estCalories = (sessionReps * activeExerciseData.calPerRep).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Zap className="w-4 h-4" />
            <span>Zero-Gear AI Studio</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">AI Vision Rep & Form Coach</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Real-time biometric pose analysis running strictly in your browser. Audio voice cues guide your depth and keep your spine safe.
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

      {/* Exercise Selection Tabs */}
      <div className="grid grid-cols-3 gap-3">
        {Object.keys(AI_EXERCISES).map((key) => {
          const ex = AI_EXERCISES[key];
          const isSelected = selectedExercise === key;
          return (
            <button
              key={key}
              onClick={() => {
                setSelectedExercise(key);
                setSessionReps(0);
                setCurrentStage(key === 'jumpingJacks' ? 'down' : 'up');
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm text-white">{ex.name.split(' ')[1] || ex.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {ex.level}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{ex.targetMuscles}</p>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Camera/Simulator + Live Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera View (7 cols) */}
        <div className="lg:col-span-7">
          <CameraView
            exerciseKey={selectedExercise}
            onAngleUpdate={handleAngleUpdate}
            currentAngle={currentAngle}
            formCue={formCue}
            currentStage={currentStage}
            isTracking={isTracking}
            setIsTracking={setIsTracking}
          />
        </div>

        {/* Right Column: Live Telemetry & Progress (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Rep Count Card */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Completed Reps</span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-5xl font-black font-mono text-white">{sessionReps}</span>
                  <span className="text-slate-400 font-semibold text-sm">/ {targetReps} target</span>
                </div>
              </div>

              <div className="flex space-x-1.5">
                <button
                  onClick={handleManualRep}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700"
                  title="Manually increment rep for testing"
                >
                  +1 Rep
                </button>
                <button
                  onClick={handleResetSession}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
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
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Joint Angle</div>
                  <div className="text-sm font-bold text-slate-100">{currentAngle}°</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Rules & Instructions */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-300 font-semibold text-xs uppercase tracking-wider mb-3">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Bio-Mechanical Form Guard</span>
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
              <span className="text-slate-400">Audio Coaching Cues:</span>
              <span className="text-emerald-400 font-medium">Automatic at Reps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
