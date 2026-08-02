package com.timestabletradies.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.LocalPopReducedMotion
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopScreen
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popSurface
import com.timestabletradies.core.network.HouseState
import com.timestabletradies.core.network.TradiesRepository

/**
 * The House Project — what the materials were for.
 *
 * Coins buy cosmetics; materials build this. Without somewhere to see it, the
 * materials line on the results screen is a number that means nothing, which
 * is most of why this screen matters more than its complexity suggests.
 */
@Composable
fun HouseScreen(
    repository: TradiesRepository,
    studentId: String,
    onBack: () -> Unit,
) {
    var house by remember { mutableStateOf<HouseState?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(studentId) {
        runCatching { repository.house(studentId) }
            .onSuccess { house = it }
            .onFailure { error = it.message ?: "Couldn't load the build." }
    }

    PopScreen(
        title = if (house?.movedIn == true) "Home!" else "Your Build",
        subtitle = house?.stages?.firstOrNull { it.current }?.name,
    ) {
        when {
            error != null -> ErrorCard(error!!)
            house == null -> PopCard(modifier = Modifier.fillMaxWidth()) {
                Text("Loading…", style = PopType.Body, color = PopTokens.Mud)
            }
            else -> {
                CurrentStage(house!!)
                StageLadder(house!!)
                RareItems(house!!)
            }
        }

        Spacer(Modifier.height(8.dp))
        PopButton(
            text = "Back to the shed",
            onClick = onBack,
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun CurrentStage(house: HouseState) {
    val stage = house.stages.firstOrNull { it.current } ?: return

    PopCard(
        modifier = Modifier.fillMaxWidth(),
        fill = PopTokens.SandPanel,
        shadow = PopShadow.Large,
    ) {
        // Every art slot in this app is a labelled placeholder pending an
        // illustrator — see the README. This is one of them.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
                .popSurface(PopTokens.Bone, PopTokens.RadiusSm, PopShadow.Small),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "🏠",
                style = PopType.DisplayLarge,
                color = PopTokens.Ink,
            )
        }

        Spacer(Modifier.height(12.dp))

        if (house.loadsNeeded == null) {
            Text("Moved in!", style = PopType.Title, color = PopTokens.TealDeep)
        } else {
            Text(
                text = "${house.loads} of ${house.loadsNeeded} ${stage.unit}",
                style = PopType.Body,
                color = PopTokens.Ink,
            )
            Spacer(Modifier.height(8.dp))
            LoadBar(house.percent)
        }
    }
}

@Composable
private fun LoadBar(percent: Int) {
    val reduced = LocalPopReducedMotion.current
    val animated by animateFloatAsState(percent / 100f, label = "houseProgress")
    val shown = if (reduced) percent / 100f else animated

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(20.dp)
            .popSurface(PopTokens.White, PopTokens.RadiusSm, PopShadow.Small)
            .padding(3.dp)
            .semantics { contentDescription = "$percent percent of this stage done" },
    ) {
        Box(
            Modifier
                .fillMaxWidth(shown.coerceIn(0f, 1f))
                .height(14.dp)
                .background(PopTokens.Amber, RoundedCornerShape(PopTokens.RadiusSm)),
        )
    }
}

@Composable
private fun StageLadder(house: HouseState) {
    PopCard(modifier = Modifier.fillMaxWidth()) {
        house.stages.forEach { stage ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .semantics {
                        contentDescription = when {
                            stage.done -> "${stage.name}, done"
                            stage.current -> "${stage.name}, in progress"
                            else -> "${stage.name}, not started"
                        }
                    },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Tick, arrow or dot — the state is never colour alone.
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .popSurface(
                            fill = when {
                                stage.done -> PopTokens.Teal
                                stage.current -> PopTokens.Yellow
                                else -> PopTokens.SandFill
                            },
                            radius = 8.dp,
                            shadow = PopShadow.Small,
                            borderWidth = 2.dp,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = when {
                            stage.done -> "✓"
                            stage.current -> "▸"
                            else -> "·"
                        },
                        style = PopType.Small,
                        color = if (stage.done) PopTokens.White else PopTokens.Ink,
                    )
                }
                Spacer(Modifier.width(12.dp))
                Text(
                    text = stage.name,
                    style = if (stage.current) PopType.Title else PopType.Body,
                    color = if (stage.done) PopTokens.Mud else PopTokens.Ink,
                )
            }
        }
    }
}

@Composable
private fun RareItems(house: HouseState) {
    val won = house.rareItems.count { it.owned }

    PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.TealWash) {
        Text(
            "Rare finds  $won / ${house.rareItems.size}",
            style = PopType.Title,
            color = PopTokens.TealDeep,
        )
        Text(
            "Only Boss Battles drop these.",
            style = PopType.Small,
            color = PopTokens.Mud,
        )
        Spacer(Modifier.height(10.dp))

        house.rareItems.forEach { item ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 3.dp),
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
                        // Unwon items keep their name but not their flavour —
                        // enough to be a goal, not enough to spoil the reveal.
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
