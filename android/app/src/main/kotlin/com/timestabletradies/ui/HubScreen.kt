package com.timestabletradies.ui

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopChip
import com.timestabletradies.core.designsystem.PopScreen
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopTheme
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popSurface
import com.timestabletradies.core.model.MasteryStage
import com.timestabletradies.core.model.ModeAvailability
import com.timestabletradies.core.model.PracticeMode
import com.timestabletradies.core.model.ModeTone

/**
 * What the hub knows about the player. Null while loading.
 *
 * Every field here is read from the server. `modes` in particular arrives
 * already decided — whether a mode is playable is a rule, and rules are
 * server-side (§1.10), because three clients working it out independently is
 * three chances to disagree with the server that will actually refuse the run.
 */
data class HubState(
    val tradieName: String,
    val coins: Int,
    val rankRung: Int,
    val factsSeen: Int,
    /**
     * The tables this student has unlocked. Questions are drawn from these
     * because `run-finish` rejects answers on anything the plan doesn't cover,
     * so inventing a table would look fine and silently earn nothing.
     */
    val playableTables: List<Int>,
    /** Decided by the `modes` endpoint — never computed here (§1.10). */
    val modes: List<PracticeMode>,
    /** Free player has opened every trade their plan allows. */
    val atFreeCeiling: Boolean,
) {
    val zoneCount: Int get() = playableTables.size
}

@Composable
fun HubScreen(
    state: HubState? = null,
    onPlay: (PracticeMode) -> Unit = {},
    onOpenGrid: () -> Unit = {},
    onOpenHouse: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    onSwitchStudent: () -> Unit = {},
) {
    PopScreen(
        title = "The Training Shed",
        subtitle = state?.let { "${it.tradieName} · Rank ${it.rankRung}" }
            ?: "Pick a job and get stuck in.",
    ) {
        CoinsRow(state)

        Text("Modes", style = PopType.DisplayMedium, color = PopTokens.Ink)

        if (state == null) {
            PopCard(modifier = Modifier.fillMaxWidth()) {
                Text("Loading…", style = PopType.Body, color = PopTokens.Mud)
            }
        } else {
            state.modes.forEach { mode ->
                ModeCard(mode, onPlay = { onPlay(mode) })
            }
        }

        // The only honest way to end a free tier: say so. A child whose coins
        // quietly stop reads it as the game breaking, not as a prompt — and
        // this says nothing about money, which stays above the grown-up gate.
        if (state?.atFreeCeiling == true) {
            PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.YellowTint) {
                Text(
                    "You've opened every trade here",
                    style = PopType.Title,
                    color = PopTokens.Ink,
                )
                Text(
                    "Ask a grown-up if you want more trades to work on.",
                    style = PopType.Small,
                    color = PopTokens.Mud,
                )
            }
        }

        Spacer(Modifier.height(8.dp))
        Text("Mastery", style = PopType.DisplayMedium, color = PopTokens.Ink)
        if (state != null) {
            PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.TealWash) {
                Text(
                    text = "${state.factsSeen} facts practised",
                    style = PopType.Title,
                    color = PopTokens.TealDeep,
                )
                Text(
                    text = "Tap to see every fact.",
                    style = PopType.Small,
                    color = PopTokens.Mud,
                )
                Spacer(Modifier.height(10.dp))
                PopButton(
                    text = "Open your grid",
                    onClick = onOpenGrid,
                    tone = PopTone.Teal,
                    size = PopSize.Small,
                )
            }
        }

        Spacer(Modifier.height(8.dp))
        Text("Your build", style = PopType.DisplayMedium, color = PopTokens.Ink)
        PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.SandPanel) {
            Text(
                "Materials go into the house.",
                style = PopType.Body,
                color = PopTokens.Ink,
            )
            Spacer(Modifier.height(10.dp))
            PopButton(
                text = "See the build",
                onClick = onOpenHouse,
                tone = PopTone.Yellow,
                size = PopSize.Small,
            )
        }

        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PopButton(
                text = "Settings",
                onClick = onOpenSettings,
                tone = PopTone.White,
                size = PopSize.Small,
            )
            PopButton(
                text = "Switch tradie",
                onClick = onSwitchStudent,
                tone = PopTone.White,
                size = PopSize.Small,
            )
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun CoinsRow(state: HubState?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        PopChip(
            text = "${state?.coins ?: 0} coins",
            fill = PopTokens.Yellow,
            glyph = "●",
        )
        PopChip(
            text = rankName(state?.rankRung ?: 1),
            fill = PopTokens.TealTint,
            content = PopTokens.TealDeep,
        )
        val zones = state?.zoneCount ?: 0
        PopChip(text = "$zones trade${if (zones == 1) "" else "s"}", fill = PopTokens.White)
    }
}

/**
 * Card colour per mode.
 *
 * Presentation, so it stays client-side — the server decides *whether* a mode
 * can be played, not what colour it is. Order and tone mirror PRACTICE_MODES
 * in `lib/game/modes.ts`; an unknown key falls back rather than crashing, so a
 * mode added server-side still renders.
 */
internal fun toneForMode(key: String): ModeTone = when (key) {
    "garage", "floorplan" -> ModeTone.TEAL
    "scaffold" -> ModeTone.INK
    "rally" -> ModeTone.YELLOW
    "cablerun" -> ModeTone.BLUE
    "tooloff" -> ModeTone.ORANGE
    "bigjob" -> ModeTone.RED
    else -> ModeTone.WHITE
}

