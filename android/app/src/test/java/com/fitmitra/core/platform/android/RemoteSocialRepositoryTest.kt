package com.fitmitra.core.platform.android

import com.fitmitra.core.domain.models.ChallengeParticipantSummary
import com.fitmitra.core.domain.models.FriendInvitation
import com.fitmitra.core.domain.models.FriendProfile
import com.fitmitra.core.domain.models.Friendship
import com.fitmitra.core.domain.models.FriendshipsList
import com.fitmitra.core.domain.models.SharedChallenge
import com.fitmitra.core.domain.models.SharedChallengeDetails
import com.fitmitra.core.platform.FakeAppStorage
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class RemoteSocialRepositoryTest {

    private lateinit var storage: FakeAppStorage
    private lateinit var socialRepository: RemoteSocialRepository

    @Before
    fun setUp() {
        storage = FakeAppStorage()
        socialRepository = RemoteSocialRepository(storage, "http://127.0.0.1:3999")
    }

    @Test
    fun testUnauthenticatedCallsFailGracefully() = runBlocking {
        // Without auth token in storage, operations fail with authentication error
        val inviteResult = socialRepository.createFriendInvitation()
        assertTrue(inviteResult.isFailure)
        assertTrue(inviteResult.exceptionOrNull()?.message?.contains("Authentication required") == true)

        val friendListResult = socialRepository.getFriendships()
        assertTrue(friendListResult.isFailure)
        assertTrue(friendListResult.exceptionOrNull()?.message?.contains("Authentication required") == true)

        val challengeResult = socialRepository.getUserChallenges()
        assertTrue(challengeResult.isFailure)
        assertTrue(challengeResult.exceptionOrNull()?.message?.contains("Authentication required") == true)
    }

    @Test
    fun testFriendInvitationDomainModel() {
        val invite = FriendInvitation(
            id = "inv_123",
            code = "FIT-8821",
            createdBy = "acc_user1",
            creatorName = "Hostel Gymmer",
            createdAt = "2026-10-14T10:00:00.000Z",
            expiresAt = "2026-10-16T10:00:00.000Z",
            isRevoked = false
        )
        assertEquals("FIT-8821", invite.code)
        assertEquals("Hostel Gymmer", invite.creatorName)
        assertFalse(invite.isRevoked)
    }

    @Test
    fun testFriendshipListStructure() {
        val friend1 = Friendship(
            id = "rel_1",
            friend = FriendProfile(
                accountId = "acc_friend1",
                displayName = "Study Room Buddy",
                username = "buddy99",
                avatarColor = "teal"
            ),
            status = "accepted",
            isIncoming = false,
            createdAt = "2026-10-14T08:00:00.000Z",
            updatedAt = "2026-10-14T08:05:00.000Z"
        )

        val list = FriendshipsList(
            friends = listOf(friend1),
            pendingIncoming = emptyList(),
            pendingOutgoing = emptyList()
        )

        assertEquals(1, list.friends.size)
        assertEquals("buddy99", list.friends[0].friend.username)
        assertEquals("accepted", list.friends[0].status)
    }

    @Test
    fun testSharedChallengeDetailsAndRankings() {
        val challenge = SharedChallenge(
            id = "chal_99",
            code = "CHAL-4455",
            title = "100 Hostel Pushups",
            description = "Hit 100 pushups before midterms",
            exerciseKey = "pushups",
            targetMetric = "rep_target",
            targetValue = 100,
            creatorId = "acc_creator",
            creatorName = "Arjun",
            maxParticipants = 10,
            participantCount = 2,
            startDate = "2026-10-14T00:00:00.000Z",
            endDate = "2026-10-21T00:00:00.000Z",
            isActive = true
        )

        val participant1 = ChallengeParticipantSummary(
            accountId = "acc_creator",
            displayName = "Arjun",
            username = "arjun_fit",
            avatarColor = "emerald",
            score = 65,
            rank = 1,
            completed = false,
            joinedAt = "2026-10-14T00:00:00.000Z",
            lastContributedAt = "2026-10-14T10:00:00.000Z"
        )

        val participant2 = ChallengeParticipantSummary(
            accountId = "acc_friend",
            displayName = "Rohan",
            username = "rohan_fit",
            avatarColor = "indigo",
            score = 40,
            rank = 2,
            completed = false,
            joinedAt = "2026-10-14T01:00:00.000Z",
            lastContributedAt = "2026-10-14T09:30:00.000Z"
        )

        val details = SharedChallengeDetails(
            challenge = challenge,
            participants = listOf(participant1, participant2)
        )

        assertEquals("CHAL-4455", details.challenge.code)
        assertEquals(2, details.participants.size)
        assertEquals(1, details.participants[0].rank)
        assertEquals(65, details.participants[0].score)
        assertEquals(2, details.participants[1].rank)
    }
}
