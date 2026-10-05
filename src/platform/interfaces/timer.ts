/**
 * FitMitra Platform Timer Interface
 * 
 * Abstract contract implemented by Web (window.setTimeout/setInterval)
 * and Android (Kotlin Coroutines / Handlers).
 */

export interface IPlatformTimer {
  /**
   * Schedules a one-shot execution after delayMs.
   * Returns a cancellation function.
   */
  schedule(callback: () => void, delayMs: number): () => void;

  /**
   * Schedules a recurring execution every intervalMs.
   * Returns a cancellation function.
   */
  scheduleInterval(callback: () => void, intervalMs: number): () => void;

  /**
   * Returns current monotonic or high-resolution timestamp in milliseconds.
   */
  now(): number;
}
