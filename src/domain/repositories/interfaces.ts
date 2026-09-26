/**
 * FitMitra Repository Interfaces
 * 
 * Formal abstraction layer separating UI / Use-Cases from persistent storage engines.
 * Implementations can be Local (LocalStorage/Room DB) or Remote (Supabase/Firebase/REST).
 */

import type {
  Account,
  ChallengeDefinition,
  ChallengeParticipation,
  DomainUserProfile,
  WorkoutSessionRecord
} from '../models/account.ts';

// ========================================================
// REPOSITORY ERROR HIERARCHY
// ========================================================

export type RepositoryErrorCode =
  | 'NotAuthenticated'   // Operation requires an active user account
  | 'Offline'            // Operation requires connectivity and offline queue is unavailable
  | 'PermissionDenied'   // User lacks authorization to modify or access target record
  | 'NotFound'           // Entity ID does not exist in the storage engine
  | 'Conflict'           // Concurrent modification conflict or deduplication collision
  | 'ServerError'        // Remote backend 5xx error or unrecoverable infrastructure fault
  | 'Unknown';           // Unhandled runtime exception

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  readonly cause?: unknown;

  constructor(
    code: RepositoryErrorCode,
    message: string,
    cause?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.cause = cause;
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, RepositoryError.prototype);
  }
}

// ========================================================
// REPOSITORY CONTRACTS
// ========================================================

/**
 * Repository interface for managing immutable workout session records.
 */
export interface IWorkoutHistoryRepository {
  /**
   * Retrieves all historical workout sessions for the active account in reverse chronological order.
   */
  getHistory(accountId?: string): Promise<WorkoutSessionRecord[]>;

  /**
   * Appends a new completed workout session.
   * Duplicate session IDs must be rejected with 'Conflict'.
   */
  saveSession(session: WorkoutSessionRecord): Promise<void>;

  /**
   * Retrieves a single session by stable ID.
   */
  getSessionById(id: string): Promise<WorkoutSessionRecord | null>;

  /**
   * Selectively purges workout history without affecting user identity or preferences.
   */
  clearHistory(accountId?: string): Promise<void>;
}

/**
 * Repository interface for challenge catalog definitions and student participation state.
 */
export interface IChallengeRepository {
  /**
   * Retrieves all available challenge definitions.
   */
  getChallengeDefinitions(): Promise<ChallengeDefinition[]>;

  /**
   * Retrieves a specific challenge definition by ID.
   */
  getChallengeDefinition(challengeId: string): Promise<ChallengeDefinition | null>;

  /**
   * Retrieves the user's active participation record for a given challenge.
   */
  getParticipation(accountId: string, challengeId: string): Promise<ChallengeParticipation | null>;

  /**
   * Retrieves all challenge participation records for a given account.
   */
  getAllParticipations(accountId: string): Promise<ChallengeParticipation[]>;

  /**
   * Registers a user for a challenge.
   * Idempotent: returns existing participation if already joined.
   */
  joinChallenge(accountId: string, challengeId: string): Promise<ChallengeParticipation>;

  /**
   * Deregisters a user from a challenge, discarding in-progress tracking.
   */
  leaveChallenge(accountId: string, challengeId: string): Promise<void>;

  /**
   * Persists updated participation progress.
   */
  saveParticipation(participation: ChallengeParticipation): Promise<void>;
}

/**
 * Repository interface for managing authentication identity and application profile.
 */
export interface IUserRepository {
  /**
   * Retrieves the currently active Account, or null if unauthenticated.
   */
  getCurrentAccount(): Promise<Account | null>;

  /**
   * Retrieves the application profile for the specified account ID.
   */
  getProfile(accountId: string): Promise<DomainUserProfile | null>;

  /**
   * Persists or updates the domain user profile.
   */
  saveProfile(profile: DomainUserProfile): Promise<void>;

  /**
   * Clears active user session and local credentials.
   */
  clearUser(): Promise<void>;
}
