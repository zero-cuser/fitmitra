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
  UserX
} from 'lucide-react';
import {
  LANDMARK_INDEX,
  evaluateExerciseLandmarks
} from './AngleMath';
import { coachVoice } from '../../utils/voiceCoach';

/**
 * CameraView Component with Real-Time MediaPipe Pose Detection
 * View States: 'idle' | 'requesting' | 'active' | 'simulating' | 'error'
 */
export const CameraView = ({
  exerciseKey = 'squats',
  onTelemetryUpdate,
  currentStage = 'up',
  setIsTracking
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const poseRef = useRef(null);
  const animFrameRef = useRef(null);
  const isRunningRef = useRef(false);

  // Viewport state machine: 'idle' | 'requesting' | 'active' | 'simulating' | 'error'
  const [viewState, setViewState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isInFrame, setIsInFrame] = useState(true);
  const [activeFormFaults, setActiveFormFaults] = useState([]);
  const [liveAngle, setLiveAngle] = useState(160);

  // Simulation state
  const [simulatedAngle, setSimulatedAngle] = useState(160);
  const [simDirection, setSimDirection] = useState(-1);

  // Keep latest props in refs for animation loop
  const exerciseKeyRef = useRef(exerciseKey);
  const currentStageRef = useRef(currentStage);

  useEffect(() => {
    exerciseKeyRef.current = exerciseKey;
    if (exerciseKey === 'jumpingJacks') {
      setSimulatedAngle(45);
      setSimDirection(1);
    } else if (exerciseKey === 'plank') {
      setSimulatedAngle(8);
      setSimDirection(1);
    } else {
      setSimulatedAngle(160);
      setSimDirection(-1);
    }
  }, [exerciseKey]);

  useEffect(() => {
    currentStageRef.current = currentStage;
  }, [currentStage]);

  // Clean stop of camera & pose detection
  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (poseRef.current) {
      try {
        poseRef.current.close();
      } catch (e) {
        // ignore close error
      }
      poseRef.current = null;
    }

    setViewState('idle');
    setErrorMessage(null);
    setIsInFrame(true);
    setActiveFormFaults([]);
    if (setIsTracking) setIsTracking(false);
  }, [setIsTracking]);

  // Render dynamic skeleton, joints, and floating form fault tooltips
  const drawPoseFrame = useCallback((ctx, width, height, landmarks, formFaults, isGoodForm, inFrame) => {
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || !inFrame) {
      return;
    }

    // Colors
    const COLOR_GOOD = '#10b981'; // Neon Emerald Green
    const COLOR_FAULT = '#ef4444'; // Crimson / Amber Red
    const COLOR_CYAN = '#06b6d4'; // Cyan highlights

    const faultyJointNames = new Set(formFaults.map((f) => f.joint));

    // Skeleton connections definition
    const SKELETON_CONNECTIONS = [
      // Upper Body
      { from: LANDMARK_INDEX.LEFT_SHOULDER, to: LANDMARK_INDEX.RIGHT_SHOULDER, jointGroup: 'shoulder' },
      { from: LANDMARK_INDEX.LEFT_SHOULDER, to: LANDMARK_INDEX.LEFT_ELBOW, jointGroup: 'elbow' },
      { from: LANDMARK_INDEX.LEFT_ELBOW, to: LANDMARK_INDEX.LEFT_WRIST, jointGroup: 'elbow' },
      { from: LANDMARK_INDEX.RIGHT_SHOULDER, to: LANDMARK_INDEX.RIGHT_ELBOW, jointGroup: 'elbow' },
      { from: LANDMARK_INDEX.RIGHT_ELBOW, to: LANDMARK_INDEX.RIGHT_WRIST, jointGroup: 'elbow' },
      // Torso
      { from: LANDMARK_INDEX.LEFT_SHOULDER, to: LANDMARK_INDEX.LEFT_HIP, jointGroup: 'hip' },
      { from: LANDMARK_INDEX.RIGHT_SHOULDER, to: LANDMARK_INDEX.RIGHT_HIP, jointGroup: 'hip' },
      { from: LANDMARK_INDEX.LEFT_HIP, to: LANDMARK_INDEX.RIGHT_HIP, jointGroup: 'hip' },
      // Lower Body
      { from: LANDMARK_INDEX.LEFT_HIP, to: LANDMARK_INDEX.LEFT_KNEE, jointGroup: 'knee' },
      { from: LANDMARK_INDEX.LEFT_KNEE, to: LANDMARK_INDEX.LEFT_ANKLE, jointGroup: 'knee' },
      { from: LANDMARK_INDEX.RIGHT_HIP, to: LANDMARK_INDEX.RIGHT_KNEE, jointGroup: 'knee' },
      { from: LANDMARK_INDEX.RIGHT_KNEE, to: LANDMARK_INDEX.RIGHT_ANKLE, jointGroup: 'knee' }
    ];

    // 1. Draw Connecting Bones
    SKELETON_CONNECTIONS.forEach(({ from, to, jointGroup }) => {
      const ptA = landmarks[from];
      const ptB = landmarks[to];
      if (!ptA || !ptB) return;

      const isFaulty = faultyJointNames.has(jointGroup);
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
      if (!pt) return;

      const isFaulty = faultyJointNames.has(name);
      const screenX = (1 - pt.x) * width;
      const screenY = pt.y * height;

      // Outer glow circle
      ctx.beginPath();
      ctx.arc(screenX, screenY, isFaulty ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = isFaulty ? COLOR_FAULT : COLOR_GOOD;
      ctx.fill();

      // Inner white dot
      ctx.beginPath();
      ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    // 3. Float Contextual Form Correction Tooltips Directly Next to Offending Joints
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

      // Positioning tooltip safely within canvas bounds
      const boxX = Math.min(Math.max(screenX + 15, 10), width - boxWidth - 10);
      const boxY = Math.min(Math.max(screenY - 14, 25), height - boxHeight - 10);

      // Background rounded pill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.92)'; // Crimson red
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
      ctx.fill();
      ctx.stroke();

      // Text label
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, boxX + padding, boxY + 17);
      ctx.restore();
    });
  }, []);

  // WebRTC Start Camera with MediaPipe Pose Hookup
  const startCamera = async () => {
    setErrorMessage(null);
    setViewState('requesting');

    // Guard against environments without mediaDevices support (e.g. non-secure origins)
    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMessage('Webcam access is not supported in this browser environment or requires HTTPS/localhost.');
      setViewState('error');
      if (setIsTracking) setIsTracking(false);
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
        } catch (playErr) {
          console.warn("Video play interrupted:", playErr);
        }
      }

      // Initialize MediaPipe Pose instance with isolated try-catch
      try {
        let PoseConstructor = window.Pose;
        if (!PoseConstructor) {
          try {
            const mp = await import('@mediapipe/pose');
            PoseConstructor = mp.Pose || mp.default?.Pose;
          } catch (e) {
            console.warn("Could not import @mediapipe/pose statically, relying on window.Pose", e);
          }
        }

        if (PoseConstructor) {
          const pose = new PoseConstructor({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          });

          pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55
          });

        pose.onResults((results) => {
          if (!isRunningRef.current) return;

          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          const width = canvas.width;
          const height = canvas.height;

          if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            const evalResult = evaluateExerciseLandmarks(
              exerciseKeyRef.current,
              results.poseLandmarks,
              currentStageRef.current
            );

            setIsInFrame(evalResult.inFrame);
            setActiveFormFaults(evalResult.formFaults || []);
            setLiveAngle(evalResult.angle || 160);

            // Draw dynamic skeleton with color coding & tooltips
            drawPoseFrame(
              ctx,
              width,
              height,
              results.poseLandmarks,
              evalResult.formFaults || [],
              evalResult.isGoodForm,
              evalResult.inFrame
            );

            // Notify parent of telemetry
            if (onTelemetryUpdate) {
              onTelemetryUpdate(evalResult);
            }
          } else {
            setIsInFrame(false);
            ctx.clearRect(0, 0, width, height);
          }
        });

        poseRef.current = pose;
      }
    } catch (poseInitError) {
      console.warn("MediaPipe Pose initialization warning (camera will stream with visual guides):", poseInitError);
    }

      isRunningRef.current = true;
      setViewState('active');
      if (setIsTracking) setIsTracking(true);

      // Frame pump loop
      const pumpFrame = async () => {
        if (!isRunningRef.current) return;

        if (
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          poseRef.current
        ) {
          try {
            await poseRef.current.send({ image: videoRef.current });
          } catch (e) {
            // Transient frame drop
          }
        }
        animFrameRef.current = requestAnimationFrame(pumpFrame);
      };

      pumpFrame();
    } catch (err) {
      console.warn("Webcam access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access blocked. Please allow permissions in your browser bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No webcam detected on this device. You can test with Interactive Simulation.');
      } else {
        setErrorMessage(err.message || 'Unable to access camera.');
      }
      setViewState('error');
      if (setIsTracking) setIsTracking(false);
    }
  };

  // Start Interactive Simulation
  const startSimulation = () => {
    stopCamera();
    setViewState('simulating');
    setIsInFrame(true);
    if (setIsTracking) setIsTracking(true);
  };

  // Stop Simulation
  const stopSimulation = () => {
    setViewState('idle');
    if (setIsTracking) setIsTracking(false);
  };

  // Synthetic Landmark Generator for Infallible Simulation Mode
  useEffect(() => {
    let interval;
    if (viewState === 'simulating') {
      interval = setInterval(() => {
        setSimulatedAngle((prev) => {
          let next = prev;
          let newDirection = simDirection;

          if (exerciseKey === 'squats' || exerciseKey === 'lunges') {
            next = prev + simDirection * 5;
            if (next <= 85) newDirection = 1;
            else if (next >= 165) newDirection = -1;
          } else if (exerciseKey === 'pushups') {
            next = prev + simDirection * 6;
            if (next <= 80) newDirection = 1;
            else if (next >= 160) newDirection = -1;
          } else if (exerciseKey === 'jumpingJacks') {
            next = prev + simDirection * 7;
            if (next >= 140) newDirection = -1;
            else if (next <= 40) newDirection = 1;
          } else {
            // plank
            next = prev + simDirection * 2;
            if (next >= 22) newDirection = -1;
            else if (next <= 5) newDirection = 1;
          }

          setSimDirection(newDirection);
          setLiveAngle(next);

          // Generate synthetic 33-landmark skeleton mirroring real anatomy
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            const bendNorm = (180 - next) / 100;
            const syntheticLandmarks = [];
            for (let i = 0; i <= 32; i++) {
              syntheticLandmarks.push({ x: 0.5, y: 0.5, visibility: 0.95 });
            }

            // Hip & Knee geometry
            syntheticLandmarks[LANDMARK_INDEX.LEFT_SHOULDER] = { x: 0.42, y: 0.32, visibility: 0.95 };
            syntheticLandmarks[LANDMARK_INDEX.RIGHT_SHOULDER] = { x: 0.58, y: 0.32, visibility: 0.95 };

            if (exerciseKey === 'jumpingJacks') {
              const armY = 0.32 - (next / 180) * 0.25;
              const armXLeft = 0.42 - (next / 180) * 0.15;
              const armXRight = 0.58 + (next / 180) * 0.15;
              syntheticLandmarks[LANDMARK_INDEX.LEFT_ELBOW] = { x: armXLeft, y: armY + 0.1, visibility: 0.95 };
              syntheticLandmarks[LANDMARK_INDEX.RIGHT_ELBOW] = { x: armXRight, y: armY + 0.1, visibility: 0.95 };
              syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: armXLeft - 0.05, y: armY, visibility: 0.95 };
              syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: armXRight + 0.05, y: armY, visibility: 0.95 };
            } else {
              syntheticLandmarks[LANDMARK_INDEX.LEFT_ELBOW] = { x: 0.38, y: 0.45, visibility: 0.95 };
              syntheticLandmarks[LANDMARK_INDEX.RIGHT_ELBOW] = { x: 0.62, y: 0.45, visibility: 0.95 };
              syntheticLandmarks[LANDMARK_INDEX.LEFT_WRIST] = { x: 0.36, y: 0.56, visibility: 0.95 };
              syntheticLandmarks[LANDMARK_INDEX.RIGHT_WRIST] = { x: 0.64, y: 0.56, visibility: 0.95 };
            }

            syntheticLandmarks[LANDMARK_INDEX.LEFT_HIP] = { x: 0.44, y: 0.55 + bendNorm * 0.08, visibility: 0.95 };
            syntheticLandmarks[LANDMARK_INDEX.RIGHT_HIP] = { x: 0.56, y: 0.55 + bendNorm * 0.08, visibility: 0.95 };

            syntheticLandmarks[LANDMARK_INDEX.LEFT_KNEE] = { x: 0.43 - bendNorm * 0.04, y: 0.72 + bendNorm * 0.03, visibility: 0.95 };
            syntheticLandmarks[LANDMARK_INDEX.RIGHT_KNEE] = { x: 0.57 + bendNorm * 0.04, y: 0.72 + bendNorm * 0.03, visibility: 0.95 };

            syntheticLandmarks[LANDMARK_INDEX.LEFT_ANKLE] = { x: 0.43, y: 0.90, visibility: 0.95 };
            syntheticLandmarks[LANDMARK_INDEX.RIGHT_ANKLE] = { x: 0.57, y: 0.90, visibility: 0.95 };

            const evalResult = evaluateExerciseLandmarks(
              exerciseKeyRef.current,
              syntheticLandmarks,
              currentStageRef.current
            );

            setActiveFormFaults(evalResult.formFaults || []);
            drawPoseFrame(
              ctx,
              width,
              height,
              syntheticLandmarks,
              evalResult.formFaults || [],
              evalResult.isGoodForm,
              true
            );

            if (onTelemetryUpdate) {
              onTelemetryUpdate(evalResult);
            }
          }

          return next;
        });
      }, 70);
    }
    return () => clearInterval(interval);
  }, [viewState, simDirection, exerciseKey, onTelemetryUpdate, drawPoseFrame]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300"
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      {/* Top Status Bar: Clean HUD badge & stop control */}
      <div className="p-4 flex justify-between items-center z-20 pointer-events-none">
        {/* Status Badge */}
        <div className="pointer-events-auto flex items-center space-x-2">
          {viewState === 'idle' && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-400 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>CAMERA IDLE</span>
            </div>
          )}

          {viewState === 'requesting' && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide">
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
              <span>REQUESTING ACCESS...</span>
            </div>
          )}

          {viewState === 'active' && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(34,197,94,0.25)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE MEDIA-PIPE AI</span>
              </div>

              {!isInFrame && (
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold animate-pulse">
                  <UserX className="w-3.5 h-3.5 text-amber-400" />
                  <span>Step back into frame</span>
                </div>
              )}
            </div>
          )}

          {viewState === 'simulating' && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(168,85,247,0.25)]">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>SIMULATING POSE</span>
            </div>
          )}

          {viewState === 'error' && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>CAMERA BLOCKED</span>
            </div>
          )}
        </div>

        {/* Top-Right Action Controls */}
        <div className="pointer-events-auto flex items-center space-x-2">
          {viewState === 'active' && (
            <button
              onClick={stopCamera}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all bg-slate-900/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/40 backdrop-blur-md"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>Stop Camera</span>
            </button>
          )}

          {viewState === 'simulating' && (
            <button
              onClick={stopSimulation}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all bg-slate-900/80 hover:bg-slate-800 text-purple-300 border border-purple-500/40 backdrop-blur-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Stop Simulation</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Screen */}
      <div className="relative aspect-[4/3] w-full max-h-[460px] flex items-center justify-center bg-gradient-to-b from-slate-950/90 to-slate-900/90 overflow-hidden">
        {/* Real Video element */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-500 ${
            viewState === 'active' ? 'opacity-90' : 'opacity-0 pointer-events-none'
          }`}
          playsInline
          muted
        />

        {/* Canvas overlay for skeleton & dynamic vector angles */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-10 transition-opacity duration-300 ${
            viewState === 'active' || viewState === 'simulating' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Floating Out-Of-Frame Warning Badge on center if needed */}
        {viewState === 'active' && !isInFrame && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 border border-amber-500/60 rounded-full px-4 py-1.5 text-xs font-bold text-amber-300 shadow-xl backdrop-blur-md flex items-center space-x-2 animate-pulse">
            <UserX className="w-4 h-4 text-amber-400" />
            <span>Step back so your full body is in frame</span>
          </div>
        )}

        {/* STATE: 'idle' — Sleek Minimalist Empty-State */}
        {viewState === 'idle' && (
          <div className="relative z-0 text-center px-6 max-w-md mx-auto flex flex-col items-center">
            {/* Centered aperture with cyan outline */}
            <div className="relative mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl bg-cyan-500/20 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl bg-slate-900/80 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-xl">
                <Camera className="w-9 h-9" />
              </div>
            </div>

            {/* Typography */}
            <h4 className="text-xl font-semibold text-white tracking-tight">
              AI Pose Detection Ready
            </h4>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed mt-1.5 mb-6">
              Grant camera access for zero-latency, client-side rep tracking
            </p>

            {/* Primary Action Button */}
            <button
              onClick={startCamera}
              className="flex items-center space-x-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Camera className="w-4 h-4" />
              <span>Enable Camera</span>
            </button>

            {/* Secondary Ghost Button */}
            <button
              onClick={startSimulation}
              className="mt-3.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors flex items-center space-x-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Try Interactive Simulation</span>
            </button>
          </div>
        )}

        {/* STATE: 'requesting' — Spinner State */}
        {viewState === 'requesting' && (
          <div className="relative z-10 text-center px-6 max-w-xs flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 backdrop-blur-md">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h4 className="text-base font-semibold text-white">Accessing camera...</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Please click "Allow" in your browser's camera prompt to start pose tracking.
            </p>
          </div>
        )}

        {/* STATE: 'error' — Inline Notification */}
        {viewState === 'error' && (
          <div className="relative z-10 text-center px-6 max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Camera Permission Blocked</h4>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed bg-rose-950/40 border border-rose-500/20 rounded-xl p-3">
              {errorMessage || 'Camera access blocked. Please allow permissions in your browser bar.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
              <button
                onClick={startSimulation}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Use Simulation Mode</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Bottom HUD Bar: Only visible when active or simulating */}
      {(viewState === 'active' || viewState === 'simulating') && (
        <div className="p-3.5 bg-slate-900/80 border-t border-slate-800/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Kinematic Joint Flexion:
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-1/2">
            <input
              type="range"
              min="0"
              max="180"
              value={liveAngle}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSimulatedAngle(val);
                setLiveAngle(val);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <span className="font-mono text-emerald-400 font-bold min-w-[38px] text-right">
              {liveAngle}°
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              STAGE:
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-800/90 text-cyan-400 font-mono font-bold uppercase text-[11px] border border-cyan-500/20">
              {currentStage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
