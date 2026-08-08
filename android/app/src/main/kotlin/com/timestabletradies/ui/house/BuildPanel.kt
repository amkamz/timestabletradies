package com.timestabletradies.ui.house

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTapCard
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType

/** Something a child can put on a square. */
data class BuildPiece(val key: String, val name: String)

/**
 * The building panel, and the whole of placement.
 *
 * **Tap a piece, then tap a square.** That is the primary route and it is the
 * only one a screen reader or a switch device can take — dragging is never
 * required (WCAG 2.2 SC 2.5.7, and the standing rule in
 * `docs/native/vision.md`). A drag onto the city can be added later *on top of*
 * this; it must never replace it.
 *
 * Every control here is a Compose node, deliberately. The engine reports which
 * square was touched and draws the result; nothing about what a touch means
 * lives inside a surface that TalkBack cannot enter.
 */
@Composable
fun BuildPanel(
    pieces: List<BuildPiece>,
    selectedPiece: String?,
    selectedCell: Pair<Int, Int>?,
    occupantName: String?,
    onPickPiece: (String?) -> Unit,
    onRotate: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        // What the tapped square holds, and what can be done to it. Only shown
        // once a square is chosen, because before that there is nothing to say.
        if (selectedCell != null) {
            val (x, z) = selectedCell
            PopCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = occupantName ?: "Empty square",
                    style = PopType.Title,
                    color = PopTokens.Ink,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics {
                            contentDescription = "Square ${x + 1}, ${z + 1}. " +
                                (occupantName?.let { "$it here." } ?: "Empty.")
                        },
                )

                if (occupantName != null) {
                    PopGap(8.dp)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PopButton(
                            text = "TURN",
                            onClick = onRotate,
                            tone = PopTone.White,
                            size = PopSize.Small,
                            modifier = Modifier.weight(1f),
                        )
                        PopButton(
                            text = "CLEAR",
                            onClick = onRemove,
                            tone = PopTone.White,
                            size = PopSize.Small,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
            PopGap(10.dp)
        }

        Text(
            text = if (selectedPiece == null) {
                "Pick a block, then tap a square."
            } else {
                "Now tap a square to put it down."
            },
            style = PopType.Small,
            color = PopTokens.Ink,
            modifier = Modifier.padding(bottom = 6.dp),
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            for (piece in pieces) {
                val picked = piece.key == selectedPiece
                PopTapCard(
                    // Tapping the chosen piece again puts it back, so a child
                    // who changed their mind is not stuck holding a block.
                    onClick = { onPickPiece(if (picked) null else piece.key) },
                    modifier = Modifier.width(96.dp),
                    fill = if (picked) PopTokens.Yellow else PopTokens.White,
                    shadow = if (picked) PopShadow.Medium else PopShadow.Small,
                    spoken = if (picked) "${piece.name}, chosen" else piece.name,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = piece.name,
                            style = PopType.Small,
                            color = PopTokens.Ink,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .semantics { selected = picked },
                        )
                    }
                }
            }
        }
    }
}
