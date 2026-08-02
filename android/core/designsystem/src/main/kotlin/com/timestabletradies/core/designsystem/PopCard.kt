package com.timestabletradies.core.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * A panel. The workhorse container — job cards, mode cards, results.
 */
@Composable
fun PopCard(
    modifier: Modifier = Modifier,
    fill: Color = PopTokens.White,
    shadow: PopShadow = PopShadow.Medium,
    padding: PaddingValues = PaddingValues(16.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .popSurface(fill = fill, radius = PopTokens.RadiusMd, shadow = shadow)
            .padding(padding),
        content = content,
    )
}

/**
 * The paper background, with its dot grid.
 *
 * The web app draws this with a repeating radial-gradient in `globals.css`;
 * here it's a `drawBehind` pass, which is cheaper than a tiled bitmap and
 * scales with density for free.
 */
fun Modifier.popPaper(
    fill: Color = PopTokens.Paper,
    dot: Color = PopTokens.PaperDot,
): Modifier = this
    .background(fill)
    .drawBehind {
        val spacing = 22.dp.toPx()
        val radius = 1.6.dp.toPx()
        var y = spacing / 2
        while (y < size.height) {
            var x = spacing / 2
            while (x < size.width) {
                drawCircle(color = dot, radius = radius, center = Offset(x, y))
                x += spacing
            }
            y += spacing
        }
    }

/**
 * The app frame: paper, dots, a title, and a scrolling body.
 *
 * Scrolling is on the screen rather than each card so long content behaves the
 * same everywhere, and so the dot grid stays fixed behind it.
 *
 * The paper deliberately fills the whole window — including behind the status
 * bar and the navigation bar — while the *content* is inset to the safe area.
 * That is the point of drawing edge to edge: the background reaches the edges
 * so there are no dead grey strips, but nothing readable or tappable ever sits
 * under a system bar.
 */
@Composable
fun PopScreen(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(modifier = modifier.fillMaxSize().popPaper()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                // Insets before the scroll, so the scrollable region itself
                // stops short of the bars rather than sliding content beneath
                // them. `safeDrawing` also covers display cutouts and the
                // keyboard, which matters on the sign-in screen.
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(text = title, style = PopType.DisplayLarge, color = PopTokens.Ink)
                if (subtitle != null) {
                    Text(text = subtitle, style = PopType.Body, color = PopTokens.Mud)
                }
            }
            content()
        }
    }
}
