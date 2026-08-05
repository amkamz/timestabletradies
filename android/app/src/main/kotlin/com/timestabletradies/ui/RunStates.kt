package com.timestabletradies.ui

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopLoadingScreen
import com.timestabletradies.core.designsystem.PopScreen
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.model.AnsweredFact
import com.timestabletradies.core.model.RunResult
import kotlin.math.roundToInt

/**
 * Waiting on `run-start` to build the questions.
 *
 * Wears the run's own backdrop rather than paper, so the briefing hands
 * straight over to the job instead of bouncing the child through the app's
 * background colour on the way — see [PopLoadingScreen].
 */
@Composable
fun RunLoading(backdrop: Color) {
    PopLoadingScreen(backdrop = backdrop, title = "GETTING THE JOB READY")
}

/**
 * The other end of the same trip: the log has gone to `run-finish` and the
 * results screen is waiting on the server's verdict.
 *
 * Also the guard on the last question. `onFinished` posts and *then* navigates,
 * so without this the finished board would sit there live and answerable for a
 * whole round trip — an eleventh question in a ten-question job.
 */
@Composable
fun RunBanking(backdrop: Color) {
    PopLoadingScreen(backdrop = backdrop, title = "WRITING UP THE JOB")
}

/**
 * `run-start` refused or couldn't be reached.
 *
 * A refusal is meaningful: the server checks entitlement and mode unlocks
 * before handing out a run, so this is also what a locked mode looks like if a
 * client somehow gets past the card (§1.10).
 *
 * **[message] must be text this app wrote.** Never pass a throwable's message
 * through: Ktor composes its exception text from the failed request, headers
 * included, so a raw message renders the session's bearer token full-screen.
 */
@Composable
fun RunStartFailed(message: String, onBack: () -> Unit) {
    PopScreen(title = "Can't start that one") {
        PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.SandPanel) {
            Text(message, style = PopType.Body, color = PopTokens.Ink)
        }
        PopButton(
            text = "Back to the shed",
            onClick = onBack,
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
        )
    }
}

/**
 * Local tally, shown only when the run couldn't be banked.
 *
 * Never presented as if it had saved — coins stay at zero because the server
 * never awarded any. It exists so a dropped connection doesn't end a session
 * with a blank screen.
 *
 * **First attempt per question, and the rest dropped.** Measure Up lets a child
 * retry a pair they got wrong, so the log can carry a question twice; scoring
 * both would put a run's total above the number of questions it asked, and
 * scoring the last would quietly turn every retried miss into a hit. This is
 * the same rule `run-finish` applies server-side, and the two must not disagree
 * — the only difference between the numbers here and the real ones should be
 * that these never banked.
 */
internal fun localTally(answers: List<AnsweredFact>): RunResult {
    val counted = answers.distinctBy { it.questionId }
    if (counted.isEmpty()) return RunResult(0, 0, 0, 0, 0, 0)
    val correct = counted.count { it.correct }
    return RunResult(
        correct = correct,
        total = counted.size,
        accuracyPercent = ((correct.toDouble() / counted.size) * 100).roundToInt(),
        averageMs = counted.sumOf { it.elapsedMs } / counted.size,
        coins = 0,
        materials = 0,
    )
}
