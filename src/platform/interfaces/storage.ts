/**
 * FitMitra Platform Key-Value Storage Interface
 * 
 * Abstract contract implemented by Web (LocalStorage with quota guards)
 * and Android (Jetpack DataStore / Room).
 */

export interface IAppStorage {
  /**
   * Retrieves a typed value by key.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Persists a typed value.
   */
  set<T>(key: string, value: T): Promise<boolean>;

  /**
   * Deletes a key from storage.
   */
  remove(key: string): Promise<boolean>;

  /**
   * Clears all application storage keys.
   */
  clear(): Promise<boolean>;
}
