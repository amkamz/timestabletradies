package com.timestabletradies.ui.jobs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopJobHeader
import com.timestabletradies.core.designsystem.PopProgressBar
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.ui.state.CrewRacer

/**
 * What the runner is dressed as.
 *
 * All four are the same loop — a server-dealt question, an answer, a log posted
 * back — wearing different clothes. Keeping them one runner rather than four
 * screens is what stops the timer, the answer log and the quit path from
 * drifting apart between modes, which is exactly where a scoring bug would
 * hide.
 */
sealed interface RunChrome {

    /** The colour behind the whole screen. */
    val backdrop: Color

    /** B4–B8 · a job from the board, in its zone's accent. */
    data class Job(override val backdrop: Color) : RunChrome

    /**
     * C5 · Site Inspection — a hard 6-second clock, shown as a ring.
     *
     * Red is doing real work here: it is the only mode that can run out of time
     * on you, and the backdrop is the warning.
     */
    data object Inspection : RunChrome {
        override val backdrop: Color get() = PopTokens.Red
    }

    /** D2 · a Boss Battle. Health drains as questions land. */
    data class Boss(val name: String) : RunChrome {
        override val backdrop: Color get() = PopTokens.Teal
    }

    /** E2 · a live Crew Race. The track *is* the progress bar. */
    data class Race(val racers: List<CrewRacer>) : RunChrome {
        override val backdrop: Color get() = PopTokens.Teal
    }
}

/**
 * The header for a chrome, above the question.
 *
 * Every variant carries the same three things in the same place — a way out, a
 * label, a sense of how far through — because a child switching modes should
 * not have to re-learn where the exit is.
 */
@Composable
fun RunChromeHeader(
    chrome: RunChrome,
    label: String,
    index: Int,
    total: Int,
    streak: Int,
    secondsLeft: Int?,
    onQuit: () -> Unit,
) {
    when (chrome) {
        is RunChrome.Job -> {
            PopJobHeader(
                label = label.uppercase(),
                onQuit = onQuit,
                counter = "${index + 1}/$total",
                progress = index.toFloat() / total.coerceAtLeast(1),
            )
            StreakLine(streak)
        }

        RunChrome.Inspection -> {
            PopJobHeader(
                label = "SITE INSPECTION",
                onQuit = onQuit,
                counter = "Q ${index + 1} / $total",
            )
            PopGap(6.dp)
            TimerRing(secondsLeft)
            Text(
                text = "SECONDS LEFT · MULTIPLY ONLY",
                style = PopType.Small,
                color = PopTokens.RedTint,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        is RunChrome.Boss -> {
            // Health is what's *left* of the boss, so it falls as the child
            // gets answers right — the inverse of the job progress bar, and the
            // reason it is red rather than yellow.
            val health = 1f - (index.toFloat() / total.coerceAtLeast(1))
            PopJobHeader(
                label = "BOSS · ${chrome.name.uppercase()}",
                onQuit = onQuit,
                counter = "${(health * 100).toInt()}%",
                progress = health,
                progressFill = PopTokens.Red,
            )
            PopGap(6.dp)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                PopArtSlot(
                    label = "BOSS",
                    modifier = Modifier.weight(1f).height(96.dp),
                    content = PopTokens.White,
                )
                Column(horizontalAlignment = Alignment.End) {
                    Text("STREAK", style = PopType.Small, color = PopTokens.White)
                    Text("×$streak", style = PopType.DisplayMedium, color = PopTokens.Yellow)
                    Text(
                        text = "Q ${index + 1} / $total",
                        style = PopType.Small,
                        color = PopTokens.TealWash,
                    )
                }
            }
        }

        is RunChrome.Race -> {
            PopJobHeader(
                label = "CREW RACE",
                onQuit = onQuit,
                counter = "Q ${index + 1} / $total",
            )
            PopGap(6.dp)
            RaceTrack(chrome.racers)
        }
    }
}

/**
 * The streak, in a slot that is there whether or not there is a streak.
 *
 * It appears at two in a row and vanishes on a miss, and the question below it
 * is centred in whatever the header leaves behind — so a line that comes and
 * goes drags the question up and down the screen with it. A child gets an
 * answer right and the next question is somewhere else, which is the one thing
 * a question card must never do.
 *
 * So the row is always composed and only its opacity changes. Reserving a fixed
 * `height` instead would clip the moment a child turns text size up; this
 * measures the real line at whatever scale is set.
 */
@Composable
private fun StreakLine(streak: Int) {
    val showing = streak >= 2
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .alpha(if (showing) 1f else 0f)
            .then(
                if (showing) {
                    Modifier.semantics { contentDescription = "$streak in a row" }
                } else {
                    // Invisible, so it must also be silent — otherwise TalkBack
                    // reads a streak that isn't on screen.
                    Modifier.clearAndSetSemantics { }
                },
            ),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("STREAK", style = PopType.Small, color = PopTokens.White)
        Text("×$streak", style = PopType.Title, color = PopTokens.Yellow)
    }
}

/**
 * The 6-second ring.
 *
 * The number inside is the information; the ring is the reinforcement. A count
 * shown only as a shrinking arc is unreadable to anyone who can't perceive the
 * colour change, and this is the one mode where running out has a cost.
 */
@Composable
private fun TimerRing(secondsLeft: Int?) {
    Box(
        modifier = Modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(86.dp)
                .border(6.dp, PopTokens.White, CircleShape)
                .semantics(mergeDescendants = true) {
                    contentDescription = "${secondsLeft ?: 0} seconds left"
                    liveRegion = LiveRegionMode.Polite
                },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "${secondsLeft ?: "–"}",
                style = PopType.DisplayLarge,
                color = if ((secondsLeft ?: 9) <= 2) PopTokens.RedTint else PopTokens.Yellow,
            )
        }
    }
}

/**
 * The race track.
 *
 * One lane per racer, position along the lane is their progress. Bots are
 * labelled in the lobby and keep their own tint here, so a child can always
 * tell who is real — the label is the honesty, the colour is the continuity.
 */
@Composable
private fun RaceTrack(racers: List<CrewRacer>) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        racers.forEach { racer ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics(mergeDescendants = true) {
                        contentDescription =
                            "${racer.name}, ${(racer.progress * 100).toInt()} percent"
                    },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Box(Modifier.weight(1f)) {
                    PopProgressBar(
                        progress = racer.progress,
                        fill = racer.tint,
                        track = PopTokens.White,
                        borderColor = PopTokens.Ink,
                        borderWidth = 2.5.dp,
                        height = 18.dp,
                    )
                }
                Text(
                    text = racer.name.substringBefore(" ").uppercase(),
                    style = PopType.Small,
                    color = PopTokens.Ink,
                    modifier = Modifier.width(64.dp),
                )
            }
        }
    }
}
