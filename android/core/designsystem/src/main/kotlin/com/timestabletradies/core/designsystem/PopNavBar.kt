package com.timestabletradies.core.designsystem

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * The five destinations, in bar order.
 *
 * [Site] is the centre cell and the landing screen, so every other destination
 * is one reach either side of home — which is the whole reason the bar has an
 * odd number of cells and why nothing may be inserted between them.
 */
enum class PopTab(val label: String) {
    Jobs("JOBS"),
    Mastery("MASTERY"),
    Site("THE SITE"),
    Shop("SHOP"),
    Locker("LOCKER"),
}

/** Bar height, from the locked spec. Cells are 50 × 74 at a 280-wide screen. */
val PopNavBarHeight = 74.dp

/**
 * The signed-off tab bar.
 *
 * Built exactly as specced, and the spec is unusually specific because this is
 * the one component a child touches on every screen: five cells that *touch* —
 * no gaps, no padding, no rounded corners, joints 2px. The bar itself never
 * moves or animates off-screen; only the selected cell resizes, which is what
 * makes it feel like a physical slider under a moving deck.
 *
 * Note the deliberate absence of a shadow. Drop shadows in Toolbox Pop mean
 * "this is a thing you can pick up and tap"; the bar is furniture the screen is
 * mounted in, so it gets a hard joint instead.
 */
@Composable
fun PopNavBar(
    selected: PopTab,
    onSelect: (PopTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(PopNavBarHeight)
            .background(PopTokens.NavRest),
    ) {
        PopTab.entries.forEachIndexed { index, tab ->
            NavCell(
                tab = tab,
                live = tab == selected,
                // The joint is drawn on the right edge of every cell but the
                // last, so two adjacent cells share one 2px line rather than
                // stacking two into a 4px seam.
                jointRight = index != PopTab.entries.lastIndex,
                onClick = { onSelect(tab) },
            )
        }
    }
}

@Composable
private fun RowScope.NavCell(
    tab: PopTab,
    live: Boolean,
    jointRight: Boolean,
    onClick: () -> Unit,
) {
    // Resting cells flex 1, the live cell 1.62 — about 50px against 83px. The
    // grow and the shrink share one duration so the pair moves as one gesture.
    val reducedMotion = LocalPopReducedMotion.current
    val target = if (live) 1.62f else 1f
    val animated by animateFloatAsState(
        targetValue = target,
        animationSpec = tween(durationMillis = 180),
        label = "navCellWeight",
    )
    val weight = if (reducedMotion) target else animated

    Column(
        modifier = Modifier
            .weight(weight)
            .fillMaxHeight()
            .background(if (live) PopTokens.NavLive else PopTokens.NavRest)
            .drawNavEdges(live = live, jointRight = jointRight)
            .clickable(role = Role.Tab, onClick = onClick)
            .semantics { selected = live }
            // Resting cells sit low under the taller live one, per the spec.
            .padding(top = if (live) 0.dp else 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        // Placeholder glyphs until the icon set is briefed (§4.7). Decorative:
        // the label underneath is what TalkBack should read, and reading a
        // rounded square out as well would only add noise.
        val iconSize = if (live) 24.dp else 20.dp
        val iconShape = RoundedCornerShape(if (live) 7.dp else 6.dp)
        Box(
            modifier = Modifier
                .size(iconSize)
                .background(if (live) PopTokens.White else PopTokens.NavIcon, iconShape)
                .border(if (live) 2.5.dp else 2.dp, PopTokens.NavJoint, iconShape)
                .clearAndSetSemantics { },
        )
        Spacer(Modifier.height(5.dp))
        Text(
            text = tab.label,
            style = if (live) LiveLabel else RestingLabel,
            color = if (live) PopTokens.White else PopTokens.NavJoint,
            textAlign = TextAlign.Center,
        )
    }
}

private val LiveLabel = TextStyle(
    fontFamily = PopType.Display,
    fontWeight = FontWeight.Normal,
    fontSize = 10.5.sp,
)

private val RestingLabel = TextStyle(
    fontFamily = PopType.Sans,
    fontWeight = FontWeight.Black,
    fontSize = 8.5.sp,
)

/**
 * The joint down the right edge, and the 5px yellow cap on the live cell.
 *
 * Drawn rather than bordered because `Modifier.border` rounds with the shape
 * and paints all four sides; these are two specific square edges.
 */
private fun Modifier.drawNavEdges(live: Boolean, jointRight: Boolean): Modifier =
    drawWithContent {
        drawContent()
        val joint = 2.dp.toPx()
        if (jointRight) {
            drawRect(
                color = PopTokens.NavJoint,
                topLeft = Offset(size.width - joint, 0f),
                size = Size(joint, size.height),
            )
        }
        if (live) {
            // Cap only. The live cell used to draw its own left joint as well,
            // which stacked with the previous cell's right joint into a double
            // line — read as a stray grey border down one side of the selection
            // rather than as the seam between two cells. One joint per gap.
            drawRect(
                color = PopTokens.Yellow,
                topLeft = Offset.Zero,
                size = Size(size.width, 5.dp.toPx()),
            )
        }
    }
