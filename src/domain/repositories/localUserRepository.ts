/**
 * Local User Repository Adapter
 * 
 * Implements IUserRepository backed by browser LocalStorage via storageSafety.ts and authStorage.ts.
 * Supports first-class anonymous mode: returns an anonymous Account when no credentials exist.
 */

import type { IUserRepository } from './interfaces.ts';
import { RepositoryError } from './interfaces.ts';
import type { Account, DomainUserProfile } from '../models/account.ts';
import { toIsoUtcString } from '../models/account.ts';
import { safeGetItem, safeSetItem, safeRemoveItem, STORAGE_KEYS } from '../../utils/storageSafety.ts';
import type { UserProfile } from '../../types/fitness.ts';

export class LocalUserRepository implements IUserRepository {
  async getCurrentAccount(): Promise<Account | null> {
    const authStatus = safeGetItem<string>(STORAGE_KEYS.AUTH_STATUS);
    const storedUser = safeGetItem<UserProfile>(STORAGE_KEYS.USER);

    if (authStatus === 'logged_out') {
      return null;
    }

    if (storedUser && typeof storedUser.id === 'string') {
      const isGuest = authStatus === 'guest';
      return {
        id: `acc_${storedUser.id}`,
        authType: isGuest ? 'anonymous' : 'authenticated',
        provider: isGuest ? undefined : 'email',
        email: storedUser.email,
        emailVerified: false,
        createdAt: toIsoUtcString(new Date(storedUser.joinedDate || Date.now())),
        updatedAt: toIsoUtcString(),
        lastSeenAt: toIsoUtcString()
      };
    }

    // Default: First-class Anonymous Local Account
    return {
      id: 'acc_anonymous_local',
      authType: 'anonymous',
      emailVerified: false,
      createdAt: toIsoUtcString(),
      updatedAt: toIsoUtcString(),
      lastSeenAt: toIsoUtcString()
    };
  }

  async getProfile(accountId: string): Promise<DomainUserProfile | null> {
    const stored = safeGetItem<UserProfile>(STORAGE_KEYS.USER);
    if (!stored) {
      return null;
    }

    return {
      accountId: accountId || `acc_${stored.id}`,
      displayName: stored.name,
      username: stored.username,
      avatarColor: stored.avatarColor,
      hostelWing: stored.hostelWing,
      fitnessGoal: stored.goal,
      goals: stored.goals || [stored.goal],
      biometrics: {
        age: stored.age,
        gender: stored.gender,
        heightCm: stored.heightCm,
        weightKg: stored.weightKg,
        activityLevel: stored.activityLevel,
        calculatedBmr: stored.calculatedBmr,
        targetDailyCalories: stored.targetDailyCalories,
        targetWaterMl: stored.targetWaterMl
      },
      preferences: {
        noiseTolerance: 'silent',
        space: 'small',
        soundMuted: false,
        voiceCoachEnabled: true
      },
      createdAt: toIsoUtcString(new Date(stored.joinedDate || Date.now())),
      updatedAt: toIsoUtcString()
    };
  }

  async saveProfile(profile: DomainUserProfile): Promise<void> {
    if (!profile.accountId || !profile.displayName || !profile.username) {
      throw new RepositoryError('Unknown', 'Invalid domain user profile: missing required identifier or name.');
    }

    const legacyUserFormat: UserProfile = {
      id: profile.accountId.replace(/^acc_/, ''),
      name: profile.displayName,
      username: profile.username,
      email: `${profile.username}@local.fitmitra.dev`,
      hostelWing: profile.hostelWing,
      goal: profile.fitnessGoal,
      goals: profile.goals,
      joinedDate: profile.createdAt,
      avatarColor: profile.avatarColor,
      age: profile.biometrics?.age,
      gender: profile.biometrics?.gender,
      heightCm: profile.biometrics?.heightCm,
      weightKg: profile.biometrics?.weightKg,
      activityLevel: profile.biometrics?.activityLevel,
      calculatedBmr: profile.biometrics?.calculatedBmr,
      targetDailyCalories: profile.biometrics?.targetDailyCalories,
      targetWaterMl: profile.biometrics?.targetWaterMl
    };

    safeSetItem(STORAGE_KEYS.USER, legacyUserFormat);
  }

  async clearUser(): Promise<void> {
    safeRemoveItem(STORAGE_KEYS.USER);
    safeSetItem(STORAGE_KEYS.AUTH_STATUS, 'logged_out');
  }
}
