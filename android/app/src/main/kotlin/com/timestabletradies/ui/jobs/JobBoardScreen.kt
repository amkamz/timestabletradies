package com.timestabletradies.ui.jobs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopCoin
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopTabBody
import com.timestabletradies.core.designsystem.PopTag
import com.timestabletradies.core.designsystem.PopTapCard
import com.timestabletradies.core.designsystem.PopTimber
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.ui.state.JobCard
import com.timestabletradies.ui.state.JobDifficulty

/**
 * B2 · The Job Board.
 *
 * Difficulty and reward are on the card, before the tap. A child choosing
 * between four jobs is making a real decision — harder work pays more under
 * difficulty weighting (§1.9) — and hiding the trade-off behind a confirmation
 * screen would turn a choice into a surprise.
 *
 * The last card is always the Mixed Muster: everything unlocked, drawn across
 * trades. It is the one job that exercises the spaced-repetition check-ins the
 * mastery ladder is waiting on, which is why it is styled as the odd one out.
 */
@Composable
fun JobBoardScreen(
    jobs: List<JobCard>,
    /** Finished today. Greyed and tagged, so the board reads as a day's work. */
    completed: Set<String>,
    onPick: (JobCard) -> Unit,
    onTrainingShed: () -> Unit,
    onTradeZones: () -> Unit,
) {
    PopTabBody {
        PopBanner(text = "THE JOB BOARD", fill = PopTokens.Teal)

        jobs.forEach { job ->
            JobRow(
                job = job,
                done = job.id in completed,
                onClick = { onPick(job) },
            )
        }

        // Nothing left to do is a result, not an empty state — and the way out
        // is practice, which is what the two cards below already offer.
        if (jobs.isNotEmpty() && jobs.all { it.id in completed }) {
            JobBoardEmpty()
        }

        PopGap(6.dp)

        // Practice and progression sit under the board rather than in the tab
        // bar: the bar has five cells and they are spoken for, and a child who
        // has finished today's jobs is exactly who goes looking for these.
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PopTapCard(
                onClick = onTrainingShed,
                modifier = Modifier.weight(1f),
                fill = PopTokens.Yellow,
                spoken = "Training shed. Practice modes.",
            ) {
                Text("TRAINING", style = PopType.Title, color = PopTokens.Ink)
                Text("SHED", style = PopType.Title, color = PopTokens.Ink)
                Text("Practice your way", style = PopType.Small, color = PopTokens.YellowDeep)
            }
            PopTapCard(
                onClick = onTradeZones,
                modifier = Modifier.weight(1f),
                fill = PopTokens.Ink,
                spoken = "Trade zones. Every table as a trade.",
            ) {
                Text("TRADE", style = PopType.Title, color = PopTokens.Yellow)
                Text("ZONES", style = PopType.Title, color = PopTokens.Yellow)
                Text("Where you're up to", style = PopType.Small, color = PopTokens.Stone)
            }
        }

        PopGap(24.dp)
    }
}

/**
 * One row on the board.
 *
 * A finished job stays visible, greyed and tagged DONE, rather than vanishing.
 * A list that empties as you work gives a child no sense of a day's shape —
 * and the strikethrough is the reward, which is why the row is still there to
 * look at.
 */
@Composable
private fun JobRow(job: JobCard, done: Boolean, onClick: () -> Unit) {
    val review = job.difficulty == JobDifficulty.Review
    val titleColor = when {
        done -> PopTokens.Sand
        review -> PopTokens.Yellow
        else -> PopTokens.Ink
    }
    val blurbColor = when {
        done -> PopTokens.SandLight
        review -> PopTokens.Stone
        else -> PopTokens.Mud
    }

    PopTapCard(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        fill = when {
            done -> PopTokens.SandPanel
            review -> PopTokens.Ink
            else -> PopTokens.White
        },
        borderColor = if (done) PopTokens.SandPale else PopTokens.Ink,
        // Done for today, so it stops being a button — no shadow, no tap.
        shadow = if (done) PopShadow.Small else PopShadow.Medium,
        enabled = !done,
        spoken = buildString {
            append(job.title)
            if (done) {
                append(", done for today")
                return@buildString
            }
            append(", ")
            append(job.difficulty.label.lowercase())
            append(", ")
            append(job.blurb)
            append(". Pays ${job.coins} coins")
            if (job.timber > 0) append(" and ${job.timber} timber")
            append(".")
        },
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(job.title, style = PopType.Title, color = titleColor)
            if (done) {
                PopTag(
                    text = "DONE ✓",
                    fill = PopTokens.TealTint,
                    content = PopTokens.TealDeep,
                    borderColor = PopTokens.Teal,
                )
            } else {
                PopTag(
                    text = job.difficulty.label,
                    fill = job.difficulty.fill,
                    content = job.difficulty.content,
                    borderColor = job.difficulty.border,
                )
            }
        }
        PopGap(3.dp)
        Text(
            text = if (done) "Back tomorrow" else job.blurb,
            style = PopType.Small,
            color = blurbColor,
        )

        if (!review && !done) {
            PopGap(8.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Reward(value = job.coins) { PopCoin(size = 15.dp) }
                if (job.timber > 0) {
                    Reward(value = job.timber) { PopTimber(width = 15.dp, height = 11.dp) }
                }
            }
        }
    }
}

@Composable
private fun Reward(value: Int, icon: @Composable () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        icon()
        Text("$value", style = PopType.Body, color = PopTokens.Ink)
    }
}

/** Compact reward line reused by the briefing screen. */
@Composable
internal fun RewardLine(coins: Int, timber: Int) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Reward(value = coins) { PopCoin(size = 15.dp) }
        if (timber > 0) Reward(value = timber) { PopTimber(width = 15.dp, height = 11.dp) }
    }
}

/** Kept as a named column so a future empty state has an obvious home. */
@Composable
internal fun JobBoardEmpty() {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text("Board's clear", style = PopType.Title, color = PopTokens.Ink)
        Text(
            "Nothing left today — try the training shed.",
            style = PopType.Small,
            color = PopTokens.Mud,
        )
    }
}
