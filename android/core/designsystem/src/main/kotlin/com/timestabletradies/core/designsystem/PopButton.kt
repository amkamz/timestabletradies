package com.timestabletradies.core.designsystem

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Toolbox Pop's button tones — ported from the `TONE` map in `pop.tsx`.
 */
enum class PopTone(val fill: Color, val content: Color) {
    Red(PopTokens.Red, PopTokens.White),
    Teal(PopTokens.Teal, PopTokens.White),
    Yellow(PopTokens.Yellow, PopTokens.Ink),
    White(PopTokens.White, PopTokens.Ink),
    Ink(PopTokens.Ink, PopTokens.Yellow),
    Blue(PopTokens.Blue, PopTokens.White),
}

/** Sizes, matching the Tailwind scale `pop.tsx` uses. */
enum class PopSize(
    val padding: PaddingValues,
    val radius: Dp,
    val fontSize: androidx.compose.ui.unit.TextUnit,
) {
    /** px-3 py-2 text-sm rounded-xl */
    Small(PaddingValues(horizontal = 12.dp, vertical = 8.dp), PopTokens.RadiusSm, 14.sp),

    /** px-4 py-3 text-base rounded-2xl */
    Medium(PaddingValues(horizontal = 16.dp, vertical = 12.dp), PopTokens.RadiusMd, 16.sp),

    /** px-5 py-4 text-lg rounded-2xl */
    Large(PaddingValues(horizontal = 20.dp, vertical = 16.dp), PopTokens.RadiusMd, 18.sp),
}

/**
 * The button every screen is built from.
 *
 * Presses drop the surface into its own shadow rather than fading it, which is
 * the whole feel of the design — and is why this is a real clickable with a
 * button role rather than a styled box: TalkBack has to announce it correctly.
 */
@Composable
fun PopButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tone: PopTone = PopTone.Teal,
    size: PopSize = PopSize.Medium,
    /** Second line, smaller, beneath the label. */
    sub: String? = null,
    fullWidth: Boolean = false,
    enabled: Boolean = true,
    shadow: PopShadow = PopShadow.Medium,
) {
    val interactionSource = rememberPopInteractionSource()
    val press by rememberPopPressOffset(interactionSource, shadow)

    Column(
        modifier = modifier
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
            .offset(x = press, y = press)
            .popSurface(
                fill = if (enabled) tone.fill else PopTokens.Stone,
                radius = size.radius,
                shadow = shadow,
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = onClick,
            )
            .padding(size.padding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = text,
            // Titan One has one weight — see PopType. Asking for Black here
            // would get a synthesised fake.
            style = TextStyle(
                fontFamily = PopType.Display,
                fontWeight = FontWeight.Normal,
                fontSize = size.fontSize,
            ),
            color = tone.content,
            textAlign = TextAlign.Center,
        )
        if (sub != null) {
            Text(
                text = sub,
                style = PopType.Small,
                color = tone.content.copy(alpha = 0.85f),
                textAlign = TextAlign.Center,
            )
        }
    }
}

/**
 * A small non-interactive label — mastery stages, difficulty, zone names.
 *
 * Deliberately not a button: chips in this app report state, they don't invite
 * a tap, and giving them a button role would make TalkBack promise something
 * that doesn't happen.
 */
@Composable
fun PopChip(
    text: String,
    modifier: Modifier = Modifier,
    fill: Color = PopTokens.White,
    content: Color = PopTokens.Ink,
    glyph: String? = null,
) {
    Column(modifier = modifier.popSurface(fill, PopTokens.RadiusSm, PopShadow.Small)) {
        Text(
            text = if (glyph != null) "$glyph  $text" else text,
            style = PopType.Small,
            color = content,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
        )
    }
}
