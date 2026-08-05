package com.timestabletradies.ui.modes

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.toMutableStateList
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
import com.timestabletradies.core.designsystem.PopChoice
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopNote
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopStat
import com.timestabletradies.core.designsystem.PopToggle
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.hazardStripe
import com.timestabletradies.ui.state.Storyboard

/**
 * C3 · The Garage.
 *
 * The adaptive practice bay. What makes it adaptive is entirely server-side —
 * `run-start` weights selection by the mastery ladder, which needs the whole
 * ruleset — so this screen's job is to say *what* is being practised and why,
 * not to choose it.
 *
 * The teacher-set focus tables are shown when a classroom has assigned them, so
 * a child can see the connection between what their teacher asked for and what
 * the app is giving them.
 */
@Composable
fun GarageScreen(
    focusTables: List<Int>,
    teacherSet: Boolean,
    coinsPerCorrect: Int,
    onStart: () -> Unit,
    onBack: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Teal) {
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
                modifier = Modifier.semantics { contentDescription = "Back to the shed" },
            )
            if (teacherSet) {
                PopBanner(
                    text = "TEACHER SET",
                    fill = PopTokens.Ink,
                    content = PopTokens.Yellow,
                    fontSize = 12.sp,
                )
            }
        }

        Text("The Garage", style = PopType.DisplayLarge, color = PopTokens.White)
        Text(
            "Your practice bay adapts to what you need most.",
            style = PopType.Body,
            color = PopTokens.TealWash,
        )

        PopArtSlot(
            label = "GARAGE / WORKBENCH ART",
            modifier = Modifier.fillMaxWidth().height(150.dp),
            content = PopTokens.White,
        )

        PopCard(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = if (teacherSet) "FOCUS FROM YOUR TEACHER" else "TODAY'S FOCUS",
                style = PopType.Small,
                color = PopTokens.Mud,
            )
            PopGap(8.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                focusTables.forEach { table ->
                    Box(
                        modifier = Modifier
                            .background(PopTokens.Yellow, RoundedCornerShape(10.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                            .semantics {
                                contentDescription =
                                    "${Storyboard.tradeFor(table)}, times $table"
                            },
                    ) {
                        Text("×$table", style = PopType.Title, color = PopTokens.Ink)
                    }
                }
            }
            PopGap(10.dp)
            Text(
                text = "💰 $coinsPerCorrect coins for every correct answer",
                style = PopType.Small,
                color = PopTokens.TealDeep,
            )
        }

        PopGap(4.dp)

        PopButton(
            text = "START PRACTICE ▸",
            onClick = onStart,
            tone = PopTone.Red,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(20.dp)
    }
}

/**
 * C4 · The Yard → Trade Rank.
 *
 * Ten rungs, and **the ladder shown here is the high-water mark, not the last
 * result.** `rankFromYardResult` recomputes rank from a single speed test and
 * can come back lower than last time; a rung that disappears after one bad run
 * reads to a seven-year-old as punishment, and anything gated on rank reads the
 * peak for the same reason (§1.8).
 */
@Composable
fun TradeRankScreen(
    currentRung: Int,
    justRankedUp: Boolean,
    onRunTheYard: () -> Unit,
    onBack: () -> Unit,
) {
    PopFullScreen(backdrop = PopTokens.Paper) {
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
                modifier = Modifier.semantics { contentDescription = "Back to the shed" },
            )
            PopBanner(
                text = "TRADE RANK",
                fill = PopTokens.Ink,
                content = PopTokens.Yellow,
            )
        }

        if (justRankedUp) {
            PopCard(
                modifier = Modifier.fillMaxWidth(),
                fill = PopTokens.Yellow,
            ) {
                Text("YOU JUST RANKED UP TO", style = PopType.Small, color = PopTokens.YellowDeep)
                Text(
                    text = Storyboard.rankLadder.getOrElse(currentRung - 1) { "" },
                    style = PopType.DisplayMedium,
                    color = PopTokens.Ink,
                )
                Text(
                    "Rung $currentRung of ${Storyboard.rankLadder.size}",
                    style = PopType.Small,
                    color = PopTokens.YellowDeep,
                )
            }
        }

        // Top rung first: the ladder is something to climb, and drawing it
        // upside down would put the goal at the bottom of a scroll.
        Storyboard.rankLadder.indices.reversed().forEach { index ->
            val rung = index + 1
            RankRow(
                rung = rung,
                name = Storyboard.rankLadder[index],
                current = rung == currentRung,
                top = rung == Storyboard.rankLadder.size,
            )
        }

        PopGap(4.dp)

        PopButton(
            text = "RUN THE YARD ▸",
            onClick = onRunTheYard,
            tone = PopTone.Teal,
            size = PopSize.Large,
            sub = "A speed test sets your rank",
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(20.dp)
    }
}

