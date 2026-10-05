/**
 * Web Implementation of IAppStorage
 * 
 * Backed by browser LocalStorage via storageSafety.ts with quota guards and validation.
 */

import type { IAppStorage } from '../interfaces/storage.ts';
import { safeGetItem, safeSetItem, safeRemoveItem, wipeAllLocalData } from '../../utils/storageSafety.ts';

export class WebLocalStorage implements IAppStorage {
  async get<T>(key: string): Promise<T | null> {
    return safeGetItem<T>(key);
  }

  async set<T>(key: string, value: T): Promise<boolean> {
    return safeSetItem<T>(key, value);
  }

  async remove(key: string): Promise<boolean> {
    return safeRemoveItem(key);
  }

  async clear(): Promise<boolean> {
    return wipeAllLocalData();
  }
}
