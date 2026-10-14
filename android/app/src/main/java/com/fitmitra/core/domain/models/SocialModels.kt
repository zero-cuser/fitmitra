package com.fitmitra.core.domain.models

/**
 * FitMitra Android Domain Models: Campus Social & Shared Challenges
 *
 * 100% pure Kotlin models representing platform-neutral contracts.
 * Matches web contracts from src/domain/models/social.ts.
 */

data class FriendInvitation(
    val id: String,
    val code: String,
    val createdBy: String,
    val creatorName: String,
    val createdAt: String,
    val expiresAt: String,
    val isRevoked: Boolean
)

data class FriendProfile(
    val accountId: String,
    val displayName: String,
    val username: String,
    val avatarColor: String
)

data class Friendship(
    val id: String,
    val friend: FriendProfile,
    val status: String, // "pending" | "accepted"
    val isIncoming: Boolean,
    val createdAt: String,
    val updatedAt: String
)

data class FriendshipsList(
    val friends: List<Friendship> = emptyList(),
    val pendingIncoming: List<Friendship> = emptyList(),
    val pendingOutgoing: List<Friendship> = emptyList()
)

data class SharedChallenge(
    val id: String,
    val code: String,
    val title: String,
    val description: String,
    val exerciseKey: String,
    val targetMetric: String, // "rep_target" | "duration_target" | "session_count" | "streak"
    val targetValue: Int,
    val creatorId: String,
    val creatorName: String,
    val maxParticipants: Int,
    val participantCount: Int,
    val startDate: String,
    val endDate: String,
    val isActive: Boolean,
    val userProgress: Int? = null,
    val userRank: Int? = null,
    val completed: Boolean? = null
)

data class ChallengeParticipantSummary(
    val accountId: String,
    val displayName: String,
    val username: String,
    val avatarColor: String,
    val score: Int,
    val rank: Int,
    val completed: Boolean,
    val joinedAt: String,
    val lastContributedAt: String
)

data class SharedChallengeDetails(
    val challenge: SharedChallenge,
    val participants: List<ChallengeParticipantSummary> = emptyList()
)

data class ChallengeContributionRecord(
    val challengeId: String,
    val amount: Int,
    val activityId: String? = null
)
