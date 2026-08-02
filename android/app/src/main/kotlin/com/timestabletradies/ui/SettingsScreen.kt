package com.timestabletradies.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopScreen
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popSurface
import com.timestabletradies.core.network.StudentSettings
import com.timestabletradies.core.network.TradiesRepository
import kotlinx.coroutines.launch

/**
 * Accessibility settings (spec §13).
 *
 * Only preferences that actually do something appear here. A toggle that
 * persists but changes nothing is worse than an absent one — it tells a child
 * who needs it that the app has handled their need when it hasn't. Read-aloud
 * and the dyslexic face are deliberately missing until TTS is wired and the
 * font is bundled.
 *
 * Reduced motion is the union of this setting and the OS one — see PopTheme. A
 * child who turned animations down system-wide shouldn't have to do it again.
 */
@Composable
fun SettingsScreen(
    repository: TradiesRepository,
    studentId: String,
    onChanged: (StudentSettings) -> Unit,
    onBack: () -> Unit,
) {
    var settings by remember { mutableStateOf<StudentSettings?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(studentId) {
        runCatching { repository.settings(studentId) }
            .onSuccess { settings = it }
            .onFailure { error = it.message ?: "Couldn't load your settings." }
    }

    fun update(next: StudentSettings) {
        settings = next
        onChanged(next)
        // Saved as it changes rather than behind a Save button: a child
        // shouldn't have to understand committing a form to make text bigger.
        scope.launch { runCatching { repository.saveSettings(next) } }
    }

    PopScreen(title = "Settings", subtitle = "Make it work for you.") {
        val current = settings
        when {
            error != null -> ErrorCard(error!!)
            current == null -> PopCard(modifier = Modifier.fillMaxWidth()) {
                Text("Loading…", style = PopType.Body, color = PopTokens.Mud)
            }
            else -> {
                Toggle(
                    label = "Calm motion",
                    detail = "Turns off things that slide and bounce.",
                    checked = current.reducedMotion,
                    onChange = { update(current.copy(reducedMotion = it)) },
                )

                TextSizePicker(
                    scale = current.textScale,
                    onChange = { update(current.copy(textScale = it)) },
                )

                TimerPicker(
                    mode = current.timerMode,
                    onChange = { update(current.copy(timerMode = it)) },
                )

                PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.SandPanel) {
                    Text("Coming soon", style = PopType.Title, color = PopTokens.Ink)
                    Text(
                        "Read-aloud, bolder colours and the easy-reading font " +
                            "aren't ready yet, so they're not shown rather than " +
                            "shown doing nothing.",
                        style = PopType.Small,
                        color = PopTokens.Mud,
                    )
                }
            }
        }

        Spacer(Modifier.height(8.dp))
        PopButton(
            text = "Back to the shed",
            onClick = onBack,
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
        )
        Spacer(Modifier.height(24.dp))
    }
}

/**
 * A switch with a real role and state.
 *
 * `Role.Switch` plus `stateDescription` is what makes TalkBack announce "on" /
 * "off" and offer to toggle it. A styled Box would be silent.
 */
@Composable
private fun Toggle(
    label: String,
    detail: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
) {
    PopCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(role = Role.Switch) { onChange(!checked) }
            .semantics {
                stateDescription = if (checked) "On" else "Off"
                contentDescription = "$label. $detail"
            },
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(label, style = PopType.Title, color = PopTokens.Ink)
                Text(detail, style = PopType.Small, color = PopTokens.Mud)
            }
            Box(
                modifier = Modifier
                    .size(width = 56.dp, height = 32.dp)
                    .popSurface(
                        fill = if (checked) PopTokens.Teal else PopTokens.SandFill,
                        radius = 16.dp,
                        shadow = PopShadow.Small,
                    ),
                contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart,
            ) {
                Box(
                    Modifier
                        .padding(horizontal = 4.dp)
                        .size(20.dp)
                        .popSurface(PopTokens.White, 10.dp, PopShadow.Small, borderWidth = 2.dp),
                )
            }
        }
    }
}

@Composable
private fun TextSizePicker(scale: Double, onChange: (Double) -> Unit) {
    // The column matches the DB check constraint: text_scale between 0.8 and 2.0.
    // Labels are kept short deliberately: at 1.6x scale a longer word
    // wraps inside its own chip. Testing at the largest size is the only
    // way that shows up.
    val options = listOf(0.9 to "Small", 1.0 to "Normal", 1.3 to "Big", 1.6 to "Huge")

    PopCard(modifier = Modifier.fillMaxWidth()) {
        Text("Text size", style = PopType.Title, color = PopTokens.Ink)
        Text(
            "This adds to whatever your phone is already set to.",
            style = PopType.Small,
            color = PopTokens.Mud,
        )
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (value, label) ->
                Choice(
                    label = label,
                    selected = kotlin.math.abs(scale - value) < 0.01,
                    onClick = { onChange(value) },
                )
            }
        }
    }
}

@Composable
private fun TimerPicker(mode: String, onChange: (String) -> Unit) {
    val options = listOf(
        "standard" to "Normal",
        "extended" to "Longer",
        "off" to "No clock",
    )

    PopCard(modifier = Modifier.fillMaxWidth()) {
        Text("Clocks", style = PopType.Title, color = PopTokens.Ink)
        Text(
            "Timed jobs can give you longer, or no clock at all.",
            style = PopType.Small,
            color = PopTokens.Mud,
        )
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (value, label) ->
                Choice(label = label, selected = mode == value, onClick = { onChange(value) })
            }
        }
    }
}

@Composable
private fun Choice(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .popSurface(
                fill = if (selected) PopTokens.Ink else PopTokens.White,
                radius = PopTokens.RadiusSm,
                shadow = PopShadow.Small,
            )
            .clickable(role = Role.RadioButton, onClick = onClick)
            .semantics { stateDescription = if (selected) "Selected" else "Not selected" }
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Text(
            label,
            style = PopType.Small,
            color = if (selected) PopTokens.Yellow else PopTokens.Ink,
            maxLines = 1,
        )
    }
}
