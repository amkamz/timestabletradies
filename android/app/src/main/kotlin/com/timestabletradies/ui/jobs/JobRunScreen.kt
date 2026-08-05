package com.timestabletradies.ui.jobs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopInsets
import com.timestabletradies.core.designsystem.PopKeypad
import com.timestabletradies.core.designsystem.PopPromptCard
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.model.AnsweredFact
import com.timestabletradies.core.model.Question
import com.timestabletradies.core.model.RunConfig
import com.timestabletradies.ui.RunBanking
import com.timestabletradies.ui.state.QuestionStyle
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random

/** How long the correct/wrong flash holds before the next question. */
private const val FEEDBACK_MS = 700L

/** Reserved for the feedback line, occupied or not, so nothing above it moves. */
private val FeedbackSlotHeight = 34.dp

/** Clearance under the keypad. */
private val KeypadLift = 15.dp

/**
 * B4–B8, C5, D2 and E2 — one runner, five presentations, four sets of clothes.
 *
 * What is common to all of them is the part that matters: the questions were
 * dealt by the server, the answers are logged verbatim, and `run-finish` marks
 * them. Nothing on this screen decides whether an answer was right for scoring
 * purposes — the local check exists only so a child sees straight away what
 * happened, and the server ignores it (§0.2).
 *
 * Two presentations take questions in batches rather than one at a time:
 * Measure Up pairs four, Build Order chains three. They are still the same log,
 * just filled in a different order.
 */
