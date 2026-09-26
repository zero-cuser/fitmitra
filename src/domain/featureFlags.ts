/**
 * FitMitra Feature Flags Configuration
 * 
 * Provides a lightweight, typed feature toggling mechanism.
 * Decouples current local-first features from upcoming cloud/account infrastructure.
 */

export interface FeatureFlags {
  /** Enables cloud synchronization of workout history and profile */
  cloudSync: boolean;
  /** Enables mandatory or advanced cloud account authentication */
  accounts: boolean;
  /** Enables campus-wide competitive server-authoritative leaderboards */
  serverLeaderboards: boolean;
  /** Enables campus challenges module */
  campusChallenges: boolean;
  /** Enables adaptive hostel room workout constraint solver */
  adaptiveHostelEngine: boolean;
  /** Enables student exam mode study breaks & timer */
  examMode: boolean;
  /** Enables on-device computer vision AI Pose Coach */
  aiPoseCoach: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  cloudSync: false,
  accounts: false,
  serverLeaderboards: false,
  campusChallenges: true,
  adaptiveHostelEngine: true,
  examMode: true,
  aiPoseCoach: true,
};

let currentFlags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

/**
 * Returns an immutable snapshot of current feature flags.
 */
export function getFeatureFlags(): Readonly<FeatureFlags> {
  return { ...currentFlags };
}

/**
 * Overrides a specific feature flag for testing or runtime experimentation.
 */
export function overrideFeatureFlag(flag: keyof FeatureFlags, value: boolean): void {
  currentFlags[flag] = value;
}

/**
 * Resets all feature flags back to default production baseline.
 */
export function resetFeatureFlags(): void {
  currentFlags = { ...DEFAULT_FEATURE_FLAGS };
}
