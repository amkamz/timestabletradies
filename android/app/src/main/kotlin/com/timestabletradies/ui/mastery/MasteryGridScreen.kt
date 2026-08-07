package com.timestabletradies.ui.mastery

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.ui.draw.clip
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
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popSafeTopPadding
import com.timestabletradies.core.designsystem.popSurface
import com.timestabletradies.core.model.MasteryStage
import com.timestabletradies.core.network.MasteryCell
import com.timestabletradies.core.network.MasteryGrid
import com.timestabletradies.core.network.StageCounts

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
                        // The merged map, not the raw response. The panel
                        // describes the grid above it, and that grid draws all
                        // 144 squares — see [countStages].
                        cells = merged,
                        maxFactor = grid.maxFactor,
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
    /**
     * Each attempt in the window, **oldest first**, so the strip reads left to
     * right the way time does.
     *
     * The counts above answer "how many"; this answers "when". Two children on
     * 80% are in completely different places if one missed four in a row last
     * week and the other missed one this morning — and the strip is the only
     * thing on the panel that can tell them apart.
     */
    val outcomes: List<Boolean> = emptyList(),
) {
    val accuracyPercent: Int?
        get() = if (attemptsInWindow == 0) null else correctInWindow * 100 / attemptsInWindow

    val wrongInWindow: Int get() = attemptsInWindow - correctInWindow
}

/** Twenty attempts, so each one is worth exactly five percent. */
const val MasteryWindow = 20

/**
 * The bottom panel — the merge (design `2a`, "Ticket + ticks").
 *
 * A job ticket: a coloured header naming the state, the fact itself centred and
 * large, the last twenty attempts as a strip of ticks, and one yellow button
 * across the bottom. It sits above the nav bar and it is **always occupied** —
 * an empty space under a grid a child has just tapped reads as the tap not
 * working.
 *
 * Two states, one shape. Tapping a square fills it with that fact; tapping the
 * square again — or arriving fresh — shows the grid's own summary. Both have a
 * header, a big number, a middle band and a button in the same places, so the
 * panel changes contents rather than changing form.
 *
 * **What the strip adds over the old three-figure well.** Accuracy, average
 * time and lifetime attempts all answered *how many*. None of them answered
 * *when*, and two children sitting on 80% are in completely different places if
 * one missed four in a row last week and the other missed one this morning. The
 * strip is the only thing here that can tell them apart, which is why it took
 * the room the three figures used to have.
 *
 * **No shadow on the card.** The design mock draws one, but this app spends the
 * hard offset shadow on exactly one thing — "you can press this" — so the
 * button below has it and the panel holding it does not (see the standing rule
 * in `docs/native/README.md`). `popSurface` cannot draw one regardless.
 */
@Composable
private fun FactPanel(
    cell: MasteryCell?,
    detail: FactDetail?,
    cells: Map<Pair<Int, Int>, MasteryCell>,
    maxFactor: Int,
    unlockedTables: List<Int>,
    onPractise: (List<Int>) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .popSurface(fill = PopTokens.White, radius = PopTokens.RadiusMd)
            // Clips the *children*, which is what the coloured header needs:
            // `popSurface` is a shape-aware background plus a shape-aware
            // border, but neither constrains what is drawn inside, so a
            // full-width bar painted its own square corners straight over the
            // card's rounded ones. Last in the chain on purpose — the border
            // draws before this and keeps its own radius.
            .clip(RoundedCornerShape(PopTokens.RadiusMd)),
    ) {
        if (cell == null) {
            GridSummary(
                cells = cells,
                maxFactor = maxFactor,
                unlockedTables = unlockedTables,
                onPractise = onPractise,
            )
        } else {
            FactTicket(
                cell = cell,
                detail = detail,
                maxFactor = maxFactor,
                unlockedTables = unlockedTables,
                onPractise = onPractise,
            )
        }
    }
}

/**
 * Stage tallies over **every square the grid draws**, not just the ones the
 * server counted.
 *
 * `/mastery` returns `counts` and `total` for the tables a student has
 * unlocked — 36 facts on the free tier — while the grid above draws all 144 and
 * fills the rest in grey. Summarising the response therefore produced a panel
 * headed WHOLE GRID that said "0 untried" over a screen two-thirds grey, and
 * "12/36 solid" under a picture of 144 squares.
 *
 * Counting what is drawn is the only version of this that can't disagree with
 * the thing it sits under. Locked tables land in `NONE`, which is exactly what
 * they look like and exactly what they are: not tried yet.
 */
