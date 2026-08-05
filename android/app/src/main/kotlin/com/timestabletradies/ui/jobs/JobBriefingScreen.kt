package com.timestabletradies.ui.jobs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopFullScreen
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopHairline
import com.timestabletradies.core.designsystem.PopNote
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopSpecRow
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.ui.state.JobCard
import com.timestabletradies.ui.state.Storyboard

/**
 * B3 · Job briefing.
 *
 * The last screen before the clock starts, and the point of it is consent: how
 * many questions, how hard, what it pays. A timed mode a child walks into
 * blind is the difference between a challenge and an ambush.
 *
 * The backdrop takes the zone's accent, which is the first appearance of a
 * colour the whole job then keeps — so a child knows they are still in Roofing
 * three screens later without reading a word.
 */
@Composable
fun JobBriefingScreen(
    job: JobCard,
    onStart: () -> Unit,
    onCancel: () -> Unit,
) {
    val accent: Color = job.tableNo?.let { Storyboard.accentFor(it) } ?: PopTokens.Slate

    PopFullScreen(backdrop = accent) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PopButton(
                text = "✕",
                onClick = onCancel,
                tone = PopTone.White,
                size = PopSize.Small,
                shadow = PopShadow.Small,
                modifier = Modifier.semantics { contentDescription = "Back to the board" },
            )
            PopBanner(
                text = job.tableNo
                    ?.let { "${job.zone.uppercase()} · ×$it" }
                    ?: job.zone.uppercase(),
                fill = PopTokens.Ink,
                content = PopTokens.Yellow,
                fontSize = 12.sp,
            )
        }

        PopGap(4.dp)

        Text(job.title, style = PopType.DisplayLarge, color = PopTokens.White)
        Text(
            text = job.summary ?: job.blurb,
            style = PopType.Body,
            color = PopTokens.White.copy(alpha = 0.9f),
        )

        PopCard(modifier = Modifier.fillMaxWidth()) {
            PopSpecRow(label = "Questions", value = "${job.questions}")
            PopGap(8.dp)
            PopHairline()
            PopGap(8.dp)
            PopSpecRow(
                label = "Difficulty",
                value = job.difficulty.label,
                valueColor = job.difficulty.content,
            )
            PopGap(8.dp)
            PopHairline()
            PopGap(8.dp)
            PopSpecRow(label = "Reward") { RewardLine(job.coins, job.timber) }
        }

        // Division opens per table once a full multiply round is finished. Said
        // here rather than as a surprise on the results screen, so the round the
        // child is about to play has a reason attached.
        if (job.divisionNote != null) {
            PopNote(
                text = "✕ ÷  ${job.divisionNote}",
                modifier = Modifier.fillMaxWidth(),
                fill = PopTokens.White.copy(alpha = 0.15f),
                content = PopTokens.White,
                accent = PopTokens.White,
            )
        }

        PopGap(4.dp)

        PopButton(
            text = "CLOCK ON ▸",
            onClick = onStart,
            tone = PopTone.Teal,
            size = PopSize.Large,
            fullWidth = true,
            shadow = PopShadow.Large,
        )

        PopGap(16.dp)
    }
}
