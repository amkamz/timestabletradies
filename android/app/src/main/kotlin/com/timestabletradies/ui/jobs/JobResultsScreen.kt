package com.timestabletradies.ui.jobs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopCoin
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopNote
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopStat
import com.timestabletradies.core.designsystem.PopTimber
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.ui.RunSummary

/**
 * B9 · Job complete.
 *
 * Everything on this screen is the server's verdict, not the client's —
 * `run-finish` recomputed coins, materials, mastery and city XP from the answer
 * log, and this displays what came back (§0.2).
 *
 * The order is deliberate. Coins first because that is what a child came for,
 * then anything that only happens rarely — a level up, a streak milestone,
 * division opening — and the accuracy figures last. Burying a level-up
 * under a stats table wastes the one moment in a session worth stopping for.
 */
@Composable
fun JobResultsScreen(
    summary: RunSummary,
    jobTitle: String,
    onAgain: () -> Unit,
    onBackToSite: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Paper) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PopBanner(
                text = if (summary.accuracyPercent >= 80) "JOB DONE!" else "CLOCKED OFF",
                fill = PopTokens.Yellow,
                content = PopTokens.Ink,
            )
            PopArtSlot(
                label = "STAR /\nCONFETTI",
                modifier = Modifier.fillMaxWidth().height(110.dp),
            )
            Text(jobTitle, style = PopType.Title, color = PopTokens.Ink, textAlign = TextAlign.Center)
        }

        PopCard(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                PopStat(
                    value = "${summary.accuracyPercent}%",
                    label = "ACCURACY",
                    valueColor = if (summary.accuracyPercent >= 80) {
                        PopTokens.Teal
                    } else {
                        PopTokens.Amber
                    },
                )
                PopStat(
                    value = "${summary.averageMs / 100 / 10.0}s",
                    label = "AVG TIME",
                    valueColor = PopTokens.Red,
                )
                PopStat(
                    value = "${summary.correct}/${summary.total}",
                    label = "CORRECT",
                )
            }
        }

        when (summary) {
            is RunSummary.Banked -> {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PayoutChip(
                        value = "+${summary.coins}",
                        modifier = Modifier.weight(1f),
                        spoken = "${summary.coins} coins earned",
                    ) { PopCoin(size = 20.dp) }
                    if (summary.materials > 0) {
                        PayoutChip(
                            value = "+${summary.materials}",
                            modifier = Modifier.weight(1f),
                            spoken = "${summary.materials} loads of timber earned",
                        ) { PopTimber(width = 20.dp, height = 14.dp) }
                    }
                }

                // The rare moments, given room rather than a line in a table.
                if (summary.newCityLevel != null) {
                    PopCard(
                        modifier = Modifier.fillMaxWidth(),
                        fill = PopTokens.Red,
                    ) {
                        Text(
                            "LEVEL UP!",
                            style = PopType.DisplayMedium,
                            color = PopTokens.White,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text(
                            "Sparky's City reached level ${summary.newCityLevel}",
                            style = PopType.Body,
                            color = PopTokens.RedTint,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }

                if (summary.streakPointsAwarded > 0) {
                    PopCard(
                        modifier = Modifier.fillMaxWidth(),
                        fill = PopTokens.Yellow,
                    ) {
                        Text(
                            "TEN DAYS ON THE TROT",
                            style = PopType.Title,
                            color = PopTokens.Ink,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text(
                            "${summary.streakPointsAwarded} streak point" +
                                if (summary.streakPointsAwarded == 1) " banked" else "s banked",
                            style = PopType.Small,
                            color = PopTokens.YellowDeep,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }

                if (summary.streakTiersLost > 0) {
                    // Said plainly and without scolding. A missed day costs a
                    // step off the rate, never the points already earned, and a
                    // child told that clearly is likelier to come back tomorrow.
                    PopCard(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            "Your streak dropped a step while you were away — " +
                                "the points you earned are safe.",
                            style = PopType.Small,
                            color = PopTokens.Mud,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }

                if (summary.divisionUnlockedFor != null) {
                    PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.Blue) {
                        Text("Division unlocked", style = PopType.Title, color = PopTokens.White)
                        Text(
                            "You can work the ×${summary.divisionUnlockedFor} table " +
                                "backwards now.",
                            style = PopType.Small,
                            color = PopTokens.White,
                        )
                    }
                }

                summary.housesCompleted.forEach { stage ->
                    PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.Teal) {
                        Text("MATERIALS BANKED", style = PopType.Title, color = PopTokens.White)
                        Text("$stage done!", style = PopType.Small, color = PopTokens.TealMist)
                    }
                }

                if (summary.capped) {
                    // The cap is soft: past the line a mode still runs and still
                    // records mastery, it just pays less. Saying so is the
                    // difference between a limit and the game looking broken.
                    PopNote(
                        text = "That's plenty for today — keep playing if you like, " +
                            "it still counts for your grid.",
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            is RunSummary.NotSaved -> {
                PopNote(
                    text = "Couldn't reach the site office, so this one didn't bank. " +
                        "Your answers are safe for the grid next time you're online.",
                    modifier = Modifier.fillMaxWidth(),
                    fill = PopTokens.SandPanel,
                    content = PopTokens.Ink,
                    accent = PopTokens.SandLight,
                )
            }
        }

        PopGap(4.dp)

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PopButton(
                text = "AGAIN",
                onClick = onAgain,
                tone = PopTone.White,
                size = PopSize.Large,
                modifier = Modifier.weight(1f),
            )
            PopButton(
                text = "BACK TO SITE",
                onClick = onBackToSite,
                tone = PopTone.Red,
                size = PopSize.Large,
                modifier = Modifier.weight(1f),
                shadow = PopShadow.Large,
            )
        }

        PopGap(20.dp)
    }
}

@Composable
private fun PayoutChip(
    value: String,
    spoken: String,
    modifier: Modifier = Modifier,
    icon: @Composable () -> Unit,
) {
    PopCard(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .semantics(mergeDescendants = true) { contentDescription = spoken },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            icon()
            Text(value, style = PopType.DisplayMedium, color = PopTokens.Ink)
        }
    }
}
