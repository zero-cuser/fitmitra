import type {
  CampusChallenge,
  ChallengeCategory,
  ChallengeDifficulty,
  ChallengeProgress,
  ChallengeType,
  CompletedActivityRecord,
  ExerciseKey,
  WorkoutConstraints
} from '../types/fitness.ts';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from '../utils/storageSafety.ts';

/**
 * Deterministic local catalog of campus challenges.
 * Designed for student living: equipment-free, compact space, quiet, and realistic.
 */
export const CAMPUS_CHALLENGES_CATALOG: CampusChallenge[] = [
  {
    id: 'challenge_7day_streak',
    title: '7-Day Movement Streak',
    description: 'Complete at least one movement or study break session each day for 7 consecutive days.',
    category: 'consistency',
    type: 'streak',
    targetValue: 7,
    unit: 'days',
    durationDays: 7,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    difficulty: 'beginner',
    isSampleData: true,
    tagline: 'Build a steady daily habit',
    rules: [
      'Complete any workout session or Exam Mode study break once per day.',
      'One qualifying activity logged on a calendar day counts toward that day.',
      'Rest days can be met with gentle 2-minute exam resets.'
    ],
    constraints: {
      space: 'small',
      equipment: ['none'],
      noiseTolerance: 'silent',
      goal: 'wellness',
      difficulty: 'beginner',
      energyLevel: 'low'
    }
  },
  {
    id: 'challenge_100_squats',
    title: '100 Squats This Week',
    description: 'Accumulate 100 bodyweight squats verified by on-device computer vision.',
    category: 'strength',
    type: 'rep_target',
    targetValue: 100,
    unit: 'reps',
    durationDays: 7,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    exerciseKeys: ['squats'],
    difficulty: 'beginner',
    isSampleData: true,
    tagline: 'Lower body foundation',
    rules: [
      'Only squats verified with proper depth (sub-125° knee flexion) count.',
      'Reps can be accumulated across multiple morning or evening sessions.',
      'Zero equipment required — entirely hostel bedside friendly.'
    ],
    constraints: {
      goal: 'strength',
      preferredExerciseIds: ['squats'],
      space: 'small',
      equipment: ['none'],
      noiseTolerance: 'silent',
      difficulty: 'beginner'
    }
  },
  {
    id: 'challenge_50_pushups',
    title: '50 Push-Ups This Week',
    description: 'Complete 50 clean push-ups across your dorm workouts with full lockout.',
    category: 'strength',
    type: 'rep_target',
    targetValue: 50,
    unit: 'reps',
    durationDays: 7,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    exerciseKeys: ['pushups'],
    difficulty: 'intermediate',
    isSampleData: true,
    tagline: 'Upper body chest & triceps',
    rules: [
      'Full arm kinematic extension and chest press depth verified by pose engine.',
      'Break into sets of 5 to 10 reps across the week to avoid form degradation.',
      'Floor mat or bedroom rug recommended.'
    ],
    constraints: {
      goal: 'strength',
      preferredExerciseIds: ['pushups'],
      space: 'medium',
      equipment: ['none'],
      noiseTolerance: 'silent',
      difficulty: 'intermediate'
    }
  },
  {
    id: 'challenge_5_hostel_workouts',
    title: '5 Hostel Workouts',
    description: 'Complete 5 quiet, compact hostel room workout routines.',
    category: 'hostel',
    type: 'session_count',
    targetValue: 5,
    unit: 'sessions',
    durationDays: 7,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    difficulty: 'beginner',
    isSampleData: true,
    tagline: 'Dorm-friendly consistency',
    rules: [
      'Workouts must fit within small bedside dorm floor space.',
      'Must maintain low noise tolerance to respect roommates.',
      'Any adaptive hostel routine or guided routine qualifies.'
    ],
    constraints: {
      space: 'small',
      equipment: ['none'],
      noiseTolerance: 'low',
      difficulty: 'beginner'
    }
  },
  {
    id: 'challenge_3day_exam_reset',
    title: '3-Day Exam Reset',
    description: 'Complete 3 study break movement sessions during exam preparation.',
    category: 'exam',
    type: 'session_count',
    targetValue: 3,
    unit: 'resets',
    durationDays: 3,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    difficulty: 'beginner',
    isSampleData: true,
    tagline: 'Desk fatigue recovery',
    rules: [
      'Complete 2m Reset, 5m Break, or 10m Recharge in Exam Mode.',
      'Relieves ocular strain, neck stiffness, and thoracic spine tension.',
      'Zero equipment and zero camera requirement.'
    ],
    constraints: {
      space: 'small',
      equipment: ['none'],
      noiseTolerance: 'silent',
      goal: 'wellness',
      difficulty: 'beginner'
    }
  },
  {
    id: 'challenge_50min_movement',
    title: '50 Minutes of Movement',
    description: 'Accumulate 50 total active minutes across workouts and study breaks.',
    category: 'wellness',
    type: 'duration_target',
    targetValue: 50,
    unit: 'minutes',
    durationDays: 7,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    difficulty: 'beginner',
    isSampleData: true,
    tagline: 'Accumulated weekly activity',
    rules: [
      'All completed workout minutes and Exam Mode study break minutes contribute.',
      'Accumulated gradually over the 7-day challenge period.',
      'Focus on regular movement rather than single high-intensity sessions.'
    ],
    constraints: {
      space: 'small',
      equipment: ['none'],
      goal: 'wellness',
      difficulty: 'beginner'
    }
  }
];

