package com.timestabletradies.core.designsystem

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import kotlinx.coroutines.launch
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * The number keypad — ported from `src/components/play/keypad.tsx`.
 *
 * Three columns, digits 1–9, then backspace / 0 / check. Every key is a real
 * clickable with a button role and a spoken label, because the two symbol keys
 * (⌫ and ✓) would otherwise be announced as punctuation or skipped entirely.
 */
@Composable
fun PopKeypad(
    onDigit: (Char) -> Unit,
    onBackspace: () -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    /**
     * Hide the ✓ key when the screen already carries its own submit.
     *
     * Site Delivery's "DELIVER IT" is the same action under a name that belongs
     * to the scenario, and offering both would give a child two buttons for one
     * decision — the exact thing a keypad exists to avoid.
     */
    showSubmit: Boolean = true,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        listOf(
            listOf('1', '2', '3'),
            listOf('4', '5', '6'),
            listOf('7', '8', '9'),
        ).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { digit ->
                    Key(
                        label = digit.toString(),
                        onClick = { onDigit(digit) },
                        enabled = enabled,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Key(
                label = "⌫",
                spokenLabel = "Delete last digit",
                onClick = onBackspace,
                enabled = enabled,
                fill = PopTokens.Bone,
                modifier = Modifier.weight(1f),
            )
            Key(
                label = "0",
                onClick = { onDigit('0') },
                enabled = enabled,
                modifier = Modifier.weight(1f),
            )
            if (showSubmit) {
                Key(
                    label = "✓",
                    spokenLabel = "Check answer",
                    onClick = onSubmit,
                    enabled = enabled,
                    fill = PopTokens.Teal,
                    content = PopTokens.White,
                    modifier = Modifier.weight(1f),
                )
            } else {
                Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun Key(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    spokenLabel: String? = null,
    fill: Color = PopTokens.White,
    content: Color = PopTokens.Ink,
) {
    val interactionSource = rememberPopInteractionSource()

    // The flash. A key that only moves is easy to miss on a fast tap — the
    // travel is 45ms and a child's thumb is already gone. The colour lingers
    // and decays instead, so the confirmation outlasts the gesture.
    val reducedMotion = LocalPopReducedMotion.current
    val flash = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = modifier
            .popPressSurface(
                interactionSource = interactionSource,
                fill = when {
                    !enabled -> PopTokens.SandFill
                    // Toward the flash colour by however much is left of it.
                    else -> lerp(fill, PopTokens.Yellow, flash.value)
                },
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = {
                    if (!reducedMotion) {
                        scope.launch {
                            flash.snapTo(1f)
                            flash.animateTo(0f, tween(durationMillis = 260))
                        }
                    }
                    onClick()
                },
            )
            .then(
                // The glyph keys need a spoken label; the digits already read
                // correctly, so they keep their own text as the description.
                if (spokenLabel != null) {
                    Modifier.semantics { contentDescription = spokenLabel }
                } else {
                    Modifier
                }
            )
            .padding(vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = TextStyle(
                fontFamily = PopType.Display,
                fontWeight = FontWeight.Normal,
                fontSize = 22.sp,
            ),
            color = if (enabled) content else PopTokens.Stone,
            modifier = if (spokenLabel != null) Modifier.clearAndSetSemantics { } else Modifier,
        )
    }
}
