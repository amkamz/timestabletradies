package com.timestabletradies.ui.grandparent

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTapCard
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.ui.state.StickerChoice
import com.timestabletradies.ui.state.Storyboard

/**
 * I2 · Grandparent — send a sticker.
 *
 * This is the *whole* grandparent app. One screen, one verb.
 *
 * The scope is the design: a grandparent can cheer, and that is all. They
 * cannot see stats, manage billing, link crew or type free text — the message
 * is picked from a preset list, which is what makes the channel safe without
 * anybody having to moderate it. Widening this screen is how a well-meaning
 * feature becomes an unmoderated message inbox pointed at a child.
 */
@Composable
fun StickerSendScreen(
    childName: String,
    milestone: String?,
    stickers: List<StickerChoice> = Storyboard.stickers,
    cheers: List<String> = Storyboard.cheers,
    onSend: (sticker: StickerChoice, cheer: String) -> Unit,
    /**
     * Set when the last send didn't reach the server.
     *
     * `sendSticker` is one of the writes still waiting on an Edge Function
     * (§1.1), so today this is always what happens. Reporting it is the same
     * choice the results screen makes about a run that didn't bank: a
     * confirmation for something that never left the device is worse than an
     * error, because nobody goes looking for a sticker that was never sent.
     */
    sendFailed: Boolean = false,
) {
    var sticker by remember { mutableStateOf(stickers.first()) }
    var cheer by remember { mutableStateOf(cheers.first()) }

    PopFullScreen(backdrop = PopTokens.TealLight) {
        Text("Cheer on $childName", style = PopType.DisplayLarge, color = PopTokens.Ink)

        if (milestone != null) {
            Text(
                text = milestoneLine(childName, milestone),
                style = PopType.Body,
                color = PopTokens.TealDeep,
            )
        }

        PopCard(modifier = Modifier.fillMaxWidth()) {
            Text("PICK A STICKER", style = PopType.Small, color = PopTokens.Mud)
            PopGap(10.dp)
            stickers.chunked(3).forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    row.forEach { choice ->
                        PopTapCard(
                            onClick = { sticker = choice },
                            modifier = Modifier.weight(1f),
                            fill = if (choice == sticker) PopTokens.TealTint else PopTokens.White,
                            borderColor = if (choice == sticker) {
                                PopTokens.Teal
                            } else {
                                PopTokens.Ink
                            },
                            shadow = PopShadow.Small,
                            padding = androidx.compose.foundation.layout.PaddingValues(6.dp),
                            spoken = "${choice.label} sticker" +
                                if (choice == sticker) ", selected" else "",
                        ) {
                            PopArtSlot(
                                label = choice.label,
                                modifier = Modifier.fillMaxWidth().height(56.dp),
                                content = if (choice == sticker) {
                                    PopTokens.TealDeep
                                } else {
                                    PopTokens.Ink
                                },
                            )
                        }
                    }
                    repeat(3 - row.size) { Box(Modifier.weight(1f)) }
                }
                PopGap(10.dp)
            }
        }

        PopCard(modifier = Modifier.fillMaxWidth()) {
            Text("ADD A PRESET CHEER", style = PopType.Small, color = PopTokens.Mud)
            PopGap(10.dp)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                cheers.forEach { option ->
                    val text = option.replace("!", ", $childName!")
                    PopTapCard(
                        onClick = { cheer = option },
                        modifier = Modifier.fillMaxWidth(),
                        fill = if (option == cheer) PopTokens.Yellow else PopTokens.White,
                        shadow = PopShadow.Small,
                        padding = androidx.compose.foundation.layout.PaddingValues(
                            horizontal = 12.dp,
                            vertical = 10.dp,
                        ),
                        spoken = "\"$text\"" + if (option == cheer) ", selected" else "",
                    ) {
                        Text("\"$text\"", style = PopType.Body, color = PopTokens.Ink)
                    }
                }
            }
        }

        if (sendFailed) {
            Text(
                text = "Couldn't reach the site office, so that one didn't send. " +
                    "Try again in a bit.",
                style = PopType.Body,
                color = PopTokens.RedDeep,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { liveRegion = LiveRegionMode.Assertive },
            )
        }

        PopGap(4.dp)

        PopButton(
            text = "SEND STICKER ▸",
            onClick = { onSend(sticker, cheer.replace("!", ", $childName!")) },
            tone = PopTone.Red,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(20.dp)
    }
}

/** "Charlie just hit **Third-Year Apprentice**!" — the one bit of news sent. */
private fun milestoneLine(childName: String, milestone: String): AnnotatedString =
    buildAnnotatedString {
        append("$childName just hit ")
        withStyle(SpanStyle(fontWeight = FontWeight.Black)) { append(milestone) }
        append("!")
    }
