/**
 * FitMitra Web Remote Social Repository
 * 
 * Implements ISocialRepository over HTTPS REST with:
 * - Bearer token authentication
 * - Local storage caching for offline resilience
 * - Error transformation into domain RepositoryError
 */

import type { ISocialRepository } from '../../domain/repositories/interfaces.ts';
import { RepositoryError } from '../../domain/repositories/interfaces.ts';
import type {
  FriendInvitation,
  Friendship,
  FriendshipsList
} from '../../domain/models/social.ts';
import { safeGetItem, safeSetItem } from '../../utils/storageSafety.ts';

const STORAGE_KEY_AUTH_TOKEN = 'fitmitra_auth_token_v1';
const STORAGE_KEY_CACHED_FRIENDS = 'fitmitra_cached_friendships_v1';

export class WebRemoteSocialRepository implements ISocialRepository {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
  }

  private getAuthToken(): string {
    const token = safeGetItem<string>(STORAGE_KEY_AUTH_TOKEN);
    if (!token) {
      throw new RepositoryError('NotAuthenticated', 'You must be signed in to access campus social features.');
    }
    return token;
  }

  async createInvitation(options?: { maxUses?: number; expiryDays?: number }): Promise<FriendInvitation> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/friends/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(options || {})
      });

      const data = await res.json();
      if (!res.ok) {
        throw new RepositoryError('ServerError', data.error || 'Failed to generate invitation code.');
      }
      return data.invitation;
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot create invitation while offline.', err);
    }
  }

  async sendFriendRequest(inviteCode: string): Promise<{
    friendship: Friendship;
    invitationCreator: { displayName: string; avatarColor: string; hostelWing?: string };
  }> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          throw new RepositoryError('NotFound', data.error || 'Invalid or expired invitation code.');
        }
        if (res.status === 409) {
          throw new RepositoryError('Conflict', data.error || 'Friend request already exists.');
        }
        throw new RepositoryError('ServerError', data.error || 'Failed to send friend request.');
      }
      return {
        friendship: data.friendship,
        invitationCreator: data.invitationCreator
      };
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot send friend request while offline.', err);
    }
  }

  async getFriendships(): Promise<FriendshipsList> {
    const token = safeGetItem<string>(STORAGE_KEY_AUTH_TOKEN);
    if (!token) {
      // Offline / Unauthenticated fallback: return cached or empty
      const cached = safeGetItem<FriendshipsList>(STORAGE_KEY_CACHED_FRIENDS);
      return cached || { accepted: [], pendingIncoming: [], pendingOutgoing: [], activeInvitations: [] };
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/friends`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const cached = safeGetItem<FriendshipsList>(STORAGE_KEY_CACHED_FRIENDS);
        if (cached) return cached;
        throw new RepositoryError('ServerError', 'Failed to fetch friendships.');
      }

      const data = await res.json();
      const list: FriendshipsList = {
        accepted: data.accepted || [],
        pendingIncoming: data.pendingIncoming || [],
        pendingOutgoing: data.pendingOutgoing || [],
        activeInvitations: data.activeInvitations || []
      };

      // Cache locally for offline viewing
      safeSetItem(STORAGE_KEY_CACHED_FRIENDS, list);
      return list;
    } catch (err: any) {
      const cached = safeGetItem<FriendshipsList>(STORAGE_KEY_CACHED_FRIENDS);
      if (cached) return cached;
      throw new RepositoryError('Offline', 'Cannot load friends while offline.', err);
    }
  }

  async respondToRequest(friendshipId: string, action: 'accept' | 'decline'): Promise<Friendship> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/friends/${encodeURIComponent(friendshipId)}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          throw new RepositoryError('PermissionDenied', data.error || 'Unauthorized to respond to this request.');
        }
        throw new RepositoryError('ServerError', data.error || 'Failed to respond to request.');
      }
      return data.friendship;
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot respond to friend request while offline.', err);
    }
  }

  async removeFriend(friendshipId: string): Promise<boolean> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/friends/${encodeURIComponent(friendshipId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new RepositoryError('ServerError', data.error || 'Failed to remove connection.');
      }
      return Boolean(data.success);
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot remove connection while offline.', err);
    }
  }

  async revokeInvitation(inviteCode: string): Promise<boolean> {
    const token = this.getAuthToken();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/friends/invite/${encodeURIComponent(inviteCode)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new RepositoryError('ServerError', data.error || 'Failed to revoke invitation.');
      }
      return Boolean(data.success);
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot revoke invitation while offline.', err);
    }
  }
}
