package com.timestabletradies.ui.settings

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopBanner
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
 * What a grown-up sees after clearing the gate from a locked trade.
 *
 * Not in the storyboard, because the storyboard's parent surfaces (H1–H9) are
 * all desktop web. Something has to be here: a gate that opens onto the student
 * picker is a door to nowhere, and the child-side path — "ask a grown-up to open
 * more trades" — has to arrive somewhere that answers the question.
 *
 * ## Why there is no price and no button
 *
 * Advertising or linking to a web purchase *from inside the app* is the part of
 * store policy that has moved repeatedly since 2024 and differs by storefront
 * (§2.9). The plan's answer is that the purchase surface is **server-driven per
 * storefront** — the app asks the backend whether to show IAP, IAP plus an
 * external link, or nothing at all.
 *
 * That backend does not exist yet, so this screen renders the conservative
 * option: it says where trades are opened and stops. Hardcoding a link-out or a
 * price now would be building exactly the thing §2.9 says not to hardcode, and
 * it would have to be unpicked before review.
 */
@Composable
fun MoreTradesScreen(onDone: () -> Unit) {
    PopFullScreen(backdrop = PopTokens.Paper) {
        PopBanner(text = "FOR A GROWN-UP", fill = PopTokens.Ink, content = PopTokens.Yellow)

        Text("Opening more trades", style = PopType.DisplayMedium, color = PopTokens.Ink)

        PopCard(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "Each trade is a times table. Three are open from the start — " +
                    "×1, ×2 and ×10 — and they're the first three steps of the " +
                    "curriculum, in order.",
                style = PopType.Body,
                color = PopTokens.Ink,
            )
            PopGap(10.dp)
            Text(
                text = "The rest are managed from your parent dashboard, along with " +
                    "progress, crew links and billing. Nothing to do with money " +
                    "ever appears in the part of the app your child uses.",
                style = PopType.Small,
                color = PopTokens.Mud,
            )
        }

        PopCard(modifier = Modifier.fillMaxWidth(), fill = PopTokens.TealWash) {
            Text("In the meantime", style = PopType.Title, color = PopTokens.TealDeep)
            Text(
                text = "Everything already open still counts — every mode, the whole " +
                    "mastery grid, the house, and the crew.",
                style = PopType.Small,
                color = PopTokens.Mud,
            )
        }

        PopGap(4.dp)

        PopButton(
            text = "BACK TO THE SITE",
            onClick = onDone,
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(20.dp)
    }
}
