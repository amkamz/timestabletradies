package com.timestabletradies.ui.boss

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopCoin
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopHairline
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopSpecRow
import com.timestabletradies.core.designsystem.PopTag
import com.timestabletradies.core.designsystem.PopTimber
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.ui.state.BossBrief
import com.timestabletradies.ui.state.RareDrop

/**
 * D1 · Boss Battle intro.
 *
 * A boss unlocks per zone once that zone is finished — never on Trade Rank,
 * which is a volatile fluency measure that can go down and would make a fight
 * appear and vanish (§1.8).
 *
 * The reward is stated before the fight because it is the only reward in the
 * game that cannot be bought: rare house items drop from bosses and from
 * nowhere else, and that is the entire reason a child takes one on.
 */
@Composable
fun BossIntroScreen(
    brief: BossBrief,
    onFight: () -> Unit,
    onBack: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Ink) {
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
                text = "BOSS BATTLE",
                fill = PopTokens.Red,
                content = PopTokens.White,
                borderColor = PopTokens.Yellow,
                fontSize = 12.sp,
            )
        }

        PopArtSlot(
            label = "BOSS ART\n${brief.name.uppercase()}",
            modifier = Modifier.fillMaxWidth().height(190.dp),
            content = PopTokens.Red,
        )

        Text(brief.name, style = PopType.DisplayLarge, color = PopTokens.White)
        Text(
            text = "${brief.zoneLabel} · ×${brief.table}",
            style = PopType.Small,
            color = PopTokens.RedTint,
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(PopTokens.SlatePanel, RoundedCornerShape(PopTokens.RadiusMd))
                .padding(16.dp),
        ) {
            PopSpecRow(
                label = "Questions",
                value = "${brief.questions} · mixed",
                valueColor = PopTokens.White,
            )
            PopGap(8.dp)
            PopHairline()
            PopGap(8.dp)
            PopSpecRow(label = "Timer", value = brief.timerLabel, valueColor = PopTokens.Yellow)
            PopGap(8.dp)
            PopHairline()
            PopGap(8.dp)
            PopSpecRow(
                label = "Win unlocks",
                value = brief.rewardLabel,
                valueColor = PopTokens.TealLight,
            )
        }

        PopGap(4.dp)

        PopButton(
            text = "TAKE ON THE BOSS ▸",
            onClick = onFight,
            tone = PopTone.Red,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(20.dp)
    }
}

/**
 * D3 · Boss down.
 *
 * The rare drop, and then straight to the house. The item is the point of the
 * fight, so it gets the whole screen rather than a line on the results card —
 * and the only button leads to where it goes.
 */
@Composable
fun BossVictoryScreen(
    drop: RareDrop,
    onAddToHouse: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Yellow) {
        PopGap(10.dp)

        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            PopBanner(
                text = "BOSS DOWN!",
                fill = PopTokens.Red,
                content = PopTokens.White,
            )

            PopCard(
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Start,
                ) {
                    PopTag(
                        text = "RARE",
                        fill = PopTokens.Teal,
                        content = PopTokens.White,
                    )
                }
                PopGap(10.dp)
                PopArtSlot(
                    label = drop.name.uppercase().replace(" ", "\n"),
                    modifier = Modifier.fillMaxWidth().height(150.dp),
                )
            }

            Text(
                "Rare item unlocked!",
                style = PopType.DisplayMedium,
                color = PopTokens.Ink,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "A one-off ${drop.name} for your house — ${drop.blurb.lowercase()}",
                style = PopType.Small,
                color = PopTokens.YellowDeep,
                textAlign = TextAlign.Center,
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PopCard {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.semantics(mergeDescendants = true) {
                            contentDescription = "${drop.coins} coins earned"
                        },
                    ) {
                        PopCoin(size = 20.dp)
                        Text("+${drop.coins}", style = PopType.Title, color = PopTokens.Ink)
                    }
                }
                PopCard {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.semantics(mergeDescendants = true) {
                            contentDescription = "${drop.timber} loads of timber earned"
                        },
                    ) {
                        PopTimber(width = 20.dp, height = 14.dp)
                        Text("+${drop.timber}", style = PopType.Title, color = PopTokens.Ink)
                    }
                }
            }
        }

        PopGap(6.dp)

        PopButton(
            text = "ADD IT TO MY HOUSE ▸",
            onClick = onAddToHouse,
            tone = PopTone.Ink,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(20.dp)
    }
}