@Composable
private fun RankRow(rung: Int, name: String, current: Boolean, top: Boolean) {
    val fill = when {
        current -> PopTokens.Teal
        top -> PopTokens.Ink
        else -> PopTokens.White
    }
    val numberColor = when {
        current -> PopTokens.White
        top -> PopTokens.Yellow
        else -> PopTokens.Sand
    }
    val nameColor = when {
        current -> PopTokens.White
        top -> PopTokens.White
        else -> PopTokens.Mud
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(fill, RoundedCornerShape(PopTokens.RadiusSm))
            .padding(horizontal = 14.dp, vertical = 10.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = if (current) {
                    "Rung $rung, $name, you are here"
                } else {
                    "Rung $rung, $name"
                }
            },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("$rung", style = PopType.Title, color = numberColor)
        Text(name, style = PopType.Body, color = nameColor, modifier = Modifier.weight(1f))
        if (current) Text("👷", style = PopType.Title)
    }
}

/**
 * C6 · Toolbox Time.
 *
 * No timer, no pressure, and the child sets it up. The one mode that is a
 * deliberate release valve — which is why the operation, the tables and
 * read-aloud are all offered here rather than buried in settings.
 *
 * The tables offered are the ones this student has actually unlocked. Offering
 * more would be a promise the server refuses when the run starts (§1.10).
 */
@Composable
fun ToolboxTimeScreen(
    availableTables: List<Int>,
    divisionUnlocked: List<Int>,
    onStart: (operation: String, tables: List<Int>, readAloud: Boolean) -> Unit,
    onBack: () -> Unit,
    /**
     * Tables to arrive with already ticked.
     *
     * Set when a child came here from a square on the mastery grid: they tapped
     * 7 × 10, so 7 and 10 are what they wanted to practise, and making them
     * re-pick would be asking a question they have already answered.
     */
    preselect: List<Int> = emptyList(),
) {
    var operation by remember { mutableStateOf("multiply") }
    val chosen = remember(preselect) {
        preselect.filter { it in availableTables }
            .ifEmpty { availableTables.take(3) }
            .toMutableStateList()
    }
    var readAloud by remember { mutableStateOf(false) }

    val canDivide = divisionUnlocked.isNotEmpty()

    PopFullScreen(backdrop = PopTokens.Paper) {
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
                modifier = Modifier.semantics { contentDescription = "Back to the shed" },
            )
            PopBanner(
                text = "TOOLBOX TIME",
                fill = PopTokens.TealLight,
                content = PopTokens.Ink,
            )
        }

        Text(
            "No timer, no pressure. Set it up your way.",
            style = PopType.Body,
            color = PopTokens.Mud,
        )

        PopCard(modifier = Modifier.fillMaxWidth()) {
            Text("OPERATION", style = PopType.Small, color = PopTokens.Mud)
            PopGap(8.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PopChoice(
                    text = "×",
                    isSelected = operation == "multiply",
                    onClick = { operation = "multiply" },
                    selectedFill = PopTokens.Teal,
                    selectedContent = PopTokens.White,
                    modifier = Modifier.weight(1f),
                )
                PopChoice(
                    text = "÷",
                    isSelected = operation == "divide",
                    onClick = { operation = "divide" },
                    selectedFill = PopTokens.Teal,
                    selectedContent = PopTokens.White,
                    enabled = canDivide,
                    modifier = Modifier.weight(1f),
                )
                PopChoice(
                    text = "BOTH",
                    isSelected = operation == "both",
                    onClick = { operation = "both" },
                    selectedFill = PopTokens.Teal,
                    selectedContent = PopTokens.White,
                    enabled = canDivide,
                    modifier = Modifier.weight(1f),
                )
            }
            if (!canDivide) {
                PopGap(8.dp)
                Text(
                    "Finish a full multiply round to work a table backwards.",
                    style = PopType.Small,
                    color = PopTokens.Mud,
                )
            }
        }

        PopCard(modifier = Modifier.fillMaxWidth()) {
            Text("TABLES", style = PopType.Small, color = PopTokens.Mud)
            PopGap(8.dp)
            availableTables.chunked(6).forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    row.forEach { table ->
                        PopChoice(
                            text = "$table",
                            isSelected = table in chosen,
                            onClick = {
                                if (table in chosen) chosen.remove(table) else chosen.add(table)
                            },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }

        PopCard(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Read questions aloud", style = PopType.Body, color = PopTokens.Ink)
                PopToggle(checked = readAloud, onCheckedChange = { readAloud = it })
            }
        }

        PopGap(4.dp)

        PopButton(
            text = "START · NO TIMER",
            onClick = { onStart(operation, chosen.toList(), readAloud) },
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
            enabled = chosen.isNotEmpty(),
            shadow = PopShadow.Large,
        )

        PopGap(20.dp)
    }
}