private fun countStages(cells: Map<Pair<Int, Int>, MasteryCell>, maxFactor: Int): StageCounts {
    var none = 0
    var bronze = 0
    var silver = 0
    var gold = 0
    var blue = 0

    for (a in 1..maxFactor) {
        for (b in 1..maxFactor) {
            when (cells[a to b]?.stage?.toStage() ?: MasteryStage.NONE) {
                MasteryStage.NONE -> none++
                MasteryStage.BRONZE -> bronze++
                MasteryStage.SILVER -> silver++
                MasteryStage.GOLD -> gold++
                MasteryStage.BLUE -> blue++
            }
        }
    }

    return StageCounts(none = none, bronze = bronze, silver = silver, gold = gold, blue = blue)
}

/* ------------------------------------------------------------ the header bar */

/**
 * The strip across the top of the panel: what this is, and one figure.
 *
 * Carries the colour, so the panel announces the tapped square's state before
 * any of it is read. The ink rule underneath is what stops a saturated bar from
 * floating off a white card.
 */
@Composable
private fun PanelHeader(
    title: String,
    trailing: String,
    fill: Color,
    content: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(PanelHeaderHeight)
            .background(fill)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = title,
            style = PopType.Small.copy(fontSize = 12.sp, letterSpacing = 1.4.sp),
            color = content,
        )
        Text(
            text = trailing,
            style = PopType.Small.copy(fontSize = 9.5.sp, letterSpacing = 1.sp),
            color = content.copy(alpha = 0.72f),
        )
    }
}

/** The ink rule under the header. Not a shadow — a border the card shares. */
@Composable
private fun HeaderRule() {
    Box(
        Modifier
            .fillMaxWidth()
            .height(3.dp)
            .background(PopTokens.Ink),
    )
}

private val PanelHeaderHeight = 34.dp

/* ---------------------------------------------------------- selected: a fact */

@Composable
private fun FactTicket(
    cell: MasteryCell,
    detail: FactDetail?,
    maxFactor: Int,
    unlockedTables: List<Int>,
    onPractise: (List<Int>) -> Unit,
) {
    val stage = cell.stage.toStage()

    // The header takes the colour of the square that was tapped, not a lighter
    // relative of it. A child who pressed a dark blue cell and got a pale blue
    // panel would have to work out that the two are the same thing.
    PanelHeader(
        title = stage.headline(),
        trailing = "FACT ${factIndex(cell, maxFactor)}/${maxFactor * maxFactor}",
        fill = stage.fill(),
        content = stage.onFill(),
    )
    HeaderRule()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 14.dp),
    ) {
        // The fact, centred and the largest thing in the box. The product
        // carries the weight — "7 × 8 =" is the question, 56 is what the child
        // came here to look at.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 2.dp, bottom = 10.dp)
                .semantics(mergeDescendants = true) {
                    contentDescription = "${cell.a} times ${cell.b} equals ${cell.a * cell.b}"
                },
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.Bottom,
        ) {
            Text(
                text = "${cell.a} × ${cell.b} =",
                style = PopType.Title.copy(fontSize = 26.sp),
                color = PopTokens.Ink,
                modifier = Modifier.padding(end = 9.dp, bottom = 3.dp),
            )
            Text(
                text = "${cell.a * cell.b}",
                style = PopType.DisplayLarge.copy(fontSize = 40.sp),
                color = PopTokens.Ink,
            )
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.Center,
        ) {
            LastTwenty(detail)
        }

        if (cell.due) {
            // The spaced-repetition check-in, in the child's words. It is also
            // the run that actually pays under mastery decay (§1.9), so it is
            // worth naming rather than leaving as a silent weighting.
            Text(
                "Due for a check-in — worth another go.",
                style = PopType.Small,
                color = PopTokens.TealDeep,
                modifier = Modifier.padding(bottom = 8.dp),
            )
        }

        // Straight from "I'm bad at this" to practising it. Toolbox Time is the
        // untimed mode, which is the right place to send someone who has just
        // found a red square and felt something about it.
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

/**
 * Twenty ticks, oldest on the left.
 *
 * Padded from the left when there are fewer than twenty attempts, so the newest
 * answer is always hard against the right-hand edge and the strip fills toward
 * the middle as a child works. Growing from the left instead would move every
 * tick every time and make the shape impossible to recognise between visits.
 *
 * The ticks are decorative to a screen reader — the row above already says
 * "eighteen right, two wrong", and twenty unlabelled squares after it would be
 * twenty pieces of noise.
 */
