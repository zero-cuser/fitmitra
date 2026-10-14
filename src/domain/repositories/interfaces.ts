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
import type {
  AccountDeletionResult,
  AuthCredentials,
  AuthSession,
  SyncConsent,
  SyncOptions,
  SyncResult,
  SyncStatus
} from '../models/sync.ts';
import type {
  FriendInvitation,
  Friendship,
  FriendshipsList,
  SharedChallenge,
  SharedChallengeDetails
} from '../models/social.ts';
import type { CompletedActivityRecord } from '../../types/fitness.ts';

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

/**
 * Repository interface for managing authentication lifecycle.
 * Implementations may be Local (anonymous guest) or Remote (backend auth provider).
 */
export interface IAuthRepository {
  /**
   * Registers a new account with email, password, and optional profile metadata.
   */
  register(credentials: AuthCredentials): Promise<AuthSession>;

  /**
   * Authenticates an existing user and returns an active session.
   */
  login(credentials: AuthCredentials): Promise<AuthSession>;

  /**
   * Explicitly terminates active session and clears tokens.
   */
  logout(): Promise<void>;

  /**
   * Retrieves active authenticated session, or null if anonymous/logged out.
   */
  getCurrentSession(): Promise<AuthSession | null>;

  /**
   * Permanently deletes account with explicit remote and/or local data wiping choices.
   */
  deleteAccount(password: string, deleteRemoteDataOnly?: boolean): Promise<AccountDeletionResult>;
}

/**
 * Repository interface for managing opt-in cloud synchronization.
 */
export interface ISyncRepository {
  /**
   * Returns current observable sync status.
   */
  getSyncStatus(): SyncStatus;

  /**
   * Enables synchronization with explicit user consent.
   */
  enableSync(consent: SyncConsent): Promise<void>;

  /**
   * Disables synchronization and resets client to local-only mode.
   */
  disableSync(): Promise<void>;

  /**
   * Manually or automatically triggers synchronization.
   */
  syncNow(options?: SyncOptions): Promise<SyncResult>;

  /**
   * Retrieves the count of local changes pending synchronization.
   */
  getPendingCount(): Promise<number>;
}

/**
 * Repository interface for managing privacy-first friend connections.
 */
export interface ISocialRepository {
  /**
   * Creates a shareable invitation code with expiry.
   */
  createInvitation(options?: { maxUses?: number; expiryDays?: number }): Promise<FriendInvitation>;

  /**
   * Sends a friend request using an invitation code.
   */
  sendFriendRequest(inviteCode: string): Promise<{
    friendship: Friendship;
    invitationCreator: { displayName: string; avatarColor: string; hostelWing?: string };
  }>;

  /**
   * Retrieves friends and incoming/outgoing pending requests.
   */
  getFriendships(): Promise<FriendshipsList>;

  /**
   * Responds to an incoming pending friend request.
   */
  respondToRequest(friendshipId: string, action: 'accept' | 'decline'): Promise<Friendship>;

  /**
   * Removes an existing friend connection.
   */
  removeFriend(friendshipId: string): Promise<boolean>;

  /**
   * Revokes an active invitation code created by the user.
   */
  revokeInvitation(inviteCode: string): Promise<boolean>;
}

/**
 * Repository interface for managing private shared campus challenges.
 */
export interface ISharedChallengeRepository {
  /**
   * Creates a private shared fitness challenge.
   */
  createChallenge(data: {
    title: string;
    description: string;
    category?: 'strength' | 'consistency' | 'cardio' | 'posture' | 'exam';
    type?: 'rep_target' | 'duration_target' | 'session_count' | 'streak';
    targetValue: number;
    unit?: string;
    exerciseKeys?: string[];
    startDate: string;
    endDate: string;
    maxParticipants?: number;
  }): Promise<SharedChallenge>;

  /**
   * Lists all active or completed challenges the user participates in.
   */
  getUserChallenges(): Promise<SharedChallenge[]>;

  /**
   * Joins a challenge via invite code.
   */
  joinChallenge(inviteCode: string): Promise<SharedChallenge>;

  /**
   * Retrieves full details, standings, and participant progress for a challenge.
   */
  getChallengeDetails(challengeId: string): Promise<SharedChallengeDetails>;

  /**
   * Contributes a completed workout or exam session to a challenge.
   */
  contributeToChallenge(
    challengeId: string,
    activity: CompletedActivityRecord
  ): Promise<{
    updatedScore: number;
    challengeCompleted: boolean;
  }>;

  /**
   * Leaves a shared challenge.
   */
  leaveChallenge(challengeId: string): Promise<boolean>;

  /**
   * Cancels a challenge (owner only).
   */
  cancelChallenge(challengeId: string): Promise<boolean>;
}


