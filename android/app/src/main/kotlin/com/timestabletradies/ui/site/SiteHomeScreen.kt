package com.timestabletradies.ui.site

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.GenericShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.timestabletradies.core.designsystem.PopArtSlot
import com.timestabletradies.core.designsystem.PopCoin
import com.timestabletradies.core.designsystem.PopInsets
import com.timestabletradies.core.designsystem.PopProgressBar
import com.timestabletradies.core.designsystem.PopReadout
import com.timestabletradies.core.designsystem.PopShadow
import com.timestabletradies.core.designsystem.PopTimber
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.designsystem.PopType
import com.timestabletradies.core.designsystem.popPressSurface
import com.timestabletradies.core.designsystem.rememberPopInteractionSource
import com.timestabletradies.ui.state.SiteState

/**
 * B1 · The Site — the home screen.
 *
 * **This one is signed off and built exactly to the spec** — which is why it is
 * the only screen in the app that does its own arithmetic instead of using the
 * shared spacing scale.
 *
 * ## Design pixels, not dp
 *
 * The spec's canvas is 280 × 634. Treating those numbers as dp reproduces the
 * *layout* and destroys the *composition*: on a 412dp-wide phone the house art
 * covers 47% of the width instead of 70%, and the deck's contents shrink to a
 * third of the deck, leaving the buttons stranded in a field of ground.
 *
 * So every dimension below is a **design pixel** scaled by [DesignScope.px] —
 * `w / 280`. That reproduces the signed-off screen at any size with the same
 * aspect, which is what "build exactly as specced" has to mean on hardware the
 * spec was not drawn at.
 *
 * Type is scaled the same way and still passes through `sp`, so the
 * accessibility text scale keeps multiplying on top of it (see `PopTheme`).
 *
 * ## Two rules that are easy to break later
 *
 * - **Drop shadows only ever appear on tappable elements.** The progress well
 *   and the HUD read-outs have none; the cog, START WORK and the two mode
 *   buttons do.
 * - **The ground runs behind the deck.** That is why the deck can be
 *   translucent at all, and why it must not be given its own opaque fill.
 */
