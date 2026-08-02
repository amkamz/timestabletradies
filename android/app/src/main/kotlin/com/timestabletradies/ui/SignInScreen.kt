package com.timestabletradies.ui

import android.util.Log
import com.timestabletradies.BuildConfig
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopScreen
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.network.TradiesRepository
import kotlinx.coroutines.launch

/**
 * Parent sign-in.
 *
 * This screen exists once per household, not once per child. The parent holds
 * the Supabase session; student profiles are chosen after it and hold no
 * credentials of their own. That is what makes "kids can't search for or add
 * other users" structurally true rather than a rule the UI happens to follow.
 */
@Composable
fun SignInScreen(
    repository: TradiesRepository,
    onSignedIn: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun submit() {
        if (busy || email.isBlank() || password.isBlank()) return
        busy = true
        error = null
        scope.launch {
            runCatching { repository.signIn(email, password) }
                .onSuccess { onSignedIn() }
                .onFailure { cause ->
                    // The message shown is deliberately vague: distinguishing
                    // "no such account" from "wrong password" tells an attacker
                    // which emails exist. The *real* cause goes to logcat, where
                    // only someone holding the device can read it.
                    Log.w(TAG, "Sign-in failed", cause)
                    error = if (BuildConfig.DEBUG) {
                        "Sign-in failed: ${cause::class.simpleName}: ${cause.message}"
                    } else {
                        "That email and password didn't match."
                    }
                }
            busy = false
        }
    }

    PopScreen(
        title = "Times Table Tradies",
        subtitle = "Grown-ups sign in here.",
    ) {
        PopCard(modifier = Modifier.fillMaxWidth()) {
            Text("Email", style = PopType.Small, color = PopTokens.Mud)
            TextField(
                value = email,
                onValueChange = { email = it },
                singleLine = true,
                enabled = !busy,
                colors = popFieldColors(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(12.dp))

            Text("Password", style = PopType.Small, color = PopTokens.Mud)
            TextField(
                value = password,
                onValueChange = { password = it },
                singleLine = true,
                enabled = !busy,
                colors = popFieldColors(),
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            if (error != null) {
                Spacer(Modifier.height(10.dp))
                Text(
                    text = error!!,
                    style = PopType.Small,
                    color = PopTokens.RedDeep,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }

        PopButton(
            text = if (busy) "Signing in…" else "Sign in",
            onClick = ::submit,
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
            enabled = !busy,
            shadow = PopShadow.Large,
        )

        PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.SandPanel) {
            Text("No account yet?", style = PopType.Title, color = PopTokens.Ink)
            Text(
                text = "Sign up on the website for now — parent onboarding " +
                    "isn't built in the app yet.",
                style = PopType.Small,
                color = PopTokens.Mud,
            )
        }

        Spacer(Modifier.height(24.dp))
    }
}

private const val TAG = "TradiesAuth"

@Composable
private fun popFieldColors() = TextFieldDefaults.colors(
    focusedContainerColor = PopTokens.Paper,
    unfocusedContainerColor = PopTokens.Paper,
    disabledContainerColor = PopTokens.SandFill,
    focusedTextColor = PopTokens.Ink,
    unfocusedTextColor = PopTokens.Ink,
    cursorColor = PopTokens.Ink,
)
