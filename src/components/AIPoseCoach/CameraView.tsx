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
  evaluateExerciseLandmarks,
  smoothLandmarksEMA,
  repEngine
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
  const prevLandmarksRef = useRef<LandmarkPoint[] | null>(null);

  // Viewport State Machine
  const [viewState, setViewState] = useState<ViewportState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInFrame, setIsInFrame] = useState(false);

  // Simulation controls
  const [simDirection, setSimDirection] = useState<1 | -1>(-1);
  const [simAngle, setSimAngle] = useState(160);
  const simDwellFramesRef = useRef(0);

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

  // Draw dynamic skeletal overlay with neon glow, offending joint highlight, and floating tooltip badges
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

      // 1. Draw Vector Skeleton Lines with Neon Glow for all detected movements
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
        ctx.lineWidth = isFaulty ? 6 : 4;
        ctx.strokeStyle = strokeColor;
        ctx.lineCap = 'round';
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = isFaulty ? 14 : 10;
        ctx.stroke();
        ctx.restore();
      });

      // 2. Draw Landmark Joint Nodes with Radial Glow
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
        // Outer glowing node
        ctx.beginPath();
        ctx.arc(screenX, screenY, isFaulty ? 9 : 7, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = isFaulty ? 16 : 10;
        ctx.fill();

        // Inner solid white core
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      });

      // 3. Render Floating Contextual Tooltip Badges Near Offending Joints
      formFaults.forEach((fault) => {
        const screenX = (1 - fault.x) * width;
        const screenY = fault.y * height;

        ctx.save();
        ctx.font = 'bold 13px Inter, -apple-system, sans-serif';
        const text = `⚠️ ${fault.message}`;
        const textMetrics = ctx.measureText(text);
        const paddingX = 12;
        const paddingY = 8;
        const boxWidth = textMetrics.width + paddingX * 2;
        const boxHeight = 32;

        const boxX = Math.min(Math.max(screenX + 16, 12), width - boxWidth - 12);
        const boxY = Math.min(Math.max(screenY - 16, 32), height - boxHeight - 12);

        // Glowing red/amber badge shadow
        ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.96)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        ctx.fill();
        ctx.stroke();

        // Badge label text
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, boxX + paddingX, boxY + 21);
        ctx.restore();
      });
    },
    []
  );

  // Start Live Webcam Stream with MediaPipe Hookup
  const startCamera = async () => {
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
            if (!isRunningRef.current) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = canvas.width;
            const height = canvas.height;

            if (results.poseLandmarks && results.poseLandmarks.length > 0) {
              // 1. Exponential Moving Average (EMA) Landmark Smoothing
              const smoothed = smoothLandmarksEMA(
                results.poseLandmarks,
                prevLandmarksRef.current,
                0.6
              );
              prevLandmarksRef.current = smoothed;

              // 2. Exercise State Machine & Angle Calculation
              const evalResult = evaluateExerciseLandmarks(
                selectedExerciseRef.current,
                smoothed,
                currentStageRef.current
              );

              setIsInFrame(evalResult.inFrame);

              // 3. Dynamic Vector Skeleton & Tooltip Overlay
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
    repEngine.reset(selectedExercise);
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
            if (simDirection === -1 && prev <= 84) {
              // Dwell at bottom depth for 5 frames (~350ms >= 300ms)
              simDwellFramesRef.current++;
              if (simDwellFramesRef.current >= 5) {
                newDirection = 1;
                simDwellFramesRef.current = 0;
              }
              next = 82;
            } else if (simDirection === 1 && prev >= 165) {
              newDirection = -1;
              next = 165;
            } else {
              next = prev + simDirection * 4;
            }
          } else if (selectedExercise === 'pushups') {
            if (simDirection === -1 && prev <= 82) {
              simDwellFramesRef.current++;
              if (simDwellFramesRef.current >= 5) {
                newDirection = 1;
                simDwellFramesRef.current = 0;
              }
              next = 80;
            } else if (simDirection === 1 && prev >= 162) {
              newDirection = -1;
              next = 162;
            } else {
              next = prev + simDirection * 4;
            }
          } else if (selectedExercise === 'jumpingJacks') {
            if (simDirection === 1 && prev >= 142) {
              simDwellFramesRef.current++;
              if (simDwellFramesRef.current >= 4) {
                newDirection = -1;
                simDwellFramesRef.current = 0;
              }
              next = 145;
            } else if (simDirection === -1 && prev <= 38) {
              newDirection = 1;
              next = 38;
            } else {
              next = prev + simDirection * 6;
            }
          } else {
            // Plank: maintains rock-solid alignment (2-4° deviation)
            next = 3;
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

              if (selectedExercise === 'squats') {
                // Standing: 165°, Deep Squat: 82°
                const t = Math.max(0, Math.min(1, (165 - next) / (165 - 82)));
                
                // Head & Spine
                syntheticLandmarks[LANDMARK_INDEX.NOSE] = { x: 0.44 - t * 0.03, y: 0.18 + t * 0.10, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.44 - t * 0.04, y: 0.28 + t * 0.10, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.52 - t * 0.04, y: 0.28 + t * 0.10, visibility: 0.95 };
                
                // Hips hinge down and back; knees track forward over feet
                const hipX = 0.46 - t * 0.09;
                const hipY = 0.48 + t * 0.19;
                const kneeX = 0.48 + t * 0.07;
                const kneeY = 0.69 + t * 0.02;
                const ankleX = 0.48;
                const ankleY = 0.90;

                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: hipX, y: hipY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: hipX + 0.06, y: hipY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: kneeX, y: kneeY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: kneeX + 0.06, y: kneeY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: ankleX, y: ankleY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: ankleX + 0.06, y: ankleY, visibility: 0.95 };

                // Arms out for counterbalance
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.56, y: 0.32 + t * 0.05, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ELBOW] = { x: 0.62, y: 0.32 + t * 0.05, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: 0.66, y: 0.32 + t * 0.05, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: 0.72, y: 0.32 + t * 0.05, visibility: 0.95 };
              } else if (selectedExercise === 'pushups') {
                // Lockout: 162°, Bottom chest press: 80°
                const t = Math.max(0, Math.min(1, (162 - next) / (162 - 80)));
                
                // Hands planted firmly on floor
                const wristX = 0.30;
                const wristY = 0.68;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: wristX, y: wristY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: wristX + 0.06, y: wristY, visibility: 0.95 };

                // Elbows bend back at 90°
                const elbowX = 0.30 - t * 0.12;
                const elbowY = 0.52 + t * 0.06;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ELBOW] = { x: elbowX, y: elbowY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ELBOW] = { x: elbowX + 0.06, y: elbowY, visibility: 0.95 };

                // Torso & Shoulders descend parallel with rigid core
                const shoulderX = 0.30;
                const shoulderY = 0.38 + t * 0.18;
                syntheticLandmarks[LANDMARK_INDEX.NOSE] = { x: 0.22, y: shoulderY - 0.05, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: shoulderX + 0.06, y: shoulderY, visibility: 0.95 };

                const hipX = 0.56;
                const hipY = 0.46 + t * 0.16;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: hipX, y: hipY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: hipX + 0.06, y: hipY, visibility: 0.95 };

                const ankleX = 0.84;
                const ankleY = 0.64;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.70, y: 0.55 + t * 0.08, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: 0.74, y: 0.55 + t * 0.08, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: ankleX, y: ankleY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: ankleX + 0.04, y: ankleY, visibility: 0.95 };
              } else if (selectedExercise === 'jumpingJacks') {
                // Down: 38°, Up: 145°
                const t = Math.max(0, Math.min(1, (next - 38) / (145 - 38)));
                
                syntheticLandmarks[LANDMARK_INDEX.NOSE] = { x: 0.50, y: 0.18, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.44, y: 0.30, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.56, y: 0.30, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.46, y: 0.52, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.54, y: 0.52, visibility: 0.95 };

                // Arms sweep from sides (0.40, 0.58) to overhead (0.38, 0.14)
                const leftWristX = 0.40 - t * 0.04;
                const leftWristY = 0.58 - t * 0.44;
                const rightWristX = 0.60 + t * 0.04;
                const rightWristY = 0.58 - t * 0.44;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.42 - t * 0.10, y: 0.44 - t * 0.22, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ELBOW] = { x: 0.58 + t * 0.10, y: 0.44 - t * 0.22, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: leftWristX, y: leftWristY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: rightWristX, y: rightWristY, visibility: 0.95 };

                // Feet jump from together to shoulder-width apart
                const legSpread = t * 0.14;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.46 - legSpread * 0.6, y: 0.70, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: 0.54 + legSpread * 0.6, y: 0.70, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.47 - legSpread, y: 0.88, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.53 + legSpread, y: 0.88, visibility: 0.95 };
              } else if (selectedExercise === 'lunges') {
                // Standing tall: 165°, Deep 90° lunge: 82°
                const t = Math.max(0, Math.min(1, (165 - next) / (165 - 82)));
                
                syntheticLandmarks[LANDMARK_INDEX.NOSE] = { x: 0.44, y: 0.20 + t * 0.08, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.44, y: 0.30 + t * 0.08, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.50, y: 0.30 + t * 0.08, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.44, y: 0.50 + t * 0.10, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.50, y: 0.50 + t * 0.10, visibility: 0.95 };

                // Front leg steps forward into 90° flexion
                const frontKneeX = 0.46 - t * 0.12;
                const frontKneeY = 0.69 + t * 0.04;
                const frontAnkleX = 0.46 - t * 0.12;
                const frontAnkleY = 0.88;
                syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: frontKneeX, y: frontKneeY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: frontAnkleX, y: frontAnkleY, visibility: 0.95 };

                // Back leg extends back with knee hovering off floor
                const backKneeX = 0.52 + t * 0.08;
                const backKneeY = 0.69 + t * 0.12;
                const backAnkleX = 0.52 + t * 0.18;
                const backAnkleY = 0.88;
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: backKneeX, y: backKneeY, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: backAnkleX, y: backAnkleY, visibility: 0.95 };
              } else {
                // Rock-Solid Forearm Plank: straight bodyline from shoulder to ankle
                syntheticLandmarks[LANDMARK_INDEX.NOSE] = { x: 0.22, y: 0.44, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.30, y: 0.48, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.34, y: 0.48, visibility: 0.95 };
                
                // Forearms supporting weight
                syntheticLandmarks[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.30, y: 0.64, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_ELBOW] = { x: 0.34, y: 0.64, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: 0.38, y: 0.64, visibility: 0.95 };
                syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: 0.42, y: 0.64, visibility: 0.95 };

                // Rigid plank core
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

      {/* Step back to fit in frame overlay when user is out of frame or confidence <= 0.65 */}
      {viewState === 'active' && !isInFrame && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] pointer-events-none animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5 px-5 py-3 rounded-2xl bg-amber-500 text-black font-extrabold text-sm shadow-2xl shadow-amber-500/30 border border-amber-300 animate-pulse">
            <UserX className="w-5 h-5 stroke-[2.5]" />
            <span>Step back to fit in frame</span>
          </div>
          <p className="text-xs text-amber-200 font-medium mt-2 bg-slate-900/90 px-3 py-1 rounded-full border border-amber-500/20">
            Full body &amp; active joints must be visible (Confidence &gt; 65%)
          </p>
        </div>
      )}

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
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <UserCheck className="w-3 h-3 inline" /> In Frame (&gt;65%)
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-bold animate-pulse">
                      <UserX className="w-3 h-3 inline" /> Step back to fit in frame
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
