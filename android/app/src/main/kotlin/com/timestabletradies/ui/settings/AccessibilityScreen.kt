package com.timestabletradies.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopChoice
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopNote
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopToggle
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.network.StudentSettings

/**
 * I1 · Accessibility.
 *
 * Every control here does something. A toggle that persists but changes nothing
 * is worse than an absent one — it tells a child who needs it that the app has
 * handled their need when it hasn't. Anything not yet implemented is named as
 * not ready rather than shown doing nothing.
 *
 * Two of these are **unions with the OS setting**, never replacements: a child
 * who turned motion down or text up system-wide should not have to do it again
 * here (§2.7, and see `PopTheme`).
 *
 * `timerMode` is the one that is not really a preference. It changes what a run
 * measures, so the *server* applies it when building the run — the client can
 * ask for it, not enforce it.
 */
@Composable
fun AccessibilityScreen(
    settings: StudentSettings?,
    error: String?,
    readAloudReady: Boolean,
    onChange: (StudentSettings) -> Unit,
    onSwitchTradie: () -> Unit,
    onBack: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Paper) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PopButton(
                text = "✕",
                onClick = onBack,
                tone = PopTone.White,
                size = PopSize.Small,
                shadow = PopShadow.Small,
                modifier = Modifier.semantics { contentDescription = "Back to the site" },
            )
            PopBanner(
                text = "ACCESSIBILITY",
                fill = PopTokens.Ink,
                content = PopTokens.Yellow,
            )
        }

        when {
            error != null -> PopCard(
                modifier = Modifier.fillMaxWidth(),
                fill = PopTokens.SandPanel,
            ) {
                Text("Couldn't load your settings", style = PopType.Title, color = PopTokens.Ink)
                Text(error, style = PopType.Small, color = PopTokens.Mud)
            }

            settings == null -> PopCard(modifier = Modifier.fillMaxWidth()) {
                Text("Loading…", style = PopType.Body, color = PopTokens.Mud)
            }

            else -> {
                if (readAloudReady) {
                    SettingToggle(
                        label = "Read questions aloud",
                        detail = "Says the question out loud when it appears.",
                        checked = settings.readAloud,
                        onChange = { onChange(settings.copy(readAloud = it)) },
                    )
                }

                SettingToggle(
                    label = "Turn off timers",
                    detail = "Every timed mode.",
                    checked = settings.timerMode == "off",
                    onChange = {
                        onChange(settings.copy(timerMode = if (it) "off" else "standard"))
                    },
                )

                // Rides on `high_contrast` until a column of its own exists.
                // The two are related — both are "make the grid readable when
                // colour alone isn't enough" — but they are not the same thing,
                // and this needs splitting when a migration next runs.
                SettingToggle(
                    label = "Shapes on the grid",
                    detail = "Adds a symbol to every square, for colourblind eyes.",
                    checked = settings.highContrast,
                    onChange = { onChange(settings.copy(highContrast = it)) },
                )

                SettingToggle(
                    label = "Calm motion",
                    detail = "Turns off things that slide and bounce.",
                    checked = settings.reducedMotion,
                    onChange = { onChange(settings.copy(reducedMotion = it)) },
                )

                TimerLength(
                    mode = settings.timerMode,
                    onChange = { onChange(settings.copy(timerMode = it)) },
                )

                TextSize(
                    scale = settings.textScale,
                    onChange = { onChange(settings.copy(textScale = it)) },
                )

                // Named, not hidden, and honest about why. A parent looking for
                // the dyslexic face needs to know it is coming rather than
                // conclude the app doesn't have it.
                PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.SandPanel) {
                    Text("Not ready yet", style = PopType.Title, color = PopTokens.Ink)
                    Text(
                        text = buildString {
                            append("The easy-reading font isn't built yet, so it's not ")
                            append("shown rather than shown doing nothing.")
                            if (!readAloudReady) {
                                append(" Read-aloud needs a voice installed on this device.")
                            }
                        },
                        style = PopType.Small,
                        color = PopTokens.Mud,
                    )
                }

                PopNote(
                    text = "Every square on the grid says its own state out loud, " +
                        "with or without shapes. Everything works with TalkBack.",
                    modifier = Modifier.fillMaxWidth(),
                )

                PopGap(4.dp)

                // Not in the storyboard, and it has to be somewhere: a family
                // can have five profiles and the cog is the only control on the
                // site. Behind the grown-up gate, because which child is playing
                // is a parent's decision — the same reason kids never hold
                // credentials at all.
                PopButton(
                    text = "SWITCH TRADIE",
                    onClick = onSwitchTradie,
                    tone = PopTone.White,
                    size = PopSize.Large,
                    sub = "A grown-up picks who's playing",
                    fullWidth = true,
                )
            }
        }

        PopGap(20.dp)
    }
}

@Composable
private fun SettingToggle(
    label: String,
    detail: String?,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
) {
    PopCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(label, style = PopType.Body, color = PopTokens.Ink)
                if (detail != null) {
                    Text(detail, style = PopType.Small, color = PopTokens.Mud)
                }
            }
            PopToggle(checked = checked, onCheckedChange = onChange)
        }
    }
}

/**
 * Timer length.
 *
 * Separate from the on/off switch because "longer" and "none" are different
 * needs: a child who processes slowly wants more time, not a different game.
 */
@Composable
private fun TimerLength(mode: String, onChange: (String) -> Unit) {
    PopCard(modifier = Modifier.fillMaxWidth()) {
        Text("HOW LONG PER QUESTION", style = PopType.Small, color = PopTokens.Mud)
        PopGap(8.dp)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("standard" to "Normal", "extended" to "Longer", "off" to "No timer")
                .forEach { (key, label) ->
                    PopChoice(
                        text = label,
                        isSelected = mode == key,
                        onClick = { onChange(key) },
                        selectedFill = PopTokens.Teal,
                        selectedContent = PopTokens.White,
                        modifier = Modifier.weight(1f),
                    )
                }
        }
    }
}

/**
 * Text size, as a five-stop slider drawn from the design.
 *
 * The scale multiplies whatever the phone is already set to rather than
 * replacing it — see `PopTheme`. That is why the stops are modest: stacked on
 * top of a system scale of 1.3, a 1.4 here is already very large.
 */
@Composable
private fun TextSize(scale: Double, onChange: (Double) -> Unit) {
    val stops = listOf(0.9, 1.0, 1.15, 1.3, 1.45)
    val index = stops.indexOfFirst { it >= scale - 0.01 }.coerceAtLeast(0)

    PopCard(modifier = Modifier.fillMaxWidth()) {
        Text("TEXT SIZE", style = PopType.Small, color = PopTokens.Mud)
        PopGap(10.dp)
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text("A", style = PopType.Small, color = PopTokens.Mud)
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(34.dp)
                    .background(PopTokens.SandPanel, RoundedCornerShape(999.dp))
                    .border(2.dp, PopTokens.Ink, RoundedCornerShape(999.dp))
                    .padding(4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                stops.forEachIndexed { i, stop ->
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(
                                if (i == index) PopTokens.Red else PopTokens.White,
                                CircleShape,
                            )
                            .border(2.5.dp, PopTokens.Ink, CircleShape)
                            .clickable(role = Role.RadioButton) { onChange(stop) }
                            .semantics {
                                contentDescription = "Text size step ${i + 1} of ${stops.size}"
                            },
                    )
                }
            }
            Text("A", style = PopType.Title, color = PopTokens.Ink)
        }
    }
}
