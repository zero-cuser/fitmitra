/**
 * FitMitra Web Remote Shared Challenge Repository
 * 
 * Implements ISharedChallengeRepository over HTTPS REST with:
 * - Direct connection to backend private challenge endpoints
 * - Local storage caching for offline browsing
 * - Strict Zero-Egress biometric assertion prior to payload dispatch
 */

import type { ISharedChallengeRepository } from '../../domain/repositories/interfaces.ts';
import { RepositoryError } from '../../domain/repositories/interfaces.ts';
import type {
  SharedChallenge,
  SharedChallengeDetails
} from '../../domain/models/social.ts';
import type { CompletedActivityRecord } from '../../types/fitness.ts';
import { safeGetItem, safeSetItem } from '../../utils/storageSafety.ts';

const STORAGE_KEY_AUTH_TOKEN = 'fitmitra_auth_token_v1';
const STORAGE_KEY_CACHED_SHARED_CHALLENGES = 'fitmitra_cached_shared_challenges_v1';

export class WebRemoteSharedChallengeRepository implements ISharedChallengeRepository {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
  }

  private getAuthToken(): string {
    const token = safeGetItem<string>(STORAGE_KEY_AUTH_TOKEN);
    if (!token) {
      throw new RepositoryError('NotAuthenticated', 'You must be signed in to manage shared challenges.');
    }
    return token;
  }

  async createChallenge(data: {
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
  }): Promise<SharedChallenge> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const body = await res.json();
      if (!res.ok) {
        throw new RepositoryError('ServerError', body.error || 'Failed to create challenge.');
      }
      return body.challenge;
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot create challenge while offline.', err);
    }
  }

  async getUserChallenges(): Promise<SharedChallenge[]> {
    const token = safeGetItem<string>(STORAGE_KEY_AUTH_TOKEN);
    if (!token) {
      const cached = safeGetItem<SharedChallenge[]>(STORAGE_KEY_CACHED_SHARED_CHALLENGES);
      return cached || [];
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/challenges`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const cached = safeGetItem<SharedChallenge[]>(STORAGE_KEY_CACHED_SHARED_CHALLENGES);
        if (cached) return cached;
        throw new RepositoryError('ServerError', 'Failed to fetch shared challenges.');
      }

      const body = await res.json();
      const challenges: SharedChallenge[] = body.challenges || [];
      safeSetItem(STORAGE_KEY_CACHED_SHARED_CHALLENGES, challenges);
      return challenges;
    } catch (err: any) {
      const cached = safeGetItem<SharedChallenge[]>(STORAGE_KEY_CACHED_SHARED_CHALLENGES);
      if (cached) return cached;
      throw new RepositoryError('Offline', 'Cannot load challenges while offline.', err);
    }
  }

  async joinChallenge(inviteCode: string): Promise<SharedChallenge> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/challenges/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() })
      });

      const body = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          throw new RepositoryError('NotFound', body.error || 'Challenge code not found.');
        }
        if (res.status === 409) {
          throw new RepositoryError('Conflict', body.error || 'Already joined this challenge.');
        }
        throw new RepositoryError('ServerError', body.error || 'Failed to join challenge.');
      }
      return body.challenge;
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot join challenge while offline.', err);
    }
  }

  async getChallengeDetails(challengeId: string): Promise<SharedChallengeDetails> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/challenges/${encodeURIComponent(challengeId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const body = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          throw new RepositoryError('PermissionDenied', body.error || 'You are not a participant in this challenge.');
        }
        if (res.status === 404) {
          throw new RepositoryError('NotFound', 'Challenge not found.');
        }
        throw new RepositoryError('ServerError', body.error || 'Failed to load challenge details.');
      }

      return {
        challenge: body.challenge,
        participants: body.participants || [],
        isOwner: Boolean(body.isOwner)
      };
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot load challenge details while offline.', err);
    }
  }

  async contributeToChallenge(
    challengeId: string,
    activity: CompletedActivityRecord
  ): Promise<{
    updatedScore: number;
    challengeCompleted: boolean;
  }> {
    const token = this.getAuthToken();

    // Defensive zero-egress check on client side
    const sanitizedActivity = {
      id: activity.id,
      type: activity.type,
      exerciseKey: activity.exerciseKey,
      reps: activity.reps,
      durationSeconds: activity.durationSeconds,
      timestamp: activity.timestamp
    };

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/challenges/${encodeURIComponent(challengeId)}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activity: sanitizedActivity })
      });

      const body = await res.json();
      if (!res.ok) {
        throw new RepositoryError('ServerError', body.error || 'Failed to record challenge contribution.');
      }

      return {
        updatedScore: body.updatedParticipantScore,
        challengeCompleted: Boolean(body.challengeCompleted)
      };
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot record contribution while offline.', err);
    }
  }

  async leaveChallenge(challengeId: string): Promise<boolean> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/challenges/${encodeURIComponent(challengeId)}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const body = await res.json();
      return Boolean(body.success);
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot leave challenge while offline.', err);
    }
  }

  async cancelChallenge(challengeId: string): Promise<boolean> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/challenges/${encodeURIComponent(challengeId)}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const body = await res.json();
      if (!res.ok) {
        throw new RepositoryError('PermissionDenied', body.error || 'Only owner can cancel challenge.');
      }
      return Boolean(body.success);
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot cancel challenge while offline.', err);
    }
  }
}
