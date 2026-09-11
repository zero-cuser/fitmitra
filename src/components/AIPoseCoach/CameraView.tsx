'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Loader2,
  Sliders,
  UserCheck,
  UserX,
  Play
} from 'lucide-react';
import {
  LANDMARK_INDEX,
  evaluateExerciseLandmarks
} from './AngleMath';
import { useWorkout } from '@/context/WorkoutContext';
import { FormFault, LandmarkPoint } from '@/types/fitness';

type ViewportState = 'idle' | 'requesting' | 'active' | 'simulating' | 'error';

const SKELETON_CONNECTIONS = [
  // Torso
  [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.RIGHT_SHOULDER],
  [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_HIP],
  [LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_HIP],
  [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.RIGHT_HIP],
  // Left Arm
  [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW],
  [LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST],
  // Right Arm
  [LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_ELBOW],
  [LANDMARK_INDEX.RIGHT_ELBOW, LANDMARK_INDEX.RIGHT_WRIST],
  // Left Leg
  [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE],
  [LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE],
  // Right Leg
  [LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_KNEE],
  [LANDMARK_INDEX.RIGHT_KNEE, LANDMARK_INDEX.RIGHT_ANKLE]
];

const COLOR_GOOD = '#10b981'; // Neon Emerald
const COLOR_FAULT = '#ef4444'; // Crimson Red

