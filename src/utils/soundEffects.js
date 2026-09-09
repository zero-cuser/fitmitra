// Web Audio API synthesized sound effects
let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playTone = (frequency = 440, duration = 0.15, type = 'sine') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio playback not permitted yet", e);
  }
};

export const playCountdown = () => playTone(600, 0.1, 'triangle');
export const playRepSuccess = () => {
  playTone(587.33, 0.08, 'sine'); // D5
  setTimeout(() => playTone(880, 0.15, 'sine'), 90); // A5
};
export const playWorkoutComplete = () => {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 0.25, 'triangle'), idx * 120);
  });
};
export const playChimeAlert = () => {
  playTone(800, 0.12, 'sine');
  setTimeout(() => playTone(1200, 0.25, 'sine'), 130);
};
