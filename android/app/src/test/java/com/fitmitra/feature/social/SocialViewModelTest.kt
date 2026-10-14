package com.fitmitra.feature.social

import com.fitmitra.core.domain.models.*
import com.fitmitra.core.domain.repositories.ISocialRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SocialViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var fakeRepo: FakeSocialRepository
    private lateinit var viewModel: SocialViewModel

    class FakeSocialRepository : ISocialRepository {
        var shouldFail = false
        var lastFriendCodeSent: String? = null
        var lastChallengeCodeJoined: String? = null
        var lastRespondedFriendshipId: String? = null
        var lastAccepted: Boolean? = null

        override suspend fun createFriendInvitation(): Result<FriendInvitation> {
            if (shouldFail) return Result.failure(Exception("Network error."))
            return Result.success(
                FriendInvitation(
                    id = "inv_test_1",
                    code = "FIT-TEST",
                    createdBy = "acc_1",
                    creatorName = "Tester",
                    createdAt = "2026-10-14T00:00:00Z",
                    expiresAt = "2026-10-16T00:00:00Z",
                    isRevoked = false
                )
            )
        }

        override suspend fun sendFriendRequest(inviteCode: String): Result<Friendship> {
            if (shouldFail) return Result.failure(Exception("Invalid code."))
            lastFriendCodeSent = inviteCode
            return Result.success(
                Friendship(
                    id = "rel_test",
                    friend = FriendProfile("acc_2", "Buddy", "buddy99", "blue"),
                    status = "pending",
                    isIncoming = false,
                    createdAt = "2026-10-14T00:00:00Z",
                    updatedAt = "2026-10-14T00:00:00Z"
                )
            )
        }

        override suspend fun respondToFriendRequest(friendshipId: String, accept: Boolean): Result<Unit> {
            if (shouldFail) return Result.failure(Exception("Action failed."))
            lastRespondedFriendshipId = friendshipId
            lastAccepted = accept
            return Result.success(Unit)
        }

        override suspend fun getFriendships(): Result<FriendshipsList> {
            if (shouldFail) return Result.failure(Exception("Cannot fetch friends."))
            return Result.success(
                FriendshipsList(
                    friends = listOf(
                        Friendship("rel_1", FriendProfile("acc_f1", "Alex", "alex_fit", "teal"), "accepted", false, "", "")
                    ),
                    pendingIncoming = listOf(
                        Friendship("rel_2", FriendProfile("acc_f2", "Sam", "sam_fit", "indigo"), "pending", true, "", "")
                    ),
                    pendingOutgoing = emptyList()
                )
            )
        }

        override suspend fun removeFriend(friendshipId: String): Result<Unit> = Result.success(Unit)
        override suspend fun revokeInvitation(code: String): Result<Unit> = Result.success(Unit)

        override suspend fun createSharedChallenge(
            title: String,
            description: String,
            exerciseKey: String,
            targetMetric: String,
            targetValue: Int,
            maxParticipants: Int,
            durationDays: Int
        ): Result<SharedChallenge> {
            return Result.success(
                SharedChallenge(
                    id = "chal_1",
                    code = "CHAL-TEST",
                    title = title,
                    description = description,
                    exerciseKey = exerciseKey,
                    targetMetric = targetMetric,
                    targetValue = targetValue,
                    creatorId = "acc_1",
                    creatorName = "Tester",
                    maxParticipants = maxParticipants,
                    participantCount = 1,
                    startDate = "",
                    endDate = "",
                    isActive = true
                )
            )
        }

        override suspend fun joinSharedChallenge(code: String): Result<SharedChallenge> {
            if (shouldFail) return Result.failure(Exception("Cannot join challenge."))
            lastChallengeCodeJoined = code
            return Result.success(
                SharedChallenge(
                    id = "chal_2",
                    code = code,
                    title = "Joined Challenge",
                    description = "",
                    exerciseKey = "squats",
                    targetMetric = "rep_target",
                    targetValue = 50,
                    creatorId = "acc_creator",
                    creatorName = "Hostel Gym",
                    maxParticipants = 10,
                    participantCount = 2,
                    startDate = "",
                    endDate = "",
                    isActive = true
                )
            )
        }

        override suspend fun getUserChallenges(): Result<List<SharedChallenge>> {
            return Result.success(emptyList())
        }

        override suspend fun getChallengeDetails(challengeId: String): Result<SharedChallengeDetails> {
            throw NotImplementedError()
        }

        override suspend fun contributeToChallenge(challengeId: String, amount: Int, activityId: String?): Result<Int> {
            return Result.success(amount)
        }

        override suspend fun leaveChallenge(challengeId: String): Result<Unit> = Result.success(Unit)
        override suspend fun cancelChallenge(challengeId: String): Result<Unit> = Result.success(Unit)
    }

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeRepo = FakeSocialRepository()
        viewModel = SocialViewModel(fakeRepo)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testInitialLoadPopulatesFriendsAndPending() = runTest {
        testDispatcher.scheduler.advanceUntilIdle()
        val state = viewModel.uiState.value
        assertEquals(1, state.friends.size)
        assertEquals("alex_fit", state.friends[0].friend.username)
        assertEquals(1, state.pendingIncoming.size)
        assertEquals("sam_fit", state.pendingIncoming[0].friend.username)
    }

    @Test
    fun testGenerateInviteCodeUpdatesState() = runTest {
        viewModel.generateInviteCode()
        testDispatcher.scheduler.advanceUntilIdle()
        val state = viewModel.uiState.value
        assertEquals("FIT-TEST", state.activeInviteCode)
        assertTrue(state.isSuccessFeedback)
        assertTrue(state.feedbackMessage?.contains("FIT-TEST") == true)
    }

    @Test
    fun testSendFriendRequestDispatchesCode() = runTest {
        viewModel.sendFriendRequest("fit-4422")
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("FIT-4422", fakeRepo.lastFriendCodeSent)
        assertTrue(viewModel.uiState.value.isSuccessFeedback)
    }

    @Test
    fun testRespondToRequestDispatchesAcceptance() = runTest {
        viewModel.respondToRequest("rel_2", true)
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("rel_2", fakeRepo.lastRespondedFriendshipId)
        assertEquals(true, fakeRepo.lastAccepted)
    }

    @Test
    fun testJoinChallengeDispatchesCode() = runTest {
        viewModel.joinChallenge("chal-9911")
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("CHAL-9911", fakeRepo.lastChallengeCodeJoined)
        assertTrue(viewModel.uiState.value.feedbackMessage?.contains("Joined challenge") == true)
    }
}
