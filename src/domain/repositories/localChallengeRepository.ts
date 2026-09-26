/**
 * Local Challenge Repository Adapter
 * 
 * Implements IChallengeRepository backed by the local campus challenges catalog
 * and browser LocalStorage via storageSafety.ts.
 */

import type { IChallengeRepository } from './interfaces.ts';
import { RepositoryError } from './interfaces.ts';
import type { ChallengeDefinition, ChallengeParticipation } from '../models/account.ts';
import { CAMPUS_CHALLENGES_CATALOG } from '../../services/campusChallengesService.ts';
import { safeGetItem, safeSetItem, STORAGE_KEYS } from '../../utils/storageSafety.ts';
import { toIsoUtcString } from '../models/account.ts';

export class LocalChallengeRepository implements IChallengeRepository {
  private loadAllStoredProgress(): Record<string, ChallengeParticipation> {
    const stored = safeGetItem<Record<string, any>>(STORAGE_KEYS.CHALLENGE_PROGRESS);
    if (!stored || typeof stored !== 'object') {
      return {};
    }

    const result: Record<string, ChallengeParticipation> = {};
    for (const [key, val] of Object.entries(stored)) {
      if (val && typeof val === 'object' && val.challengeId) {
        result[key] = {
          id: val.id || `part_${val.accountId || 'local'}_${val.challengeId}`,
          accountId: val.accountId || 'local',
          challengeId: val.challengeId,
          joinedAt: val.joinedAt || toIsoUtcString(),
          currentValue: typeof val.currentValue === 'number' ? val.currentValue : 0,
          targetValue: typeof val.targetValue === 'number' ? val.targetValue : 100,
          completedDays: Array.isArray(val.completedDays) ? val.completedDays : [],
          completedSessions: typeof val.completedSessions === 'number' ? val.completedSessions : 0,
          processedActivityIds: Array.isArray(val.processedActivityIds) ? val.processedActivityIds : [],
          completed: Boolean(val.completed),
          completedAt: val.completedAt
        };
      }
    }
    return result;
  }

  private persistAllProgress(all: Record<string, ChallengeParticipation>): void {
    safeSetItem(STORAGE_KEYS.CHALLENGE_PROGRESS, all);
  }

  async getChallengeDefinitions(): Promise<ChallengeDefinition[]> {
    return CAMPUS_CHALLENGES_CATALOG.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      type: c.type,
      targetValue: c.targetValue,
      unit: c.unit,
      durationDays: c.durationDays,
      rules: [...c.rules],
      exerciseKeys: c.exerciseKeys ? [...c.exerciseKeys] : undefined,
      tagline: c.tagline
    }));
  }

  async getChallengeDefinition(challengeId: string): Promise<ChallengeDefinition | null> {
    const definitions = await this.getChallengeDefinitions();
    const found = definitions.find((d) => d.id === challengeId);
    return found ? { ...found } : null;
  }

  async getParticipation(accountId: string, challengeId: string): Promise<ChallengeParticipation | null> {
    const all = this.loadAllStoredProgress();
    const key = `${accountId}_${challengeId}`;
    // Also support fallback to challengeId alone for backward compatibility with Phase 5 storage
    const found = all[key] || all[challengeId];
    return found ? { ...found } : null;
  }

  async getAllParticipations(accountId: string): Promise<ChallengeParticipation[]> {
    const all = this.loadAllStoredProgress();
    return Object.values(all).filter((p) => p.accountId === accountId || p.accountId === 'local');
  }

  async joinChallenge(accountId: string, challengeId: string): Promise<ChallengeParticipation> {
    const definition = await this.getChallengeDefinition(challengeId);
    if (!definition) {
      throw new RepositoryError('NotFound', `Challenge definition "${challengeId}" not found in catalog.`);
    }

    const all = this.loadAllStoredProgress();
    const key = `${accountId}_${challengeId}`;

    if (all[key]) {
      return { ...all[key] };
    }

    const newParticipation: ChallengeParticipation = {
      id: `part_${accountId}_${challengeId}`,
      accountId,
      challengeId,
      joinedAt: toIsoUtcString(),
      currentValue: 0,
      targetValue: definition.targetValue,
      completedDays: [],
      completedSessions: 0,
      processedActivityIds: [],
      completed: false
    };

    all[key] = newParticipation;
    this.persistAllProgress(all);
    return { ...newParticipation };
  }

  async leaveChallenge(accountId: string, challengeId: string): Promise<void> {
    const all = this.loadAllStoredProgress();
    const key = `${accountId}_${challengeId}`;

    let removed = false;
    if (all[key]) {
      delete all[key];
      removed = true;
    }
    if (all[challengeId]) {
      delete all[challengeId];
      removed = true;
    }

    if (removed) {
      this.persistAllProgress(all);
    }
  }

  async saveParticipation(participation: ChallengeParticipation): Promise<void> {
    if (!participation.challengeId || !participation.accountId) {
      throw new RepositoryError('Unknown', 'Invalid challenge participation: missing required identifiers.');
    }

    const all = this.loadAllStoredProgress();
    const key = `${participation.accountId}_${participation.challengeId}`;
    all[key] = { ...participation };
    this.persistAllProgress(all);
  }
}
