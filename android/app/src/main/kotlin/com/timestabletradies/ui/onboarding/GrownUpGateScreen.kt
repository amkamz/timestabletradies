package com.timestabletradies.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopKeypad
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import kotlin.random.Random

/**
 * A2 · Grown-up gate.
 *
 * Stands in front of account setup, billing, crew links and any external link —
 * Apple's Kids Category requires it and reviewers test it (§4.5).
 *
 * Two things about it are load-bearing:
 *
 * **It is generated locally and must work offline** (§1.4). A parent on a plane
 * who cannot reach the settings that turn a timer off is a support ticket, and
 * a gate that fails open is not a gate.
 *
 * **The factors sit outside what the app teaches.** The product covers up to
 * ×12, so a 13–18 × 12–17 challenge is a speed bump a child cannot clear with
 * the very fluency the app is building in them. It is not a security boundary —
 * nothing here protects data, RLS does — it is an age check.
 */
@Composable
fun GrownUpGateScreen(
    onPassed: () -> Unit,
    onCancel: () -> Unit,
    /** What sits on the other side, so the copy can say why. */
    reason: String = "Setting up, adding crew and anything to do with money is " +
        "done by a parent. Ask them to key in the answer.",
) {
    // Re-rolled on every wrong answer, so guessing gains nothing and a child
    // watching over a shoulder can't reuse what they just saw.
    var challenge by remember { mutableStateOf(newGateChallenge()) }
    var typed by remember { mutableStateOf("") }
    var wrong by remember { mutableIntStateOf(0) }

    PopFullScreen(backdrop = PopTokens.Paper) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End,
        ) {
            PopButton(
                text = "✕",
                onClick = onCancel,
                tone = PopTone.White,
                size = PopSize.Small,
                shadow = PopShadow.Small,
                modifier = Modifier.semantics { contentDescription = "Go back" },
            )
        }

        PopGap(6.dp)

        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(62.dp)
                    .background(PopTokens.Yellow, CircleShape)
                    .border(PopTokens.BorderWidth, PopTokens.Ink, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text("!", style = PopType.DisplayMedium, color = PopTokens.Ink)
            }

            Text(
                text = "Grab a grown-up",
                style = PopType.DisplayMedium,
                color = PopTokens.Ink,
                textAlign = TextAlign.Center,
            )
            Text(
                text = reason,
                style = PopType.Small,
                color = PopTokens.Mud,
                textAlign = TextAlign.Center,
            )
        }

        PopGap(4.dp)

        PopCard(
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("WHAT IS", style = PopType.Small, color = PopTokens.Mud)
                Text(
                    text = "${challenge.a} × ${challenge.b}",
                    style = PopType.DisplayLarge,
                    color = PopTokens.Ink,
                    modifier = Modifier.semantics {
                        contentDescription = "${challenge.a} times ${challenge.b}"
                    },
                )
                PopGap(6.dp)
                Text(
                    text = typed.ifEmpty { "?" },
                    style = PopType.Numeric,
                    color = if (typed.isEmpty()) PopTokens.SandLight else PopTokens.Ink,
                )
            }
        }

        if (wrong > 0) {
            Text(
                text = "Not quite — here's another one.",
                style = PopType.Small,
                color = PopTokens.RedDeep,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { liveRegion = LiveRegionMode.Polite },
            )
        }

        PopKeypad(
            onDigit = { d -> if (typed.length < 4) typed += d },
            onBackspace = { typed = typed.dropLast(1) },
            onSubmit = {
                when {
                    typed.isEmpty() -> Unit
                    typed.toIntOrNull() == challenge.answer -> onPassed()
                    else -> {
                        wrong += 1
                        typed = ""
                        challenge = newGateChallenge()
                    }
                }
            },
        )

        Box(Modifier.height(12.dp))
    }
}

/** One gate challenge. Mirrors `newGateChallenge()` in `lib/game/seed.ts`. */
data class GateChallenge(val a: Int, val b: Int) {
    val answer: Int get() = a * b
}

/**
 * 13–18 × 12–17.
 *
 * Deliberately above the ×12 ceiling the product teaches: a child who has
 * mastered everything the app has to offer still cannot answer it, which is the
 * only property that makes an age gate an age gate.
 */
fun newGateChallenge(random: Random = Random.Default): GateChallenge =
    GateChallenge(a = random.nextInt(13, 19), b = random.nextInt(12, 18))
