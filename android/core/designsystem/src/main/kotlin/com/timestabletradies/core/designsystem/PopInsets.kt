package com.timestabletradies.core.designsystem

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.calculateEndPadding
import androidx.compose.foundation.layout.calculateStartPadding
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.union
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Where content may live when the system bars are hidden.
 *
 * The app runs immersive, so `WindowInsets.statusBars` collapses to zero the
 * moment the bars go away — and content laid out against that lands underneath
 * the punch-hole camera. The bars being gone does not move the camera.
 *
 * So the top inset is the largest of three things:
 *
 * - the status bar, when it is showing
 * - the **display cutout**, which is there whether the bars are or not
 * - a floor of [MinTopInset], so a phone that reports no cutout still keeps
 *   readable content off the very top edge
 *
 * **Backgrounds are exempt on purpose.** Sky, ground, paper and the deck all
 * still run edge to edge — this is about anything the eye is meant to land on.
 * A layout that inset its own background would leave dead strips at the top of
 * every screen, which is the thing edge-to-edge exists to avoid.
 */
object PopInsets {

    /** Enough to clear a hole-punch on phones that report no cutout at all. */
    val MinTopInset: Dp = 28.dp

    /** Keeps the gesture bar from sitting on top of a tap target. */
    val MinBottomInset: Dp = 8.dp

    val top: WindowInsets
        @Composable get() = WindowInsets.statusBars
            .union(WindowInsets.displayCutout)
            .union(WindowInsets(top = MinTopInset))

    val bottom: WindowInsets
        @Composable get() = WindowInsets.navigationBars
            .union(WindowInsets(bottom = MinBottomInset))

    /** Both, plus the cutout's side insets for a phone held in landscape. */
    val content: WindowInsets
        @Composable get() = top.union(bottom)
}

/**
 * Pad content clear of the bars, the cutout and the bottom gesture area.
 *
 * Use this on the *content* of a screen, never on the surface drawing its
 * background.
 */
@Composable
fun Modifier.popSafeContentPadding(): Modifier =
    this.padding(PopInsets.content.asPaddingValues())

/** Top and sides only — for screens that own their own bottom edge. */
@Composable
fun Modifier.popSafeTopPadding(): Modifier {
    val direction = LocalLayoutDirection.current
    val values = PopInsets.top.asPaddingValues()
    return this.padding(
        start = values.calculateStartPadding(direction),
        end = values.calculateEndPadding(direction),
        top = values.calculateTopPadding(),
    )
}