export const CameraView: React.FC = () => {
  const {
    selectedExercise,
    currentStage,
    handleTelemetry,
    setIsTracking
  } = useWorkout();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  // Viewport State Machine
  const [viewState, setViewState] = useState<ViewportState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInFrame, setIsInFrame] = useState(false);

  // Simulation controls
  const [simDirection, setSimDirection] = useState<1 | -1>(-1);
  const [simAngle, setSimAngle] = useState(160);

  // Keep ref synchronized to avoid stale state in callback
  const selectedExerciseRef = useRef(selectedExercise);
  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
  }, [selectedExercise]);

  const currentStageRef = useRef(currentStage);
  useEffect(() => {
    currentStageRef.current = currentStage;
  }, [currentStage]);

  // Clean shutdown helper
  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (poseRef.current) {
      try {
        poseRef.current.close();
      } catch {}
      poseRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setIsTracking(false);
  }, [setIsTracking]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Draw dynamic skeletal overlay with color coding and contextual tooltip labels
  const drawPoseFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      landmarks: LandmarkPoint[],
      formFaults: FormFault[]
    ) => {
      ctx.clearRect(0, 0, width, height);

      const faultyJointNames = new Set(formFaults.map((f) => f.joint.toLowerCase()));

      // 1. Draw Skeleton Lines
      SKELETON_CONNECTIONS.forEach(([idxA, idxB]) => {
        const ptA = landmarks[idxA];
        const ptB = landmarks[idxB];
        if (!ptA || !ptB) return;
        if ((ptA.visibility ?? 1) < 0.4 || (ptB.visibility ?? 1) < 0.4) return;

        let isFaulty = false;
        if (
          (idxA === LANDMARK_INDEX.LEFT_KNEE || idxB === LANDMARK_INDEX.LEFT_KNEE || idxA === LANDMARK_INDEX.RIGHT_KNEE || idxB === LANDMARK_INDEX.RIGHT_KNEE) &&
          faultyJointNames.has('knee')
        ) {
          isFaulty = true;
        }
        if (
          (idxA === LANDMARK_INDEX.LEFT_HIP || idxB === LANDMARK_INDEX.LEFT_HIP || idxA === LANDMARK_INDEX.RIGHT_HIP || idxB === LANDMARK_INDEX.RIGHT_HIP) &&
          faultyJointNames.has('hip')
        ) {
          isFaulty = true;
        }
        if (
          (idxA === LANDMARK_INDEX.LEFT_ELBOW || idxB === LANDMARK_INDEX.LEFT_ELBOW || idxA === LANDMARK_INDEX.RIGHT_ELBOW || idxB === LANDMARK_INDEX.RIGHT_ELBOW) &&
          faultyJointNames.has('elbow')
        ) {
          isFaulty = true;
        }

        const strokeColor = isFaulty ? COLOR_FAULT : COLOR_GOOD;

        ctx.beginPath();
        // Mirror x coordinates to match mirrored video (-scale-x-100)
        ctx.moveTo((1 - ptA.x) * width, ptA.y * height);
        ctx.lineTo((1 - ptB.x) * width, ptB.y * height);
        ctx.lineWidth = isFaulty ? 5 : 4;
        ctx.strokeStyle = strokeColor;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      // 2. Draw Landmark Joint Nodes
      const TRACKED_JOINTS = [
        { idx: LANDMARK_INDEX.LEFT_SHOULDER, name: 'shoulder' },
        { idx: LANDMARK_INDEX.RIGHT_SHOULDER, name: 'shoulder' },
        { idx: LANDMARK_INDEX.LEFT_ELBOW, name: 'elbow' },
        { idx: LANDMARK_INDEX.RIGHT_ELBOW, name: 'elbow' },
        { idx: LANDMARK_INDEX.LEFT_WRIST, name: 'wrist' },
        { idx: LANDMARK_INDEX.RIGHT_WRIST, name: 'wrist' },
        { idx: LANDMARK_INDEX.LEFT_HIP, name: 'hip' },
        { idx: LANDMARK_INDEX.RIGHT_HIP, name: 'hip' },
        { idx: LANDMARK_INDEX.LEFT_KNEE, name: 'knee' },
        { idx: LANDMARK_INDEX.RIGHT_KNEE, name: 'knee' },
        { idx: LANDMARK_INDEX.LEFT_ANKLE, name: 'ankle' },
        { idx: LANDMARK_INDEX.RIGHT_ANKLE, name: 'ankle' }
      ];

      TRACKED_JOINTS.forEach(({ idx, name }) => {
        const pt = landmarks[idx];
        if (!pt || (pt.visibility ?? 1) < 0.4) return;

        const isFaulty = faultyJointNames.has(name);
        const screenX = (1 - pt.x) * width;
        const screenY = pt.y * height;

        // Outer glow
        ctx.beginPath();
        ctx.arc(screenX, screenY, isFaulty ? 9 : 7, 0, Math.PI * 2);
        ctx.fillStyle = isFaulty ? COLOR_FAULT : COLOR_GOOD;
        ctx.fill();

        // Inner white center
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // 3. Float Contextual Form Correction Tooltips Next to Offending Joints
      formFaults.forEach((fault) => {
        const screenX = (1 - fault.x) * width;
        const screenY = fault.y * height;

        ctx.save();
        ctx.font = 'bold 12px Inter, sans-serif';
        const text = `⚠️ ${fault.message}`;
        const textMetrics = ctx.measureText(text);
        const padding = 7;
        const boxWidth = textMetrics.width + padding * 2;
        const boxHeight = 26;

        const boxX = Math.min(Math.max(screenX + 14, 10), width - boxWidth - 10);
        const boxY = Math.min(Math.max(screenY - 14, 25), height - boxHeight - 10);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.94)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, boxX + padding, boxY + 17);
        ctx.restore();
      });
    },
    []
  );

  // Start Live Webcam Stream with MediaPipe Hookup
  const startCamera = async () => {
    setErrorMessage(null);
    setViewState('requesting');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Webcam access is not supported in this browser environment or requires HTTPS/localhost.');
      setViewState('error');
      setIsTracking(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {}
      }

      // Initialize MediaPipe Pose instance
      try {
        let PoseConstructor = (window as any).Pose;
        if (!PoseConstructor) {
          try {
            const mp = await import('@mediapipe/pose');
            PoseConstructor = mp.Pose || (mp as any).default?.Pose;
          } catch (e) {
            console.warn('Could not import @mediapipe/pose dynamically, checking window.Pose', e);
          }
        }

        if (PoseConstructor) {
          const pose = new PoseConstructor({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          });

          pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55
          });

          pose.onResults((results: any) => {
            if (!isRunningRef.current) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = canvas.width;
            const height = canvas.height;

            if (results.poseLandmarks && results.poseLandmarks.length > 0) {
              const evalResult = evaluateExerciseLandmarks(
                selectedExerciseRef.current,
                results.poseLandmarks,
                currentStageRef.current
              );

              setIsInFrame(evalResult.inFrame);

              drawPoseFrame(
                ctx,
                width,
                height,
                results.poseLandmarks,
                evalResult.formFaults || []
              );

              handleTelemetry(evalResult);
            } else {
              setIsInFrame(false);
              ctx.clearRect(0, 0, width, height);
            }
          });

          poseRef.current = pose;
        }
      } catch (poseErr) {
        console.warn('MediaPipe Pose setup note:', poseErr);
      }

      isRunningRef.current = true;
      setViewState('active');
      setIsTracking(true);

      // Frame Pump Loop
      const pumpFrame = async () => {
        if (!isRunningRef.current) return;
        if (
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          poseRef.current
        ) {
          try {
            await poseRef.current.send({ image: videoRef.current });
          } catch {}
        }
        animFrameRef.current = requestAnimationFrame(pumpFrame);
      };

      pumpFrame();
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was blocked. Please allow camera permissions in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No webcam detected on this device. You can test full rep tracking with Interactive Simulation.');
      } else {
        setErrorMessage(err.message || 'Unable to access webcam.');
      }
      setViewState('error');
      setIsTracking(false);
    }
  };

  // Start Interactive Simulation Mode
  const startSimulation = () => {
    stopCamera();
    setViewState('simulating');
    setIsInFrame(true);
    setIsTracking(true);
  };

  // Synthetic Landmark Generator for Infallible Simulation Mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (viewState === 'simulating') {
      interval = setInterval(() => {
        setSimAngle((prev) => {
          let next = prev;
          let newDirection = simDirection;

          if (selectedExercise === 'squats' || selectedExercise === 'lunges') {
            next = prev + simDirection * 5;
            if (next <= 85) newDirection = 1;
            else if (next >= 165) newDirection = -1;
          } else if (selectedExercise === 'pushups') {
            next = prev + simDirection * 6;
            if (next <= 80) newDirection = 1;
            else if (next >= 160) newDirection = -1;
          } else if (selectedExercise === 'jumpingJacks') {
            next = prev + simDirection * 7;
            if (next >= 140) newDirection = -1;
            else if (next <= 40) newDirection = 1;
          } else {
            // plank deviation
            next = prev + simDirection * 2;
            if (next >= 20) newDirection = -1;
            else if (next <= 4) newDirection = 1;
          }

          setSimDirection(newDirection);

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const width = canvas.width;
              const height = canvas.height;

              const syntheticLandmarks: LandmarkPoint[] = [];
              for (let i = 0; i <= 32; i++) {
                syntheticLandmarks.push({ x: 0.5, y: 0.5, visibility: 0.95 });
              }

              // Head & Torso
              syntheticLandmarks[LANDMARK_INDEX.NOSE] = { x: 0.5, y: 0.2, visibility: 0.95 };
              syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.42, y: 0.32, visibility: 0.95 };
              syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.58, y: 0.32, visibility: 0.95 };

              const norm = (180 - next) / 100;

              if (selectedExercise === 'squats') {
                const hipY = 0.52 + norm * 0.14;
                const kneeY = 0.72 + norm * 0.05;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.44, y: hipY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.56, y: hipY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.42, y: kneeY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: 0.58, y: kneeY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.43, y: 0.9, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.57, y: 0.9, visibility: 0.95 };
              } else if (selectedExercise === 'pushups') {
                const elbowY = 0.4 + norm * 0.12;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.35, y: elbowY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ELBOW] = { x: 0.65, y: elbowY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: 0.35, y: 0.6, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: 0.65, y: 0.6, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.44, y: 0.52, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.56, y: 0.52, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.43, y: 0.75, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.57, y: 0.75, visibility: 0.95 };
              } else if (selectedExercise === 'jumpingJacks') {
                const armAngleNorm = (next - 40) / 100;
                const armY = 0.32 - armAngleNorm * 0.2;
                const armXLeft = 0.42 - armAngleNorm * 0.18;
                const armXRight = 0.58 + armAngleNorm * 0.18;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: armXLeft, y: armY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: armXRight, y: armY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.45, y: 0.52, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.55, y: 0.52, visibility: 0.95 };
                const legSpread = armAngleNorm * 0.12;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.45 - legSpread, y: 0.88, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.55 + legSpread, y: 0.88, visibility: 0.95 };
              } else if (selectedExercise === 'lunges') {
                const frontKneeY = 0.68 + norm * 0.08;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.45, y: 0.52, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.55, y: 0.52, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.42, y: frontKneeY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: 0.58, y: 0.75, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.42, y: 0.88, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.62, y: 0.88, visibility: 0.95 };
              } else {
                // Plank
                const sagY = 0.5 + (next / 30) * 0.1;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.48, y: sagY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.52, y: sagY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.35, y: 0.7, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.65, y: 0.7, visibility: 0.95 };
              }

              const evalResult = evaluateExerciseLandmarks(
                selectedExerciseRef.current,
                syntheticLandmarks,
                currentStageRef.current
              );

              drawPoseFrame(
                ctx,
                width,
                height,
                syntheticLandmarks,
                evalResult.formFaults || []
              );

              handleTelemetry(evalResult);
            }
          }

          return next;
        });
      }, 70);
    }
    return () => clearInterval(interval);
  }, [viewState, simDirection, selectedExercise, handleTelemetry, drawPoseFrame]);

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-[#090d16] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
      
      {/* 1. Underlying Mirrored Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-500 ${
          viewState === 'active' ? 'opacity-90' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 2. Skeletal Canvas Overlay */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 transition-opacity duration-300 ${
          viewState === 'active' || viewState === 'simulating' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 3. Sleek Minimalist Idle State */}
      {viewState === 'idle' && (
        <div className="relative z-20 flex flex-col items-center text-center p-6 max-w-md mx-auto animate-in fade-in zoom-in-95 duration-300">
          <div className="relative mb-5 group">
            <div className="w-20 h-20 rounded-3xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-center shadow-xl shadow-emerald-500/10 group-hover:scale-105 transition-all">
              <Camera className="w-9 h-9 text-emerald-400 stroke-[1.75]" />
            </div>
            <div className="absolute -inset-1 rounded-3xl bg-emerald-500/20 blur-xl opacity-60 pointer-events-none" />
          </div>

          <h3 className="text-xl font-black text-white tracking-tight mb-1.5">
            AI Pose Detection Ready
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Client-side MediaPipe biometric tracking. 100% on-device inference with zero latency and complete dorm privacy.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
            <button
              onClick={startCamera}
              className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>Enable Camera</span>
            </button>

            <button
              onClick={startSimulation}
              className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>Auto Simulate</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Requesting Camera Access State */}
      {viewState === 'requesting' && (
        <div className="relative z-20 flex flex-col items-center text-center p-6 animate-in fade-in duration-200">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
          <p className="text-sm font-bold text-white">Accessing Camera Stream...</p>
          <p className="text-xs text-slate-400 mt-1">Please allow camera permissions if prompted.</p>
        </div>
      )}

      {/* 5. Error & Fallback Recovery State */}
      {viewState === 'error' && (
        <div className="relative z-20 flex flex-col items-center text-center p-6 max-w-sm mx-auto animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
            <AlertCircle className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-white mb-1">Camera Notice</p>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">{errorMessage}</p>

          <div className="flex items-center space-x-2 w-full">
            <button
              onClick={startCamera}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center justify-center space-x-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              onClick={startSimulation}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Use Simulator</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Active Viewport HUD & Controls */}
      {(viewState === 'active' || viewState === 'simulating') && (
        <>
          {/* Top HUD Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            
            {/* Tracking Status Pill */}
            <div className="pointer-events-auto flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${viewState === 'simulating' ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400 animate-ping'}`} />
              <span className="text-white">
                {viewState === 'simulating' ? 'Interactive Simulation' : 'Live Pose Tracking'}
              </span>
              {viewState === 'active' && (
                <span className="text-[10px] text-slate-400 pl-1 border-l border-slate-800">
                  {isInFrame ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 inline" /> In Frame
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <UserX className="w-3 h-3 inline" /> Step Back
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Viewport Control Buttons */}
            <div className="pointer-events-auto flex items-center space-x-2">
              <button
                onClick={() => {
                  stopCamera();
                  setViewState('idle');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold text-slate-300 hover:text-rose-400 flex items-center space-x-1.5 transition-all"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            </div>

          </div>

          {/* Simulation Fine Control Slider */}
          {viewState === 'simulating' && (
            <div className="absolute bottom-4 left-4 right-4 z-20 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 flex items-center justify-between gap-3 animate-in fade-in">
              <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1 shrink-0">
                <Sliders className="w-3.5 h-3.5" />
                Auto-Cycling Kinematics:
              </span>
              <div className="flex-1 flex items-center space-x-2">
                <span className="text-[10px] text-slate-400">Flexion</span>
                <input
                  type="range"
                  min="60"
                  max="170"
                  value={simAngle}
                  onChange={(e) => setSimAngle(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="text-xs font-bold text-white w-10 text-right">{simAngle}°</span>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