/**
 * Validates challenge schema integrity.
 */
export function validateChallenge(challenge: unknown): challenge is CampusChallenge {
  if (!challenge || typeof challenge !== 'object') return false;
  const c = challenge as Record<string, unknown>;

  if (typeof c.id !== 'string' || !c.id.trim()) return false;
  if (typeof c.title !== 'string' || !c.title.trim()) return false;
  if (typeof c.description !== 'string') return false;

  const validCategories: ChallengeCategory[] = ['strength', 'consistency', 'wellness', 'exam', 'hostel'];
  if (!validCategories.includes(c.category as ChallengeCategory)) return false;

  const validTypes: ChallengeType[] = ['rep_target', 'duration_target', 'streak', 'session_count'];
  if (!validTypes.includes(c.type as ChallengeType)) return false;

  if (typeof c.targetValue !== 'number' || c.targetValue <= 0 || !Number.isFinite(c.targetValue)) return false;
  if (typeof c.durationDays !== 'number' || c.durationDays <= 0) return false;
  if (typeof c.unit !== 'string' || !c.unit.trim()) return false;

  const validDifficulties: ChallengeDifficulty[] = ['beginner', 'intermediate', 'advanced'];
  if (!validDifficulties.includes(c.difficulty as ChallengeDifficulty)) return false;

  return true;
}

/**
 * Returns the complete challenge catalog.
 */
export function getChallengeCatalog(): CampusChallenge[] {
  return CAMPUS_CHALLENGES_CATALOG;
}

/**
 * Finds a single challenge by ID.
 */
export function getChallengeById(id: string): CampusChallenge | undefined {
  return CAMPUS_CHALLENGES_CATALOG.find((c) => c.id === id);
}

/**
 * Loads all stored challenge progress records with fallback and validation.
 */
export function loadAllChallengeProgress(): Record<string, ChallengeProgress> {
  const fallback: Record<string, ChallengeProgress> = {
    challenge_7day_streak: {
      challengeId: 'challenge_7day_streak',
      joinedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      currentValue: 3,
      completedDays: ['2026-09-23', '2026-09-24', '2026-09-25'],
      completedSessions: 3,
      processedActivityIds: ['seed_act_1', 'seed_act_2', 'seed_act_3'],
      completed: false
    },
    challenge_100_squats: {
      challengeId: 'challenge_100_squats',
      joinedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      currentValue: 45,
      completedDays: ['2026-09-24', '2026-09-25'],
      completedSessions: 2,
      processedActivityIds: ['seed_squat_1', 'seed_squat_2'],
      completed: false
    }
  };

  const stored = safeGetItem<Record<string, ChallengeProgress>>(
    STORAGE_KEYS.CHALLENGE_PROGRESS,
    (data): data is Record<string, ChallengeProgress> => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
      return Object.values(data).every((val) => {
        if (!val || typeof val !== 'object') return false;
        const p = val as Record<string, unknown>;
        return typeof p.challengeId === 'string' && typeof p.currentValue === 'number';
      });
    },
    fallback
  );

  return stored || fallback;
}

/**
 * Safely persists challenge progress map.
 */
export function saveChallengeProgress(allProgress: Record<string, ChallengeProgress>): boolean {
  return safeSetItem(STORAGE_KEYS.CHALLENGE_PROGRESS, allProgress);
}

/**
 * Joins a challenge idempotently.
 */
export function joinChallenge(challengeId: string, now = new Date().toISOString()): ChallengeProgress {
  const progressMap = loadAllChallengeProgress();
  if (progressMap[challengeId]) {
    return progressMap[challengeId];
  }

  const newProgress: ChallengeProgress = {
    challengeId,
    joinedAt: now,
    currentValue: 0,
    completedDays: [],
    completedSessions: 0,
    processedActivityIds: [],
    completed: false
  };

  progressMap[challengeId] = newProgress;
  saveChallengeProgress(progressMap);
  return newProgress;
}

/**
 * Leaves / unjoins a challenge.
 */
export function leaveChallenge(challengeId: string): void {
  const progressMap = loadAllChallengeProgress();
  if (progressMap[challengeId]) {
    delete progressMap[challengeId];
    saveChallengeProgress(progressMap);
  }
}

/**
 * Updates joined challenges deterministically when an activity completes.
 * Prevents double-counting by validating activity.id against processedActivityIds.
 */
