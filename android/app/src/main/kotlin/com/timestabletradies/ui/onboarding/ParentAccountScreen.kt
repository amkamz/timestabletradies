package com.timestabletradies.ui.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopNote
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTextField
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType

/**
 * A3 · Create the parent account — step 1 of 3.
 *
 * The root account, and the only one that ever holds credentials. Everything
 * with a cost or a consequence hangs off it: billing, crew links, classroom
 * membership, stats. A child profile is a row under this account, not a login,
 * which is what makes "kids never hold credentials" structural rather than a
 * convention someone can forget (§0.5).
 */
@Composable
fun ParentAccountScreen(
    onCreate: (name: String, email: String, password: String) -> Unit,
    onBack: () -> Unit,
    busy: Boolean = false,
    error: String? = null,
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    val ready = name.isNotBlank() &&
        email.contains("@") &&
        password.length >= 8

    PopFullScreen(backdrop = PopTokens.Paper) {
        StepHeader(step = 1, of = 3, label = "PARENT", onBack = onBack)

        Text("Set up the parent account", style = PopType.DisplayMedium, color = PopTokens.Ink)

        PopCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                PopTextField(
                    label = "Your name",
                    value = name,
                    onValueChange = { name = it },
                    placeholder = "Sam Rivera",
                )
                PopTextField(
                    label = "Email",
                    value = email,
                    onValueChange = { email = it },
                    placeholder = "sam@example.com",
                    keyboardType = KeyboardType.Email,
                )
                PopTextField(
                    label = "Password",
                    value = password,
                    onValueChange = { password = it },
                    placeholder = "At least 8 characters",
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                    isPassword = true,
                )
            }
        }

        PopNote(
            text = "Billing, crew links and stats all live here — never in the kids' app.",
            modifier = Modifier.fillMaxWidth(),
        )

        if (error != null) {
            PopNote(
                text = error,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { liveRegion = LiveRegionMode.Assertive },
                fill = PopTokens.RedTint,
                content = PopTokens.RedDeep,
                accent = PopTokens.Red,
            )
        }

        PopGap(4.dp)

        PopButton(
            text = if (busy) "CREATING…" else "CREATE ACCOUNT",
            onClick = { onCreate(name.trim(), email.trim(), password) },
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
            enabled = ready && !busy,
            shadow = PopShadow.Large,
        )

        PopGap(16.dp)
    }
}

/**
 * The "STEP n OF 3" eyebrow the setup wizard carries.
 *
 * Worth the space: a parent halfway through onboarding on a phone needs to know
 * how much is left before they decide whether to finish now, and three steps is
 * short enough that saying so is reassuring rather than daunting.
 */
@Composable
fun StepHeader(
    step: Int,
    of: Int,
    label: String,
    onBack: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (onBack != null) {
            PopButton(
                text = "‹",
                onClick = onBack,
                tone = PopTone.White,
                size = PopSize.Small,
                shadow = PopShadow.Small,
                modifier = Modifier.semantics { contentDescription = "Back a step" },
            )
        }
        Text(
            text = "STEP $step OF $of · $label",
            style = PopType.Small,
            color = PopTokens.Mud,
        )
    }
}
