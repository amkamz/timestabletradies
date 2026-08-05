package com.timestabletradies.ui.modes

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopTabBody
import com.timestabletradies.core.designsystem.PopTag
import com.timestabletradies.core.designsystem.PopTapCard
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.ui.state.ZoneRow
import com.timestabletradies.ui.state.ZoneState

/**
 * C1 · Trade Zones.
 *
 * Every table is a trade, in curriculum order rather than numerical order —
 * ×1, ×2, ×10, ×5 … — because that is the order the maths actually gets
 * learned in (`DEFAULT_UNLOCK_ORDER`).
 *
 * **Locked zones are shown, never hidden**, and what they say is a progression
 * goal, never a price. A free player sees "Ask a grown-up to open more trades";
 * the word *subscription* exists only above the gate, in the parent dashboard.
 * That is the whole paywall, and it is what keeps money structurally absent
 * from the student app (§1.8, §1.10).
 */
@Composable
fun TradeZonesScreen(
    zones: List<ZoneRow>,
    atCeiling: Boolean,
    onPlay: (ZoneRow) -> Unit,
    onAskGrownUp: () -> Unit,
) {
    PopTabBody {
        PopBanner(text = "TRADE ZONES", fill = PopTokens.Teal)

        zones.forEach { zone ->
            when (zone.state) {
                ZoneState.Locked -> LockedZone(zone, onAskGrownUp)
                else -> OpenZone(zone) { onPlay(zone) }
            }
        }

        // The capstone and the post-grid zones, shown as horizon rather than as
        // content — a child should know the game keeps going.
        PopCard(
            modifier = Modifier.fillMaxWidth(),
            fill = PopTokens.Ink,
        ) {
            Text("🔒 ×12 SITE MANAGEMENT", style = PopType.Title, color = PopTokens.Yellow)
            Text(
                "Capstone — mixes every trade",
                style = PopType.Small,
                color = PopTokens.Stone,
            )
        }
        PopCard(
            modifier = Modifier.fillMaxWidth(),
            fill = PopTokens.Slate,
        ) {
            Text("🔒 ×13+ NEW ZONES", style = PopType.Title, color = PopTokens.TealLight)
            Text(
                "Unlock once the 12×12 grid is all blue",
                style = PopType.Small,
                color = PopTokens.Stone,
            )
        }

        if (atCeiling) {
            PopTapCard(
                onClick = onAskGrownUp,
                modifier = Modifier.fillMaxWidth(),
                fill = PopTokens.YellowTint,
                spoken = "You've opened every trade here. Ask a grown-up to open more.",
            ) {
                Text(
                    "You've opened every trade here",
                    style = PopType.Title,
                    color = PopTokens.Ink,
                )
                Text(
                    "Ask a grown-up if you want more trades to work on.",
                    style = PopType.Small,
                    color = PopTokens.Mud,
                )
            }
        }

        PopGap(24.dp)
    }
}

@Composable
private fun OpenZone(zone: ZoneRow, onClick: () -> Unit) {
    val done = zone.state == ZoneState.Fluent
    PopTapCard(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        spoken = "${zone.trade}, times ${zone.table}, " +
            if (done) "fully fluent" else "${zone.fluencyPercent} percent fluent",
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            ZoneBadge(
                label = "×${zone.table}",
                fill = if (done) PopTokens.Teal else PopTokens.Yellow,
                content = if (done) PopTokens.White else PopTokens.Ink,
            )
            Column(Modifier.weight(1f)) {
                Text(zone.trade, style = PopType.Title, color = PopTokens.Ink)
                Text(
                    text = if (done) {
                        "×${zone.table} · fully fluent"
                    } else {
                        "×${zone.table} · ${zone.fluencyPercent}% fluent"
                    },
                    style = PopType.Small,
                    color = PopTokens.Mud,
                )
            }
            if (done) {
                ZoneBadge(label = "✓", fill = PopTokens.Teal, content = PopTokens.White)
            } else {
                PopTag(text = "PLAY", fill = PopTokens.Red, content = PopTokens.White)
            }
        }
    }
}

/**
 * A locked zone.
 *
 * Muted, still readable, still tappable — tapping it opens the "ask a grown-up"
 * path rather than doing nothing. A dead control teaches a child the app is
 * broken; a control that explains itself teaches them what to ask for.
 */
@Composable
private fun LockedZone(zone: ZoneRow, onAskGrownUp: () -> Unit) {
    PopTapCard(
        onClick = onAskGrownUp,
        modifier = Modifier.fillMaxWidth(),
        fill = PopTokens.SandPanel,
        borderColor = PopTokens.SandPale,
        shadow = PopShadow.Small,
        spoken = "${zone.trade}, times ${zone.table}, locked. " +
            "Ask a grown-up to open more trades.",
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            ZoneBadge(
                label = "🔒",
                fill = PopTokens.SandFill,
                content = PopTokens.Sand,
                borderColor = PopTokens.SandPale,
            )
            Column(Modifier.weight(1f)) {
                Text(zone.trade, style = PopType.Title, color = PopTokens.Sand)
                Text(
                    "×${zone.table} · locked",
                    style = PopType.Small,
                    color = PopTokens.SandLight,
                )
            }
        }
    }
}

@Composable
private fun ZoneBadge(
    label: String,
    fill: androidx.compose.ui.graphics.Color,
    content: androidx.compose.ui.graphics.Color,
    borderColor: androidx.compose.ui.graphics.Color = PopTokens.Ink,
) {
    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier = Modifier
            .size(42.dp)
            .background(fill, shape)
            .border(2.5.dp, borderColor, shape),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = PopType.Small, color = content, modifier = Modifier.padding(2.dp))
    }
}
