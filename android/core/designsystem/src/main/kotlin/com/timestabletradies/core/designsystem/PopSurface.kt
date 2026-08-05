package com.timestabletradies.core.designsystem

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * ## The shadow rule
 *
 * **Only buttons have shadows.** Not cards, not panels, not banners, not
 * fields, not the nav bar, not a progress well. A hard offset shadow down and
 * to the right is this design's single affordance for "you can press this", and
 * the moment anything else borrows it the affordance stops meaning anything.
 *
 * If you are reaching for [popShadow] on something that does not respond to a
 * tap, the answer is no.
 */

/**
 * The hard offset shadow, drawn by hand.
 *
 * `Modifier.shadow` is elevation-based: it always blurs, and on Android there
 * is no non-blurred elevation at all. Toolbox Pop's shadow is a solid ink
 * rectangle offset down and right with zero blur, so it gets drawn directly.
 *
 * [retreat] is the press. At 0 the shadow sits at its full offset; at 1 it has
 * collapsed to nothing under the surface — see [popPressSurface] for why that
 * is the whole trick.
 */
fun Modifier.popShadow(
    shadow: PopShadow,
    radius: Dp,
    color: Color = PopTokens.Ink,
    retreat: Float = 0f,
): Modifier = drawBehind {
    val left = (1f - retreat).coerceIn(0f, 1f)
    drawRoundRect(
        color = color,
        topLeft = Offset(shadow.x.toPx() * left, shadow.y.toPx() * left),
        size = Size(size.width, size.height),
        cornerRadius = CornerRadius(radius.toPx()),
    )
}

/**
 * A plain surface: fill and a 3px ink border. **No shadow.**
 *
 * Every card, panel and well in the app is this plus content. Buttons are
 * [popPressSurface] instead.
 */
fun Modifier.popSurface(
    fill: Color,
    radius: Dp = PopTokens.RadiusMd,
    borderColor: Color = PopTokens.Ink,
    borderWidth: Dp = PopTokens.BorderWidth,
): Modifier = this
    .background(fill, RoundedCornerShape(radius))
    .border(borderWidth, borderColor, RoundedCornerShape(radius))

/**
 * A button surface: fill, border, shadow, and the press.
 *
 * The press is the reason this exists as one modifier rather than three. The
 * surface travels *into* its own shadow — it moves down and right by exactly
 * the shadow's offset while the shadow simultaneously collapses to nothing — so
 * the button ends flush with the page, the way a real key bottoms out. Moving
 * the surface and its shadow together (which is what happens if you compose
 * `offset` and `popShadow` independently) slides the whole sticker sideways
 * instead, and reads as a bug.
 *
 * Gated on reduced motion: a child who turned motion down still gets the state
 * change, without the travel (§2.7).
 */
@Composable
fun Modifier.popPressSurface(
    interactionSource: MutableInteractionSource,
    fill: Color,
    radius: Dp = PopTokens.RadiusMd,
    shadow: PopShadow = PopShadow.Medium,
    borderColor: Color = PopTokens.Ink,
    borderWidth: Dp = PopTokens.BorderWidth,
): Modifier {
    val press by rememberPopPressFraction(interactionSource)
    return this
        .offset(x = shadow.x * press, y = shadow.y * press)
        .popShadow(shadow, radius, borderColor, retreat = press)
        .background(fill, RoundedCornerShape(radius))
        .border(borderWidth, borderColor, RoundedCornerShape(radius))
}

/**
 * How far into its shadow a pressed surface has travelled — 0 at rest, 1 held.
 *
 * A fraction rather than a distance so one value can drive both halves of the
 * effect: the surface's offset and the shadow's collapse have to stay exactly
 * in step or the button appears to slide rather than depress.
 */
@Composable
fun rememberPopPressFraction(
    interactionSource: MutableInteractionSource,
    reducedMotion: Boolean = LocalPopReducedMotion.current,
): State<Float> {
    val pressed by interactionSource.collectIsPressedAsState()
    val target = if (pressed) 1f else 0f
    // Reduced motion still depresses — it just arrives rather than travels.
    return if (reducedMotion) {
        rememberUpdatedState(target)
    } else {
        animateFloatAsState(
            targetValue = target,
            // Snappy on the way down, a touch softer coming back. A spring here
            // overshoots and makes a key feel spongy; the whole point of the
            // travel is to confirm the tap landed, and confirmation late is
            // confirmation wasted.
            animationSpec = tween(durationMillis = if (target == 1f) 45 else 110),
            label = "popPress",
        )
    }
}

/** Convenience for call sites that only need a source to hand to a modifier. */
@Composable
fun rememberPopInteractionSource(): MutableInteractionSource =
    remember { MutableInteractionSource() }
