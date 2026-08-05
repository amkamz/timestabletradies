package com.timestabletradies.ui.jobs

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.toSize
import com.timestabletradies.core.designsystem.LocalPopReducedMotion
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popPressSurface
import com.timestabletradies.core.designsystem.popSurface
import com.timestabletradies.core.designsystem.rememberPopInteractionSource
import com.timestabletradies.core.model.Operation
import com.timestabletradies.core.model.Question
import com.timestabletradies.ui.state.Storyboard
import kotlinx.coroutines.delay
import kotlin.math.abs
import kotlin.random.Random

/* -------------------------------------------------------------- B4 · tiles */

/**
 * Four tiles, one right.
 *
 * The three wrong ones are **generated on the client**, and that is fine: the
 * answer already ships with the question (`ServedQuestion.answer`), so a
 * distractor reveals nothing the child doesn't have. What matters is that they
 * are *plausible* — off-by-one-multiple, a transposition, a neighbouring
 * table — because four random numbers turn recall into elimination and stop
 * measuring anything.
 */
fun distractorsFor(question: Question, random: Random): List<Int> {
    val answer = question.answer
    val a = question.a
    val b = question.b

    val candidates = linkedSetOf<Int>()
    // One multiple out, either way — the classic slip.
    candidates += answer + a
    candidates += answer - a
    candidates += answer + b
    candidates += answer - b
    // Adjacent facts in the same table.
    candidates += a * (b + 1)
    candidates += a * (b - 1)
    // A digit transposition, when there is one to make.
    if (answer >= 10) {
        val swapped = answer.toString().reversed().toIntOrNull()
        if (swapped != null) candidates += swapped
    }

    val plausible = candidates
        .filter { it > 0 && it != answer }
        .distinct()
        .sortedBy { abs(it - answer) }
        .take(6)
        .shuffled(random)
        .take(3)
        .toMutableList()

    // Small facts run out of plausible near-misses — 1 × 1 has almost none. Top
    // up from the neighbours rather than render two tiles, which would turn a
    // recall question into a coin toss.
    var offset = 1
    while (plausible.size < 3 && offset < 12) {
        listOf(answer + offset, answer - offset).forEach {
            if (plausible.size < 3 && it > 0 && it != answer && it !in plausible) {
                plausible += it
            }
        }
        offset += 1
    }

    return plausible
}

