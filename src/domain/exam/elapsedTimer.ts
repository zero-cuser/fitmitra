/**
 * FitMitra Platform-Neutral Elapsed Timer Controller
 * 
 * Re-exports the wall-clock delta elapsed timer under domain/exam.
 */

export {
  ElapsedTimerController
} from '../../services/elapsedTimer.ts';

export type {
  TimerActivity,
  TimerSnapshot
} from '../../services/elapsedTimer.ts';
