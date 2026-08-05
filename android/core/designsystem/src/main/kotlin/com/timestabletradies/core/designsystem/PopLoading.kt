package com.timestabletradies.core.designsystem

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

/** One block's whole up-and-down, including the pause before it goes again. */
private const val CycleMs = 900

/** How far apart the three blocks start, which is what makes it a wave. */
private const val StaggerMs = 130

private val BlockWidth = 26.dp
private val BlockHeight = 18.dp
private val BlockLift = 16.dp

/**
 * The screen between two phases of a job.
 *
 * ## Why there is one at all
 *
 * Both seams in the loop are network round trips — `run-start` deals the
 * questions before the first one can be shown, and `run-finish` marks the log
 * before results exist. Neither is instant, and the honest choice is to say so
 * rather than freeze the previous screen and hope. A frozen screen reads as a
 * broken tap; a screen that is visibly *doing something* reads as a moment.
 *
 * ## Why it wears the job's colour
 *
 * The backdrop is the run's own — the zone accent, inspection red, boss teal.
 * Dropping to paper between the briefing and the first question would make the
 * child cross two thresholds to start one job. Holding the colour makes this
 * the same room with the lights still coming up.
 *
 * The caller holds it for a minimum beat (see `PhaseHoldMs` in `TradiesApp`) so
 * a fast reply doesn't flash it for three frames, which looks like a glitch
 * rather than a transition.
 */
@Composable
fun PopLoadingScreen(
    backdrop: Color,
    title: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(backdrop)
            .semantics(mergeDescendants = true) {
                contentDescription = title
                // Announced when it arrives, without stealing focus from
                // whatever the child had been touching.
                liveRegion = LiveRegionMode.Polite
            },
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            LoadingBlocks()
            // On a pill rather than straight onto the backdrop: a job's accent
            // can be yellow, and there is no one text colour that reads on
            // yellow *and* on inspection red.
            PopBanner(text = title, fill = PopTokens.White, content = PopTokens.Ink)
        }
    }
}

/**
 * Three blocks being stacked, over and over.
 *
 * Deliberately not a spinner: a spinner says "the machine is busy", and this
 * screen is meant to say "your job is being got ready". Same wait, different
 * thing to be told about it — and it costs nothing to draw with tokens the app
 * already owns.
 */
@Composable
private fun LoadingBlocks() {
    val reducedMotion = LocalPopReducedMotion.current
    val transition = rememberInfiniteTransition(label = "popLoading")
    val shape = RoundedCornerShape(4.dp)

    Row(
        modifier = Modifier.height(BlockHeight + BlockLift),
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        repeat(3) { index ->
            // Always animated, even when the value is thrown away — a
            // conditional `animateFloat` would change the composable call
            // sequence the moment the preference flipped.
            val lift by transition.animateFloat(
                initialValue = 0f,
                targetValue = 0f,
                animationSpec = infiniteRepeatable(
                    animation = keyframes {
                        durationMillis = CycleMs
                        0f at 0 using FastOutSlowInEasing
                        1f at 230 using FastOutSlowInEasing
                        0f at 460
                    },
                    initialStartOffset = StartOffset(index * StaggerMs),
                ),
                label = "block$index",
            )
            Box(
                Modifier
                    .offset(y = -BlockLift * (if (reducedMotion) 0f else lift))
                    .size(width = BlockWidth, height = BlockHeight)
                    .background(if (index == 1) PopTokens.Yellow else PopTokens.White, shape)
                    .border(2.5.dp, PopTokens.Ink, shape),
            )
        }
    }
}