/**
 * C7 · The Big Job.
 *
 * Once a month, 100 questions, five minutes — the benchmark the parent
 * dashboard and the teacher's report both quote. The screen says up front that
 * the result is shared, because a child should never find out afterwards that
 * something they did was reported on.
 */
@Composable
fun BigJobScreen(
    available: Boolean,
    nextAvailableLabel: String?,
    onStart: () -> Unit,
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
                modifier = Modifier.semantics { contentDescription = "Back to the shed" },
            )
            PopBanner(
                text = "ONCE A MONTH",
                fill = PopTokens.Red,
                content = PopTokens.White,
                borderColor = PopTokens.Yellow,
                fontSize = 12.sp,
            )
        }

        Box(Modifier.fillMaxWidth().height(16.dp).hazardStripe(band = 14.dp))

        Text("THE BIG JOB", style = PopType.DisplayLarge, color = PopTokens.Yellow)
        Text(
            "100 questions. 5 minutes. Your best fluency check of the month.",
            style = PopType.Body,
            color = PopTokens.Stone,
        )

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .background(PopTokens.SlatePanel, RoundedCornerShape(PopTokens.RadiusMd))
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center,
            ) {
                PopStat(
                    value = "100",
                    label = "QUESTIONS",
                    valueColor = PopTokens.White,
                    labelColor = PopTokens.Stone,
                )
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .background(PopTokens.SlatePanel, RoundedCornerShape(PopTokens.RadiusMd))
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center,
            ) {
                PopStat(
                    value = "5:00",
                    label = "ON THE CLOCK",
                    valueColor = PopTokens.White,
                    labelColor = PopTokens.Stone,
                )
            }
        }

        PopNote(
            text = "Results go automatically to your teacher and parent.",
            modifier = Modifier.fillMaxWidth(),
            fill = PopTokens.SlatePanel,
            content = PopTokens.Yellow,
            accent = PopTokens.Yellow,
        )

        PopGap(4.dp)

        if (available) {
            PopButton(
                text = "START THE BIG JOB ▸",
                onClick = onStart,
                tone = PopTone.Yellow,
                size = PopSize.Large,
                fullWidth = true,
                shadow = PopShadow.Large,
            )
        } else {
            PopCard(
                modifier = Modifier.fillMaxWidth(),
                fill = PopTokens.SlatePanel,
            ) {
                Text("Already done this month", style = PopType.Title, color = PopTokens.White)
                Text(
                    text = nextAvailableLabel ?: "Back next month.",
                    style = PopType.Small,
                    color = PopTokens.Stone,
                    textAlign = TextAlign.Start,
                )
            }
        }

        PopGap(20.dp)
    }
}
