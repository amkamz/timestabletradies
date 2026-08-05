package com.timestabletradies.ui.crew

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopNote
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTabBody
import com.timestabletradies.core.designsystem.PopTag
import com.timestabletradies.core.designsystem.PopTapCard
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.dashedBorder
import com.timestabletradies.ui.state.ChallengeOutcome
import com.timestabletradies.ui.state.CrewContact
import com.timestabletradies.ui.state.CrewRacer
import com.timestabletradies.ui.state.ExpoRow

/**
 * E1 · Crew Race lobby.
 *
 * Multiplayer here means **linked crew only**. Two parents link their families
 * and their children become crew; a child can never search for, add or message
 * anyone. That is the safety model, and it is structural — there is no code
 * path from this screen to a stranger.
 *
 * Bots fill the empty seats and are **labelled**, every time. A simulated
 * opponent presented as a real one is a small lie a child will eventually catch,
 * and the whole feature depends on them trusting that "Priya" is Priya.
 */
@Composable
fun CrewRaceLobbyScreen(
    racers: List<CrewRacer>,
    tableLabel: String,
    teacherSet: Boolean,
    onStart: () -> Unit,
    onExpo: () -> Unit,
    onChallenges: () -> Unit,
    onBack: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Blue) {
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
                text = if (teacherSet) "$tableLabel · TEACHER SET" else tableLabel,
                fill = PopTokens.Ink,
                content = PopTokens.Yellow,
                fontSize = 12.sp,
            )
        }

        Text("Crew Race", style = PopType.DisplayLarge, color = PopTokens.White)
        Text(
            "Waiting for the crew to clock on…",
            style = PopType.Body,
            color = PopTokens.BlueTint,
        )

        racers.forEach { racer -> RacerRow(racer) }

        PopGap(4.dp)

        PopButton(
            text = "START THE RACE ▸",
            onClick = onStart,
            tone = PopTone.Yellow,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PopButton(
                text = "TRADE EXPO",
                onClick = onExpo,
                tone = PopTone.White,
                size = PopSize.Small,
                modifier = Modifier.weight(1f),
            )
            PopButton(
                text = "CHALLENGES",
                onClick = onChallenges,
                tone = PopTone.White,
                size = PopSize.Small,
                modifier = Modifier.weight(1f),
            )
        }

        PopGap(20.dp)
    }
}

@Composable
private fun RacerRow(racer: CrewRacer) {
    val spoken = buildString {
        append(racer.name)
        if (racer.bot) append(", practice opponent")
        if (racer.ready && !racer.bot) append(", ready")
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (racer.bot) {
                    Modifier.dashedBorder(PopTokens.White, PopTokens.BorderWidth, PopTokens.RadiusMd)
                } else {
                    Modifier
                        .background(PopTokens.White, RoundedCornerShape(PopTokens.RadiusMd))
                        .border(
                            PopTokens.BorderWidth,
                            PopTokens.Ink,
                            RoundedCornerShape(PopTokens.RadiusMd),
                        )
                },
            )
            .padding(12.dp)
            .semantics(mergeDescendants = true) { contentDescription = spoken },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Swatch(racer.tint)
        Text(
            text = racer.name,
            style = PopType.Body,
            color = PopTokens.Ink,
            modifier = Modifier.weight(1f),
        )
        when {
            racer.bot -> PopTag(
                text = "PRACTICE",
                fill = PopTokens.Bone,
                content = PopTokens.YellowDeep,
            )

            racer.ready -> Text("READY", style = PopType.Small, color = PopTokens.TealDeep)
        }
    }
}

@Composable
private fun Swatch(tint: Color, size: androidx.compose.ui.unit.Dp = 30.dp) {
    val shape = RoundedCornerShape(9.dp)
    Box(Modifier.size(size).background(tint, shape).border(2.5.dp, PopTokens.Ink, shape))
}

/**
 * E3 · Trade Expo.
 *
 * The open race board across the whole crew network — still only families a
 * grown-up linked, just more of them than one race.
 *
 * The player's own row is always marked and never dropped off the bottom. A
 * leaderboard a child cannot find themselves on is a list of other people
 * doing better than them, which is the opposite of the intended effect.
 */
@Composable
fun TradeExpoScreen(
    rows: List<ExpoRow>,
    onJoinNextRace: () -> Unit,
    onBack: () -> Unit,
) {
    PopTabBody {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PopButton(
                text = "‹",
                onClick = onBack,
                tone = PopTone.White,
                size = PopSize.Small,
                shadow = PopShadow.Small,
                modifier = Modifier.semantics { contentDescription = "Back" },
            )
            PopBanner(text = "TRADE EXPO", fill = PopTokens.Blue)
        }

        Text(
            "Today's leaderboard · your whole crew network",
            style = PopType.Small,
            color = PopTokens.Mud,
        )

        rows.forEach { row -> ExpoRowCard(row) }

        PopGap(4.dp)

        PopButton(
            text = "JOIN THE NEXT RACE ▸",
            onClick = onJoinNextRace,
            tone = PopTone.Blue,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(24.dp)
    }
}

