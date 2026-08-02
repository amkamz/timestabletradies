package com.timestabletradies.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopScreen
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType

/**
 * How a finished run is presented.
 *
 * [Banked] carries the server's figures — `run-finish` recomputed them from
 * the answer log, so the client is displaying a decision, not making one.
 * [NotSaved] is the offline case, and says so plainly rather than showing a
 * coin total that never happened.
 */
sealed interface RunSummary {
    val correct: Int
    val total: Int
    val accuracyPercent: Int
    val averageMs: Long

    data class Banked(
        override val correct: Int,
        override val total: Int,
        override val accuracyPercent: Int,
        override val averageMs: Long,
        val coins: Int,
        val materials: Int,
        val coinsTotal: Int,
        val capped: Boolean,
        val housesCompleted: List<String>,
        /** Set when The Yard pushed them up the ladder. */
        val newRank: String? = null,
        /** Set when a full multiplication round opened division for a table. */
        val divisionUnlockedFor: Int? = null,
    ) : RunSummary

    data class NotSaved(
        override val correct: Int,
        override val total: Int,
        override val accuracyPercent: Int,
        override val averageMs: Long,
        val reason: String,
    ) : RunSummary
}

@Composable
fun ResultsScreen(
    summary: RunSummary,
    onDone: () -> Unit,
) {
    PopScreen(
        title = if (summary.accuracyPercent >= 80) "Good job!" else "Job done",
        subtitle = "${summary.correct} of ${summary.total} right",
    ) {
        when (summary) {
            is RunSummary.Banked -> {
                PopCard(
                    modifier = Modifier.fillMaxWidth(),
                    fill = PopTokens.Yellow,
                    shadow = PopShadow.Large,
                ) {
                    Text(
                        text = "+${summary.coins}",
                        style = PopType.DisplayLarge,
                        color = PopTokens.Ink,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        text = "coins  ·  ${summary.coinsTotal} all up",
                        style = PopType.Body,
                        color = PopTokens.YellowDeep,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                if (summary.capped) {
                    // The cap is soft on purpose: past the line the mode still
                    // runs and still records mastery, it just pays a quarter.
                    PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.TealWash) {
                        Text(
                            "That's plenty for today",
                            style = PopType.Title,
                            color = PopTokens.TealDeep,
                        )
                        Text(
                            "Keep playing if you like — it still counts for your grid.",
                            style = PopType.Small,
                            color = PopTokens.Mud,
                        )
                    }
                }

                // The moments worth stopping for. Coins tick up constantly;
                // a promotion or a new operation opening up happens rarely,
                // and burying them under a stats row wastes them.
                if (summary.newRank != null) {
                    PopCard(
                        modifier = Modifier.fillMaxWidth(),
                        fill = PopTokens.Red,
                        shadow = PopShadow.Large,
                    ) {
                        Text(
                            "Promoted!",
                            style = PopType.DisplayMedium,
                            color = PopTokens.White,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text(
                            summary.newRank,
                            style = PopType.Body,
                            color = PopTokens.RedTint,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }

                if (summary.divisionUnlockedFor != null) {
                    PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.Blue) {
                        Text(
                            "Division unlocked",
                            style = PopType.Title,
                            color = PopTokens.White,
                        )
                        Text(
                            "You can work the ×${summary.divisionUnlockedFor} " +
                                "table backwards now.",
                            style = PopType.Small,
                            color = PopTokens.White,
                        )
                    }
                }

                summary.housesCompleted.forEach { stage ->
                    PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.TealTint) {
                        Text("$stage done!", style = PopType.Title, color = PopTokens.TealDeep)
                    }
                }

                StatsRow(summary.accuracyPercent, summary.averageMs, summary.materials)
            }

            is RunSummary.NotSaved -> {
                PopCard(
                    modifier = Modifier.fillMaxWidth(),
                    fill = PopTokens.SandPanel,
                    shadow = PopShadow.Large,
                ) {
                    Text("Not saved", style = PopType.Title, color = PopTokens.Ink)
                    Text(
                        text = "Couldn't reach the site office, so this one didn't " +
                            "count. Your answers are safe on the grid next time " +
                            "you're online.",
                        style = PopType.Small,
                        color = PopTokens.Mud,
                    )
                }
                StatsRow(summary.accuracyPercent, summary.averageMs, materials = null)
            }
        }

        Spacer(Modifier.height(4.dp))

        PopButton(
            text = "Back to the shed",
            onClick = onDone,
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )
    }
}

@Composable
private fun StatsRow(accuracyPercent: Int, averageMs: Long, materials: Int?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Stat("Accuracy", "$accuracyPercent%", Modifier.weight(1f))
        Stat("Average", "${averageMs / 100 / 10.0}s", Modifier.weight(1f))
        if (materials != null) Stat("Materials", "$materials", Modifier.weight(1f))
    }
}

@Composable
private fun Stat(label: String, value: String, modifier: Modifier = Modifier) {
    PopCard(modifier = modifier, shadow = PopShadow.Small) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(value, style = PopType.Title, color = PopTokens.Ink)
            Text(label, style = PopType.Small, color = PopTokens.Mud)
        }
    }
}
