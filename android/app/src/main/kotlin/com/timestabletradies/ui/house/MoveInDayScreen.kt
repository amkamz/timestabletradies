package com.timestabletradies.ui.house

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType

/**
 * D5 · Move-in Day.
 *
 * The end of a build, which in a product measured in months of practice is the
 * longest arc a child completes. It gets a full screen with no nav bar and its
 * own sky, because everything else in the app is a step and this is an arrival.
 *
 * Two exits, and both matter: start a fresh block, or walk the street of houses
 * already finished. The street is the record of everything they have done, and
 * a game that only ever points forward throws that away.
 */
@Composable
fun MoveInDayScreen(
    houseName: String,
    housesFinished: Int,
    onSeeTheStreet: () -> Unit,
    onStartNewBuild: () -> Unit,
) {
    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    0.0f to Color(0xFFAEE0FF),
                    0.55f to Color(0xFFDFF3FF),
                    0.551f to Color(0xFFC8EFB6),
                    1.0f to Color(0xFFC8EFB6),
                ),
            ),
    ) {
        PopFullScreen(backdrop = Color.Transparent) {
            PopGap(14.dp)

            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                PopBanner(
                    text = "MOVE-IN DAY!",
                    fill = PopTokens.Yellow,
                    content = PopTokens.Ink,
                )

                PopArtSlot(
                    label = "FINISHED HOUSE ART\n+ tradie out front\n+ bunting/balloons",
                    modifier = Modifier.fillMaxWidth().height(240.dp),
                    content = Color(0xFF2A5A2A),
                )

                Text(
                    text = "The ${houseName.lowercase()} is done!",
                    style = PopType.DisplayMedium,
                    color = PopTokens.InkSoft,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = "All 8 stages built. Start a fresh block, or tour the street " +
                        "of houses you've finished.",
                    style = PopType.Body,
                    color = Color(0xFF4A6A3A),
                    textAlign = TextAlign.Center,
                )
            }

            PopGap(8.dp)

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PopButton(
                    text = "SEE THE STREET",
                    onClick = onSeeTheStreet,
                    tone = PopTone.White,
                    size = PopSize.Large,
                    sub = if (housesFinished > 1) "$housesFinished houses" else null,
                    modifier = Modifier.weight(1f),
                )
                PopButton(
                    text = "START A NEW BUILD",
                    onClick = onStartNewBuild,
                    tone = PopTone.Red,
                    size = PopSize.Large,
                    modifier = Modifier.weight(1f),
                    shadow = PopShadow.Large,
                )
            }

            PopGap(24.dp)
        }
    }
}
