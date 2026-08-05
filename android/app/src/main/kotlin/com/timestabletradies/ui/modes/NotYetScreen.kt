package com.timestabletradies.ui.modes

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType

/**
 * A mode the server offers that this client cannot play yet.
 *
 * It exists so that the honest answer has somewhere to go. Before it, an
 * unhandled mode key fell through to a generic keypad run and the server
 * obligingly served ten plain questions, so four different games were one
 * identical drill under four names — and nothing on either side treated that
 * as a problem.
 *
 * The tone matters as much as the fact. A child has tapped something they were
 * shown and are allowed to play; being told "not here yet, try it on the web"
 * is a fair answer, and being quietly given a different game is not.
 */
@Composable
fun NotOnAndroidYetScreen(modeName: String, onBack: () -> Unit) {
    PopFullScreen(backdrop = PopTokens.TealPale) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            PopCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "🚧",
                    style = PopType.DisplayLarge,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                PopGap(10.dp)
                Text(
                    text = "$modeName isn't on the tools yet",
                    style = PopType.Title,
                    color = PopTokens.Ink,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                PopGap(8.dp)
                Text(
                    text = "We're still building this one for your phone. " +
                        "Everything else on the board is ready to go.",
                    style = PopType.Small,
                    color = PopTokens.Mud,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            PopGap(20.dp)

            PopButton(
                text = "BACK TO THE SHED",
                onClick = onBack,
                tone = PopTone.Red,
                size = PopSize.Large,
                shadow = PopShadow.Large,
            )
        }
    }
}
