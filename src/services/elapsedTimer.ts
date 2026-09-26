/**
 * FitMitra Deterministic Elapsed-Time Timer Controller
 * 
 * Accounts for true wall-clock delta to prevent timing drift
 * when browser tabs are throttled in the background or during CPU spikes.
 * Pure and fully testable in headless Node.js unit tests.
 */

export interface TimerActivity {
  id: string;
  name: string;
  durationSeconds: number;
}

export interface TimerSnapshot {
  activityIndex: number;
  totalActivities: number;
  currentActivityId: string;
  currentActivityName: string;
  activityDurationSeconds: number;
  activityRemainingSeconds: number;
  activityElapsedSeconds: number;
  totalSessionDurationSeconds: number;
  totalSessionElapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
}

export class ElapsedTimerController {
  private activities: TimerActivity[];
  private activityIndex = 0;
  private isRunning = false;
  private isPaused = false;
  private isCompleted = false;

  private startTime: number | null = null;
  private accumulatedMsInActivity = 0;
  private previousActivitiesElapsedSeconds = 0;

  constructor(activities: TimerActivity[]) {
    if (!activities || activities.length === 0) {
      throw new Error('ElapsedTimerController requires at least one activity.');
    }
    this.activities = activities;
  }

  /**
   * Starts or restarts the timer.
   */
  start(now = Date.now()): void {
    if (this.isCompleted) return;
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = now;
  }

  /**
   * Pauses the timer and freezes accumulated time.
   */
  pause(now = Date.now()): void {
    if (!this.isRunning || this.isPaused || this.isCompleted) return;

    if (this.startTime !== null) {
      this.accumulatedMsInActivity += Math.max(0, now - this.startTime);
    }
    this.startTime = null;
    this.isRunning = false;
    this.isPaused = true;
  }

  /**
   * Resumes a paused timer.
   */
  resume(now = Date.now()): void {
    if (!this.isPaused || this.isCompleted) return;

    this.startTime = now;
    this.isRunning = true;
    this.isPaused = false;
  }

  /**
   * Resets the entire timer session to initial state.
   */
  reset(): void {
    this.activityIndex = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.startTime = null;
    this.accumulatedMsInActivity = 0;
    this.previousActivitiesElapsedSeconds = 0;
  }

  /**
   * Skips the current activity immediately to the next one.
   */
  skip(now = Date.now()): boolean {
    if (this.isCompleted) return false;

    // Accumulate the current activity's full duration
    const currentAct = this.activities[this.activityIndex];
    this.previousActivitiesElapsedSeconds += currentAct.durationSeconds;

    if (this.activityIndex < this.activities.length - 1) {
      this.activityIndex += 1;
      this.accumulatedMsInActivity = 0;
      if (this.isRunning && !this.isPaused) {
        this.startTime = now;
      } else {
        this.startTime = null;
      }
      return true;
    } else {
      // Last activity completed
      this.isCompleted = true;
      this.isRunning = false;
      this.isPaused = false;
      this.startTime = null;
      return true;
    }
  }

  /**
   * Ends the entire session early.
   */
  endSession(): void {
    this.isCompleted = true;
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
  }

  /**
   * Deterministic time step. Accounts for elapsed wall-clock delta.
   * Advances activities when their duration is met.
   */
  step(now = Date.now()): { activityCompleted: boolean; sessionCompleted: boolean } {
    if (!this.isRunning || this.isPaused || this.isCompleted || this.startTime === null) {
      return { activityCompleted: false, sessionCompleted: this.isCompleted };
    }

    const currentAct = this.activities[this.activityIndex];
    const totalElapsedMsInActivity = this.accumulatedMsInActivity + Math.max(0, now - this.startTime);
    const targetMs = currentAct.durationSeconds * 1000;

    if (totalElapsedMsInActivity >= targetMs) {
      this.previousActivitiesElapsedSeconds += currentAct.durationSeconds;

      if (this.activityIndex < this.activities.length - 1) {
        this.activityIndex += 1;
        this.accumulatedMsInActivity = 0;
        this.startTime = now;
        return { activityCompleted: true, sessionCompleted: false };
      } else {
        this.isCompleted = true;
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        return { activityCompleted: true, sessionCompleted: true };
      }
    }

    return { activityCompleted: false, sessionCompleted: false };
  }

  /**
   * Returns a complete, immutable snapshot of the current timer status.
   */
  getSnapshot(now = Date.now()): TimerSnapshot {
    const currentAct = this.activities[this.activityIndex] || this.activities[this.activities.length - 1];

    let currentActivityElapsedMs = this.accumulatedMsInActivity;
    if (this.isRunning && !this.isPaused && this.startTime !== null) {
      currentActivityElapsedMs += Math.max(0, now - this.startTime);
    }

    const activityDurationSeconds = currentAct.durationSeconds;
    const activityElapsedSeconds = Math.min(activityDurationSeconds, Math.floor(currentActivityElapsedMs / 1000));
    const activityRemainingSeconds = this.isCompleted
      ? 0
      : Math.max(0, Math.ceil((activityDurationSeconds * 1000 - currentActivityElapsedMs) / 1000));

    const totalSessionDurationSeconds = this.activities.reduce((acc, a) => acc + a.durationSeconds, 0);
    const totalSessionElapsedSeconds = this.isCompleted
      ? totalSessionDurationSeconds
      : Math.min(totalSessionDurationSeconds, this.previousActivitiesElapsedSeconds + activityElapsedSeconds);

    return {
      activityIndex: this.activityIndex,
      totalActivities: this.activities.length,
      currentActivityId: currentAct.id,
      currentActivityName: currentAct.name,
      activityDurationSeconds,
      activityRemainingSeconds,
      activityElapsedSeconds,
      totalSessionDurationSeconds,
      totalSessionElapsedSeconds,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isCompleted: this.isCompleted
    };
  }
}
