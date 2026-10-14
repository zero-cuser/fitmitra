package com.fitmitra.feature.social

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fitmitra.core.theme.FitMitraColors

@Composable
fun SocialScreen(
    viewModel: SocialViewModel,
    onBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()
    var inputCode by remember { mutableStateOf("") }
    var inputChallengeCode by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FitMitraColors.Background)
            .statusBarsPadding()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // Navigation Back
        Box(
            modifier = Modifier
                .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                .semantics {
                    role = Role.Button
                    contentDescription = "Navigate back to Home"
                }
                .clickable { onBack() },
            contentAlignment = Alignment.CenterStart
        ) {
            Text(
                text = "‹ Back",
                color = FitMitraColors.PrimaryBright,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Title Header
        Text(
            text = "Campus Community",
            color = FitMitraColors.TextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Share invite codes with hostel batchmates without sharing phone numbers.",
            color = FitMitraColors.TextSecondary,
            fontSize = 13.sp
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Feedback Banner
        if (state.feedbackMessage != null) {
            val bannerBg = if (state.isSuccessFeedback) FitMitraColors.Success.copy(alpha = 0.15f) else FitMitraColors.Danger.copy(alpha = 0.15f)
            val bannerBorder = if (state.isSuccessFeedback) FitMitraColors.Success else FitMitraColors.Danger
            val bannerText = if (state.isSuccessFeedback) FitMitraColors.Success else FitMitraColors.Danger

            Surface(
                color = bannerBg,
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, bannerBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = state.feedbackMessage ?: "",
                        color = bannerText,
                        fontSize = 13.sp,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = "✕",
                        color = FitMitraColors.TextSecondary,
                        modifier = Modifier
                            .clickable { viewModel.clearFeedback() }
                            .padding(4.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Section 1: My Invite Code
        Surface(
            color = FitMitraColors.Surface,
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderSubtle),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "🔑 Your Friend Invite Code",
                    color = FitMitraColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                Text(
                    text = "Code is valid for 48 hours and up to 5 campus classmates.",
                    color = FitMitraColors.TextSecondary,
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                if (state.activeInviteCode != null) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Surface(
                            color = FitMitraColors.Accent.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Accent.copy(alpha = 0.4f))
                        ) {
                            Text(
                                text = state.activeInviteCode ?: "",
                                color = FitMitraColors.Accent,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }

                        Button(
                            onClick = { viewModel.generateInviteCode() },
                            colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.SurfaceElevated)
                        ) {
                            Text("New Code", color = FitMitraColors.TextPrimary, fontSize = 12.sp)
                        }
                    }
                } else {
                    Button(
                        onClick = { viewModel.generateInviteCode() },
                        enabled = !state.isLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(if (state.isLoading) "Generating..." else "Generate Invite Code", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Section 2: Enter Friend Code
        Surface(
            color = FitMitraColors.Surface,
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderSubtle),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "🤝 Connect with Code",
                    color = FitMitraColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputCode,
                        onValueChange = { inputCode = it.uppercase() },
                        placeholder = { Text("e.g. FIT-8821", color = FitMitraColors.TextSecondary, fontSize = 13.sp) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = FitMitraColors.Primary,
                            unfocusedBorderColor = FitMitraColors.BorderSubtle,
                            focusedTextColor = FitMitraColors.TextPrimary,
                            unfocusedTextColor = FitMitraColors.TextPrimary
                        ),
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            viewModel.sendFriendRequest(inputCode)
                            inputCode = ""
                        },
                        enabled = inputCode.isNotEmpty() && !state.isLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary)
                    ) {
                        Text("Connect")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Section 3: Pending Incoming Requests
        if (state.pendingIncoming.isNotEmpty()) {
            Text(
                text = "Pending Requests (${state.pendingIncoming.size})",
                color = FitMitraColors.PrimaryBright,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            state.pendingIncoming.forEach { req ->
                Surface(
                    color = FitMitraColors.Surface,
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Primary.copy(alpha = 0.3f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(req.friend.displayName, color = FitMitraColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("@${req.friend.username}", color = FitMitraColors.TextSecondary, fontSize = 11.sp)
                        }
                        Row {
                            Button(
                                onClick = { viewModel.respondToRequest(req.id, true) },
                                colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Success),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text("Accept", fontSize = 12.sp)
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Button(
                                onClick = { viewModel.respondToRequest(req.id, false) },
                                colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.SurfaceElevated),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text("Decline", fontSize = 12.sp, color = FitMitraColors.TextSecondary)
                            }
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Section 4: Friends List
        Text(
            text = "Friends Network (${state.friends.size})",
            color = FitMitraColors.TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp
        )
        Spacer(modifier = Modifier.height(8.dp))

        if (state.friends.isEmpty()) {
            Surface(
                color = FitMitraColors.Surface,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "No friends connected yet. Generate an invite code above to connect with classmates!",
                    color = FitMitraColors.TextSecondary,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(16.dp)
                )
            }
        } else {
            state.friends.forEach { friendship ->
                Surface(
                    color = FitMitraColors.Surface,
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.BorderSubtle),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = FitMitraColors.Primary.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    friendship.friend.displayName.take(1),
                                    color = FitMitraColors.PrimaryBright,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                friendship.friend.displayName,
                                color = FitMitraColors.TextPrimary,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp
                            )
                            Text(
                                "@${friendship.friend.username}",
                                color = FitMitraColors.TextSecondary,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Section 5: Private Shared Challenges
        Text(
            text = "🏆 Private Shared Challenges",
            color = FitMitraColors.TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp
        )
        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = inputChallengeCode,
                onValueChange = { inputChallengeCode = it.uppercase() },
                placeholder = { Text("Code: CHAL-XXXX", color = FitMitraColors.TextSecondary, fontSize = 13.sp) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = FitMitraColors.Primary,
                    unfocusedBorderColor = FitMitraColors.BorderSubtle,
                    focusedTextColor = FitMitraColors.TextPrimary,
                    unfocusedTextColor = FitMitraColors.TextPrimary
                ),
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Button(
                onClick = {
                    viewModel.joinChallenge(inputChallengeCode)
                    inputChallengeCode = ""
                },
                enabled = inputChallengeCode.isNotEmpty() && !state.isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Secondary)
            ) {
                Text("Join")
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (state.challenges.isNotEmpty()) {
            state.challenges.forEach { challenge ->
                Surface(
                    color = FitMitraColors.Surface,
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, FitMitraColors.Secondary.copy(alpha = 0.3f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(challenge.title, color = FitMitraColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(challenge.code, color = FitMitraColors.Secondary, fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                        }
                        Text(
                            "Target: ${challenge.targetValue} ${challenge.exerciseKey} • Participants: ${challenge.participantCount}",
                            color = FitMitraColors.TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}
