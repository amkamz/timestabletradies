package com.timestabletradies.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.LocalPopReducedMotion
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopKeypad
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popPaper
import com.timestabletradies.core.designsystem.popSurface
import com.timestabletradies.core.model.AnsweredFact
import com.timestabletradies.core.model.Question
import com.timestabletradies.core.model.RunConfig
import kotlinx.coroutines.delay

/** How long the correct/wrong flash stays up before the next question. */
private const val FEEDBACK_MS = 700L

/**
 * The core loop: a question, a keypad, feedback, repeat.
 *
 * Timing is measured here but proves nothing on its own — every reward is
 * recomputed server-side from the answer log (§0.2), so these numbers are for
 * the child, not for the economy.
 */
@Composable
fun RunScreen(
    config: RunConfig,
    onFinished: (List<AnsweredFact>) -> Unit,
    onQuit: () -> Unit,
) {
    var index by remember { mutableIntStateOf(0) }
    var typed by remember { mutableStateOf("") }
    var feedback by remember { mutableStateOf<Feedback?>(null) }
    var streak by remember { mutableIntStateOf(0) }
    val answers = remember { mutableListOf<AnsweredFact>().toMutableStateList() }

    // Started from an effect rather than during composition — reading the
    // clock while rendering makes the value depend on when recomposition
    // happens to run.
    var questionStartedAt by remember { mutableLongStateOf(0L) }
    var secondsLeft by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(index) {
        questionStartedAt = System.currentTimeMillis()
        typed = ""
        secondsLeft = config.timerSeconds
    }

    val question = config.questions.getOrNull(index)

    // Advance after the feedback flash, so a child sees what happened.
    LaunchedEffect(feedback) {
        val current = feedback ?: return@LaunchedEffect
        delay(FEEDBACK_MS)
        feedback = null
        if (current.wasLast) onFinished(answers.toList()) else index += 1
    }

    if (question == null) {
        // Every question answered; the effect above is about to hand over.
        Box(Modifier.fillMaxSize().popPaper())
        return
    }

    fun record(value: Int?) {
        if (feedback != null) return
        val correct = value != null && value == question.answer
        val elapsed = System.currentTimeMillis() - questionStartedAt

        answers += AnsweredFact(
            questionId = question.id,
            a = question.a,
            b = question.b,
            operation = question.operation,
            answer = value,
            // Local, and only so the card can flash. The server marks the run.
            correct = correct,
            elapsedMs = elapsed,
        )
        streak = if (correct) streak + 1 else 0
        feedback = Feedback(
            correct = correct,
            shown = question.answer,
            wasLast = index == config.questions.lastIndex,
        )
    }

    fun submit() {
        if (feedback != null || typed.isEmpty()) return
        record(typed.toIntOrNull() ?: return)
    }

    // The clock. Running out records an unanswered question rather than a
    // wrong one — the server sees `answer = null`, which is honest: the child
    // didn't get it wrong, they ran out of time.
    LaunchedEffect(index, feedback) {
        if (feedback != null) return@LaunchedEffect
        var remaining = config.timerSeconds ?: return@LaunchedEffect
        while (remaining > 0) {
            delay(1000)
            remaining -= 1
            secondsLeft = remaining
        }
        record(null)
    }

    Box(Modifier.fillMaxSize().popPaper()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            RunHeader(
                label = config.label,
                index = index,
                total = config.questions.size,
                streak = streak,
                secondsLeft = secondsLeft,
                onQuit = onQuit,
            )

            QuestionCard(question = question, typed = typed, feedback = feedback)

            Spacer(Modifier.height(2.dp))

            PopKeypad(
                onDigit = { digit -> if (typed.length < 4) typed += digit },
                onBackspace = { typed = typed.dropLast(1) },
                onSubmit = ::submit,
                enabled = feedback == null,
            )
        }
    }
}

private data class Feedback(val correct: Boolean, val shown: Int, val wasLast: Boolean)

@Composable
private fun RunHeader(
    label: String,
    index: Int,
    total: Int,
    streak: Int,
    secondsLeft: Int?,
    onQuit: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text(label, style = PopType.Title, color = PopTokens.Ink)
                Text(
                    text = "Question ${index + 1} of $total",
                    style = PopType.Small,
                    color = PopTokens.Mud,
                )
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (secondsLeft != null) {
                    // Turns red in the last three seconds. Colour isn't the
                    // only signal — the number itself is the information.
                    Text(
                        text = "${secondsLeft}s",
                        style = PopType.Title,
                        color = if (secondsLeft <= 3) PopTokens.RedDeep else PopTokens.Mud,
                        modifier = Modifier.semantics {
                            contentDescription = "$secondsLeft seconds left"
                        },
                    )
                }
                if (streak >= 2) {
                    Text(
                        text = "🔥 $streak",
                        style = PopType.Title,
                        color = PopTokens.AmberDeep,
                        modifier = Modifier.semantics {
                            contentDescription = "$streak in a row"
                        },
                    )
                }
                PopButton(
                    text = "✕",
                    onClick = onQuit,
                    tone = PopTone.White,
                    size = PopSize.Small,
                    shadow = PopShadow.Small,
                )
            }
        }
        ProgressBar(progress = index.toFloat() / total.coerceAtLeast(1))
    }
}

@Composable
private fun ProgressBar(progress: Float) {
    val reducedMotion = LocalPopReducedMotion.current
    val animated by animateFloatAsState(
        targetValue = progress,
        label = "runProgress",
    )
    val shown = if (reducedMotion) progress else animated

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(14.dp)
            .popSurface(
                fill = PopTokens.White,
                radius = PopTokens.RadiusSm,
                shadow = PopShadow.Small,
            )
            .padding(3.dp),
    ) {
        Box(
            Modifier
                .fillMaxWidth(shown.coerceIn(0f, 1f))
                .height(8.dp)
                .background(PopTokens.Teal, RoundedCornerShape(PopTokens.RadiusSm)),
        )
    }
}

/**
 * The prompt, the typed answer, and the feedback flash.
 *
 * Feedback is colour *and* words — "Nice!" / "7 × 8 = 56" — because colour is
 * never the only signal, and because a child who got it wrong needs to see the
 * right answer, not just that they missed.
 */
@Composable
private fun QuestionCard(question: Question, typed: String, feedback: Feedback?) {
    val fill = when {
        feedback == null -> PopTokens.White
        feedback.correct -> PopTokens.TealTint
        else -> PopTokens.RedTint
    }

    PopCard(
        modifier = Modifier.fillMaxWidth(),
        fill = fill,
        shadow = PopShadow.Large,
    ) {
        Text(
            text = question.prompt,
            style = PopType.DisplayLarge,
            color = PopTokens.Ink,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .semantics { contentDescription = question.spoken },
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .popSurface(
                    fill = PopTokens.Paper,
                    radius = PopTokens.RadiusSm,
                    shadow = PopShadow.Small,
                )
                .padding(vertical = 14.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = typed.ifEmpty { "—" },
                style = PopType.Numeric,
                color = if (typed.isEmpty()) PopTokens.Stone else PopTokens.Ink,
            )
        }

        if (feedback != null) {
            Spacer(Modifier.height(10.dp))
            Text(
                text = if (feedback.correct) "Nice!" else "${question.prompt} = ${feedback.shown}",
                style = PopType.Title,
                color = if (feedback.correct) PopTokens.TealDeep else PopTokens.RedDeep,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    // Announced without stealing focus from the keypad.
                    .semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
    }
}
