package com.timestabletradies.ui.mastery

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopStat
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popSafeTopPadding
import com.timestabletradies.core.designsystem.popSurface
import com.timestabletradies.core.model.MasteryStage
import com.timestabletradies.core.network.MasteryCell
import com.timestabletradies.core.network.MasteryGrid

/**
 * G1 · The Mastery Grid — 144 facts, one cell each.
 *
 * ## It does not scroll
 *
 * The grid is the screen's whole argument: 144 cells, all visible, changing
 * shape over months. A child looking for the red patch has to be able to see
 * the red patch, and a grid you have to scroll to compare two halves of has
 * stopped being a picture and become a list. So the layout is fixed — grid in
 * the top half, the tapped fact in the bottom — and every cell stays where it
 * was yesterday.
 *
 * ## Colour first, shapes on request
 *
 * The ramp is grey → red → orange → green → shiny blue, read left to right the
 * way a traffic light is. Shapes used to be stamped on every cell for
 * colourblind readers; they are now behind a switch in accessibility, because
 * 144 glyphs at this size is noise for everyone who doesn't need them and the
 * ones who do get them everywhere the moment it's on. Colour is never the *only*
 * channel regardless: every cell names its own state to a screen reader, and
 * tapping one spells it out.
 *
 * ## Both halves of a fact
 *
 * 7 × 10 and 10 × 7 are one fact to a child, and 70 ÷ 7 is the same knowledge
 * again. `factKey` stores them apart, so the grid merges them for display —
 * answering either lights both cells. See [mergeCommutative].
 */
@Composable
fun MasteryGridScreen(
    grid: MasteryGrid?,
    error: String?,
    selected: MasteryCell?,
    detail: FactDetail?,
    showShapes: Boolean,
    unlockedTables: List<Int>,
    onSelect: (MasteryCell?) -> Unit,
    onPractise: (List<Int>) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .popSafeTopPadding()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        when {
            error != null -> PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.SandPanel) {
                Text("Couldn't load the grid", style = PopType.Title, color = PopTokens.Ink)
                Text(error, style = PopType.Small, color = PopTokens.Mud)
            }

            grid == null -> PopCard(modifier = Modifier.fillMaxWidth()) {
                Text("Loading…", style = PopType.Body, color = PopTokens.Mud)
            }

            else -> {
                val merged = remember(grid) { mergeCommutative(grid) }

                PopBanner(text = "MASTERY", fill = PopTokens.Yellow, content = PopTokens.Ink)

                Grid(
                    cells = merged,
                    maxFactor = grid.maxFactor,
                    selected = selected,
                    showShapes = showShapes,
                    onSelect = onSelect,
                )

                // The bottom half. Always occupied — an empty space under a grid
                // a child has just tapped reads as the tap not working.
                Box(Modifier.weight(1f)) {
                    FactPanel(
                        cell = selected,
                        detail = detail,
                        grid = grid,
                        unlockedTables = unlockedTables,
                        onPractise = onPractise,
                    )
                }
            }
        }
    }
}

/* ----------------------------------------------------------------- the grid */

