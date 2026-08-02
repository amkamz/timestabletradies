package com.timestabletradies.core.designsystem

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The hard offset shadow, drawn by hand.
 *
 * `Modifier.shadow` is elevation-based: it always blurs, and on Android there
 * is no non-blurred elevation at all. Toolbox Pop's shadow is a solid ink
 * rectangle offset down and right with zero blur, so it gets drawn directly.
 *
 * Drawn *behind* the content and inset by nothing — the offset rect is the
 * same size as the surface, which is what makes the shape read as a sticker
 * lifted off the page rather than a soft drop shadow.
 */
fun Modifier.popShadow(
    shadow: PopShadow,
    radius: Dp,
    color: Color = PopTokens.Ink,
): Modifier = drawBehind {
    drawRoundRect(
        color = color,
        topLeft = Offset(shadow.x.toPx(), shadow.y.toPx()),
        size = Size(size.width, size.height),
        cornerRadius = CornerRadius(radius.toPx()),
    )
}

/**
 * The full Toolbox Pop surface treatment: hard shadow, 3px ink border, fill.
 *
 * Every card, button and panel in the app is this plus content, which is why
 * it is one modifier rather than three repeated everywhere.
 */
fun Modifier.popSurface(
    fill: Color,
    radius: Dp = PopTokens.RadiusMd,
    shadow: PopShadow = PopShadow.Medium,
    borderColor: Color = PopTokens.Ink,
    borderWidth: Dp = PopTokens.BorderWidth,
): Modifier = this
    .popShadow(shadow, radius, borderColor)
    .background(fill, RoundedCornerShape(radius))
    .border(borderWidth, borderColor, RoundedCornerShape(radius))

/**
 * The `pop-press` motion: the surface drops into its own shadow when held.
 *
 * Gated on the accessibility preference — a child who set reduced motion, in
 * the app or at OS level, gets the state change without the travel. See
 * [LocalPopReducedMotion].
 */
@Composable
fun rememberPopPressOffset(
    interactionSource: MutableInteractionSource,
    shadow: PopShadow = PopShadow.Medium,
    reducedMotion: Boolean = LocalPopReducedMotion.current,
): State<Dp> {
    val pressed by interactionSource.collectIsPressedAsState()
    val target = if (pressed && !reducedMotion) shadow.y else 0.dp
    return animateDpAsState(targetValue = target, label = "popPress")
}

/** Convenience for call sites that only need a source to hand to a modifier. */
@Composable
fun rememberPopInteractionSource(): MutableInteractionSource =
    remember { MutableInteractionSource() }