@Composable
fun JobRunScreen(
    config: RunConfig,
    style: QuestionStyle,
    chrome: RunChrome,
    onFinished: (List<AnsweredFact>) -> Unit,
    /**
     * The child tapped ✕.
     *
     * Carries the answers given so far, because **leaving is not the same as
     * not having done the work.** A child who answered six questions and then
     * stopped has practised six facts, and the grid has to say so — throwing
     * the log away would teach them that quitting costs them their progress,
     * which is the one lesson a maths app must not teach.
     *
     * `run-finish` scores whatever it is handed against the board it stored, so
     * a partial log banks partially and nothing needs to change server-side.
     */
    onLeave: (List<AnsweredFact>) -> Unit,
    readAloud: Boolean = false,
) {
    val batch = style.batchSize()
    val speaker = rememberSpeaker(readAloud)
    val random = remember(config.runId) { Random(config.runId.hashCode()) }

    // Measure Up takes a wrong pair back off the board after a beat, which is
    // the one thing on this screen that has to happen on a timer without a
    // state change to hang a LaunchedEffect on.
    val scope = rememberCoroutineScope()

    val answers = remember(config.runId) { mutableListOf<AnsweredFact>().toMutableStateList() }
    var cursor by remember(config.runId) { mutableIntStateOf(0) }
    var typed by remember(config.runId) { mutableStateOf("") }
    var streak by remember(config.runId) { mutableIntStateOf(0) }
    var feedback by remember(config.runId) { mutableStateOf<Feedback?>(null) }
    var secondsLeft by remember(config.runId) { mutableStateOf<Int?>(null) }
    var startedAt by remember(config.runId) { mutableLongStateOf(0L) }

    /**
     * The log has been handed over and the screen is on its way out.
     *
     * A one-way latch, because everything it guards has to stay guarded until
     * this composable is gone — not merely until the next recomposition.
     */
    var finishing by remember(config.runId) { mutableStateOf(false) }

    // Batch-only state, cleared whenever the batch moves.
    /**
     * Measure Up: questionId → the total it was paired with.
     *
     * Holds *attempts*, not verdicts. A correct pair stays here for the rest of
     * the batch; a wrong one is removed again after [MeasureUpMissMs], which is
     * what lets a child have another go at it.
     */
    val pairings = remember(config.runId) { mutableStateMapOf<String, Int>() }
    var selectedQuestionId by remember(config.runId) { mutableStateOf<String?>(null) }
    /** Build Order: questionId → the value typed for that step. */
    val stepAnswers = remember(config.runId) { mutableStateMapOf<String, Int>() }

    val group = config.questions.drop(cursor).take(batch)
    val question = group.firstOrNull()

    LaunchedEffect(cursor) {
        startedAt = System.currentTimeMillis()
        typed = ""
        selectedQuestionId = null
        pairings.clear()
        stepAnswers.clear()
        secondsLeft = if (batch == 1) config.timerSeconds else null
        if (readAloud && question != null && style != QuestionStyle.WordProblem) {
            speaker.say(question.spoken)
        }
    }

    /** Append to the log. `correct` is for the flash; the server does the marking. */
    fun record(target: Question, value: Int?) {
        if (finishing) return
        answers += AnsweredFact(
            questionId = target.id,
            a = target.a,
            b = target.b,
            operation = target.operation,
            answer = value,
            correct = value != null && value == target.answer,
            elapsedMs = System.currentTimeMillis() - startedAt,
        )
        streak = if (value != null && value == target.answer) streak + 1 else 0
    }

    fun finishBatch(lastCorrect: Boolean, shown: Int) {
        if (finishing) return
        feedback = Feedback(
            correct = lastCorrect,
            shown = shown,
            wasLast = cursor + batch >= config.questions.size,
        )
    }

    LaunchedEffect(feedback) {
        val current = feedback ?: return@LaunchedEffect
        delay(FEEDBACK_MS)

        if (current.wasLast) {
            // The run is over. `onFinished` posts the log and *then* navigates,
            // so there is a network round trip during which this screen is still
            // on top — and clearing the feedback here would hand the child back
            // a live, answerable copy of the question they just finished. That
            // is the eleventh question in a ten-question job.
            //
            // So `finishing` latches and the whole board is replaced by the
            // hand-over screen until the results actually arrive.
            finishing = true
            onFinished(answers.toList())
        } else {
            feedback = null
            cursor += batch
        }
    }

    // The clock, for the single-question styles only. Running out records an
    // unanswered question rather than a wrong one — the child did not get it
    // wrong, they ran out of time, and the log should say which.
    LaunchedEffect(cursor, feedback) {
        if (feedback != null || batch != 1) return@LaunchedEffect
        var remaining = config.timerSeconds ?: return@LaunchedEffect
        while (remaining > 0) {
            delay(1000)
            remaining -= 1
            secondsLeft = remaining
        }
        val target = question ?: return@LaunchedEffect
        record(target, null)
        finishBatch(lastCorrect = false, shown = target.answer)
    }

    // The hand-over. The log has gone up, `run-finish` is marking it, and the
    // results screen will replace this one when it comes back.
    //
    // Everything below this line is an input, so it all goes away — which is
    // also the strongest version of the guard `finishing` exists for: there is
    // no live copy of the last question left on screen to answer twice.
    if (finishing || question == null) {
        RunBanking(chrome.backdrop)
        return
    }

    val borderColor = when {
        feedback == null -> PopTokens.Ink
        feedback!!.correct -> PopTokens.Teal
        else -> PopTokens.Red
    }

    // Header pinned to the top, input pinned to the bottom, question centred in
    // whatever is left. A thumb rests near the bottom of a phone, so the keypad
    // lives there on every screen and never moves between questions — and the
    // question sits in the middle of the remaining space rather than riding up
    // and down as the prompt changes length.
    Box(Modifier.fillMaxSize().background(chrome.backdrop)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(PopInsets.content)
                .padding(horizontal = 18.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            RunChromeHeader(
                chrome = chrome.withRaceProgress(answers.size, config.questions.size),
                label = config.label,
                index = cursor,
                total = config.questions.size,
                streak = streak,
                secondsLeft = secondsLeft,
                onQuit = { onLeave(answers.toList()) },
            )


            // Split into "what you're looking at" and "what you're touching".
            // Every style puts its input at the bottom of the screen, in the
            // same place, so a thumb learns one position and keeps it across
            // all five presentations.
            val prompt: @Composable ColumnScope.() -> Unit
            val input: @Composable ColumnScope.() -> Unit

            /**
             * A line for the feedback slot that isn't the end-of-question flash.
             *
             * Measure Up is the only style that can be mid-answer and wrong at
             * the same time, and it needs to say so without ending anything.
             * Derived rather than stored: it is true exactly while a wrong pair
             * is sitting on the board, so it cannot get out of step with one.
             */
            var statusLine: String? = null

            when (style) {
                QuestionStyle.Tiles -> {
                    val options = remember(question.id) {
                        (distractorsFor(question, random) + question.answer).shuffled(random)
                    }
                    prompt = {
                        PopPromptCard(
                            prompt = question.prompt,
                            spoken = question.spoken,
                            borderColor = borderColor,
                        )
                    }
                    input = {
                        TileChoices(
                            options = options,
                            picked = feedback?.let { typed.toIntOrNull() },
                            answer = question.answer,
                            enabled = feedback == null,
                            onPick = { picked ->
                                if (feedback != null) return@TileChoices
                                typed = picked.toString()
                                record(question, picked)
                                finishBatch(picked == question.answer, question.answer)
                            },
                        )
                    }
                }

                QuestionStyle.Keypad -> {
                    prompt = {
                        PopPromptCard(
                            prompt = question.prompt,
                            spoken = question.spoken,
                            borderColor = borderColor,
                            footer = { TypedAnswerBox(typed) },
                        )
                    }
                    input = {
                        PopKeypad(
                            onDigit = { d -> if (typed.length < 4) typed += d },
                            onBackspace = { typed = typed.dropLast(1) },
                            onSubmit = {
                                val value = typed.toIntOrNull() ?: return@PopKeypad
                                if (feedback != null) return@PopKeypad
                                record(question, value)
                                finishBatch(value == question.answer, question.answer)
                            },
                            enabled = feedback == null,
                        )
                    }
                }

                QuestionStyle.WordProblem -> {
                    val scenario = remember(question.id) { wordProblemFor(question) }
                    prompt = {
                        WordProblemCard(
                            text = scenario,
                            typed = typed,
                            readAloudEnabled = readAloud,
                            onReadAloud = { speaker.say(scenario.text) },
                            borderColor = borderColor,
                        )
                    }
                    input = {
                        PopKeypad(
                            onDigit = { d -> if (typed.length < 4) typed += d },
                            onBackspace = { typed = typed.dropLast(1) },
                            onSubmit = {},
                            enabled = feedback == null,
                            showSubmit = false,
                        )
                        PopGap(10.dp)
                        PopButton(
                            text = "DELIVER IT ▸",
                            onClick = {
                                val value = typed.toIntOrNull() ?: return@PopButton
                                if (feedback != null) return@PopButton
                                record(question, value)
                                finishBatch(value == question.answer, question.answer)
                            },
                            tone = PopTone.Teal,
                            size = PopSize.Large,
                            fullWidth = true,
                            enabled = typed.isNotEmpty() && feedback == null,
                            shadow = PopShadow.Large,
                        )
                    }
                }

                QuestionStyle.MeasureUp -> {
                    // (slot, total) so two facts sharing an answer stay two
                    // separate tiles — see MeasureUpBoard.
                    val slots = remember(cursor) {
                        group.map { it.answer }.shuffled(random)
                            .mapIndexed { slot, total -> slot to total }
                    }
                    val totals = remember(slots) { slots.toMap() }

                    // True from the moment a wrong pair lands until it comes
                    // back off. No answer in it: telling a child the total here
                    // would hand them the retry, and the retry is the point.
                    val misplaced = group.any { q ->
                        val paired = pairings[q.id]
                        paired != null && totals[paired] != q.answer
                    }
                    if (misplaced) statusLine = "Not that one — have another go."

                    prompt = {
                        Text(
                            text = "Match the job to its total",
                            style = PopType.Title,
                            color = PopTokens.White,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        PopGap(10.dp)
                        MeasureUpBoard(
                            questions = group,
                            slots = slots,
                            pairings = pairings,
                            selectedQuestionId = selectedQuestionId,
                            onSelectQuestion = { selectedQuestionId = it },
                            onConnect = { questionId, slot ->
                                val chosen = group.firstOrNull { it.id == questionId }
                                // Both halves already have to be free for the
                                // board to offer the join, so this is a guard on
                                // the *log* rather than on the UI: a pair that
                                // slipped through twice would log the same
                                // attempt twice, and only the first of them
                                // counts (see below).
                                if (chosen == null ||
                                    pairings.containsKey(questionId) ||
                                    pairings.containsValue(slot)
                                ) {
                                    return@MeasureUpBoard
                                }
                                val given = totals.getValue(slot)

                                // Logged against the *job*, never the total: the
                                // fact being practised is 7 × 8, and a child who
                                // dropped it on 54 has had a go at 7 × 8 and
                                // missed. `run-finish` keeps the first attempt
                                // per question and drops the rest, so a retry
                                // gets the fact back — not the mark.
                                record(chosen, given)
                                pairings[chosen.id] = slot
                                selectedQuestionId = null
                                startedAt = System.currentTimeMillis()

                                if (given == chosen.answer) {
                                    // Done when every job is on its own total.
                                    // A wrong pair ends nothing.
                                    val allMatched = group.all { q ->
                                        pairings[q.id]?.let { totals[it] } == q.answer
                                    }
                                    if (allMatched) {
                                        finishBatch(
                                            lastCorrect = true,
                                            shown = chosen.answer,
                                        )
                                    }
                                } else {
                                    // Off it comes, once the red has been seen.
                                    // Both cells go back to being available and
                                    // the child tries again.
                                    scope.launch {
                                        delay(MeasureUpMissMs)
                                        pairings.remove(chosen.id)
                                    }
                                }
                            },
                        )
                    }
                    // The board is the input. Nothing to pin at the bottom.
                    input = {}
                }

                QuestionStyle.BuildOrder -> {
                    val activeIndex = group.indexOfFirst { it.id !in stepAnswers }
                        .let { if (it < 0) group.lastIndex else it }
                    val active = group[activeIndex]
                    prompt = {
                        Text(
                            text = "Order all the tiles for the bathroom:",
                            style = PopType.Title,
                            color = PopTokens.White,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        PopGap(10.dp)
                        BuildOrderBoard(
                            steps = group,
                            answers = stepAnswers,
                            activeIndex = activeIndex,
                            typed = typed,
                            stepLabels = buildOrderLabels,
                            borderColor = borderColor,
                        )
                    }
                    input = {
                        PopKeypad(
                            onDigit = { d -> if (typed.length < 4) typed += d },
                            onBackspace = { typed = typed.dropLast(1) },
                            onSubmit = {
                                val value = typed.toIntOrNull() ?: return@PopKeypad
                                if (feedback != null) return@PopKeypad
                                record(active, value)
                                stepAnswers[active.id] = value
                                typed = ""
                                // Each step is timed from the last one, not from
                                // the top of the batch, or step three would
                                // always look like the slowest fact in the run.
                                startedAt = System.currentTimeMillis()
                                if (stepAnswers.size == group.size) {
                                    finishBatch(value == active.answer, active.answer)
                                }
                            },
                            enabled = feedback == null,
                        )
                    }
                }
            }

            // Centred in whatever the header and the input leave behind. Tall
            // boards scroll inside this rather than pushing the input off.
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.Center,
            ) {
                prompt()
            }

            // The feedback line gets its own reserved slot, always the same
            // height whether or not anything is in it.
            //
            // Letting it grow into the layout pushes the question upward the
            // instant an answer lands — so the thing a child is reading jumps
            // away at exactly the moment they are checking whether they got it
            // right. The space is cheap; the jump is not.
            Box(
                modifier = Modifier.fillMaxWidth().height(FeedbackSlotHeight),
                contentAlignment = Alignment.Center,
            ) {
                val line = when {
                    // Nothing has ended; a board may still have something to
                    // say about where things stand.
                    feedback == null -> statusLine
                    feedback!!.correct -> "Nice!"
                    else -> "${question.prompt} = ${feedback!!.shown}"
                }
                if (line != null) {
                    Text(
                        text = line,
                        style = PopType.Title,
                        color = PopTokens.White,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            // Announced without pulling focus off the keypad.
                            .semantics { liveRegion = LiveRegionMode.Polite },
                    )
                }
            }

            input()

            // Lifts the keypad clear of the very bottom edge, where a thumb
            // reaching for '0' otherwise catches the system gesture area.
            PopGap(KeypadLift)
        }
    }
}

private data class Feedback(val correct: Boolean, val shown: Int, val wasLast: Boolean)

@Composable
private fun TypedAnswerBox(typed: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 10.dp)
            .background(PopTokens.Paper, androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
            .padding(vertical = 12.dp),
        contentAlignment = androidx.compose.ui.Alignment.Center,
    ) {
        Text(
            text = typed.ifEmpty { "—" },
            style = PopType.Numeric,
            color = if (typed.isEmpty()) PopTokens.SandLight else PopTokens.Ink,
        )
    }
}

/** Questions consumed per screen. Two styles work on a group, three don't. */
private fun QuestionStyle.batchSize(): Int = when (this) {
    QuestionStyle.MeasureUp -> 4
    QuestionStyle.BuildOrder -> 3
    else -> 1
}

/**
 * Move the field along with the player.
 *
 * Bot pace is *presentation*, not a rule: a Crew Race is scored from the same
 * answer log as everything else, so a bot that looks fast has no effect on what
 * anyone earns. It exists so an empty lobby still feels like a race, and the
 * lobby has already told the child which racers are simulated.
 */
private fun RunChrome.withRaceProgress(answered: Int, total: Int): RunChrome {
    if (this !is RunChrome.Race) return this
    val you = if (total == 0) 0f else answered.toFloat() / total
    return copy(
        racers = racers.mapIndexed { index, racer ->
            if (racer.you) {
                racer.copy(progress = you)
            } else {
                // Each simulated racer holds a steady, slightly different pace
                // around the player's, so the field spreads rather than moving
                // as one block.
                val pace = 0.85f + (index * 0.09f)
                racer.copy(progress = (you * pace).coerceIn(0f, 1f))
            }
        },
    )
}