@Composable
private fun LastTwenty(detail: FactDetail?) {
    val outcomes = detail?.outcomes.orEmpty().takeLast(MasteryWindow)
    val blanks = MasteryWindow - outcomes.size

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom,
    ) {
        Text(
            text = "LAST $MasteryWindow TICKETS",
            style = PopType.Small.copy(fontSize = 9.5.sp, letterSpacing = 1.2.sp),
            color = PopTokens.Mud,
        )
        Text(
            text = if (detail == null || detail.attemptsInWindow == 0) {
                "NOT TRIED YET"
            } else {
                "${detail.correctInWindow} RIGHT · ${detail.wrongInWindow} WRONG"
            },
            style = PopType.Small.copy(fontSize = 11.sp),
            color = when {
                detail == null || detail.attemptsInWindow == 0 -> PopTokens.Mud
                detail.wrongInWindow == 0 -> PopTokens.GradeGold
                else -> PopTokens.Ink
            },
        )
    }

    PopGap(5.dp)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(26.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = if (detail == null || detail.attemptsInWindow == 0) {
                    "No attempts yet"
                } else {
                    "Last ${detail.attemptsInWindow}: " +
                        "${detail.correctInWindow} right, ${detail.wrongInWindow} wrong"
                }
            },
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        repeat(blanks) {
            Tick(fill = PopTokens.SandFill, modifier = Modifier.weight(1f))
        }
        outcomes.forEach { correct ->
            Tick(
                fill = if (correct) PopTokens.GradeGold else PopTokens.Red,
                modifier = Modifier.weight(1f),
            )
        }
    }

    PopGap(4.dp)

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text("OLDEST", style = PopType.Small.copy(fontSize = 9.sp), color = PopTokens.SandPale)
        Text("NEWEST", style = PopType.Small.copy(fontSize = 9.sp), color = PopTokens.SandPale)
    }
}

@Composable
private fun Tick(fill: Color, modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxHeight()
            .background(fill, RoundedCornerShape(3.dp)),
    )
}

/* ------------------------------------------------------ nothing selected yet */

/**
 * The resting state: the whole grid in one bar.
 *
 * Answers the question a child asks before they have tapped anything — *how am
 * I doing overall?* — with the same shape the fact ticket uses, so the panel
 * reads as one object changing contents rather than two panels swapping places.
 *
 * The bar is proportional and shows **all five stages**, not the four the mock
 * drew. Gold is the stage most of a working grid sits in for months; folding it
 * into "solid" would hide the difference between a fact that is fast and one
 * that has also survived a fortnight away from it.
 */
@Composable
private fun GridSummary(
    cells: Map<Pair<Int, Int>, MasteryCell>,
    maxFactor: Int,
    unlockedTables: List<Int>,
    onPractise: (List<Int>) -> Unit,
) {
    val total = maxFactor * maxFactor
    val counts = remember(cells, maxFactor) { countStages(cells, maxFactor) }
    val solid = counts.gold + counts.blue

    PanelHeader(
        title = "YOUR GRID",
        trailing = "$solid/$total SOLID",
        fill = PopTokens.TealDeep,
        content = PopTokens.White,
    )
    HeaderRule()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 14.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 2.dp, bottom = 10.dp)
                .semantics(mergeDescendants = true) {
                    contentDescription = "$solid of $total facts solid"
                },
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.Bottom,
        ) {
            Text(
                text = "$solid",
                style = PopType.DisplayLarge.copy(fontSize = 40.sp),
                color = PopTokens.Ink,
            )
            Text(
                text = "facts solid",
                style = PopType.Title.copy(fontSize = 21.sp),
                color = PopTokens.Mud,
                modifier = Modifier.padding(start = 9.dp, bottom = 3.dp),
            )
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "WHOLE GRID",
                style = PopType.Small.copy(fontSize = 9.5.sp, letterSpacing = 1.2.sp),
                color = PopTokens.Mud,
            )

            PopGap(5.dp)

            StageBar(counts = counts, total = total)

            PopGap(7.dp)

            StageLegend(counts = counts)
        }

        // Adaptive practice, not a table picker: the child has not named a fact,
        // so the honest answer to "what should I do" is whatever the grid says
        // is weakest.
        PopButton(
            text = "PRACTISE WEAK SPOTS",
            onClick = { onPractise(weakestTables(cells, unlockedTables)) },
            tone = PopTone.Yellow,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )
    }
}