export function recordActivityProgress(
  activity: CompletedActivityRecord,
  progressMap: Record<string, ChallengeProgress>
): {
  updatedMap: Record<string, ChallengeProgress>;
  updatedChallengeIds: string[];
  newlyCompletedChallengeIds: string[];
} {
  if (!activity || !activity.id) {
    return { updatedMap: progressMap, updatedChallengeIds: [], newlyCompletedChallengeIds: [] };
  }

  const updatedMap: Record<string, ChallengeProgress> = { ...progressMap };
  const updatedChallengeIds: string[] = [];
  const newlyCompletedChallengeIds: string[] = [];

  const activityDate = activity.timestamp ? activity.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];
  const activityMinutes = Math.max(1, Math.round(activity.durationSeconds / 60));

  for (const challengeId of Object.keys(updatedMap)) {
    const progress = { ...updatedMap[challengeId] };
    const challenge = getChallengeById(challengeId);
    if (!challenge) continue;

    // Strict duplicate activity protection: ignore if this activity was already processed
    if (progress.processedActivityIds && progress.processedActivityIds.includes(activity.id)) {
      continue;
    }

    let progressChanged = false;

    switch (challenge.type) {
      case 'rep_target': {
        // Only workouts with matching exerciseKey (or any if unspecified)
        if (activity.type === 'workout' && activity.reps && activity.reps > 0) {
          const matchesExercise =
            !challenge.exerciseKeys ||
            challenge.exerciseKeys.length === 0 ||
            (activity.exerciseKey && challenge.exerciseKeys.includes(activity.exerciseKey));

          if (matchesExercise) {
            progress.currentValue += activity.reps;
            progressChanged = true;
          }
        }
        break;
      }

      case 'duration_target': {
        // Both workouts and exam sessions contribute active minutes
        if (activityMinutes > 0) {
          progress.currentValue += activityMinutes;
          progressChanged = true;
        }
        break;
      }

      case 'session_count': {
        // Exam session challenge requires exam_session; hostel challenge accepts hostel-friendly workouts
        if (challenge.category === 'exam') {
          if (activity.type === 'exam_session') {
            progress.completedSessions += 1;
            progress.currentValue += 1;
            progressChanged = true;
          }
        } else if (challenge.category === 'hostel') {
          if (activity.type === 'workout' || activity.isHostelFriendly) {
            progress.completedSessions += 1;
            progress.currentValue += 1;
            progressChanged = true;
          }
        } else {
          // Generic session count
          progress.completedSessions += 1;
          progress.currentValue += 1;
          progressChanged = true;
        }
        break;
      }

      case 'streak': {
        // Qualifying activity logged on calendar day
        if (!progress.completedDays.includes(activityDate)) {
          progress.completedDays = [...progress.completedDays, activityDate];
          progress.currentValue = progress.completedDays.length;
          progressChanged = true;
        }
        break;
      }
    }

    if (progressChanged) {
      // Record activity ID in processed array to prevent double counting
      progress.processedActivityIds = [...(progress.processedActivityIds || []), activity.id];

      // Clamp progress to target value
      progress.currentValue = Math.min(progress.currentValue, challenge.targetValue);

      // Check for completion
      if (progress.currentValue >= challenge.targetValue && !progress.completed) {
        progress.completed = true;
        progress.completedAt = activity.timestamp || new Date().toISOString();
        newlyCompletedChallengeIds.push(challengeId);
      }

      updatedMap[challengeId] = progress;
      updatedChallengeIds.push(challengeId);
    }
  }

  if (updatedChallengeIds.length > 0) {
    saveChallengeProgress(updatedMap);
  }

  return { updatedMap, updatedChallengeIds, newlyCompletedChallengeIds };
}

/**
 * Maps challenge requirements to WorkoutConstraints for the Adaptive Hostel Workout Engine.
 */
export function mapChallengeToWorkoutConstraints(challenge: CampusChallenge): WorkoutConstraints {
  const baseConstraints: WorkoutConstraints = {
    durationMinutes: 10,
    space: 'small',
    equipment: ['none'],
    noiseTolerance: 'low',
    goal: 'strength',
    difficulty: challenge.difficulty
  };

  if (challenge.category === 'hostel') {
    return {
      ...baseConstraints,
      space: 'small',
      equipment: ['none'],
      noiseTolerance: 'low',
      durationMinutes: 7
    };
  }

  if (challenge.category === 'exam') {
    return {
      ...baseConstraints,
      space: 'small',
      equipment: ['none'],
      noiseTolerance: 'silent',
      goal: 'wellness',
      durationMinutes: 5,
      energyLevel: 'low'
    };
  }

  if (challenge.exerciseKeys && challenge.exerciseKeys.length > 0) {
    return {
      ...baseConstraints,
      preferredExerciseIds: challenge.exerciseKeys,
      ...challenge.constraints
    };
  }

  return {
    ...baseConstraints,
    ...challenge.constraints
  };
}
