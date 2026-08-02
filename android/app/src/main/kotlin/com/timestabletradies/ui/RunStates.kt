package com.timestabletradies.ui

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopScreen
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.model.AnsweredFact
import com.timestabletradies.core.model.RunResult
import kotlin.math.roundToInt

/** Waiting on `run-start` to build the questions. */
@Composable
fun RunLoading() {
    PopScreen(title = "Getting the job ready…") {
        PopCard(modifier = Modifier.fillMaxWidth()) {
            Text("Fetching your questions", style = PopType.Body, color = PopTokens.Mud)
        }
    }
}

/**
 * `run-start` refused or couldn't be reached.
 *
 * A refusal is meaningful: the server checks entitlement and mode unlocks
 * before handing out a run, so this is also what a locked mode looks like if
 * a client somehow gets past the card (§1.10).
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
 */
internal fun localTally(answers: List<AnsweredFact>): RunResult {
    if (answers.isEmpty()) return RunResult(0, 0, 0, 0, 0, 0)
    val correct = answers.count { it.correct }
    return RunResult(
        correct = correct,
        total = answers.size,
        accuracyPercent = ((correct.toDouble() / answers.size) * 100).roundToInt(),
        averageMs = answers.sumOf { it.elapsedMs } / answers.size,
        coins = 0,
        materials = 0,
    )
}
