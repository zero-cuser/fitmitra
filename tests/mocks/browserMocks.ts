/**
 * Headless Browser API Mocks for Pure Unit Testing in Node.js
 * Isolates DOM, WebRTC Camera, Canvas 2D, Web Audio, and Speech Synthesis.
 */

/**
 * In-memory Mock implementation of the W3C Storage interface (localStorage / sessionStorage).
 */
export class MockLocalStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

/**
 * Deterministic animation frame controller.
 * Allows step-by-step ticking of frame loops without browser runtime.
 */
export class MockAnimationFrameController {
  private nextId = 1;
  private queue: Map<number, FrameRequestCallback> = new Map();

  requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const id = this.nextId++;
    this.queue.set(id, callback);
    return id;
  };

  cancelAnimationFrame = (id: number): void => {
    this.queue.delete(id);
  };

  /**
   * Executes the next scheduled frame callback with current timestamp.
   */
  step(timestamp: number = performance.now()): boolean {
    const firstEntry = this.queue.entries().next();
    if (firstEntry.done) return false;

    const [id, cb] = firstEntry.value;
    this.queue.delete(id);
    cb(timestamp);
    return true;
  }

  /**
   * Flushes all currently queued animation frames.
   */
  flush(timestamp: number = performance.now()): number {
    let count = 0;
    while (this.queue.size > 0) {
      this.step(timestamp);
      count++;
    }
    return count;
  }

  get pendingCount(): number {
    return this.queue.size;
  }
}

/**
 * Headless mock for HTMLCanvasElement and 2D rendering context.
 */
export function createMockCanvas2D() {
  const operations: string[] = [];

  const context = {
    clearRect: (x: number, y: number, w: number, h: number) => operations.push(`clearRect(${x},${y},${w},${h})`),
    beginPath: () => operations.push('beginPath'),
    arc: (x: number, y: number, r: number) => operations.push(`arc(${x},${y},${r})`),
    fill: () => operations.push('fill'),
    stroke: () => operations.push('stroke'),
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    scale: (x: number, y: number) => operations.push(`scale(${x},${y})`),
    translate: (x: number, y: number) => operations.push(`translate(${x},${y})`),
    moveTo: (x: number, y: number) => operations.push(`moveTo(${x},${y})`),
    lineTo: (x: number, y: number) => operations.push(`lineTo(${x},${y})`),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1
  };

  const canvas = {
    width: 640,
    height: 480,
    getContext: (type: string) => (type === '2d' ? context : null)
  };

  return { canvas, context, operations };
}

/**
 * Headless mock for WebRTC MediaStream and Tracks.
 */
export function createMockMediaStream() {
  let isStopped = false;

  const track = {
    kind: 'video',
    enabled: true,
    readyState: 'live',
    stop: () => {
      isStopped = true;
      track.readyState = 'ended';
    }
  };

  const stream = {
    active: true,
    getTracks: () => [track],
    getVideoTracks: () => [track],
    getAudioTracks: () => [],
    addTrack: () => {},
    removeTrack: () => {}
  };

  return { stream, track, get isStopped() { return isStopped; } };
}

/**
 * Headless mock for SpeechSynthesis text-to-speech.
 */
export function createMockSpeechSynthesis() {
  const utterances: string[] = [];
  let isSpeaking = false;

  const synth = {
    speak: (utterance: { text: string }) => {
      utterances.push(utterance.text);
      isSpeaking = true;
    },
    cancel: () => {
      isSpeaking = false;
    },
    getVoices: () => [],
    get speaking() {
      return isSpeaking;
    },
    utterances
  };

  return synth;
}
