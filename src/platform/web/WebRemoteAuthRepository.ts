/**
 * FitMitra Web Remote Auth Repository
 * 
 * Implements IAuthRepository over HTTPS REST to the FitMitra backend API.
 * Handles JWT token storage, session restoration, and graceful offline fallback.
 */

import type { IAuthRepository } from '../../domain/repositories/interfaces.ts';
import { RepositoryError } from '../../domain/repositories/interfaces.ts';
import type { AccountDeletionResult, AuthCredentials, AuthSession } from '../../domain/models/sync.ts';
import { safeGetItem, safeSetItem, safeRemoveItem, STORAGE_KEYS, wipeAllLocalData } from '../../utils/storageSafety.ts';

const STORAGE_KEY_AUTH_TOKEN = 'fitmitra_auth_token_v1';
const STORAGE_KEY_AUTH_SESSION = 'fitmitra_auth_session_v1';

export class WebRemoteAuthRepository implements IAuthRepository {
  private baseUrl: string;

  constructor(baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getAuthHeader(): Record<string, string> {
    const token = safeGetItem<string>(STORAGE_KEY_AUTH_TOKEN);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async register(credentials: AuthCredentials): Promise<AuthSession> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new RepositoryError(
          res.status === 409 ? 'Conflict' : 'Unknown',
          data.error || 'Registration failed.'
        );
      }

      const session: AuthSession = {
        token: data.token,
        accountId: data.account.id,
        email: data.account.email,
        username: data.profile.username,
        displayName: data.profile.displayName,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      safeSetItem(STORAGE_KEY_AUTH_TOKEN, data.token);
      safeSetItem(STORAGE_KEY_AUTH_SESSION, session);
      safeSetItem(STORAGE_KEYS.AUTH_STATUS, 'authenticated');

      return session;
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot reach backend server. Operating in offline mode.', err);
    }
  }

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new RepositoryError(
          res.status === 401 ? 'NotAuthenticated' : res.status === 429 ? 'Conflict' : 'Unknown',
          data.error || 'Authentication failed.'
        );
      }

      const session: AuthSession = {
        token: data.token,
        accountId: data.account.id,
        email: data.account.email,
        username: data.profile.username,
        displayName: data.profile.displayName,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      safeSetItem(STORAGE_KEY_AUTH_TOKEN, data.token);
      safeSetItem(STORAGE_KEY_AUTH_SESSION, session);
      safeSetItem(STORAGE_KEYS.AUTH_STATUS, 'authenticated');

      return session;
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('Offline', 'Cannot reach backend server. Operating in offline mode.', err);
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        }
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      safeRemoveItem(STORAGE_KEY_AUTH_TOKEN);
      safeRemoveItem(STORAGE_KEY_AUTH_SESSION);
      safeSetItem(STORAGE_KEYS.AUTH_STATUS, 'logged_out');
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const status = safeGetItem<string>(STORAGE_KEYS.AUTH_STATUS);
    if (status === 'logged_out') return null;

    const token = safeGetItem<string>(STORAGE_KEY_AUTH_TOKEN);
    const cachedSession = safeGetItem<AuthSession>(STORAGE_KEY_AUTH_SESSION);
    if (!token || !cachedSession) return null;

    // Check cached token expiration
    if (new Date(cachedSession.expiresAt).getTime() < Date.now()) {
      await this.logout();
      return null;
    }

    return cachedSession;
  }

  async deleteAccount(password: string, deleteRemoteDataOnly = false): Promise<AccountDeletionResult> {
    const session = await this.getCurrentSession();
    if (!session) {
      throw new RepositoryError('NotAuthenticated', 'Must be authenticated to delete account.');
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader()
        },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new RepositoryError(
          res.status === 403 ? 'PermissionDenied' : 'Unknown',
          data.error || 'Account deletion failed.'
        );
      }

      if (!deleteRemoteDataOnly) {
        wipeAllLocalData();
      } else {
        safeRemoveItem(STORAGE_KEY_AUTH_TOKEN);
        safeRemoveItem(STORAGE_KEY_AUTH_SESSION);
        safeSetItem(STORAGE_KEYS.AUTH_STATUS, 'logged_out');
      }

      return {
        success: true,
        remoteDataDeleted: true,
        localDataDeleted: !deleteRemoteDataOnly,
        accountId: session.accountId
      };
    } catch (err: any) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError('ServerError', 'Failed to execute account deletion on remote server.', err);
    }
  }
}
