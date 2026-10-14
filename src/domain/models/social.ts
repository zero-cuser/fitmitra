/**
 * FitMitra Campus Social & Shared Challenge Domain Models
 * 
 * Defines platform-neutral types for privacy-first friend connections,
 * invitation codes, and private student challenges.
 */

export interface FriendInvitation {
  id: string;
  creatorAccountId: string;
  inviteCode: string;
  expiresAt: string;
  maxUses: number;
  usesCount: number;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
}

export interface FriendProfile {
  displayName: string;
  avatarColor: string;
  hostelWing?: string;
  username?: string;
}

export interface Friendship {
  id: string;
  accountId: string;
  friendAccountId: string;
  status: 'pending' | 'accepted' | 'declined';
  initiatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FriendshipsList {
  accepted: Array<{
    friendshipId: string;
    friend: FriendProfile;
    since: string;
  }>;
  pendingIncoming: Array<{
    friendshipId: string;
    requester: FriendProfile;
    requestedAt: string;
  }>;
  pendingOutgoing: Array<{
    friendshipId: string;
    recipient: FriendProfile;
    requestedAt: string;
  }>;
  activeInvitations: FriendInvitation[];
}

export interface SharedChallenge {
  id: string;
  ownerAccountId: string;
  title: string;
  description: string;
  category: 'strength' | 'consistency' | 'cardio' | 'posture' | 'exam';
  type: 'rep_target' | 'duration_target' | 'session_count' | 'streak';
  targetValue: number;
  unit: string;
  exerciseKeys?: string[];
  startDate: string;
  endDate: string;
  maxParticipants: number;
  inviteCode: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  userProgress?: number;
  userPercentage?: number;
  isOwner?: boolean;
  activeParticipantsCount?: number;
}

export interface ChallengeParticipantSummary {
  participantId: string;
  displayName: string;
  avatarColor: string;
  hostelWing?: string;
  role: 'owner' | 'participant';
  currentValue: number;
  percentage: number;
  completed: boolean;
  completedAt?: string;
  isCurrentUser: boolean;
}

export interface SharedChallengeDetails {
  challenge: SharedChallenge;
  participants: ChallengeParticipantSummary[];
  isOwner: boolean;
}

export interface ChallengeContributionRecord {
  id: string;
  challengeId: string;
  accountId: string;
  activityId: string;
  activityType: string;
  exerciseKey?: string;
  metricValue: number;
  activityTimestamp: string;
  createdAt: string;
}
