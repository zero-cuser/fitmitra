/**
 * FramePumpController manages the requestAnimationFrame loop lifecycle
 * ensuring that in-flight async frames or stop events do not leave orphaned ticks.
 */
export class FramePumpController {
  private isRunning = false;
  private isProcessing = false;
  private currentFrameId: number | null = null;

  start(
    processFrame: () => Promise<void>,
    requestFn: (cb: FrameRequestCallback) => number = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : () => 0,
    cancelFn: (id: number) => void = typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : () => {}
  ) {
    this.stop(cancelFn);
    this.isRunning = true;

    const loop = async () => {
      if (!this.isRunning) return;
      if (!this.isProcessing) {
        this.isProcessing = true;
        try {
          await processFrame();
        } catch {} finally {
          this.isProcessing = false;
        }
      }
      // Re-check after async processing completes before scheduling the next tick
      if (this.isRunning) {
        this.currentFrameId = requestFn(loop);
      } else {
        this.currentFrameId = null;
      }
    };

    this.currentFrameId = requestFn(loop);
  }

  stop(cancelFn: (id: number) => void = typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : () => {}) {
    this.isRunning = false;
    this.isProcessing = false;
    if (this.currentFrameId !== null) {
      cancelFn(this.currentFrameId);
      this.currentFrameId = null;
    }
  }

  get running(): boolean {
    return this.isRunning;
  }

  get scheduledFrameId(): number | null {
    return this.currentFrameId;
  }
}
