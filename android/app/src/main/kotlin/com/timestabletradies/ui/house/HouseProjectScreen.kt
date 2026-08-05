package com.timestabletradies.ui.house

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
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopProgressBar
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTabBody
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.network.HouseState
import com.timestabletradies.core.network.HouseStageDto

/**
 * D4 · The House Project — what the materials were for.
 *
 * Coins buy cosmetics; materials build this. Without somewhere to see it, the
 * materials line on the results screen is a number that means nothing, which is
 * most of why this screen matters more than its complexity suggests.
 *
 * Stage thresholds come from the server, not a local table: the server rolls
 * loads forward through them when banking, so a client with its own copy would
 * draw a bar that disagrees with when a stage actually completes.
 */
@Composable
fun HouseProjectScreen(
    house: HouseState?,
    houseName: String,
    error: String?,
    onBack: () -> Unit,
    onMoveIn: () -> Unit,
) {
    PopTabBody {
        PopBanner(text = "THE ${houseName.uppercase()}", fill = PopTokens.Teal)

        when {
            error != null -> PopCard(
                modifier = Modifier.fillMaxWidth(),
                fill = PopTokens.SandPanel,
            ) {
                Text("Couldn't load the build", style = PopType.Title, color = PopTokens.Ink)
                Text(error, style = PopType.Small, color = PopTokens.Mud)
            }

            house == null -> PopCard(modifier = Modifier.fillMaxWidth()) {
                Text("Loading…", style = PopType.Body, color = PopTokens.Mud)
            }

            else -> {
                val current = house.stages.firstOrNull { it.current }
                val rareWon = house.rareItems.filter { it.owned }

                PopArtSlot(
                    label = buildString {
                        append("HOUSE @ ${current?.name?.uppercase() ?: "DONE"}")
                        rareWon.forEach { append("\n+ ${it.name.lowercase()}") }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(190.dp)
                        .background(PopTokens.TealPale, RoundedCornerShape(PopTokens.RadiusMd)),
                )

                house.stages.forEachIndexed { index, stage ->
                    StageRow(
                        number = index + 1,
                        stage = stage,
                        loads = house.loads,
                        loadsNeeded = house.loadsNeeded,
                        percent = house.percent,
                        last = index == house.stages.lastIndex,
                    )
                }

                RareItems(house)

                if (house.movedIn) {
                    PopGap(4.dp)
                    PopButton(
                        text = "SEE MOVE-IN DAY ▸",
                        onClick = onMoveIn,
                        tone = PopTone.Red,
                        size = PopSize.Large,
                        fullWidth = true,
                        shadow = PopShadow.Large,
                    )
                }
            }
        }

        PopGap(4.dp)

        PopButton(
            text = "Back to the site",
            onClick = onBack,
            tone = PopTone.White,
            size = PopSize.Small,
        )

        PopGap(24.dp)
    }
}

/**
 * One stage.
 *
 * Only the current stage gets a card, a number badge and a bar; done and
 * upcoming stages are one line each. A ladder where every rung shouts is a
 * ladder where nothing tells a child what to do next.
 */
@Composable
private fun StageRow(
    number: Int,
    stage: HouseStageDto,
    loads: Int,
    loadsNeeded: Int?,
    percent: Int,
    last: Boolean,
) {
    val spoken = when {
        stage.done -> "Stage $number, ${stage.name}, done"
        stage.current && loadsNeeded != null ->
            "Stage $number, ${stage.name}, in progress, $loads of $loadsNeeded ${stage.unit}"
        stage.current -> "Stage $number, ${stage.name}, in progress"
        else -> "Stage $number, ${stage.name}, not started"
    }

    if (stage.current) {
        PopCard(
            modifier = Modifier
                .fillMaxWidth()
                .semantics(mergeDescendants = true) { contentDescription = spoken },
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                StageBadge(
                    label = if (last) "🏠" else "$number",
                    fill = PopTokens.Yellow,
                    content = PopTokens.Ink,
                )
                Column(Modifier.weight(1f)) {
                    Text(stage.name, style = PopType.Title, color = PopTokens.Ink)
                    PopGap(6.dp)
                    PopProgressBar(
                        progress = percent / 100f,
                        height = 12.dp,
                        track = PopTokens.SandFill,
                        fill = PopTokens.Teal,
                        borderWidth = 1.5.dp,
                        label = "$percent percent of this stage",
                    )
                    PopGap(4.dp)
                    if (loadsNeeded != null) {
                        Text(
                            "$loads / $loadsNeeded ${stage.unit}",
                            style = PopType.Small,
                            color = PopTokens.Mud,
                        )
                    }
                }
            }
        }
    } else {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 2.dp)
                .semantics(mergeDescendants = true) { contentDescription = spoken },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            StageBadge(
                label = when {
                    stage.done -> "✓"
                    last -> "🏠"
                    else -> "$number"
                },
                fill = if (stage.done) PopTokens.Teal else PopTokens.SandFill,
                content = if (stage.done) PopTokens.White else PopTokens.Sand,
                borderColor = if (stage.done) PopTokens.Ink else PopTokens.SandLight,
            )
            Text(
                text = stage.name,
                style = PopType.Body,
                color = if (stage.done) PopTokens.Ink else PopTokens.Sand,
            )
        }
    }
}

@Composable
private fun StageBadge(
    label: String,
    fill: Color,
    content: Color,
    borderColor: Color = PopTokens.Ink,
) {
    val shape = RoundedCornerShape(10.dp)
    Box(
        modifier = Modifier.size(32.dp).background(fill, shape).border(2.5.dp, borderColor, shape),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = PopType.Small, color = content)
    }
}

/**
 * The rare finds.
 *
 * Unwon items keep their zone but not their name — enough to be a goal, not
 * enough to spoil the reveal. They are the only reward in the game that coins
 * cannot buy, which is what makes a boss worth fighting.
 */
@Composable
private fun RareItems(house: HouseState) {
    val won = house.rareItems.count { it.owned }

    PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.TealWash) {
        Text(
            "Rare finds  $won / ${house.rareItems.size}",
            style = PopType.Title,
            color = PopTokens.TealDeep,
        )
        Text("Only Boss Battles drop these.", style = PopType.Small, color = PopTokens.Mud)
        PopGap(10.dp)

        house.rareItems.forEach { item ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = if (item.owned) "★" else "·",
                    style = PopType.Title,
                    color = if (item.owned) PopTokens.Amber else PopTokens.Stone,
                    modifier = Modifier.width(24.dp),
                    textAlign = TextAlign.Center,
                )
                Column(Modifier.weight(1f)) {
                    Text(
                        text = if (item.owned) item.name else "×${item.zone} zone reward",
                        style = PopType.Body,
                        color = if (item.owned) PopTokens.Ink else PopTokens.Mud,
                    )
                    if (item.owned) {
                        Text(item.blurb, style = PopType.Small, color = PopTokens.Mud)
                    }
                }
            }
        }
    }
}