/** One bar, five segments, in ladder order. Zero-width stages are dropped. */
@Composable
private fun StageBar(counts: StageCounts, total: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(26.dp)
            .clip(RoundedCornerShape(5.dp))
            .semantics(mergeDescendants = true) {
                contentDescription = "Of $total facts: " +
                    "${counts.blue} locked in, ${counts.gold} solid, " +
                    "${counts.silver} getting there, ${counts.bronze} needing work, " +
                    "${counts.none} not tried"
            },
    ) {
        StageBarOrder.forEach { stage ->
            val share = counts.of(stage)
            if (share > 0) {
                Box(
                    Modifier
                        .weight(share.toFloat())
                        .fillMaxHeight()
                        .background(stage.fill()),
                )
            }
        }
    }
}

@Composable
private fun StageLegend(counts: StageCounts) {
    // Two rows of the ladder rather than one wrapping line, so the swatches
    // stay in columns a child can compare down as well as across.
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        StageBarOrder.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { stage ->
                    LegendEntry(stage = stage, count = counts.of(stage))
                }
            }
        }
    }
}

@Composable
private fun LegendEntry(stage: MasteryStage, count: Int) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
        modifier = Modifier.semantics(mergeDescendants = true) {
            contentDescription = "$count ${stage.shortLabel()}"
        },
    ) {
        Box(
            Modifier
                .width(11.dp)
                .aspectRatio(1f)
                .background(stage.fill(), RoundedCornerShape(3.dp)),
        )
        Text(
            text = "$count ${stage.shortLabel()}",
            style = PopType.Small.copy(fontSize = 10.5.sp),
            color = PopTokens.Mud,
        )
    }
}

/** Best first: a child should read their own grid as a thing they are winning. */
private val StageBarOrder = listOf(
    MasteryStage.BLUE,
    MasteryStage.GOLD,
    MasteryStage.SILVER,
    MasteryStage.BRONZE,
    MasteryStage.NONE,
)

private fun StageCounts.of(stage: MasteryStage): Int = when (stage) {
    MasteryStage.NONE -> none
    MasteryStage.BRONZE -> bronze
    MasteryStage.SILVER -> silver
    MasteryStage.GOLD -> gold
    MasteryStage.BLUE -> blue
}

/**
 * The header line for a stage.
 *
 * Names the colour as well as the meaning, because the child got here by
 * tapping a coloured square and the panel has to confirm it read the right one.
 */
private fun MasteryStage.headline(): String = when (this) {
    MasteryStage.NONE -> "GREY · NOT TRIED"
    MasteryStage.BRONZE -> "RED · NEEDS WORK"
    MasteryStage.SILVER -> "ORANGE · GETTING THERE"
    MasteryStage.GOLD -> "GREEN · SOLID"
    MasteryStage.BLUE -> "BLUE · LOCKED IN"
}

private fun MasteryStage.shortLabel(): String = when (this) {
    MasteryStage.NONE -> "untried"
    MasteryStage.BRONZE -> "to fix"
    MasteryStage.SILVER -> "shaky"
    MasteryStage.GOLD -> "solid"
    MasteryStage.BLUE -> "locked in"
}

/** Where this fact sits in the grid, reading across then down. */
private fun factIndex(cell: MasteryCell, maxFactor: Int): Int =
    (cell.a - 1) * maxFactor + cell.b

/**
 * The tables carrying the most unfinished facts.
 *
 * Takes the two weakest rather than everything unlocked: a practice run over
 * eleven tables is the same run the child could already have started from the
 * shed, and would make the button a long way round to Toolbox Time. Falls back
 * to the whole unlocked set when the grid is complete enough to have no weak
 * spots left, which is the one time "practise everything" is the right answer.
 */
private fun weakestTables(
    cells: Map<Pair<Int, Int>, MasteryCell>,
    unlockedTables: List<Int>,
): List<Int> {
    if (unlockedTables.isEmpty()) return emptyList()

    val unfinishedPerTable = unlockedTables.associateWith { table ->
        cells.values.count { cell ->
            (cell.a == table || cell.b == table) &&
                cell.stage.toStage().ordinal < MasteryStage.GOLD.ordinal
        }
    }

    val weakest = unfinishedPerTable
        .filterValues { it > 0 }
        .entries
        .sortedByDescending { it.value }
        .take(2)
        .map { it.key }
        .sorted()

    return weakest.ifEmpty { unlockedTables }
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
