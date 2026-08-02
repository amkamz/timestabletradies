package com.timestabletradies.core.designsystem

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
            Key(
                label = "✓",
                spokenLabel = "Check answer",
                onClick = onSubmit,
                enabled = enabled,
                fill = PopTokens.Teal,
                content = PopTokens.White,
                modifier = Modifier.weight(1f),
            )
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
    val press by rememberPopPressOffset(interactionSource)

    Box(
        modifier = modifier
            .offset(x = press, y = press)
            .popSurface(fill = if (enabled) fill else PopTokens.SandFill)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = onClick,
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
