package com.timestabletradies.ui.modes

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopTabBody
import com.timestabletradies.core.designsystem.PopTapCard
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.model.ModeAvailability
import com.timestabletradies.core.model.ModeTone
import com.timestabletradies.core.model.PracticeMode

/**
 * C2 · The Training Shed — the practice hub.
 *
 * The list and every mode's locked/playable state come from the `modes`
 * endpoint, decided server-side. That is not ceremony: the same server refuses
 * the run, so a client that worked availability out for itself would offer a
 * mode and then fail it, and the lock reason is the only explanation a child
 * gets (§1.10).
 *
 * A locked mode is shown with its requirement — "Unlocks with 5 trades" — which
 * is a goal to work toward, not a price tag. There is no upgrade button on this
 * screen and there never will be.
 */
@Composable
fun TrainingShedScreen(
    modes: List<PracticeMode>,
    loading: Boolean,
    onPlay: (PracticeMode) -> Unit,
) {
    PopTabBody {
        PopBanner(text = "TRAINING SHED", fill = PopTokens.Yellow, content = PopTokens.Ink)

        Text(
            "Pick how you want to practise.",
            style = PopType.Small,
            color = PopTokens.Mud,
        )

        if (loading) {
            PopCard(modifier = Modifier.fillMaxWidth()) {
                Text("Loading…", style = PopType.Body, color = PopTokens.Mud)
            }
        }

        modes.forEach { mode -> ModeRow(mode) { onPlay(mode) } }

        PopGap(24.dp)
    }
}

@Composable
private fun ModeRow(mode: PracticeMode, onPlay: () -> Unit) {
    val locked = mode.availability is ModeAvailability.Locked
    val fill = if (locked) PopTokens.SandPanel else mode.tone.fill()
    val content = if (locked) PopTokens.Sand else mode.tone.content()
    val sub = when (val a = mode.availability) {
        is ModeAvailability.Locked -> a.reason
        ModeAvailability.Playable -> mode.blurb
    }

    PopTapCard(
        onClick = onPlay,
        modifier = Modifier.fillMaxWidth(),
        fill = fill,
        borderColor = if (locked) PopTokens.SandPale else PopTokens.Ink,
        shadow = if (locked) PopShadow.Small else PopShadow.Medium,
        enabled = !locked,
        spoken = "${mode.name}. $sub",
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(mode.name, style = PopType.Title, color = content)
                Text(
                    text = sub,
                    style = PopType.Small,
                    color = content.copy(alpha = 0.85f),
                )
            }
            if (locked) {
                // Decorative — the reason line already says it in words, so the
                // padlock must not be read out a second time.
                Text("🔒", style = PopType.Title, modifier = Modifier.clearAndSetSemantics { })
            }
        }
    }
}

/* ------------------------------------------------------------ token maps */

/**
 * Card colour per mode.
 *
 * Presentation, so it stays client-side — the server decides *whether* a mode
 * can be played, not what colour it is. Order and tone mirror `PRACTICE_MODES`
 * in `lib/game/modes.ts`; an unknown key falls back rather than crashing, so a
 * mode added server-side still renders.
 */
fun toneForMode(key: String): ModeTone = when (key) {
    "garage", "floorplan" -> ModeTone.TEAL
    "scaffold" -> ModeTone.INK
    "rally" -> ModeTone.YELLOW
    "cablerun" -> ModeTone.BLUE
    "tooloff" -> ModeTone.ORANGE
    "bigjob" -> ModeTone.RED
    "inspection" -> ModeTone.RED
    "yard" -> ModeTone.WHITE
    else -> ModeTone.WHITE
}

internal fun ModeTone.fill(): Color = when (this) {
    ModeTone.TEAL -> PopTokens.Teal
    ModeTone.WHITE -> PopTokens.White
    ModeTone.INK -> PopTokens.Ink
    ModeTone.BLUE -> PopTokens.Blue
    ModeTone.ORANGE -> PopTokens.Orange
    ModeTone.YELLOW -> PopTokens.Yellow
    ModeTone.RED -> PopTokens.Red
}

internal fun ModeTone.content(): Color = when (this) {
    ModeTone.WHITE, ModeTone.YELLOW -> PopTokens.Ink
    ModeTone.INK -> PopTokens.Yellow
    else -> PopTokens.White
}