@Composable
private fun ExpoRowCard(row: ExpoRow) {
    val leader = row.rank == 1
    PopCard(
        modifier = Modifier
            .fillMaxWidth()
            .semantics(mergeDescendants = true) {
                contentDescription = "Position ${row.rank}, ${row.name}, ${row.score} points"
            },
        fill = if (leader) PopTokens.Yellow else PopTokens.White,
        padding = androidx.compose.foundation.layout.PaddingValues(12.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "${row.rank}",
                style = PopType.Title,
                color = if (row.you) PopTokens.TealDeep else PopTokens.Ink,
                modifier = Modifier.size(width = 20.dp, height = 24.dp),
                textAlign = TextAlign.Center,
            )
            Swatch(row.tint, size = 26.dp)
            Text(
                text = row.name,
                style = PopType.Body,
                color = PopTokens.Ink,
                modifier = Modifier.weight(1f),
            )
            Text("${row.score}", style = PopType.Title, color = PopTokens.Ink)
        }
    }
}

/**
 * E4 · Job Challenge.
 *
 * Asynchronous head-to-head: you play a set, they play the same set whenever
 * they next open the app. No live session to coordinate, which is what makes it
 * work between a child and a grandparent in another time zone.
 *
 * The send list is *only* people a grown-up has linked, and the screen says so.
 */
@Composable
fun JobChallengeScreen(
    latest: ChallengeOutcome?,
    contacts: List<CrewContact>,
    onSend: (CrewContact) -> Unit,
    onBack: () -> Unit,
) {
    PopTabBody {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PopButton(
                text = "‹",
                onClick = onBack,
                tone = PopTone.White,
                size = PopSize.Small,
                shadow = PopShadow.Small,
                modifier = Modifier.semantics { contentDescription = "Back" },
            )
            PopBanner(text = "JOB CHALLENGE", fill = PopTokens.Red)
        }

        if (latest != null) {
            PopCard(
                modifier = Modifier.fillMaxWidth(),
                fill = when {
                    latest.won -> PopTokens.Teal
                    latest.drawn -> PopTokens.Blue
                    else -> PopTokens.SandPanel
                },
            ) {
                Text(
                    text = when {
                        latest.won -> "YOU WON!"
                        latest.drawn -> "A DRAW!"
                        else -> "${latest.opponent.uppercase()} TOOK IT"
                    },
                    style = PopType.DisplayMedium,
                    color = if (latest.drawn || latest.won) PopTokens.White else PopTokens.Ink,
                )
                PopGap(10.dp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    ScoreColumn(
                        name = "You",
                        score = "${latest.yourScore}/${latest.outOf}",
                        highlight = latest.won,
                    )
                    Text(
                        "vs",
                        style = PopType.Body,
                        color = if (latest.won || latest.drawn) {
                            PopTokens.White
                        } else {
                            PopTokens.Mud
                        },
                    )
                    ScoreColumn(
                        name = latest.opponent,
                        score = "${latest.theirScore}/${latest.outOf}",
                        highlight = !latest.won && !latest.drawn,
                    )
                }
            }
        }

        Text("CHALLENGE SOMEONE", style = PopType.Small, color = PopTokens.Mud)

        contacts.forEach { contact ->
            PopTapCard(
                onClick = { onSend(contact) },
                modifier = Modifier.fillMaxWidth(),
                shadow = PopShadow.Small,
                spoken = "Send a challenge to ${contact.name}" +
                    (contact.role?.let { ", $it" } ?: ""),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Swatch(contact.tint, size = 28.dp)
                    Text(
                        text = contact.role?.let { "${contact.name} ($it)" } ?: contact.name,
                        style = PopType.Body,
                        color = PopTokens.Ink,
                        modifier = Modifier.weight(1f),
                    )
                    PopTag(text = "SEND", fill = PopTokens.Yellow, content = PopTokens.Ink)
                }
            }
        }

        PopNote(
            text = "Only crew a grown-up has linked · no free chat",
            modifier = Modifier.fillMaxWidth(),
            fill = PopTokens.SandPanel,
            content = PopTokens.Mud,
            accent = PopTokens.SandLight,
        )

        PopGap(24.dp)
    }
}

@Composable
private fun ScoreColumn(name: String, score: String, highlight: Boolean) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.semantics(mergeDescendants = true) {
            contentDescription = "$name scored $score"
        },
    ) {
        Text(name, style = PopType.Small, color = PopTokens.White)
        Text(
            text = score,
            style = PopType.DisplayMedium,
            color = if (highlight) PopTokens.Yellow else PopTokens.White,
        )
    }
}
