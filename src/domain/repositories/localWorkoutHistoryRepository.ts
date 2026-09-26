/**
 * Local Workout History Repository Adapter
 * 
 * Implements IWorkoutHistoryRepository backed by browser LocalStorage via storageSafety.ts.
 * Enforces visual privacy: refuses to persist raw camera frames or pose landmark arrays.
 */

import type { IWorkoutHistoryRepository } from './interfaces.ts';
import { RepositoryError } from './interfaces.ts';
import type { WorkoutSessionRecord } from '../models/account.ts';
import { safeGetItem, safeSetItem, safeRemoveItem, STORAGE_KEYS } from '../../utils/storageSafety.ts';

const STORAGE_KEY_WORKOUT_SESSIONS = 'fitmitra_workout_sessions_v1';

export class LocalWorkoutHistoryRepository implements IWorkoutHistoryRepository {
  private inMemoryCache: WorkoutSessionRecord[] | null = null;

  private loadSessions(): WorkoutSessionRecord[] {
    if (this.inMemoryCache !== null) {
      return this.inMemoryCache;
    }

    const stored = safeGetItem<WorkoutSessionRecord[]>(STORAGE_KEY_WORKOUT_SESSIONS);
    if (Array.isArray(stored)) {
      this.inMemoryCache = stored;
      return stored;
    }

    this.inMemoryCache = [];
    return [];
  }

  private persistSessions(sessions: WorkoutSessionRecord[]): void {
    this.inMemoryCache = sessions;
    const success = safeSetItem(STORAGE_KEY_WORKOUT_SESSIONS, sessions);
    if (!success && typeof window !== 'undefined') {
      console.warn('[LocalWorkoutHistoryRepository] Failed to persist workout sessions to LocalStorage.');
    }
  }

  async getHistory(accountId?: string): Promise<WorkoutSessionRecord[]> {
    const all = this.loadSessions();
    if (!accountId) {
      return [...all].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return all
      .filter((s) => s.accountId === accountId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getSessionById(id: string): Promise<WorkoutSessionRecord | null> {
    const all = this.loadSessions();
    const found = all.find((s) => s.id === id);
    return found ? { ...found } : null;
  }

  async saveSession(session: WorkoutSessionRecord): Promise<void> {
    // 1. Privacy Enforcement Guard: Ensure no raw frame or skeletal landmark coordinates leak
    const rawAny = session as any;
    if (rawAny.landmarks || rawAny.frames || rawAny.videoBuffer || rawAny.coordinates) {
      throw new RepositoryError(
        'PermissionDenied',
        'Privacy Violation: Raw camera frames or skeletal landmark arrays must never be passed to persistent storage.'
      );
    }

    // 2. Validate mandatory fields
    if (!session.id || !session.exerciseKey || !session.timestamp) {
      throw new RepositoryError('Unknown', 'Invalid workout session: missing required identifier or timestamp.');
    }

    const all = this.loadSessions();

    // 3. Collision Check (Idempotency)
    const existingIndex = all.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      throw new RepositoryError(
        'Conflict',
        `Workout session with ID "${session.id}" already exists. Sessions are append-only.`
      );
    }

    // 4. Append
    const updated = [session, ...all];
    this.persistSessions(updated);
  }

  async clearHistory(accountId?: string): Promise<void> {
    if (!accountId) {
      this.inMemoryCache = [];
      safeRemoveItem(STORAGE_KEY_WORKOUT_SESSIONS);
      return;
    }

    const all = this.loadSessions();
    const remaining = all.filter((s) => s.accountId !== accountId);
    this.persistSessions(remaining);
  }
}
