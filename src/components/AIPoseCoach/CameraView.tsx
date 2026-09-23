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
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  RotateCcw,
  Plus
} from 'lucide-react';
import {
  LANDMARK_INDEX,
  evaluateExerciseLandmarks,
  smoothLandmarksEMA,
  repEngine,
  getPlankAlignmentMetrics
} from './AngleMath';
import { useWorkout } from '@/context/WorkoutContext';
import { FormFault, LandmarkPoint } from '@/types/fitness';
import { EXERCISE_CATALOG } from '@/data/exercises';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type ViewportState = 'idle' | 'requesting' | 'active' | 'simulating' | 'error';

import { FramePumpController } from './FramePumpController';
export { FramePumpController };

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

const COLOR_GOOD = '#22c55e'; // Neon Lime/Emerald
const COLOR_FAULT = '#ef4444'; // Crimson Red

interface CameraViewProps {
  onBack?: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ onBack }) => {
  const {
    selectedExercise,
    currentStage,
    handleTelemetry,
    setIsTracking,
    sessionReps,
    targetReps,
    liveAngle,
    activeFaults,
    isGoodForm,
    soundEnabled,
    toggleSound,
    toggleVoiceCoach,
    recordRep,
    resetSession,
    setTargetReps
  } = useWorkout();

  const config = EXERCISE_CATALOG[selectedExercise];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const prevLandmarksRef = useRef<LandmarkPoint[] | null>(null);

  // Viewport State Machine
  const [viewState, setViewState] = useState<ViewportState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInFrame, setIsInFrame] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Simulation controls
  const [simDirection, setSimDirection] = useState<1 | -1>(-1);
  const [simAngle, setSimAngle] = useState(160);
  const simDwellFramesRef = useRef(0);

  // Synchronize pause ref
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Keep ref synchronized to avoid stale state in callback
  const selectedExerciseRef = useRef(selectedExercise);
  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
    repEngine.reset(selectedExercise);
    prevLandmarksRef.current = null;
    setIsInFrame(false);
  }, [selectedExercise]);

  const currentStageRef = useRef(currentStage);
  useEffect(() => {
    currentStageRef.current = currentStage;
  }, [currentStage]);

  // Clean shutdown helper
  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);
    prevLandmarksRef.current = null;
    setIsInFrame(false);
    repEngine.reset(selectedExerciseRef.current);
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

  // Draw dynamic skeletal overlay with neon glow
  const drawPoseFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      landmarks: LandmarkPoint[],
      formFaults: FormFault[],
      inFrame: boolean
    ) => {
      ctx.clearRect(0, 0, width, height);

      const faultyJointNames = new Set(formFaults.map((f) => f.joint.toLowerCase()));

      // 1. Draw Vector Skeleton Lines
      SKELETON_CONNECTIONS.forEach(([idxA, idxB]) => {
        const ptA = landmarks[idxA];
        const ptB = landmarks[idxB];
        if (!ptA || !ptB) return;
        if ((ptA.visibility ?? 1) < 0.20 || (ptB.visibility ?? 1) < 0.20) return;

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

        ctx.save();
        ctx.beginPath();
        // Mirror x coordinates to match mirrored video (-scale-x-100)
        ctx.moveTo((1 - ptA.x) * width, ptA.y * height);
        ctx.lineTo((1 - ptB.x) * width, ptB.y * height);
        ctx.lineWidth = isFaulty ? 5 : 4;
        ctx.strokeStyle = strokeColor;
        ctx.lineCap = 'round';
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = isFaulty ? 12 : 8;
        ctx.stroke();
        ctx.restore();
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
        if (!pt || (pt.visibility ?? 1) < 0.20) return;

        const isFaulty = faultyJointNames.has(name);
        const screenX = (1 - pt.x) * width;
        const screenY = pt.y * height;
        const nodeColor = isFaulty ? COLOR_FAULT : COLOR_GOOD;

        ctx.save();
        ctx.beginPath();
        ctx.arc(screenX, screenY, isFaulty ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = isFaulty ? 14 : 8;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      });
    },
    []
  );

  // Start Live Webcam Stream with MediaPipe Hookup
  const startCamera = async () => {
    stopCamera();
    repEngine.reset(selectedExerciseRef.current);
    prevLandmarksRef.current = null;
    setIsInFrame(false);
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
            minDetectionConfidence: 0.35,
            minTrackingConfidence: 0.35
          });

          pose.onResults((results: any) => {
            if (!isRunningRef.current || isPausedRef.current) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = canvas.width;
            const height = canvas.height;

            if (results.poseLandmarks && results.poseLandmarks.length > 0) {
              const smoothed = smoothLandmarksEMA(
                results.poseLandmarks,
                prevLandmarksRef.current,
                0.6
              );
              prevLandmarksRef.current = smoothed;

              const evalResult = evaluateExerciseLandmarks(
                selectedExerciseRef.current,
                smoothed,
                currentStageRef.current
              );

              setIsInFrame(evalResult.inFrame);

              drawPoseFrame(
                ctx,
                width,
                height,
                smoothed,
                evalResult.formFaults || [],
                evalResult.inFrame
              );

              handleTelemetry(evalResult);
            } else {
              prevLandmarksRef.current = null;
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

      const pumpFrame = async () => {
        if (!isRunningRef.current) return;
        if (
          !isPausedRef.current &&
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          poseRef.current
        ) {
          try {
            await poseRef.current.send({ image: videoRef.current });
          } catch (poseSendErr) {
            if (isRunningRef.current) {
              console.warn('Pose processing frame skipped:', poseSendErr);
            }
          }
        }
        if (isRunningRef.current) {
          animFrameRef.current = requestAnimationFrame(pumpFrame);
        } else {
          animFrameRef.current = null;
        }
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

  const startSimulation = () => {
    stopCamera();
    repEngine.reset(selectedExercise);
    setViewState('simulating');
    setIsInFrame(true);
    setIsTracking(true);
  };

  // Synthetic Landmark Generator for Simulation Mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (viewState === 'simulating' && !isPaused) {
      interval = setInterval(() => {
        setSimAngle((prev) => {
          let next = prev;
          let newDirection = simDirection;

          if (selectedExercise === 'squats' || selectedExercise === 'lunges') {
            if (simDirection === -1 && prev <= 84) {
              simDwellFramesRef.current++;
              if (simDwellFramesRef.current >= 5) {
                newDirection = 1;
                simDwellFramesRef.current = 0;
              }
              next = 82;
            } else if (simDirection === 1 && prev >= 165) {
              newDirection = -1;
              next = 164;
            } else {
              next = prev + (simDirection === -1 ? -5 : 5);
            }
          } else if (selectedExercise === 'pushups') {
            if (simDirection === -1 && prev <= 80) {
              newDirection = 1;
              next = 82;
            } else if (simDirection === 1 && prev >= 165) {
              newDirection = -1;
              next = 163;
            } else {
              next = prev + (simDirection === -1 ? -5 : 5);
            }
          } else if (selectedExercise === 'jumpingJacks') {
            if (simDirection === 1 && prev >= 115) {
              newDirection = -1;
              next = 113;
            } else if (simDirection === -1 && prev <= 55) {
              newDirection = 1;
              next = 58;
            } else {
              next = prev + (simDirection === 1 ? 5 : -5);
            }
          } else {
            next = 180;
          }

          setSimDirection(newDirection);

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const width = canvas.width;
              const height = canvas.height;
              const syntheticLandmarks: LandmarkPoint[] = Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, visibility: 0.95 }));

              if (selectedExercise === 'squats') {
                const normAngle = Math.max(80, Math.min(165, next));
                const t = (165 - normAngle) / (165 - 80);
                const hipY = 0.52 + t * 0.16;
                const kneeY = 0.68 + t * 0.05;
                const ankleY = 0.88;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.46, y: hipY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.54, y: hipY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.44 - t * 0.04, y: kneeY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: 0.56 + t * 0.04, y: kneeY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.44, y: ankleY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.56, y: ankleY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.46, y: hipY - 0.22, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.54, y: hipY - 0.22, visibility: 0.95 };
              } else if (selectedExercise === 'pushups') {
                const normAngle = Math.max(80, Math.min(165, next));
                const t = (165 - normAngle) / (165 - 80);
                const chestY = 0.45 + t * 0.16;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.42, y: chestY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.58, y: chestY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.36 - t * 0.06, y: chestY + 0.05, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ELBOW] = { x: 0.64 + t * 0.06, y: chestY + 0.05, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: 0.38, y: 0.70, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: 0.62, y: 0.70, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.44, y: chestY + 0.15, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.56, y: chestY + 0.15, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.45, y: 0.75, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: 0.55, y: 0.75, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.45, y: 0.88, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.55, y: 0.88, visibility: 0.95 };
              } else if (selectedExercise === 'jumpingJacks') {
                const armRad = ((180 - next) * Math.PI) / 180;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.46, y: 0.35, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.54, y: 0.35, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = {
                  x: 0.46 - Math.cos(armRad) * 0.22,
                  y: 0.35 - Math.sin(armRad) * 0.22,
                  visibility: 0.95
                };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = {
                  x: 0.54 + Math.cos(armRad) * 0.22,
                  y: 0.35 - Math.sin(armRad) * 0.22,
                  visibility: 0.95
                };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.47, y: 0.55, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.53, y: 0.55, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.43, y: 0.88, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.57, y: 0.88, visibility: 0.95 };
              } else if (selectedExercise === 'lunges') {
                const normAngle = Math.max(80, Math.min(165, next));
                const t = (165 - normAngle) / (165 - 80);
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.48, y: 0.52 + t * 0.12, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.52, y: 0.52 + t * 0.12, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.46 - t * 0.12, y: 0.69 + t * 0.04, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.46 - t * 0.12, y: 0.88, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: 0.52 + t * 0.08, y: 0.69 + t * 0.12, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.52 + t * 0.18, y: 0.88, visibility: 0.95 };
              } else {
                syntheticLandmarks[LANDMARK_INDEX.NOSE] = { x: 0.22, y: 0.44, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.30, y: 0.48, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.34, y: 0.48, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.30, y: 0.64, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ELBOW] = { x: 0.34, y: 0.64, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: 0.38, y: 0.64, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: 0.42, y: 0.64, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.56, y: 0.52, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.60, y: 0.52, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.70, y: 0.54, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: 0.74, y: 0.54, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.84, y: 0.56, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.88, y: 0.56, visibility: 0.95 };
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
                evalResult.formFaults || [],
                true
              );

              handleTelemetry(evalResult);
            }
          }

          return next;
        });
      }, 70);
    }
    return () => clearInterval(interval);
  }, [viewState, isPaused, simDirection, selectedExercise, handleTelemetry, drawPoseFrame]);

  // Plank Alignment calculations
  const plankDeviationThreshold = config.formThresholds?.maxDeviation ?? 15;
  const plankMetrics = getPlankAlignmentMetrics(liveAngle, plankDeviationThreshold);

  // Form Feedback Presentation
  const isPlank = config.isHoldExercise;
  const isComplete = sessionReps >= targetReps && targetReps > 0;

  // Toggle Pause
  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Stop workout session
  const handleStop = () => {
    stopCamera();
    setViewState('idle');
    if (onBack) onBack();
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* 1. TOP BAR: Back + Exercise Name + Set/Exercise Info */}
      <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-surface border border-border-subtle shadow-md">
        <div className="flex items-center space-x-3 min-w-0">
          {onBack && (
            <button
              onClick={handleStop}
              aria-label="Back to workout discovery"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border-subtle text-text-secondary hover:text-text-primary flex items-center space-x-1.5 transition-all text-xs font-bold shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary-bright shadow-[0_0_8px_rgba(74,123,255,0.7)]" />
              <h1 className="text-base sm:text-xl font-black text-text-primary tracking-tight truncate">
                {config.name}
              </h1>
            </div>
            <p className="text-xs text-text-secondary truncate mt-0.5">
              Set 1 • Target: <span className="font-bold text-text-primary">{targetReps} {config.metricUnit}</span> • {config.targetMuscles}
            </p>
          </div>
        </div>

        {/* Live Audio & Reset Shortcuts */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => {
              toggleSound();
              toggleVoiceCoach();
            }}
            title={soundEnabled ? 'Mute Voice & Audio' : 'Unmute Voice & Audio'}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-primary/10 border-primary/30 text-primary-bright hover:bg-primary/20'
                : 'bg-surface-elevated border-border-subtle text-text-muted hover:text-text-primary'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={resetSession}
            title="Reset Current Reps"
            className="p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-text-primary transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. DOMINANT CAMERA VIEWPORT WITH HUD OVERLAYS */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:min-h-[520px] bg-[#080F19] rounded-3xl overflow-hidden border border-border-subtle shadow-2xl flex flex-col items-center justify-center">
        
        {/* Underlying Mirrored Video Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-500 ${
            viewState === 'active' ? 'opacity-90' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Skeletal Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 transition-opacity duration-300 ${
            viewState === 'active' || viewState === 'simulating' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* FLOATING HUD OVERLAYS (Stage + Reps) */}
        {(viewState === 'active' || viewState === 'simulating') && (
          <div className="absolute top-4 left-4 z-20 flex flex-col sm:flex-row gap-2.5 pointer-events-none">
            {/* Stage Card */}
            <div className="px-4 py-2 rounded-2xl bg-surface/85 backdrop-blur-md border border-border-subtle shadow-xl flex flex-col min-w-[90px]">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-text-muted">
                Stage
              </span>
              <span className="text-xl sm:text-2xl font-black text-text-primary capitalize leading-tight">
                {isPlank ? (plankMetrics.isGoodAlignment ? 'Hold' : 'Adjust') : currentStage}
              </span>
            </div>

            {/* Reps / Hold Time Card */}
            <div className="px-4 py-2 rounded-2xl bg-surface/85 backdrop-blur-md border border-border-subtle shadow-xl flex flex-col min-w-[110px]">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-text-muted">
                {isPlank ? 'Hold Time' : 'Reps'}
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl sm:text-2xl font-black text-primary-bright leading-tight">
                  {sessionReps}
                </span>
                <span className="text-xs font-bold text-text-muted">
                  / {targetReps} {isPlank ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TOP RIGHT TRACKING STATUS PILL */}
        {(viewState === 'active' || viewState === 'simulating') && (
          <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-surface/85 backdrop-blur-md border border-border-subtle text-xs font-semibold shadow-xl">
              <span
                className={`w-2 h-2 rounded-full ${
                  viewState === 'simulating'
                    ? 'bg-accent animate-pulse'
                    : isInFrame
                    ? 'bg-success animate-ping'
                    : 'bg-warning animate-pulse'
                }`}
              />
              <span className="text-text-primary text-[11px] font-bold">
                {viewState === 'simulating'
                  ? 'Simulator Active'
                  : isInFrame
                  ? 'Good Tracking'
                  : 'Adjust Position'}
              </span>
            </div>
          </div>
        )}

        {/* 8 TRACKING PRESENTATION STATES */}

        {/* State 1: Camera Permission / Onboarding (Idle) */}
        {viewState === 'idle' && (
          <div className="relative z-20 flex flex-col items-center text-center p-6 max-w-md mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mb-5 group">
              <div className="w-20 h-20 rounded-3xl bg-surface-elevated border border-primary/40 flex items-center justify-center shadow-xl shadow-primary/10 group-hover:scale-105 transition-all">
                <Camera className="w-9 h-9 text-primary-bright stroke-[1.75]" />
              </div>
              <div className="absolute -inset-1 rounded-3xl bg-primary/20 blur-xl opacity-60 pointer-events-none" />
            </div>

            <h2 className="text-xl font-black text-text-primary tracking-tight mb-1.5">
              Ready for AI Coaching
            </h2>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              Camera access is analyzed 100% on your device with zero video storage or streaming. Maintain dorm room privacy while getting real-time form guidance.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <Button
                variant="primary"
                size="lg"
                onClick={startCamera}
                className="w-full sm:flex-1 py-3.5 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 rounded-2xl"
              >
                <Camera className="w-4 h-4 stroke-[2.5]" />
                <span>Enable Camera</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={startSimulation}
                className="w-full sm:flex-1 py-3.5 font-bold text-xs flex items-center justify-center space-x-2 rounded-2xl"
              >
                <Play className="w-3.5 h-3.5 text-accent fill-accent" />
                <span>Auto Simulate</span>
              </Button>
            </div>
          </div>
        )}

        {/* State 2: Camera Loading */}
        {viewState === 'requesting' && (
          <div className="relative z-20 flex flex-col items-center text-center p-6 animate-in fade-in duration-200">
            <Loader2 className="w-12 h-12 text-primary-bright animate-spin mb-3" />
            <h3 className="text-base font-black text-text-primary">Connecting Camera...</h3>
            <p className="text-xs text-text-secondary mt-1">
              Initializing on-device biometric posture tracking.
            </p>
          </div>
        )}

        {/* State 5: Low-Confidence Tracking (Poor visibility banner with actionable language) */}
        {viewState === 'active' && !isInFrame && (
          <div className="absolute inset-x-4 top-20 z-20 mx-auto max-w-md p-4 rounded-2xl bg-warning/95 backdrop-blur-md text-black shadow-2xl border border-amber-300 animate-in fade-in duration-200 pointer-events-none">
            <div className="flex items-center space-x-2 font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-black stroke-[2.5] shrink-0" />
              <span>Camera Not Tracking Well</span>
            </div>
            <p className="text-xs font-semibold text-black/90 mt-1 leading-snug">
              Try repositioning the camera or move into better lighting. Make sure your full body and active joints are in clear view.
            </p>
          </div>
        )}

        {/* State 6 & 8: Camera Unavailable / Error */}
        {viewState === 'error' && (
          <div className="relative z-20 flex flex-col items-center text-center p-6 max-w-sm mx-auto animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-text-primary mb-1">Camera Unavailable</h3>
            <p className="text-xs text-text-secondary mb-5 leading-relaxed">
              {errorMessage || 'Unable to access your webcam. Check browser permissions or practice with the Interactive Simulator.'}
            </p>

            <div className="flex items-center space-x-2 w-full">
              <Button
                variant="outline"
                size="md"
                onClick={startCamera}
                className="flex-1 py-2.5 font-bold text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span>Retry</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={startSimulation}
                className="flex-1 py-2.5 font-bold text-xs"
              >
                <Sliders className="w-3.5 h-3.5 mr-1" />
                <span>Use Simulator</span>
              </Button>
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="px-5 py-3 rounded-2xl bg-surface border border-border-subtle shadow-2xl flex flex-col items-center text-center">
              <Pause className="w-8 h-8 text-primary-bright mb-2" />
              <p className="text-base font-black text-text-primary">Session Paused</p>
              <p className="text-xs text-text-secondary mt-0.5 mb-3">Camera is active. Tap resume when ready.</p>
              <Button
                variant="primary"
                size="md"
                onClick={togglePause}
                className="px-6 py-2.5 font-bold text-xs"
              >
                <Play className="w-4 h-4 mr-1.5" />
                <span>Resume Tracking</span>
              </Button>
            </div>
          </div>
        )}

        {/* State 7: Exercise Complete Celebration Overlay */}
        {isComplete && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-success/20 border border-success/40 flex items-center justify-center text-success mb-3 shadow-xl shadow-success/20 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">Set Complete! 🎉</h3>
            <p className="text-sm text-text-secondary mt-1 text-center max-w-xs">
              Great work! You reached your goal of {targetReps} {config.metricUnit} with strong biomechanics.
            </p>

            <div className="flex items-center gap-3 mt-5">
              <Button
                variant="primary"
                size="md"
                onClick={() => setTargetReps(targetReps + config.defaultTarget)}
                className="font-bold text-xs px-5 py-2.5"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span>Next Set (+{config.defaultTarget})</span>
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={handleStop}
                className="font-bold text-xs px-5 py-2.5"
              >
                <span>Finish Session</span>
              </Button>
            </div>
          </div>
        )}

        {/* Simulation Slider Control Bar */}
        {viewState === 'simulating' && (
          <div className="absolute bottom-4 left-4 right-4 z-20 p-3 rounded-2xl bg-surface/90 backdrop-blur-md border border-border-subtle flex items-center justify-between gap-3 animate-in fade-in">
            <span className="text-[11px] font-bold text-accent flex items-center gap-1 shrink-0">
              <Sliders className="w-3.5 h-3.5" />
              Simulator Cycle:
            </span>
            <div className="flex-1 flex items-center space-x-2">
              <input
                type="range"
                min="60"
                max="170"
                value={simAngle}
                onChange={(e) => setSimAngle(Number(e.target.value))}
                className="w-full accent-primary-bright cursor-pointer h-1.5 bg-surface-elevated rounded-lg"
              />
              <span className="text-xs font-bold text-text-primary w-10 text-right">{simAngle}°</span>
            </div>
          </div>
        )}

      </div>

      {/* 3. BOTTOM FEEDBACK PANEL (GOOD FORM / GOOD ALIGNMENT / ADJUST POSITION) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-subtle shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3">
            {/* Status Pill Badge */}
            {isPlank ? (
              plankMetrics.isGoodAlignment ? (
                <div className="px-3 py-1.5 rounded-xl bg-success/15 border border-success/40 text-success text-xs font-black tracking-wide flex items-center space-x-1.5 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>GOOD ALIGNMENT</span>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-warning/15 border border-warning/40 text-warning text-xs font-black tracking-wide flex items-center space-x-1.5 shrink-0 animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  <span>ADJUST POSITION</span>
                </div>
              )
            ) : isGoodForm || activeFaults.length === 0 ? (
              <div className="px-3 py-1.5 rounded-xl bg-success/15 border border-success/40 text-success text-xs font-black tracking-wide flex items-center space-x-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span>GOOD FORM</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-danger/15 border border-danger/40 text-danger text-xs font-black tracking-wide flex items-center space-x-1.5 shrink-0">
                <AlertTriangle className="w-4 h-4" />
                <span>ADJUST FORM</span>
              </div>
            )}

            {/* Direct Feedback Guidance Sentence */}
            <p className="text-xs sm:text-sm font-semibold text-text-primary leading-snug">
              {isPlank
                ? plankMetrics.isGoodAlignment
                  ? 'Shoulders, hips, and ankles are in a straight horizontal line.'
                  : plankMetrics.deviation > 15
                  ? 'Bring your hips into a straight horizontal line to protect your lower back.'
                  : 'Hold steady and breathe smoothly throughout the hold.'
                : activeFaults.length > 0
                ? activeFaults[0].message
                : selectedExercise === 'squats'
                ? 'Keep your back straight and knees aligned over your toes.'
                : selectedExercise === 'pushups'
                ? 'Maintain a rigid spine line and press firmly through your palms.'
                : selectedExercise === 'lunges'
                ? 'Keep your torso upright and front knee directly above your ankle.'
                : 'Land softly on the balls of your feet and maintain a steady rhythm.'}
            </p>
          </div>

          {/* Quick Manual Rep Increment */}
          <button
            onClick={() => recordRep(isPlank ? 5 : 1)}
            className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border-subtle text-xs font-bold text-text-secondary hover:text-text-primary flex items-center space-x-1 transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isPlank ? '+5s Hold' : '+1 Manual Rep'}</span>
          </button>
        </div>
      </div>

      {/* 4. CONTROLS BAR WITH LARGE TOUCH TARGETS */}
      <div className="grid grid-cols-3 gap-3 p-2.5 sm:p-3 rounded-2xl bg-surface border border-border-subtle shadow-md">
        {/* Pause / Resume */}
        <Button
          size="lg"
          variant={isPaused ? 'primary' : 'outline'}
          onClick={togglePause}
          disabled={viewState !== 'active' && viewState !== 'simulating'}
          className="min-h-[48px] py-3 text-xs sm:text-sm font-black flex items-center justify-center space-x-2 rounded-xl"
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </Button>

        {/* Stop Workout */}
        <Button
          size="lg"
          variant="danger"
          onClick={handleStop}
          className="min-h-[48px] py-3 text-xs sm:text-sm font-black flex items-center justify-center space-x-2 rounded-xl"
        >
          <Square className="w-5 h-5" />
          <span>Stop</span>
        </Button>

        {/* Sound / Mute Toggle */}
        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            toggleSound();
            toggleVoiceCoach();
          }}
          className="min-h-[48px] py-3 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 rounded-xl"
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-primary-bright" />
          ) : (
            <VolumeX className="w-5 h-5 text-text-muted" />
          )}
          <span>{soundEnabled ? 'Audio On' : 'Muted'}</span>
        </Button>
      </div>
    </div>
  );
};