/** Name for a rung of the ladder, clamped like `rankName` in `progression.ts`. */
internal fun rankName(rung: Int): String =
    RANK_NAMES.getOrElse(rung - 1) { RANK_NAMES.last() }

/** The Trade Rank ladder — mirrors TRADE_RANKS in `lib/game/progression.ts`. */
private val RANK_NAMES = listOf(
    "First-Year Apprentice",
    "Second-Year Apprentice",
    "Third-Year Apprentice",
    "Fourth-Year Apprentice",
    "Qualified Tradie",
    "Leading Hand",
    "Foreman",
    "Site Supervisor",
    "Master Tradie",
    "Legend of the Trade",
)

/**
 * A mode card, playable or locked.
 *
 * The locked treatment is the important one. A locked mode is shown, not
 * hidden, and explains itself as a progression goal — "Unlocks with 5 trades" —
 * never as a price. That is what lets the paywall exist without the student
 * app ever mentioning money (docs/native/README.md §1.8, §1.10).
 */
@Composable
private fun ModeCard(mode: PracticeMode, onPlay: () -> Unit) {
    val locked = mode.availability is ModeAvailability.Locked
    val fill = if (locked) PopTokens.SandFill else mode.tone.fill()
    val content = if (locked) PopTokens.Mud else mode.tone.content()

    PopCard(
        modifier = Modifier.fillMaxWidth(),
        fill = fill,
        shadow = if (locked) PopShadow.Small else PopShadow.Medium,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(mode.name, style = PopType.Title, color = content)
                Spacer(Modifier.height(2.dp))
                Text(
                    text = when (val a = mode.availability) {
                        is ModeAvailability.Locked -> a.reason
                        ModeAvailability.Playable -> mode.blurb
                    },
                    style = PopType.Small,
                    color = content.copy(alpha = 0.85f),
                )
            }
            if (locked) {
                // Decorative — the reason line above already says it in words,
                // so the padlock must not be read out a second time.
                Text(
                    text = "🔒",
                    style = PopType.Title,
                    modifier = Modifier.clearAndSetSemantics { },
                )
            } else {
                PopButton(
                    text = "Go",
                    onClick = onPlay,
                    tone = PopTone.Ink,
                    size = PopSize.Small,
                    shadow = PopShadow.Small,
                )
            }
        }
    }
}

/**
 * The mastery ladder.
 *
 * Colour is never the only signal: every stage carries its glyph and its text
 * description, so the grid works for colourblind users and screen readers.
 */
@Composable
private fun MasteryLegend() {
    PopCard(modifier = Modifier.fillMaxWidth()) {
        MasteryStage.entries.forEach { stage ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 5.dp)
                    .semantics {
                        contentDescription = "${stage.label}: ${stage.description}"
                    },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(
                    modifier = Modifier
                        .size(34.dp)
                        .popSurface(
                            fill = stage.fill(),
                            radius = PopTokens.RadiusSm,
                            shadow = PopShadow.Small,
                        ),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(stage.glyph, style = PopType.Body, color = stage.onFill())
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(stage.label, style = PopType.Title, color = PopTokens.Ink)
                    Text(stage.description, style = PopType.Small, color = PopTokens.Mud)
                }
            }
        }
    }
}

@Composable
private fun ButtonShowcase() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PopButton("Teal", {}, tone = PopTone.Teal, size = PopSize.Small)
            PopButton("Red", {}, tone = PopTone.Red, size = PopSize.Small)
            PopButton("Yellow", {}, tone = PopTone.Yellow, size = PopSize.Small)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PopButton("White", {}, tone = PopTone.White, size = PopSize.Small)
            PopButton("Ink", {}, tone = PopTone.Ink, size = PopSize.Small)
            PopButton("Blue", {}, tone = PopTone.Blue, size = PopSize.Small)
        }
        PopButton(
            text = "Start a job",
            onClick = {},
            tone = PopTone.Red,
            size = PopSize.Large,
            sub = "10 questions · 60 coins",
            fullWidth = true,
            shadow = PopShadow.Large,
        )
    }
}

/* ------------------------------------------------------------- token maps */

private fun ModeTone.fill(): Color = when (this) {
    ModeTone.TEAL -> PopTokens.Teal
    ModeTone.WHITE -> PopTokens.White
    ModeTone.INK -> PopTokens.Ink
    ModeTone.BLUE -> PopTokens.Blue
    ModeTone.ORANGE -> PopTokens.Orange
    ModeTone.YELLOW -> PopTokens.Yellow
    ModeTone.RED -> PopTokens.Red
}

private fun ModeTone.content(): Color = when (this) {
    ModeTone.WHITE, ModeTone.YELLOW -> PopTokens.Ink
    ModeTone.INK -> PopTokens.Yellow
    else -> PopTokens.White
}

private fun MasteryStage.fill(): Color = when (this) {
    MasteryStage.NONE -> PopTokens.GradeNone
    MasteryStage.BRONZE -> PopTokens.GradeBronze
    MasteryStage.SILVER -> PopTokens.GradeSilver
    MasteryStage.GOLD -> PopTokens.GradeGold
    MasteryStage.BLUE -> PopTokens.GradeBlue
}

private fun MasteryStage.onFill(): Color = when (this) {
    MasteryStage.NONE -> PopTokens.Mud
    MasteryStage.GOLD -> PopTokens.Ink
    else -> PopTokens.White
}

/* ---------------------------------------------------------- sample data */
