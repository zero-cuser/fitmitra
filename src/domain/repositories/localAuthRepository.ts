/**
 * FitMitra Local Auth Repository Implementation
 * 
 * Implements IAuthRepository for local-only, anonymous operation.
 * Completely offline, zero network requests, zero remote dependencies.
 */

import type { IAuthRepository } from './interfaces.ts';
import { RepositoryError } from './interfaces.ts';
import type { AccountDeletionResult, AuthCredentials, AuthSession } from '../models/sync.ts';
import { safeGetItem, safeSetItem, safeRemoveItem, STORAGE_KEYS, wipeAllLocalData } from '../../utils/storageSafety.ts';

const STORAGE_KEY_AUTH_SESSION = 'fitmitra_local_session_v1';

export class LocalAuthRepository implements IAuthRepository {
  async register(credentials: AuthCredentials): Promise<AuthSession> {
    if (!credentials.email || !credentials.password) {
      throw new RepositoryError('Unknown', 'Email and password are required.');
    }
    if (credentials.password.length < 4) {
      throw new RepositoryError('Unknown', 'Password must be at least 4 characters.');
    }

    const email = credentials.email.trim().toLowerCase();
    const username = credentials.username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const displayName = credentials.displayName || (username.charAt(0).toUpperCase() + username.slice(1));
    const accountId = `acc_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    const session: AuthSession = {
      token: `local_token_${Date.now()}`,
      accountId,
      email,
      username,
      displayName,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    safeSetItem(STORAGE_KEY_AUTH_SESSION, session);
    safeSetItem(STORAGE_KEYS.AUTH_STATUS, 'authenticated');
    return session;
  }

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    if (!credentials.email || !credentials.password) {
      throw new RepositoryError('Unknown', 'Email and password are required.');
    }

    const existing = safeGetItem<AuthSession>(STORAGE_KEY_AUTH_SESSION);
    if (existing && existing.email.toLowerCase() === credentials.email.trim().toLowerCase()) {
      safeSetItem(STORAGE_KEYS.AUTH_STATUS, 'authenticated');
      return existing;
    }

    // For local mode, generate a valid session for the given credentials
    return this.register(credentials);
  }

  async logout(): Promise<void> {
    safeRemoveItem(STORAGE_KEY_AUTH_SESSION);
    safeSetItem(STORAGE_KEYS.AUTH_STATUS, 'logged_out');
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const authStatus = safeGetItem<string>(STORAGE_KEYS.AUTH_STATUS);
    if (authStatus === 'logged_out') {
      return null;
    }

    const session = safeGetItem<AuthSession>(STORAGE_KEY_AUTH_SESSION);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.logout();
      return null;
    }

    return session;
  }

  async deleteAccount(_password: string, deleteRemoteDataOnly = false): Promise<AccountDeletionResult> {
    const current = await this.getCurrentSession();
    const accountId = current?.accountId || 'unknown';

    if (!deleteRemoteDataOnly) {
      wipeAllLocalData();
    } else {
      await this.logout();
    }

    return {
      success: true,
      remoteDataDeleted: true,
      localDataDeleted: !deleteRemoteDataOnly,
      accountId
    };
  }
}