@Composable
fun SiteHomeScreen(
    state: SiteState,
    onStartWork: () -> Unit,
    onBossBattle: () -> Unit,
    onCrewRace: () -> Unit,
    onSettings: () -> Unit,
    onHouse: () -> Unit,
    onShop: () -> Unit,
) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        // Captured out of the constraints scope: the layers below are nested in
        // a plain Box, which shadows this receiver.
        val h = maxHeight
        val w = maxWidth
        val d = DesignScope(w / CANVAS_W)

        Box(Modifier.fillMaxSize().background(PopTokens.TealPale)) {

            /* ------------------------------------------------- the landscape */

            // Sky y0–230, hill ellipse at y186 bleeding 30 past both edges,
            // ground from y262 down — and the ground is drawn full height so the
            // deck can sit over it translucently.
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(h * SKY_END)
                    .background(
                        Brush.verticalGradient(listOf(PopTokens.SkyTop, PopTokens.SkyBottom)),
                    ),
            )
            // The horizon. It runs well past both edges — otherwise the ends of
            // the ellipse curve back into view and it reads as a green lozenge
            // sitting on the ground rather than the far side of a paddock.
            //
            // `requiredWidth`, not `width`: a child of a Box is measured against
            // the parent's constraints, so a plain `width` wider than the screen
            // is silently clamped back to it — and the offset then shoves the
            // whole ellipse off to the left instead of centring an oversized one.
            Box(
                Modifier
                    .align(Alignment.TopCenter)
                    .offset(y = h * HILL_TOP)
                    .requiredWidth(w * (1f + HILL_BLEED * 2f))
                    .height(h * HILL_HEIGHT)
                    .background(PopTokens.Hill, EllipseShape),
            )
            Box(
                Modifier
                    .offset(y = h * GROUND_TOP)
                    .fillMaxSize()
                    .background(PopTokens.Ground),
            )

            // House art 196 × 198 centred at y104; tradie 62 × 96 at x16 / y212.
            PopArtSlot(
                label = "HOUSE ART\n@ ${state.stageName.uppercase()} STAGE\n(fills as kid earns)",
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .offset(y = h * HOUSE_TOP)
                    .width(d.px(196))
                    .height(d.px(198))
                    .clickable(role = Role.Button, onClick = onHouse),
                radius = d.px(14),
            )
            PopArtSlot(
                label = "TRADIE",
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .offset(x = d.px(16), y = h * TRADIE_TOP)
                    .width(d.px(62))
                    .height(d.px(96)),
                radius = d.px(11),
            )

            /* -------------------------------------------------------- the HUD */

            // Floats over the site art, never over the deck, and belongs to this
            // screen alone — it does not persist across tabs.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .windowInsetsPadding(PopInsets.top)
                    .padding(d.px(14)),
                verticalAlignment = Alignment.Top,
            ) {
                SettingsCog(d = d, onClick = onSettings)
                Row(
                    // Equal shares of whatever is left beside the cog. Fixed
                    // widths overflow the row on a narrow phone and the last
                    // pill gets squeezed — and a set of three read-outs where
                    // one is visibly smaller looks like a bug, not a layout.
                    modifier = Modifier.weight(1f).padding(start = d.px(8)),
                    horizontalArrangement = Arrangement.spacedBy(d.px(6)),
                ) {
                    PopReadout(
                        value = formatCoins(state.coins),
                        spoken = "${state.coins} coins. Opens the shop.",
                        modifier = Modifier.weight(1f),
                        icon = { PopCoin(size = d.px(17)) },
                        onClick = onShop,
                    )
                    PopReadout(
                        value = "${state.timber}",
                        spoken = "${state.timber} loads of timber",
                        modifier = Modifier.weight(1f),
                        icon = { PopTimber(width = d.px(17), height = d.px(12)) },
                    )
                    PopReadout(
                        value = "🔥 ${state.streakDays}",
                        spoken = "${state.streakDays} day streak",
                        modifier = Modifier.weight(1f),
                        fill = PopTokens.Yellow,
                    )
                }
            }

            /* ------------------------------------------------------- the deck */

            // y336 down to 74 above the bottom — which is exactly where the nav
            // bar starts, so the deck's floor is the bar's ceiling.
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(h * (1f - DECK_TOP))
                    .background(PopTokens.Deck)
                    .padding(
                        start = d.px(14),
                        end = d.px(14),
                        top = d.px(16),
                        bottom = d.px(12),
                    ),
                verticalArrangement = Arrangement.spacedBy(d.px(10)),
            ) {
                HouseProgress(
                    d = d,
                    title = "${state.houseName.uppercase()} · ${state.stageName.uppercase()}",
                    percent = state.housePercent,
                    onClick = onHouse,
                    // Weights, not intrinsic heights. The three children fill the
                    // deck in the spec's own proportions — roughly 45 : 63 : 48 —
                    // at whatever height the deck ends up being.
                    modifier = Modifier.weight(45f),
                )

                StartWorkButton(
                    d = d,
                    jobsToday = state.jobsToday,
                    onClick = onStartWork,
                    modifier = Modifier.weight(63f),
                )

                Row(
                    modifier = Modifier.weight(48f),
                    horizontalArrangement = Arrangement.spacedBy(d.px(10)),
                ) {
                    DeckButton(
                        d = d,
                        line1 = "BOSS",
                        line2 = "BATTLE",
                        fill = PopTokens.Teal,
                        enabled = state.bossReady,
                        onClick = onBossBattle,
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                    )
                    DeckButton(
                        d = d,
                        line1 = "CREW",
                        line2 = "RACE",
                        fill = PopTokens.Blue,
                        onClick = onCrewRace,
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                    )
                }
            }
        }
    }
}

/* ------------------------------------------------------------- geometry */

/** The spec's canvas width. Every fixed dimension below is relative to it. */
private val CANVAS_W = 280.dp

/**
 * A true ellipse — the horizon.
 *
 * The spec's `border-radius: 50%` on a 340 × 120 box is elliptical: CSS gives
 * each corner a radius of half the width *horizontally* and half the height
 * *vertically*. `RoundedCornerShape(percent = 50)` cannot express that — it
 * takes one radius from the shorter side, which on a wide, shallow box draws a
 * stadium and reads as a green rectangle rather than a hill.
 */
private val EllipseShape = GenericShape { size, _ ->
    addOval(Rect(0f, 0f, size.width, size.height))
}

// Fractions of the 634-tall spec canvas. Changing one changes the signed-off
// screen, so they are named rather than inlined.
private const val SKY_END = 230f / 634f
private const val HILL_TOP = 186f / 634f
private const val HILL_HEIGHT = 120f / 634f

/** How far past each edge the horizon runs, as a fraction of the width. */
private const val HILL_BLEED = 0.45f
private const val GROUND_TOP = 262f / 634f
private const val HOUSE_TOP = 104f / 634f
private const val TRADIE_TOP = 212f / 634f
private const val DECK_TOP = 336f / 634f

/**
 * A design pixel, scaled to this device.
 *
 * `d.px(196)` is "196 units on the 280-wide canvas the spec was drawn on".
 * Wrapping it in a value class rather than passing a bare `Float` keeps the
 * call sites reading as the spec's own numbers.
 */
@JvmInline
private value class DesignScope(private val scale: Float) {
    /** A length from the spec, in dp for this device. */
    fun px(units: Int): Dp = (units * scale).dp

    /**
     * A length from the spec as a text size.
     *
     * Deliberately `sp` and not `dp`: `PopTheme` folds the child's text-scale
     * preference into the density's `fontScale`, so this stays responsive to
     * the accessibility setting while still starting from the design's size.
     */
    fun sp(units: Double) = (units * scale).sp
}

