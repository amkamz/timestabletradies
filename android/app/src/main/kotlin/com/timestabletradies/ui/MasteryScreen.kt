package com.timestabletradies.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopScreen
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popSurface
import com.timestabletradies.core.model.MasteryStage
import com.timestabletradies.core.network.MasteryCell
import com.timestabletradies.core.network.MasteryGrid
import com.timestabletradies.core.network.TradiesRepository

/**
 * Every fact, and how well it's known.
 *
 * The stage on each cell was decided server-side — Gold and Blue are claims
 * about speed and retention, and this screen displays that verdict rather than
 * working it out (§1.10).
 *
 * **Colour is never the only signal.** Each cell carries its stage glyph, and
 * each has a spoken description naming the fact and the stage, so the grid
 * works for colourblind children and for TalkBack.
 */
@Composable
fun MasteryScreen(
    repository: TradiesRepository,
    studentId: String,
    onBack: () -> Unit,
) {
    var grid by remember { mutableStateOf<MasteryGrid?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(studentId) {
        runCatching { repository.masteryGrid(studentId) }
            .onSuccess { grid = it }
            .onFailure { error = it.message ?: "Couldn't load the grid." }
    }

    PopScreen(
        title = "Your Grid",
        subtitle = grid?.let { "${it.counts.gold + it.counts.blue} of ${it.total} facts solid" },
    ) {
        when {
            error != null -> ErrorCard(error!!)
            grid == null -> PopCard(modifier = Modifier.fillMaxWidth()) {
                Text("Loading…", style = PopType.Body, color = PopTokens.Mud)
            }
            else -> {
                StageTally(grid!!)
                Grid(grid!!)
                Legend()
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
private fun StageTally(grid: MasteryGrid) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        MasteryStage.entries.forEach { stage ->
            val count = when (stage) {
                MasteryStage.NONE -> grid.counts.none
                MasteryStage.BRONZE -> grid.counts.bronze
                MasteryStage.SILVER -> grid.counts.silver
                MasteryStage.GOLD -> grid.counts.gold
                MasteryStage.BLUE -> grid.counts.blue
            }
            Column(
                modifier = Modifier
                    .popSurface(stage.fill(), PopTokens.RadiusSm, PopShadow.Small)
                    .size(width = 64.dp, height = 56.dp)
                    .semantics {
                        contentDescription = "$count facts at ${stage.label}"
                    },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text("$count", style = PopType.Title, color = stage.onFill())
                Text(stage.glyph, style = PopType.Small, color = stage.onFill())
            }
        }
    }
}

/**
 * The grid itself.
 *
 * Twelve columns won't fit a phone at a readable size, so it scrolls
 * horizontally inside its own container rather than shrinking the cells to
 * illegibility or letting the whole page scroll sideways.
 */
@Composable
private fun Grid(grid: MasteryGrid) {
    val byTable = grid.cells.groupBy { it.a }

    PopCard(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
            Column {
                // Column headings: the factors.
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(Modifier.size(30.dp))
                    (1..grid.maxFactor).forEach { b ->
                        Box(Modifier.size(30.dp), contentAlignment = Alignment.Center) {
                            Text("$b", style = PopType.Small, color = PopTokens.Mud)
                        }
                    }
                }
                Spacer(Modifier.height(4.dp))

                grid.tables.forEach { table ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.height(34.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.size(30.dp), contentAlignment = Alignment.Center) {
                            Text("×$table", style = PopType.Small, color = PopTokens.Ink)
                        }
                        (1..grid.maxFactor).forEach { b ->
                            val cell = byTable[table]?.firstOrNull { it.b == b }
                            if (cell == null) Box(Modifier.size(30.dp)) else Cell(cell)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Cell(cell: MasteryCell) {
    val stage = cell.stage.toStage()
    Box(
        modifier = Modifier
            .size(30.dp)
            .popSurface(
                fill = stage.fill(),
                radius = 8.dp,
                shadow = PopShadow.Small,
                borderWidth = 2.dp,
            )
            .semantics {
                // Names the fact and the stage. Without this a screen reader
                // gets a wall of single glyphs with no idea what they refer to.
                contentDescription = buildString {
                    append("${cell.a} times ${cell.b}: ${stage.label}")
                    if (cell.attempts > 0) {
                        append(", ${cell.correct} of ${cell.attempts} right")
                    }
                    if (cell.due) append(", due for review")
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = stage.glyph,
            style = PopType.Small,
            color = stage.onFill(),
            modifier = Modifier.clearAndSetSemantics { },
        )
    }
}

@Composable
private fun Legend() {
    PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.SandPanel) {
        MasteryStage.entries.forEach { stage ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(22.dp)
                        .popSurface(stage.fill(), 6.dp, PopShadow.Small, borderWidth = 2.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(stage.glyph, style = PopType.Small, color = stage.onFill())
                }
                Spacer(Modifier.width(10.dp))
                Text(
                    "${stage.label} — ${stage.description}",
                    style = PopType.Small,
                    color = PopTokens.Ink,
                )
            }
            Spacer(Modifier.height(4.dp))
        }
    }
}

private fun String.toStage(): MasteryStage = when (this) {
    "bronze" -> MasteryStage.BRONZE
    "silver" -> MasteryStage.SILVER
    "gold" -> MasteryStage.GOLD
    "blue" -> MasteryStage.BLUE
    else -> MasteryStage.NONE
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
