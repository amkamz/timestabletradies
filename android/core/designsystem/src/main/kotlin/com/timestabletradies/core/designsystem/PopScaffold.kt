package com.timestabletradies.core.designsystem

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp

/**
 * The tabbed shell: a screen, and the locked bar underneath it.
 *
 * The wipe is the part worth reading the spec for. Tapping a tab to the *left*
 * brings the new screen in from the left while the current one leaves to the
 * right; tapping to the right mirrors it. Both move together over 260ms, and
 * the bar itself never moves — only the selected cell resizes. That is what
 * makes the bar feel like a slider under a moving deck rather than a strip of
 * buttons that happens to sit at the bottom.
 *
 * The paper fills the whole window, including behind the system bars, while
 * content is inset — so the background reaches the edges with no dead grey
 * strips, but nothing readable ever sits under a bar.
 */
@Composable
fun PopTabScaffold(
    selected: PopTab,
    onSelect: (PopTab) -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable (PopTab) -> Unit,
) {
    val reducedMotion = LocalPopReducedMotion.current

    Box(modifier = modifier.fillMaxSize().popPaper()) {
        Column(Modifier.fillMaxSize()) {
            AnimatedContent(
                targetState = selected,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                label = "tabWipe",
                transitionSpec = {
                    if (reducedMotion) {
                        // The state change still has to land; only the travel
                        // is dropped. A cross-fade at zero duration is an
                        // instant swap without a special code path.
                        androidx.compose.animation.fadeIn(tween(0)) togetherWith
                            androidx.compose.animation.fadeOut(tween(0))
                    } else {
                        val forward = targetState.ordinal > initialState.ordinal
                        val spec = tween<IntOffset>(durationMillis = 260)
                        if (forward) {
                            // Tapped a tab to the right: current exits left,
                            // new one arrives from the right.
                            slideInHorizontally(spec) { it } togetherWith
                                slideOutHorizontally(spec) { -it }
                        } else {
                            slideInHorizontally(spec) { -it } togetherWith
                                slideOutHorizontally(spec) { it }
                        }
                    }
                },
            ) { tab ->
                content(tab)
            }

            // The bar sits above the gesture/navigation inset, and the inset
            // strip below it takes the bar's own resting fill so the screen
            // still reaches the bottom edge.
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(PopTokens.NavRest)
                    .windowInsetsPadding(WindowInsets.navigationBars),
            ) {
                PopNavBar(selected = selected, onSelect = onSelect)
            }
        }
    }
}

/**
 * A tab's own body: paper, a scroll, and safe-area padding at the top only.
 *
 * The bottom is left alone deliberately — [PopTabScaffold] has already reserved
 * the nav bar's height, so padding here as well would leave a gap the child
 * reads as the screen ending early.
 *
 * [header] is the opt-in fixed top. Anything passed there is laid out above the
 * scroll and stays put while [content] moves under it — for a screen whose title
 * and filter belong to the whole list rather than to its first row. A child who
 * has scrolled halfway down the shop should still be able to see which category
 * they are in and how many coins they hold. Leave it null and the screen is a
 * single scroll exactly as before.
 */
@Composable
fun PopTabBody(
    modifier: Modifier = Modifier,
    horizontalPadding: androidx.compose.ui.unit.Dp = 18.dp,
    arrangement: Arrangement.Vertical = Arrangement.spacedBy(12.dp),
    header: (@Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit)? = null,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Column(modifier = modifier.fillMaxSize().windowInsetsPadding(PopInsets.top)) {
        if (header != null) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = horizontalPadding)
                    .padding(top = 16.dp, bottom = 12.dp),
                verticalArrangement = arrangement,
                content = header,
            )
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = horizontalPadding)
                // With a header above, its own bottom padding is already the
                // gap — doubling up here would leave the list floating.
                .padding(top = if (header == null) 16.dp else 0.dp, bottom = 16.dp),
            verticalArrangement = arrangement,
            content = content,
        )
    }
}

/* -------------------------------------------------------------- job header */

/**
 * The header every in-job screen carries: a way out, what you're doing, and how
 * far through you are.
 *
 * The ✕ is always first and always the same size, because a child who wants to
 * stop should never have to look for the exit — and because a timed mode with
 * no visible escape is the kind of thing that gets an education app one-starred
 * by parents.
 */
@Composable
fun PopJobHeader(
    label: String,
    onQuit: () -> Unit,
    modifier: Modifier = Modifier,
    counter: String? = null,
    progress: Float? = null,
    content: Color = PopTokens.White,
    progressFill: Color = PopTokens.Yellow,
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PopButton(
                text = "✕",
                onClick = onQuit,
                tone = PopTone.White,
                size = PopSize.Small,
                shadow = PopShadow.Small,
                modifier = Modifier
                    .size(40.dp)
                    .semantics { contentDescription = "Leave this job" },
            )
            Column(Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(label, style = PopType.Small, color = content)
                    if (counter != null) {
                        Text(counter, style = PopType.Small, color = content)
                    }
                }
                if (progress != null) {
                    PopGap(5.dp)
                    PopProgressBar(
                        progress = progress,
                        height = 12.dp,
                        track = PopTokens.White,
                        fill = progressFill,
                        label = counter?.let { "Progress: $it" },
                    )
                }
            }
        }
    }
}

/**
 * The centred prompt card — the one object present on every question screen.
 *
 * The border colour is the feedback channel: ink at rest, teal on a correct
 * answer, red on a wrong one. Colour is never the only signal, so callers pass
 * the words as well.
 */
@Composable
fun PopPromptCard(
    prompt: String,
    modifier: Modifier = Modifier,
    spoken: String = prompt,
    eyebrow: String? = "WHAT IS",
    borderColor: Color = PopTokens.Ink,
    footer: @Composable (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .popSurface(
                fill = PopTokens.White,
                radius = PopTokens.RadiusLg,
                borderColor = borderColor,
                borderWidth = 4.dp,
            )
            .padding(horizontal = 16.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (eyebrow != null) {
            Text(eyebrow, style = PopType.Small, color = PopTokens.Mud)
        }
        Text(
            text = prompt,
            style = PopType.DisplayLarge,
            color = PopTokens.Ink,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = spoken },
        )
        footer?.invoke()
    }
}