/* --------------------------------------------------------------- pieces */

/**
 * The progress well.
 *
 * The spec says "not tappable, so no shadow" — and it is right that it should
 * not look tappable. It is still made to open the house, because a progress bar
 * a child watches for days and cannot follow is a dead end; the affordance is
 * the destination it names, not a raised surface.
 */
@Composable
private fun HouseProgress(
    d: DesignScope,
    title: String,
    percent: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(d.px(13))
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(PopTokens.DeckWell, shape)
            .border(d.px(3), PopTokens.DeckBorder, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics(mergeDescendants = true) {
                contentDescription = "$title, $percent percent. Opens the house project."
            }
            .padding(horizontal = d.px(12), vertical = d.px(8)),
        verticalArrangement = Arrangement.Center,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(d.px(8)),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = title,
                style = deckLabel(d, 11.5),
                color = PopTokens.DeckTitle,
                // A long house name must not push the percentage off the row —
                // the percentage is the number the child is actually watching.
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Text(text = "$percent%", style = deckLabel(d, 11.5), color = PopTokens.DeckPercent)
        }
        Spacer(Modifier.height(d.px(5)))
        PopProgressBar(
            progress = percent / 100f,
            height = d.px(12),
            track = PopTokens.DeckWellTrack,
            fill = PopTokens.Teal,
            borderColor = PopTokens.DeckBorder,
            borderWidth = d.px(2),
        )
    }
}

/** The one primary action on the home screen. Red, biggest, hardest shadow. */
@Composable
private fun StartWorkButton(
    d: DesignScope,
    jobsToday: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val interactionSource = rememberPopInteractionSource()
    val radius = d.px(17)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .popPressSurface(
                interactionSource = interactionSource,
                fill = PopTokens.Red,
                radius = radius,
                shadow = PopShadow.Hero,
                borderWidth = d.px(3),
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                role = Role.Button,
                onClick = onClick,
            )
            .semantics(mergeDescendants = true) {
                contentDescription = "Start work. $jobsToday jobs on the board today."
            }
            .padding(d.px(13)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "START WORK",
            style = TextStyle(
                fontFamily = PopType.Display,
                fontWeight = FontWeight.Normal,
                fontSize = d.sp(23.0),
            ),
            color = PopTokens.White,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(d.px(3)))
        Text(
            text = "$jobsToday JOBS ON THE BOARD TODAY",
            style = TextStyle(
                fontFamily = PopType.Sans,
                fontWeight = FontWeight.Black,
                fontSize = d.sp(10.5),
            ),
            color = PopTokens.RedTint,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun DeckButton(
    d: DesignScope,
    line1: String,
    line2: String,
    fill: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val interactionSource = rememberPopInteractionSource()
    val radius = d.px(15)

    Column(
        modifier = modifier
            .popPressSurface(
                interactionSource = interactionSource,
                fill = if (enabled) fill else PopTokens.Stone,
                radius = radius,
                shadow = PopShadow.Medium,
                borderWidth = d.px(3),
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = onClick,
            )
            .semantics(mergeDescendants = true) {
                contentDescription = if (enabled) {
                    "$line1 $line2"
                } else {
                    "$line1 $line2. Finish a trade to open this."
                }
            }
            .padding(horizontal = d.px(8), vertical = d.px(10)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        val style = TextStyle(
            fontFamily = PopType.Display,
            fontWeight = FontWeight.Normal,
            fontSize = d.sp(14.0),
        )
        Text(line1, style = style, color = PopTokens.White, textAlign = TextAlign.Center)
        Text(line2, style = style, color = PopTokens.White, textAlign = TextAlign.Center)
    }
}

/** 38 × 38 top-left. Tappable, so unlike the read-outs it keeps its shadow. */
@Composable
private fun SettingsCog(d: DesignScope, onClick: () -> Unit) {
    val interactionSource = rememberPopInteractionSource()
    val radius = d.px(12)

    Box(
        modifier = Modifier
            .size(d.px(38))
            .popPressSurface(
                interactionSource = interactionSource,
                fill = PopTokens.White,
                radius = radius,
                shadow = PopShadow.Small,
                borderWidth = d.px(3),
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                role = Role.Button,
                onClick = onClick,
            )
            .semantics { contentDescription = "Settings" },
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier
                .size(d.px(15))
                .clip(CircleShape)
                .border(d.px(4), PopTokens.Ink, CircleShape),
        )
    }
}

/** Titan One at a design-pixel size — the deck's own label style. */
private fun deckLabel(d: DesignScope, units: Double) = TextStyle(
    fontFamily = PopType.Display,
    fontWeight = FontWeight.Normal,
    fontSize = d.sp(units),
)

/** 1,240 rather than 1240 — four digits is where a child stops reading it. */
internal fun formatCoins(coins: Int): String =
    if (coins < 1000) coins.toString() else "%,d".format(coins)