@Composable
fun TileChoices(
    options: List<Int>,
    picked: Int?,
    answer: Int,
    enabled: Boolean,
    onPick: (Int) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        options.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { option ->
                    val state = when {
                        picked == null -> TileState.Idle
                        option == answer -> TileState.Right
                        option == picked -> TileState.Wrong
                        else -> TileState.Idle
                    }
                    Tile(
                        value = option,
                        state = state,
                        enabled = enabled,
                        onClick = { onPick(option) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

private enum class TileState { Idle, Right, Wrong }

@Composable
private fun Tile(
    value: Int,
    state: TileState,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val fill = when (state) {
        TileState.Idle -> PopTokens.White
        TileState.Right -> PopTokens.Teal
        TileState.Wrong -> PopTokens.Red
    }
    val content = if (state == TileState.Idle) PopTokens.Ink else PopTokens.White
    val interactionSource = rememberPopInteractionSource()

    Box(
        modifier = modifier
            // A tile is the answer control, so it is a button and depresses like
            // one — the same press the keypad gets, for the same reason.
            .popPressSurface(
                interactionSource = interactionSource,
                fill = fill,
                radius = PopTokens.RadiusMd,
                shadow = PopShadow.Medium,
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = onClick,
            )
            // The right/wrong marking is spoken, never left to the fill alone.
            .semantics {
                contentDescription = when (state) {
                    TileState.Idle -> "$value"
                    TileState.Right -> "$value, correct"
                    TileState.Wrong -> "$value, wrong"
                }
            }
            .padding(vertical = 18.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text("$value", style = PopType.DisplayMedium, color = content)
    }
}

/* ------------------------------------------------------- B6 · word problem */

/**
 * The fact, wrapped in something happening on a site.
 *
 * The maths is untouched — a and b come straight from the served question — and
 * only the sentence around them is chosen here. That keeps the word-problem
 * mode from being a second question generator, which is the thing §0.2 exists
 * to prevent.
 *
 * **The operation decides the pool.** A division question expects `b`, not
 * `a × b`, so it has to be told as a sharing story; asking "how many palings
 * all up?" while the server marks "how many on one panel?" fails a child for
 * being right. Same index into both pools, so the situation stays stable for a
 * given fact whichever way round it is asked.
 */
fun wordProblemFor(question: Question): AnnotatedString {
    val pool = if (question.operation == Operation.DIVIDE) {
        Storyboard.divideProblems
    } else {
        Storyboard.multiplyProblems
    }
    val template = pool[(question.a * 31 + question.b * 17) % pool.size]
    return markdownBold(template(question.a, question.b))
}

/** The templates mark their numbers with `**`; this is the whole of that. */
private fun markdownBold(source: String): AnnotatedString = buildAnnotatedString {
    var rest = source
    while (true) {
        val open = rest.indexOf("**")
        if (open < 0) {
            append(rest)
            return@buildAnnotatedString
        }
        val close = rest.indexOf("**", open + 2)
        if (close < 0) {
            append(rest)
            return@buildAnnotatedString
        }
        append(rest.substring(0, open))
        withStyle(SpanStyle(fontWeight = FontWeight.Black)) {
            append(rest.substring(open + 2, close))
        }
        rest = rest.substring(close + 2)
    }
}

@Composable
fun WordProblemCard(
    text: AnnotatedString,
    typed: String,
    readAloudEnabled: Boolean,
    onReadAloud: () -> Unit,
    borderColor: Color,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        PopArtSlot(
            label = "DELIVERY SCENE ART · pallets on a ute",
            modifier = Modifier.fillMaxWidth().height(120.dp),
            content = PopTokens.White,
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .popSurface(
                    fill = PopTokens.White,
                    radius = PopTokens.RadiusLg,
                    borderColor = borderColor,
                    borderWidth = 4.dp,
                )
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (readAloudEnabled) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .clickable(role = Role.Button, onClick = onReadAloud)
                        .semantics { contentDescription = "Read the question aloud" },
                ) {
                    Box(
                        modifier = Modifier
                            .size(30.dp)
                            .background(PopTokens.Yellow, CircleShape)
                            .border(2.5.dp, PopTokens.Ink, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("🔊", style = PopType.Small)
                    }
                    Text("TAP TO HEAR", style = PopType.Small, color = PopTokens.Mud)
                }
            }
            Text(text = text, style = PopType.Body, color = PopTokens.Ink)
            Text(
                text = typed.ifEmpty { "—" },
                style = PopType.Numeric,
                color = if (typed.isEmpty()) PopTokens.SandLight else PopTokens.Ink,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/* -------------------------------------------------------- B7 · measure up */

/**
 * The match grid.
 *
 * ## Two ways to pair, and only one of them is required
 *
 * Drag a job across to its total and let go, or tap the job and then tap the
 * total. **The tap path is the one that must always work** — "dragging is never
 * required" is a standing constraint on every mode (§2.7), because a drag on a
 * small screen with a small hand is a coordination test wearing a maths
 * question's clothes, and it is flatly impossible under a screen reader or a
 * switch device.
 *
 * So the drag is an *affordance on top*: the cells are still real buttons with
 * real click handlers, and the gesture below only claims the pointer once a
 * finger has actually travelled past the touch slop. A tap that never moves
 * never reaches it.
 *
 * ## The rope
 *
 * A live rope follows the finger. A *right* pair keeps its rope — faint, grey
 * and out of the way — so the board holds a record of what has been joined
 * while the child works on the rest. A wrong pair flashes red and the rope
 * decays away entirely, taking the pairing with it.
 *
 * ## Wrong is not final
 *
 * A miss comes back off the board after [MeasureUpMissMs] and both cells are
 * available again. The child keeps going until every job is on its own total,
 * which is the only thing that ends the round.
 *
 * **This does not cost them the mark, and it does not give them one either.**
 * The attempt is logged against the *job* the moment it is made — 7 × 8 was
 * tried and missed — and `run-finish` scores the first attempt on each question
 * and drops the rest. So a retry hands back the puzzle, not the grade, and the
 * mastery grid still hears about the miss. It also means a wrong drop marks the
 * job cell rather than the total: the fact being practised is 7 × 8, and 54 did
 * nothing wrong.
 */
@Composable
fun MeasureUpBoard(
    questions: List<Question>,
    /**
     * The right-hand column, as (slot, total).
     *
     * Slots rather than bare totals because two facts in one batch can share an
     * answer — 2 × 6 and 3 × 4 are both 12. Keyed by value, pairing the first
     * would grey out the second and strand the child with a tile they cannot
     * use and a question they cannot answer.
     */
    slots: List<Pair<Int, Int>>,
    /**
     * questionId → the slot it was paired with.
     *
     * Attempts, not verdicts: a wrong pair is in here for as long as it is
     * being shown as wrong, and then the caller takes it out again.
     */
    pairings: Map<String, Int>,
    selectedQuestionId: String?,
    onSelectQuestion: (String) -> Unit,
    /** A pair was made, by either route. The caller does the recording. */
    onConnect: (questionId: String, slot: Int) -> Unit,
) {
    val totalForSlot = remember(slots) { slots.toMap() }

    /** Spoken for by a *right* pair — the only ones that grey out for good. */
    val matchedSlots = questions.mapNotNullTo(mutableSetOf()) { question ->
        pairings[question.id]?.takeIf { totalForSlot[it] == question.answer }
    }

    /** In any pair at all, including a wrong one still on screen. */
    val heldSlots = pairings.values.toSet()
    val connect by rememberUpdatedState(onConnect)

    // Where each cell ended up, in *root* coordinates, alongside where the
    // board itself is. Kept apart rather than pre-subtracted because the two
    // callbacks fire in no guaranteed order, and an origin baked into a cell's
    // rect one frame too early would draw the rope where the cell isn't.
    val anchors = remember(questions) { mutableStateMapOf<Anchor, Rect>() }
    var boardOrigin by remember { mutableStateOf(Offset.Zero) }

    // The live drag, split three ways on purpose: the point moves every frame
    // and is only ever read while drawing, so keeping it out of `from` and
    // `over` stops a drag from recomposing eight cells sixty times a second.
    var dragFrom by remember { mutableStateOf<Anchor?>(null) }
    var dragOver by remember { mutableStateOf<Anchor?>(null) }
    var dragPoint by remember { mutableStateOf(Offset.Zero) }

    val ropes = questions.map { question ->
        val slot = pairings[question.id]
        val right = slot != null && totalForSlot[slot] == question.answer
        key(question.id) {
            Rope(
                from = Anchor.Job(question.id),
                to = slot?.let { Anchor.Slot(it) },
                color = if (right) PopTokens.Ink else PopTokens.Red,
                alpha = rememberRopeAlpha(paired = slot != null, correct = right),
            )
        }
    }

    /** A cell's box in the board's own coordinates. Null until it is laid out. */
    fun rectOf(anchor: Anchor): Rect? =
        anchors[anchor]?.translate(-boardOrigin.x, -boardOrigin.y)

    fun anchorAt(point: Offset): Anchor? =
        anchors.keys.firstOrNull { rectOf(it)?.contains(point) == true }

    // Both read `pairings` live rather than a snapshot taken when the gesture
    // started — it is the same instance for the whole run, so a pair made
    // mid-batch is visible to the next drag without restarting anything.
    fun free(anchor: Anchor): Boolean = when (anchor) {
        is Anchor.Job -> !pairings.containsKey(anchor.questionId)
        is Anchor.Slot -> !pairings.containsValue(anchor.slot)
    }

    fun canJoin(from: Anchor, to: Anchor): Boolean {
        // Opposite sides only: a total is not an answer to another total.
        val crossesTheBoard = (from is Anchor.Job) != (to is Anchor.Job)
        return crossesTheBoard && free(to)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .onGloballyPositioned { boardOrigin = it.positionInRoot() }
            .pointerInput(questions, slots) {
                awaitEachGesture {
                    // Not `requireUnconsumed`: the cells underneath are real
                    // buttons and their own tap detector consumes the down.
                    val down = awaitFirstDown(requireUnconsumed = false)
                    val from = anchorAt(down.position)?.takeIf { free(it) }
                        // Started on the gap or on a cell that is already
                        // paired — leave the gesture alone so the scroll this
                        // board sits inside can still have it.
                        ?: return@awaitEachGesture

                    var dragging = false
                    while (true) {
                        val event = awaitPointerEvent()
                        val change = event.changes.firstOrNull { it.id == down.id } ?: break
                        if (!change.pressed) break
                        if (!dragging) {
                            val travelled = (change.position - down.position).getDistance()
                            // Under the slop this is still a tap, and a tap
                            // belongs to the button underneath.
                            if (travelled < viewConfiguration.touchSlop) continue
                            dragging = true
                            dragFrom = from
                        }
                        dragPoint = change.position
                        dragOver = anchorAt(change.position)?.takeIf { canJoin(from, it) }
                        // Claims the gesture, and two useful things follow: the
                        // cell under the finger drops its pending click, and the
                        // enclosing scroll stops trying to scroll.
                        change.consume()
                    }

                    val landedOn = dragOver
                    dragFrom = null
                    dragOver = null
                    if (dragging && landedOn != null) {
                        when {
                            from is Anchor.Job && landedOn is Anchor.Slot ->
                                connect(from.questionId, landedOn.slot)

                            from is Anchor.Slot && landedOn is Anchor.Job ->
                                connect(landedOn.questionId, from.slot)
                        }
                    }
                }
            }
            .drawWithContent {
                drawContent()

                // Settled ropes first, so the live one is never buried.
                ropes.forEach { rope ->
                    val alpha = rope.alpha.value
                    if (alpha <= 0.02f) return@forEach
                    val end = rope.to?.let { rectOf(it) } ?: return@forEach
                    val start = rectOf(rope.from) ?: return@forEach
                    drawRope(
                        from = start.centerRight,
                        to = end.centerLeft,
                        color = rope.color,
                        alpha = alpha,
                        width = RopeWidth.toPx(),
                    )
                }

                val held = dragFrom
                val start = held?.let { rectOf(it) }
                if (held != null && start != null) {
                    val fromLeftColumn = held is Anchor.Job
                    val grip = if (fromLeftColumn) start.centerRight else start.centerLeft
                    drawRope(
                        from = grip,
                        to = dragPoint,
                        color = PopTokens.Ink,
                        alpha = 1f,
                        width = RopeLiveWidth.toPx(),
                        fromDirection = if (fromLeftColumn) 1f else -1f,
                        // The far end is a fingertip, not a fixing point, so
                        // the rope runs straight into it.
                        toDirection = 0f,
                    )
                    drawCircle(PopTokens.Ink, RopeKnot.toPx(), grip)
                    drawCircle(PopTokens.Ink, RopeKnot.toPx(), dragPoint)
                    drawCircle(PopTokens.Yellow, RopeKnot.toPx() - 3.dp.toPx(), dragPoint)
                }
            },
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                questions.forEach { question ->
                    val anchor = Anchor.Job(question.id)
                    val paired = pairings[question.id]?.let { totalForSlot[it] }
                    val right = paired != null && paired == question.answer
                    val armed = question.id == selectedQuestionId ||
                        dragFrom == anchor ||
                        dragOver == anchor
                    MatchCell(
                        label = question.prompt,
                        fill = when {
                            paired != null && right -> PopTokens.TealTint
                            paired != null -> PopTokens.RedTint
                            armed -> PopTokens.Teal
                            else -> PopTokens.White
                        },
                        content = when {
                            paired != null && right -> PopTokens.TealDeep
                            paired != null -> PopTokens.RedDeep
                            armed -> PopTokens.White
                            else -> PopTokens.Ink
                        },
                        dashed = false,
                        enabled = paired == null,
                        spoken = when {
                            paired != null && right ->
                                "${question.spoken}, matched to $paired, correct"

                            paired != null ->
                                "${question.spoken}, matched to $paired, wrong, try again"

                            else -> question.spoken
                        },
                        onClick = { onSelectQuestion(question.id) },
                        modifier = Modifier.anchorTo(anchor, anchors),
                    )
                }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                slots.forEach { (slot, total) ->
                    val anchor = Anchor.Slot(slot)
                    // A total that a wrong pair is briefly attached to is not
                    // marked and does not grey out — it was never the thing
                    // that was wrong. It just can't be tapped until the miss
                    // has finished clearing.
                    val matched = slot in matchedSlots
                    val held = slot in heldSlots
                    val armed = dragFrom == anchor || dragOver == anchor
                    MatchCell(
                        label = "$total",
                        fill = when {
                            matched -> PopTokens.SandPanel
                            armed -> PopTokens.Yellow
                            else -> PopTokens.YellowTint
                        },
                        content = if (matched) PopTokens.Sand else PopTokens.Ink,
                        dashed = !matched && !armed,
                        enabled = !held && selectedQuestionId != null,
                        spoken = if (matched) "$total, already used" else "$total",
                        onClick = { selectedQuestionId?.let { connect(it, slot) } },
                        modifier = Modifier.anchorTo(anchor, anchors),
                    )
                }
            }
        }
    }
}

/** One end of a rope: a cell on one side of the board or the other. */
private sealed interface Anchor {
    data class Job(val questionId: String) : Anchor
    data class Slot(val slot: Int) : Anchor
}

/** A settled rope. [to] is null until its question has been paired. */
private data class Rope(
    val from: Anchor,
    val to: Anchor?,
    val color: Color,
    val alpha: State<Float>,
)

/** Full strength while the eye is still on the pair that was just made. */
private const val RopeHoldMs = 380L
private const val RopeDecayMs = 520

/**
 * How long a wrong pair stays on the board before the caller takes it off.
 *
 * Tied to the rope's own life rather than picked separately, so the red flash
 * ending and the cells coming free are one event. Long enough to read as an
 * answer that was marked, short enough that a child who knows what they did
 * wrong isn't kept waiting to fix it.
 */
const val MeasureUpMissMs: Long = RopeHoldMs + RopeDecayMs

/** What a correct rope settles back to: still there, no longer shouting. */
private const val RopeSettledAlpha = 0.28f

private val RopeWidth = 5.dp
private val RopeLiveWidth = 6.dp
private val RopeKnot = 7.dp

/**
 * How present a rope is, over time.
 *
 * Right: full, then fades back to a faint line that stays for the rest of the
 * batch. Wrong: a red flash, then gone. Both go through the same animation so
 * the two outcomes are the same gesture with different endings rather than two
 * unrelated effects.
 */
@Composable
private fun rememberRopeAlpha(paired: Boolean, correct: Boolean): State<Float> {
    val reducedMotion = LocalPopReducedMotion.current
    val alpha = remember { Animatable(0f) }

    LaunchedEffect(paired, correct, reducedMotion) {
        if (!paired) {
            alpha.snapTo(0f)
            return@LaunchedEffect
        }
        val settled = if (correct) RopeSettledAlpha else 0f
        if (reducedMotion) {
            // The state still lands; only the travel is dropped (§2.7).
            alpha.snapTo(settled)
            return@LaunchedEffect
        }
        alpha.snapTo(1f)
        delay(RopeHoldMs)
        alpha.animateTo(settled, tween(RopeDecayMs))
    }

    return alpha.asState()
}

/** Report a cell's box, in root coordinates, for the rope layer to read. */
private fun Modifier.anchorTo(key: Anchor, into: MutableMap<Anchor, Rect>): Modifier =
    this.onGloballyPositioned { into[key] = Rect(it.positionInRoot(), it.size.toSize()) }

/**
 * A rope between two points.
 *
 * A shoulder comes out of each end before the line turns, which is what makes
 * two cells four rows apart read as slack rope laid over the board rather than
 * a wire drawn straight through it.
 */
private fun DrawScope.drawRope(
    from: Offset,
    to: Offset,
    color: Color,
    alpha: Float,
    width: Float,
    fromDirection: Float = 1f,
    toDirection: Float = -1f,
) {
    val bow = (22.dp.toPx() + abs(to.y - from.y) * 0.12f).coerceAtMost(60.dp.toPx())
    val path = Path().apply {
        moveTo(from.x, from.y)
        cubicTo(
            from.x + bow * fromDirection, from.y,
            to.x + bow * toDirection, to.y,
            to.x, to.y,
        )
    }
    drawPath(
        path = path,
        color = color,
        alpha = alpha,
        style = Stroke(width = width, cap = StrokeCap.Round),
    )
}

@Composable
private fun MatchCell(
    label: String,
    fill: Color,
    content: Color,
    dashed: Boolean,
    enabled: Boolean,
    spoken: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .popSurface(
                fill = fill,
                radius = PopTokens.RadiusSm,
                borderColor = if (dashed) PopTokens.Sand else PopTokens.Ink,
            )
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = spoken }
            .padding(vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = PopType.Title, color = content)
    }
}

/* ------------------------------------------------------- B8 · build order */

/**
 * Three steps toward one grand total.
 *
 * The running total is the point: it is the first mode where an answer is worth
 * something beyond being right, and a child who sees 36 become 90 has done
 * something the single-question modes cannot ask for.
 */
@Composable
fun BuildOrderBoard(
    steps: List<Question>,
    answers: Map<String, Int>,
    activeIndex: Int,
    typed: String,
    stepLabels: List<String>,
    borderColor: Color,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        steps.forEachIndexed { index, question ->
            val done = question.id in answers
            when {
                done -> StepRow(
                    number = index + 1,
                    label = "${question.prompt} ${stepLabels.getOrElse(index) { "" }}",
                    value = "${answers[question.id]} ✓",
                    fill = PopTokens.White,
                    borderColor = PopTokens.Teal,
                    numberFill = PopTokens.Teal,
                    numberContent = PopTokens.White,
                    contentColor = PopTokens.Ink,
                    valueColor = PopTokens.TealDeep,
                )

                index == activeIndex -> Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .popSurface(
                            fill = PopTokens.White,
                            radius = PopTokens.RadiusMd,
                            borderColor = borderColor,
                            borderWidth = 4.dp,
                        )
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = "STEP ${index + 1} · " +
                            stepLabels.getOrElse(index) { "" }.uppercase(),
                        style = PopType.Small,
                        color = PopTokens.Mud,
                    )
                    Text(
                        text = question.prompt,
                        style = PopType.DisplayLarge,
                        color = PopTokens.Ink,
                        modifier = Modifier.semantics { contentDescription = question.spoken },
                    )
                    Text(
                        text = typed.ifEmpty { "?" },
                        style = PopType.Numeric,
                        color = if (typed.isEmpty()) PopTokens.SandLight else PopTokens.Ink,
                    )
                }

                else -> StepRow(
                    number = index + 1,
                    label = "${question.prompt} ${stepLabels.getOrElse(index) { "" }}",
                    value = null,
                    fill = Color.Transparent,
                    borderColor = PopTokens.White,
                    numberFill = PopTokens.White,
                    numberContent = PopTokens.Ink,
                    contentColor = PopTokens.White,
                    valueColor = PopTokens.White,
                )
            }
        }

        PopGap(2.dp)

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .popSurface(
                    fill = PopTokens.Yellow,
                    radius = PopTokens.RadiusMd,
                )
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            val total = answers.values.sum()
            Text(
                text = "GRAND TOTAL SO FAR: $total",
                style = PopType.Title,
                color = PopTokens.Ink,
            )
        }
    }
}

@Composable
private fun StepRow(
    number: Int,
    label: String,
    value: String?,
    fill: Color,
    borderColor: Color,
    numberFill: Color,
    numberContent: Color,
    contentColor: Color,
    valueColor: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (fill == Color.Transparent) {
                    Modifier.border(
                        PopTokens.BorderWidth,
                        borderColor,
                        RoundedCornerShape(PopTokens.RadiusMd),
                    )
                } else {
                    Modifier.popSurface(
                        fill = fill,
                        radius = PopTokens.RadiusMd,
                        borderColor = borderColor,
                    )
                },
            )
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(26.dp)
                .background(numberFill, CircleShape)
                .border(2.dp, PopTokens.Ink, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text("$number", style = PopType.Small, color = numberContent)
        }
        Text(label, style = PopType.Small, color = contentColor, modifier = Modifier.weight(1f))
        if (value != null) {
            Text(value, style = PopType.Title, color = valueColor)
        }
    }
}

/** Step names for Build Order. Copy, keyed by position, not by fact. */
val buildOrderLabels = listOf("walls", "floor", "splashback")
