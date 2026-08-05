package com.timestabletradies.ui.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.hazardStripe

/**
 * A1 · Welcome — first launch.
 *
 * Two doors and nothing else. "Start a new site" is the parent path and goes
 * straight to the grown-up gate; "I already have one" is a returning family and
 * goes to sign-in. There is deliberately no third option: a child who opens the
 * app on a fresh install has nothing they can do alone, and pretending
 * otherwise would only strand them.
 */
@Composable
fun WelcomeScreen(
    onNewSite: () -> Unit,
    onExistingSite: () -> Unit,
) {
    Box(Modifier.fillMaxSize()) {
        PopFullScreen(backdrop = PopTokens.Teal, scrollable = true) {
            // The hazard stripe is the app's one piece of pure signage — it says
            // "site" before a single word is read.
            Box(Modifier.fillMaxWidth().height(18.dp).hazardStripe())

            PopGap(18.dp)

            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = "TIMES TABLE",
                    style = PopType.DisplayMedium,
                    color = PopTokens.White,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = "TRADIE",
                    style = PopType.DisplayLarge,
                    color = PopTokens.Yellow,
                    textAlign = TextAlign.Center,
                )
            }

            PopGap(10.dp)

            PopArtSlot(
                label = "HERO TRADIE\n+ TOOLBELT\nART",
                modifier = Modifier.fillMaxWidth().height(230.dp),
                content = PopTokens.White,
            )

            PopGap(14.dp)

            PopButton(
                text = "START A NEW SITE",
                onClick = onNewSite,
                tone = PopTone.Red,
                size = PopSize.Large,
                sub = "A grown-up sets this up",
                fullWidth = true,
                shadow = PopShadow.Large,
            )
            PopButton(
                text = "I ALREADY HAVE ONE",
                onClick = onExistingSite,
                tone = PopTone.White,
                size = PopSize.Large,
                fullWidth = true,
            )

            PopGap(20.dp)
        }
    }
}
