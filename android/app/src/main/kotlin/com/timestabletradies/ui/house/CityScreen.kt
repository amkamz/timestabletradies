package com.timestabletradies.ui.house

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timestabletradies.core.designsystem.PopBanner
import com.timestabletradies.core.designsystem.PopButton
import com.timestabletradies.core.designsystem.PopCard
import com.timestabletradies.core.designsystem.PopGap
import com.timestabletradies.core.designsystem.PopInsets
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopSize
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopTone
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.godot.CityLayout
import com.timestabletradies.godot.GodotCityView
import androidx.compose.foundation.layout.windowInsetsPadding

/**
 * Sparky's City — the 3D town, with every control in Compose on top of it.
 *
 * **This is tier 1 from `docs/native/rescope.md`.** Godot draws the pixels and
 * owns nothing else: the back button, the level readout and the building panel
 * are real Compose nodes, so TalkBack traverses them exactly as it does on
 * every other screen. The city itself is a single labelled node — a picture,
 * which is what it is.
 *
 * That split is not decoration. A Godot surface is one unlabelled `SurfaceView`
 * to a screen reader; nothing inside it can be reached by swiping, explored by
 * touch, or given a focus order. Keeping the controls out of it is the only
 * arrangement where this screen stays usable without sight.
 *
 * When [engineAvailable] is false the city is replaced by a plain card rather
 * than a black rectangle. That happens when `city.pck` never made it into
 * assets — `godot/export-pck.ps1` was not run — and a screen that says so is
 * worth more than one that silently shows nothing.
 */
@Composable
fun CityScreen(
    cityName: String,
    level: Int,
    gridSize: Int,
    engineAvailable: Boolean,
    layout: CityLayout,
    palette: List<BuildPiece>,
    /** Encodes a layout into the JSON the engine is sent. */
    encode: (CityLayout) -> String,
    onLayoutChanged: (CityLayout) -> Unit,
    onBack: () -> Unit,
    onShop: () -> Unit,
) {
    // Which square the child last touched. Held here rather than in the engine
    // because the engine reports *which* square and this decides what that
    // means — the split that keeps every control a Compose node.
    var selectedCell by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    var selectedPiece by remember { mutableStateOf<String?>(null) }

    Box(Modifier.fillMaxSize()) {
        if (engineAvailable) {
            GodotCityView(
                modifier = Modifier.fillMaxSize(),
                contentDescription =
                    "$cityName, level $level. A $gridSize by $gridSize town. " +
                        "Drag to turn it.",
                state = { encode(layout) },
                onCellTouched = { x, z ->
                    selectedCell = x to z
                    // A block in hand goes down where you tapped; an empty hand
                    // just selects the square so it can be turned or cleared.
                    selectedPiece?.let { key ->
                        onLayoutChanged(layout.place(key, x, z))
                    }
                },
            )
        } else {
            Box(
                modifier = Modifier.fillMaxSize().semantics {
                    contentDescription = "The city could not be loaded"
                },
                contentAlignment = Alignment.Center,
            ) {
                PopCard(modifier = Modifier.padding(24.dp)) {
                    Text(
                        "The city isn't packed yet",
                        style = PopType.Title,
                        color = PopTokens.Ink,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    PopGap(6.dp)
                    Text(
                        "Run godot/export-pck.ps1 and build again.",
                        style = PopType.Small,
                        color = PopTokens.Mud,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }

        // The chrome, composited over the engine's surface.
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .windowInsetsPadding(PopInsets.content)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                PopButton(
                    text = "‹",
                    onClick = onBack,
                    tone = PopTone.White,
                    size = PopSize.Small,
                    shadow = PopShadow.Small,
                    modifier = Modifier.semantics { contentDescription = "Back to the site" },
                )
                PopBanner(
                    text = "LEVEL $level",
                    fill = PopTokens.Yellow,
                    content = PopTokens.Ink,
                )
            }
        }

        // The building panel rises from the bottom. Empty for now — placement
        // is the next piece, and it lands here rather than inside the engine so
        // that tapping a piece and tapping a cell stays a Compose interaction
        // with a real focus order (docs/native/vision.md).
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .windowInsetsPadding(PopInsets.content)
                .padding(horizontal = 14.dp, vertical = 12.dp),
        ) {
            BuildPanel(
                pieces = palette,
                selectedPiece = selectedPiece,
                selectedCell = selectedCell,
                occupantName = selectedCell?.let { (x, z) ->
                    layout.at(x, z)?.key?.let { key ->
                        palette.firstOrNull { it.key == key }?.name ?: key
                    }
                },
                onPickPiece = { selectedPiece = it },
                onRotate = {
                    selectedCell?.let { (x, z) -> onLayoutChanged(layout.rotateAt(x, z)) }
                },
                onRemove = {
                    selectedCell?.let { (x, z) -> onLayoutChanged(layout.removeAt(x, z)) }
                },
            )

            PopGap(10.dp)

            PopButton(
                text = "GET MORE BLOCKS",
                onClick = onShop,
                tone = PopTone.Red,
                size = PopSize.Large,
                sub = "Spend bricks in the shop",
                fullWidth = true,
                shadow = PopShadow.Large,
            )
        }
    }
}
