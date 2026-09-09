import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Loader2,
  Sliders,
  CheckCircle2
} from 'lucide-react';

/**
 * CameraView Component
 * View States: 'idle' | 'requesting' | 'active' | 'simulating' | 'error'
 */
export const CameraView = ({
  exerciseKey,
  onAngleUpdate,
  currentAngle = 160,
  formCue,
  currentStage = 'up',
  isTracking,
  setIsTracking
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Viewport state machine: 'idle' | 'requesting' | 'active' | 'simulating' | 'error'
  const [viewState, setViewState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);

  // Simulation state
  const [simulatedAngle, setSimulatedAngle] = useState(160);
  const [simDirection, setSimDirection] = useState(-1);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setViewState('idle');
    setErrorMessage(null);
    if (setIsTracking) setIsTracking(false);
  }, [setIsTracking]);

  // Request WebRTC Camera Stream
  const startCamera = async () => {
    setErrorMessage(null);
    setViewState('requesting');

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
        await videoRef.current.play();
        setViewState('active');
        if (setIsTracking) setIsTracking(true);
      }
    } catch (err) {
      console.warn("Webcam access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access blocked. Please allow permissions in your browser bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No webcam detected on this device. You can test with the Interactive Simulation.');
      } else {
        setErrorMessage(err.message || 'Unable to access camera. Please check your camera settings.');
      }
      setViewState('error');
      if (setIsTracking) setIsTracking(false);
    }
  };

  // Start Interactive Simulation
  const startSimulation = () => {
    stopCamera();
    setViewState('simulating');
    setSimulatedAngle(160);
    setSimDirection(-1);
    if (setIsTracking) setIsTracking(true);
  };

  // Stop Simulation
  const stopSimulation = () => {
    setViewState('idle');
    if (setIsTracking) setIsTracking(false);
  };

  // Simulation Runner Loop
  useEffect(() => {
    let interval;
    if (viewState === 'simulating') {
      interval = setInterval(() => {
        setSimulatedAngle((prev) => {
          let next;
          if (exerciseKey === 'squats') {
            next = prev + simDirection * 5;
            if (next <= 85) setSimDirection(1);
            else if (next >= 165) setSimDirection(-1);
          } else if (exerciseKey === 'pushups') {
            next = prev + simDirection * 6;
            if (next <= 80) setSimDirection(1);
            else if (next >= 160) setSimDirection(-1);
          } else {
            // jumping jacks
            next = prev + simDirection * 7;
            if (next >= 140) setSimDirection(-1);
            else if (next <= 35) setSimDirection(1);
          }
          if (onAngleUpdate) onAngleUpdate(next);
          return next;
        });
      }, 70);
    }
    return () => clearInterval(interval);
  }, [viewState, simDirection, exerciseKey, onAngleUpdate]);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Canvas drawing: ONLY active during 'active' or 'simulating'
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // If NOT active and NOT simulating, leave canvas completely clear!
    if (viewState !== 'active' && viewState !== 'simulating') {
      return;
    }

    const angleToDisplay = viewState === 'simulating' ? simulatedAngle : currentAngle;

    // Responsive skeletal kinematics overlay
    const centerX = width / 2;
    const hipY = height * 0.52;
    const kneeBend = Math.min(Math.max((180 - angleToDisplay) * 0.6, 0), 65);

    // Head
    ctx.beginPath();
    ctx.arc(centerX, height * 0.22 + kneeBend * 0.4, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#22c55e';
    ctx.stroke();

    // Spine
    ctx.beginPath();
    ctx.moveTo(centerX, height * 0.25 + kneeBend * 0.4);
    ctx.lineTo(centerX, hipY + kneeBend * 0.6);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Hips
    const hipLeftX = centerX - 35;
    const hipRightX = centerX + 35;
    const currentHipY = hipY + kneeBend * 0.6;

    ctx.beginPath();
    ctx.moveTo(hipLeftX, currentHipY);
    ctx.lineTo(hipRightX, currentHipY);
    ctx.stroke();

    // Left Leg
    const kneeLeftX = hipLeftX - 15 - kneeBend * 0.2;
    const kneeLeftY = currentHipY + 55;
    const ankleLeftX = hipLeftX - 10;
    const ankleLeftY = height * 0.88;

    ctx.beginPath();
    ctx.moveTo(hipLeftX, currentHipY);
    ctx.lineTo(kneeLeftX, kneeLeftY);
    ctx.lineTo(ankleLeftX, ankleLeftY);
    ctx.strokeStyle = angleToDisplay < 100 ? '#22c55e' : '#06b6d4';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Right Leg
    const kneeRightX = hipRightX + 15 + kneeBend * 0.2;
    const kneeRightY = currentHipY + 55;
    const ankleRightX = hipRightX + 10;
    const ankleRightY = height * 0.88;

    ctx.beginPath();
    ctx.moveTo(hipRightX, currentHipY);
    ctx.lineTo(kneeRightX, kneeRightY);
    ctx.lineTo(ankleRightX, ankleRightY);
    ctx.stroke();

    // Joint landmark nodes
    const joints = [
      [centerX, height * 0.22 + kneeBend * 0.4],
      [hipLeftX, currentHipY],
      [hipRightX, currentHipY],
      [kneeLeftX, kneeLeftY],
      [kneeRightX, kneeRightY],
      [ankleLeftX, ankleLeftY],
      [ankleRightX, ankleRightY]
    ];

    joints.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
    });

    // Angle Display badge near knee
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = angleToDisplay < 100 ? '#22c55e' : '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(kneeRightX + 15, kneeRightY - 20, 95, 38, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(`${angleToDisplay}°`, kneeRightX + 26, kneeRightY + 4);
  }, [currentAngle, simulatedAngle, viewState]);

  const activeAngleValue = viewState === 'simulating' ? simulatedAngle : currentAngle;

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
      {/* Top Status Bar: Clean HUD with single status badge and discreet controls */}
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
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(34,197,94,0.25)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE TRACKING</span>
            </div>
          )}

          {viewState === 'simulating' && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(168,85,247,0.25)]">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>SIMULATING</span>
            </div>
          )}

          {viewState === 'error' && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>CAMERA BLOCKED</span>
            </div>
          )}
        </div>

        {/* Top-Right Action Controls (Only shown when active or simulating) */}
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

        {/* Canvas overlay for skeleton & vector angles */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-10 transition-opacity duration-300 ${
            viewState === 'active' || viewState === 'simulating' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* STATE: 'idle' — Sleek Minimalist Empty-State */}
        {viewState === 'idle' && (
          <div className="relative z-0 text-center px-6 max-w-md mx-auto flex flex-col items-center">
            {/* Centered blurred camera aperture icon with subtle glowing neon cyan outline */}
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

        {/* Live Form Guidance Floating Banner (Only when active/simulating and cue is present) */}
        {(viewState === 'active' || viewState === 'simulating') && formCue && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-emerald-500 text-slate-950 px-4 py-1.5 rounded-full font-bold text-xs shadow-xl shadow-emerald-500/30 flex items-center space-x-2 animate-bounce">
            <span>✨</span>
            <span>{formCue}</span>
          </div>
        )}
      </div>

      {/* Dedicated Bottom HUD Bar: Only visible when state is 'active' or 'simulating' */}
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
              min="60"
              max="180"
              value={activeAngleValue}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSimulatedAngle(val);
                if (onAngleUpdate) onAngleUpdate(val);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <span className="font-mono text-emerald-400 font-bold min-w-[38px] text-right">
              {activeAngleValue}°
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
