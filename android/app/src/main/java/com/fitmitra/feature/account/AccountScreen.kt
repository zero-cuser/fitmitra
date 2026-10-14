package com.fitmitra.feature.account

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fitmitra.core.domain.models.SyncStatusState
import com.fitmitra.core.theme.FitMitraColors

@Composable
fun AccountScreen(
    viewModel: AccountViewModel,
    onBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    var isSignupTab by remember { mutableStateOf(false) }
    var emailInput by remember { mutableStateOf("") }
    var passInput by remember { mutableStateOf("") }
    var nameInput by remember { mutableStateOf("") }
    var deletePassInput by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .statusBarsPadding(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                        .clickable { onBack() },
                    contentAlignment = Alignment.CenterStart
                ) {
                    Text(
                        text = "‹ Back",
                        color = FitMitraColors.PrimaryBright,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp
                    )
                }
                Spacer(Modifier.width(8.dp))
                Text(
                    text = "Account & Cloud Backup",
                    color = FitMitraColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }
        },
        containerColor = FitMitraColors.Background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Feedback Banner
            state.feedbackMessage?.let { msg ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = FitMitraColors.Success.copy(alpha = 0.15f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = msg,
                        color = FitMitraColors.Success,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // Error Banner
            state.authError?.let { err ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = FitMitraColors.Danger.copy(alpha = 0.15f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = err,
                        color = FitMitraColors.Danger,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            if (state.session == null) {
                // ANONYMOUS GUEST MODE CARD
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = FitMitraColors.Surface),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🔒", fontSize = 16.sp)
                            Spacer(Modifier.width(8.dp))
                            Text("Anonymous Local-Only Mode", color = FitMitraColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        Text(
                            text = "You can use FitMitra forever without an account. All camera vision, workouts, streaks, and challenges remain 100% private on your device.",
                            color = FitMitraColors.TextSecondary,
                            fontSize = 12.sp,
                            lineHeight = 17.sp
                        )
                    }
                }

                // AUTH TABS
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(FitMitraColors.Surface)
                        .padding(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (!isSignupTab) FitMitraColors.Primary else Color.Transparent)
                            .clickable { isSignupTab = false }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Sign In", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSignupTab) FitMitraColors.Primary else Color.Transparent)
                            .clickable { isSignupTab = true }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Create Account", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }

                // AUTH INPUTS
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = FitMitraColors.Surface),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (isSignupTab) {
                            OutlinedTextField(
                                value = nameInput,
                                onValueChange = { nameInput = it },
                                label = { Text("Display Name") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = FitMitraColors.Primary,
                                    unfocusedBorderColor = FitMitraColors.BorderSubtle,
                                    focusedTextColor = FitMitraColors.TextPrimary,
                                    unfocusedTextColor = FitMitraColors.TextPrimary
                                )
                            )
                        }

                        OutlinedTextField(
                            value = emailInput,
                            onValueChange = { emailInput = it },
                            label = { Text("Campus Email") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = FitMitraColors.Primary,
                                unfocusedBorderColor = FitMitraColors.BorderSubtle,
                                focusedTextColor = FitMitraColors.TextPrimary,
                                unfocusedTextColor = FitMitraColors.TextPrimary
                            )
                        )

                        OutlinedTextField(
                            value = passInput,
                            onValueChange = { passInput = it },
                            label = { Text("Password (min 4 characters)") },
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = FitMitraColors.Primary,
                                unfocusedBorderColor = FitMitraColors.BorderSubtle,
                                focusedTextColor = FitMitraColors.TextPrimary,
                                unfocusedTextColor = FitMitraColors.TextPrimary
                            )
                        )

                        Button(
                            onClick = {
                                if (isSignupTab) {
                                    viewModel.register(emailInput, passInput, nameInput)
                                } else {
                                    viewModel.login(emailInput, passInput)
                                }
                            },
                            enabled = !state.isSubmitting,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Primary)
                        ) {
                            if (state.isSubmitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            } else {
                                Text(if (isSignupTab) "Create Account" else "Sign In", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                // AUTHENTICATED PROFILE CARD
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = FitMitraColors.Surface),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(state.session?.displayName ?: "Student", color = FitMitraColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text(state.session?.email ?: "", color = FitMitraColors.TextSecondary, fontSize = 12.sp)
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(FitMitraColors.Success.copy(alpha = 0.2f))
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text("Cloud Active", color = FitMitraColors.Success, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // CLOUD SYNCHRONIZATION CARD
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = FitMitraColors.Surface),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Cloud Synchronization", color = FitMitraColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(
                                    "Status: ${state.syncStatus.state.name}",
                                    color = when (state.syncStatus.state) {
                                        SyncStatusState.SYNCED -> FitMitraColors.Success
                                        SyncStatusState.SYNCING -> FitMitraColors.Primary
                                        SyncStatusState.OFFLINE, SyncStatusState.ERROR -> FitMitraColors.Warning
                                        else -> FitMitraColors.TextSecondary
                                    },
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            Switch(
                                checked = state.syncStatus.state != SyncStatusState.DISABLED,
                                onCheckedChange = { viewModel.toggleSync() }
                            )
                        }

                        Text(
                            text = "Backs up workout session counts, posture scores, and challenge milestones to your private account. Camera frames and skeletal landmarks NEVER leave your hardware.",
                            color = FitMitraColors.TextSecondary,
                            fontSize = 11.sp,
                            lineHeight = 16.sp
                        )

                        if (state.syncStatus.state != SyncStatusState.DISABLED) {
                            Button(
                                onClick = { viewModel.syncNow() },
                                enabled = !state.isSubmitting,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Secondary)
                            ) {
                                if (state.isSubmitting) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                                } else {
                                    Text("🔄", fontSize = 14.sp)
                                    Spacer(Modifier.width(6.dp))
                                    Text("Sync Now")
                                }
                            }
                        }
                    }
                }

                // PRIVACY & ACTIONS CARD
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = FitMitraColors.Surface),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Session & Account Privacy", color = FitMitraColors.TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)

                        OutlinedButton(
                            onClick = { viewModel.logout() },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Sign Out (Keep Local Device Data)")
                        }

                        Button(
                            onClick = { viewModel.openDeleteDialog() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Danger.copy(alpha = 0.85f)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Delete Account & Cloud Data")
                        }
                    }
                }
            }
        }
    }

    // DELETION CONFIRMATION DIALOG
    if (state.showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.closeDeleteDialog() },
            title = { Text("Delete Account", color = FitMitraColors.TextPrimary, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "This permanently removes your account records from the server. Choose your deletion policy:",
                        color = FitMitraColors.TextSecondary,
                        fontSize = 12.sp
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.setDeleteRemoteOnly(true) },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = state.deleteRemoteOnly, onClick = { viewModel.setDeleteRemoteOnly(true) })
                        Spacer(Modifier.width(6.dp))
                        Text("Delete remote cloud records only (keep local device data)", fontSize = 12.sp, color = FitMitraColors.TextPrimary)
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.setDeleteRemoteOnly(false) },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = !state.deleteRemoteOnly, onClick = { viewModel.setDeleteRemoteOnly(false) })
                        Spacer(Modifier.width(6.dp))
                        Text("Wipe everything (both remote cloud and local device)", fontSize = 12.sp, color = FitMitraColors.Danger)
                    }

                    OutlinedTextField(
                        value = deletePassInput,
                        onValueChange = { deletePassInput = it },
                        label = { Text("Enter Password to Confirm") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.confirmDeleteAccount(deletePassInput) },
                    colors = ButtonDefaults.buttonColors(containerColor = FitMitraColors.Danger),
                    enabled = deletePassInput.isNotBlank()
                ) {
                    Text("Confirm Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.closeDeleteDialog() }) {
                    Text("Cancel")
                }
            },
            containerColor = FitMitraColors.Surface
        )
    }
}
