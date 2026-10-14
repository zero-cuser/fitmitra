package com.fitmitra.core.domain.repositories

import com.fitmitra.core.domain.models.FriendInvitation
import com.fitmitra.core.domain.models.Friendship
import com.fitmitra.core.domain.models.FriendshipsList
import com.fitmitra.core.domain.models.SharedChallenge
import com.fitmitra.core.domain.models.SharedChallengeDetails

/**
 * Android Domain Contract: Campus Social & Shared Challenges Repository
 *
 * Provides operations for friend connections via secure invite codes
 * and cohort-scoped private shared challenges.
 */
interface ISocialRepository {
    suspend fun createFriendInvitation(): Result<FriendInvitation>
    suspend fun sendFriendRequest(inviteCode: String): Result<Friendship>
    suspend fun respondToFriendRequest(friendshipId: String, accept: Boolean): Result<Unit>
    suspend fun getFriendships(): Result<FriendshipsList>
    suspend fun removeFriend(friendshipId: String): Result<Unit>
    suspend fun revokeInvitation(code: String): Result<Unit>

    suspend fun createSharedChallenge(
        title: String,
        description: String,
        exerciseKey: String,
        targetMetric: String,
        targetValue: Int,
        maxParticipants: Int = 10,
        durationDays: Int = 7
    ): Result<SharedChallenge>

    suspend fun joinSharedChallenge(code: String): Result<SharedChallenge>
    suspend fun getUserChallenges(): Result<List<SharedChallenge>>
    suspend fun getChallengeDetails(challengeId: String): Result<SharedChallengeDetails>
    suspend fun contributeToChallenge(challengeId: String, amount: Int, activityId: String? = null): Result<Int>
    suspend fun leaveChallenge(challengeId: String): Result<Unit>
    suspend fun cancelChallenge(challengeId: String): Result<Unit>
}