@Composable
private fun Grid(
    cells: Map<Pair<Int, Int>, MasteryCell>,
    maxFactor: Int,
    selected: MasteryCell?,
    showShapes: Boolean,
    onSelect: (MasteryCell?) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        // Column headings. Decorative for a screen reader — every cell names its
        // own fact, so reading "1 2 3 4…" first would be noise.
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Box(Modifier.width(AxisWidth))
            (1..maxFactor).forEach { b ->
                AxisLabel(
                    value = b,
                    lit = selected?.b == b,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        (1..maxFactor).forEach { a ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AxisLabel(
                    value = a,
                    lit = selected?.a == a,
                    modifier = Modifier.width(AxisWidth),
                )
                (1..maxFactor).forEach { b ->
                    val cell = cells[a to b] ?: MasteryCell(a = a, b = b, stage = "none")
                    val picked = selected?.let { (it.a == a && it.b == b) } == true
                    Cell(
                        cell = cell,
                        picked = picked,
                        // Everything sharing a row or a column with the tapped
                        // cell. The crosshair is what turns "this square" into
                        // "this fact, in this table" — which is the whole reason
                        // the grid is a grid and not a list.
                        onAxis = selected != null && (selected.a == a || selected.b == b),
                        showShapes = showShapes,
                        onClick = { onSelect(if (picked) null else cell) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

private val AxisWidth = 18.dp

private val CellShape = RoundedCornerShape(3.dp)

/**
 * The dark wash laid over the tapped cell's row and column.
 *
 * The crosshair used to outline all twenty-three neighbours, which drew
 * twenty-three boxes to say "not this one" and left the tapped cell as just one
 * more outlined square in a field of them. Dimming the row and column instead
 * makes the single un-dimmed, outlined cell the only thing left standing — the
 * crosshair reads as a spotlight rather than as a second grid drawn over the
 * first.
 */
private val CrosshairScrim = PopTokens.Ink.copy(alpha = 0.52f)

/**
 * The row and column headings.
 *
 * Ink and bold: they are the only way to know which fact a square is, and a
 * label you have to squint at makes the grid unreadable for exactly the child
 * who most needs to read it. The lit state marks the tapped cell's row and
 * column so the crosshair reaches all the way out to the edges.
 */
@Composable
private fun AxisLabel(value: Int, lit: Boolean, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .then(
                if (lit) {
                    Modifier.background(PopTokens.Yellow, CellShape)
                } else {
                    Modifier
                },
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "$value",
            // Bold rather than Black: the Nunito family registers four weights
            // and Bold is the heaviest real one. Asking for Black gets a
            // synthesised smear at 11sp, which is worse than the weight below.
            style = PopType.Small.copy(fontSize = 11.sp, fontWeight = FontWeight.Bold),
            color = PopTokens.Ink,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun Cell(
    cell: MasteryCell,
    picked: Boolean,
    onAxis: Boolean,
    showShapes: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val stage = cell.stage.toStage()

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .then(
                if (stage == MasteryStage.BLUE) {
                    // "Shiny blue — perfect and locked in." The only gradient in
                    // the app, and the only stage outside the traffic-light ramp.
                    Modifier.background(
                        Brush.linearGradient(
                            listOf(PopTokens.GradeBlueSheen, PopTokens.GradeBlueDeep),
                        ),
                        CellShape,
                    )
                } else {
                    Modifier.background(stage.fill(), CellShape)
                },
            )
            .then(
                when {
                    // The one square the child asked about.
                    picked -> Modifier.border(2.5.dp, PopTokens.Ink, CellShape)
                    // Everything else it shares a row or a column with.
                    onAxis -> Modifier.scrim()
                    else -> Modifier
                },
            )
            .clickable(role = Role.Button, onClick = onClick)
            .semantics {
                contentDescription = "${cell.a} times ${cell.b}, ${stage.label}"
                selected = picked
            },
        contentAlignment = Alignment.Center,
    ) {
        if (showShapes) {
            Text(
                text = stage.glyph,
                style = PopType.Small.copy(fontSize = 7.sp),
                color = stage.onFill(),
            )
        }
    }
}

/**
 * Wash the whole cell, glyph included.
 *
 * Drawn after `drawContent` so it lands on top of the stage fill *and* anything
 * inside — a scrim that dimmed the square but left the shape glyph at full
 * strength would make the dimmed cells look like the marked ones.
 */
private fun Modifier.scrim(): Modifier = this.drawWithContent {
    drawContent()
    drawRoundRect(color = CrosshairScrim, cornerRadius = CornerRadius(3.dp.toPx()))
}

/* --------------------------------------------------------------- the detail */

/**
 * One fact's rolling window, read from the answer log.
 *
 * Lifetime totals answer "how much have they done", which is not the question
 * this screen asks. A child who was shaky on 7 × 8 in March and solid on it now
 * should see solid — so accuracy is over the last [MasteryWindow] attempts, and
 * lands on a multiple of five once there are that many.
 */
data class FactDetail(
    val attemptsInWindow: Int,
    val correctInWindow: Int,
    val averageMs: Int,
    val lifetimeAttempts: Int,
) {
    val accuracyPercent: Int?
        get() = if (attemptsInWindow == 0) null else correctInWindow * 100 / attemptsInWindow
}

/** Twenty attempts, so each one is worth exactly five percent. */
const val MasteryWindow = 20

/**
 * The bottom half: white card, three levels, one bright thing on it.
 *
 * It used to be an ink slab carrying teal, yellow and white text on three
 * different dark wells, which gave five things the same weight and left the
 * child's actual question — *how am I going on this one?* — competing with its
 * own labels. The panel is now the app's ordinary white card, and the ranking
 * is done by size rather than by colour:
 *
 * 1. **the fact**, big and in ink — it is the thing being asked about
 * 2. **the three figures**, in one quiet sand well underneath
 * 3. **the button**, the only saturated colour in the box
 *
 * Yellow is left doing exactly one job, which is what makes it mean "press me".
 */
@Composable
private fun FactPanel(
    cell: MasteryCell?,
    detail: FactDetail?,
    grid: MasteryGrid,
    unlockedTables: List<Int>,
    onPractise: (List<Int>) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .popSurface(fill = PopTokens.White, radius = PopTokens.RadiusMd)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (cell == null) {
            val solid = grid.counts.gold + grid.counts.blue
            Text("YOUR GRID", style = PopType.Small, color = PopTokens.Mud)
            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(7.dp),
                modifier = Modifier.semantics(mergeDescendants = true) {
                    contentDescription = "$solid of ${grid.total} facts solid"
                },
            ) {
                Text("$solid", style = PopType.DisplayLarge, color = PopTokens.Ink)
                Text(
                    text = "of ${grid.total} facts solid",
                    style = PopType.Body,
                    color = PopTokens.Mud,
                    modifier = Modifier.padding(bottom = 5.dp),
                )
            }
            Text(
                "Tap any square to see how it's going.",
                style = PopType.Small,
                color = PopTokens.Mud,
            )
            return@Column
        }

        val stage = cell.stage.toStage()

        // Level one, part one: what state this square is in, said in words as
        // well as in colour.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .semantics(mergeDescendants = true) { contentDescription = stage.label },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .width(18.dp)
                    .aspectRatio(1f)
                    .background(stage.fill(), RoundedCornerShape(4.dp))
                    .border(2.dp, PopTokens.Ink, RoundedCornerShape(4.dp)),
            )
            Text(
                text = stage.label.uppercase(),
                style = PopType.Small.copy(fontWeight = FontWeight.Bold),
                color = PopTokens.Mud,
            )
        }

        // Level one, part two: the fact itself, and the biggest thing in the
        // box. The product carries the weight — "7 ×  8 =" is the question, 56
        // is what the child came here to look at.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .semantics(mergeDescendants = true) {
                    contentDescription = "${cell.a} times ${cell.b} equals ${cell.a * cell.b}"
                },
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = "${cell.a} × ${cell.b} =",
                style = PopType.Title,
                color = PopTokens.Mud,
                modifier = Modifier.padding(bottom = 4.dp),
            )
            Text("${cell.a * cell.b}", style = PopType.DisplayLarge, color = PopTokens.Ink)
        }

        // Level two: one well, three figures, hairlines between them. Three
        // separate boxes made three objects out of what is one read-out.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(PopTokens.SandPanel, RoundedCornerShape(PopTokens.RadiusSm))
                .padding(vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            DetailStat(
                value = detail?.accuracyPercent?.let { "$it%" } ?: "—",
                label = "LAST $MasteryWindow",
                modifier = Modifier.weight(1f),
            )
            StatDivider()
            DetailStat(
                value = detail?.averageMs
                    ?.takeIf { it > 0 }
                    ?.let { "${it / 100 / 10.0}s" } ?: "—",
                label = "AVG TIME",
                modifier = Modifier.weight(1f),
            )
            StatDivider()
            DetailStat(
                value = "${detail?.lifetimeAttempts ?: cell.attempts}",
                label = "ATTEMPTS",
                modifier = Modifier.weight(1f),
            )
        }

        if (cell.due) {
            // The spaced-repetition check-in, in the child's words. It is also
            // the run that actually pays under mastery decay (§1.9), so it is
            // worth naming rather than leaving as a silent weighting.
            Text(
                "Due for a check-in — worth another go.",
                style = PopType.Small,
                color = PopTokens.TealDeep,
            )
        }

        Box(Modifier.weight(1f))

        // Level three. Straight from "I'm bad at this" to practising it —
        // Toolbox Time is the untimed mode, which is the right place to send
        // someone who just found a red square and felt something about it.
        val tables = practiceTablesFor(cell, unlockedTables)
        PopButton(
            text = "PRACTISE THIS",
            onClick = { onPractise(tables) },
            tone = PopTone.Yellow,
            size = PopSize.Large,
            sub = tables.joinToString(" · ") { "×$it" },
            fullWidth = true,
            shadow = PopShadow.Large,
        )
    }
}

@Composable
private fun DetailStat(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
) {
    PopStat(
        value = value,
        label = label,
        // One colour for all three: they are the same kind of fact about the
        // same square, and colour-coding them made the panel look like three
        // unrelated scores.
        valueColor = PopTokens.Ink,
        labelColor = PopTokens.Mud,
        modifier = modifier,
    )
}

/** The hairline between two figures in the stat well. */
@Composable
private fun StatDivider() {
    Box(
        Modifier
            .width(1.dp)
            .height(30.dp)
            .background(PopTokens.SandPale),
    )
}

/* ------------------------------------------------------------------ merging */

/**
 * Fold the grid so a fact and its mirror share a state.
 *
 * The server keys facts as `a×b` and stores `7×10` separately from `10×7`, so a
 * child who has only ever met the fact one way round sees one lit cell and one
 * grey one — which is wrong twice over: it isn't two facts, and the grey half
 * makes the grid look emptier than their knowledge is.
 *
 * Merged by taking the **better** stage of the pair and summing the attempts.
 * Better rather than worse because the claim being made is "you know this", and
 * you either do or you don't; the mirror having fewer attempts is an artefact of
 * which way the question happened to be asked.
 *
 * The real fix is canonicalising the key on write, which would also stop the
 * economy and `hasFullBlueGrid` counting one fact twice — noted in the plan.
 */
fun mergeCommutative(grid: MasteryGrid): Map<Pair<Int, Int>, MasteryCell> {
    val byKey = grid.cells.associateBy { it.a to it.b }
    val out = HashMap<Pair<Int, Int>, MasteryCell>(byKey.size * 2)

    for (a in 1..grid.maxFactor) {
        for (b in 1..grid.maxFactor) {
            val here = byKey[a to b]
            val mirror = byKey[b to a]
            val best = when {
                here == null -> mirror
                mirror == null -> here
                mirror.stage.toStage().ordinal > here.stage.toStage().ordinal -> mirror
                else -> here
            } ?: continue

            out[a to b] = best.copy(
                a = a,
                b = b,
                attempts = (here?.attempts ?: 0) + (if (a == b) 0 else mirror?.attempts ?: 0),
                correct = (here?.correct ?: 0) + (if (a == b) 0 else mirror?.correct ?: 0),
                due = (here?.due ?: false) || (mirror?.due ?: false),
            )
        }
    }
    return out
}

/**
 * Which tables the "practise this" button should tick.
 *
 * Both halves of the fact when both are open, otherwise whichever is. A child
 * can never reach a fact where neither is unlocked — the grid's rows *are* the
 * unlocked tables — so the list is never empty, and the `ifEmpty` is a guard
 * against a future where that stops being true rather than a real case.
 */
fun practiceTablesFor(cell: MasteryCell, unlocked: List<Int>): List<Int> =
    listOf(cell.a, cell.b)
        .distinct()
        .filter { it in unlocked }
        .ifEmpty { unlocked.take(1) }

/* ------------------------------------------------------------- token maps */

/** The server's stage strings. Unknown values fall back rather than crash. */
internal fun String.toStage(): MasteryStage = when (this) {
    "bronze" -> MasteryStage.BRONZE
    "silver" -> MasteryStage.SILVER
    "gold" -> MasteryStage.GOLD
    "blue" -> MasteryStage.BLUE
    else -> MasteryStage.NONE
}

internal fun MasteryStage.fill(): Color = when (this) {
    MasteryStage.NONE -> PopTokens.GradeNone
    MasteryStage.BRONZE -> PopTokens.GradeBronze
    MasteryStage.SILVER -> PopTokens.GradeSilver
    MasteryStage.GOLD -> PopTokens.GradeGold
    MasteryStage.BLUE -> PopTokens.GradeBlue
}

internal fun MasteryStage.onFill(): Color = when (this) {
    MasteryStage.NONE -> PopTokens.Mud
    else -> PopTokens.White
}
