package com.timestabletradies.core.designsystem

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.toggleableState
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/* ------------------------------------------------------------------ banner */

/**
 * The Titan One pill that titles most screens — "THE JOB BOARD", "BOSS DOWN!".
 *
 * A heading, not a control — so no shadow. A title that looks pressable is a
 * promise the screen doesn't keep.
 */
@Composable
fun PopBanner(
    text: String,
    modifier: Modifier = Modifier,
    fill: Color = PopTokens.Teal,
    content: Color = PopTokens.White,
    borderColor: Color = PopTokens.Ink,
    fontSize: TextUnit = 15.sp,
) {
    val shape = RoundedCornerShape(999.dp)
    Box(
        modifier = modifier
            .background(fill, shape)
            .border(PopTokens.BorderWidth, borderColor, shape)
            .padding(horizontal = 16.dp, vertical = 7.dp),
    ) {
        Text(
            text = text,
            style = TextStyle(
                fontFamily = PopType.Display,
                fontWeight = FontWeight.Normal,
                fontSize = fontSize,
            ),
            color = content,
        )
    }
}

/**
 * The small square-cornered tag used inside cards — EASY / MEDIUM / RARE /
 * PRACTICE / OWNED. Distinct from [PopBanner] by shape as well as scale, so the
 * two never read as one object at different sizes.
 */
@Composable
fun PopTag(
    text: String,
    modifier: Modifier = Modifier,
    fill: Color = PopTokens.White,
    content: Color = PopTokens.Ink,
    borderColor: Color = PopTokens.Ink,
) {
    val shape = RoundedCornerShape(8.dp)
    Box(
        modifier = modifier
            .background(fill, shape)
            .border(2.dp, borderColor, shape)
            .padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Text(
            text = text,
            style = TextStyle(
                fontFamily = PopType.Sans,
                fontWeight = FontWeight.Black,
                fontSize = 11.sp,
            ),
            color = content,
        )
    }
}

/**
 * The dashed callout — the teal "worth knowing" and red "needs work" notes.
 *
 * Dashed rather than solid on purpose: a solid 3px ink border marks a real
 * object in this language, and these are annotations on the screen rather than
 * things in it.
 */
@Composable
fun PopNote(
    text: String,
    modifier: Modifier = Modifier,
    fill: Color = PopTokens.TealWash,
    content: Color = PopTokens.TealDeep,
    accent: Color = PopTokens.Teal,
) {
    val shape = RoundedCornerShape(PopTokens.RadiusSm)
    Box(
        modifier = modifier
            .background(fill, shape)
            .dashedBorder(accent, 2.dp, PopTokens.RadiusSm)
            .padding(horizontal = 12.dp, vertical = 9.dp),
    ) {
        Text(text = text, style = PopType.Small, color = content)
    }
}

/* ------------------------------------------------------------ placeholders */

/**
 * A labelled art slot.
 *
 * Every character and house illustration in the product is still a placeholder
 * (§4.7), and the storyboard draws them as dashed boxes at fixed sizes with a
 * mono caption. Keeping that convention in the running app is deliberate: real
 * art drops into the same box, and until it does nobody mistakes a gap for a
 * finished screen.
 */
@Composable
fun PopArtSlot(
    label: String,
    modifier: Modifier = Modifier,
    fill: Color = Color.Transparent,
    content: Color = PopTokens.Ink,
    hatch: Color? = null,
    radius: Dp = 14.dp,
) {
    val shape = RoundedCornerShape(radius)
    Box(
        modifier = modifier
            .clip(shape)
            .then(if (fill != Color.Transparent) Modifier.background(fill) else Modifier)
            .then(if (hatch != null) Modifier.hatched(hatch) else Modifier)
            .dashedBorder(content, PopTokens.BorderWidth, radius)
            .semantics(mergeDescendants = true) {
                contentDescription = "Artwork placeholder: $label"
            },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = TextStyle(
                fontFamily = PopType.Mono,
                fontWeight = FontWeight.Normal,
                fontSize = 10.sp,
                lineHeight = 16.sp,
            ),
            color = content,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(6.dp),
        )
    }
}

/** The 45° hatch the storyboard fills placeholder boxes with. Clip it yourself. */
fun Modifier.hatched(color: Color, spacing: Dp = 18.dp): Modifier =
    this.drawBehind {
        val step = spacing.toPx()
        var x = -size.height
        while (x < size.width + size.height) {
            drawLine(
                color = color,
                start = Offset(x, size.height),
                end = Offset(x + size.height, 0f),
                strokeWidth = step / 2f,
            )
            x += step
        }
    }

/** The diagonal hazard stripe — Big Job, Welcome, anything that means "site". */
fun Modifier.hazardStripe(
    stripe: Color = PopTokens.Yellow,
    gap: Color = PopTokens.Ink,
    band: Dp = 16.dp,
): Modifier = this
    .background(gap)
    .drawBehind {
        val step = band.toPx()
        var x = -size.height
        while (x < size.width + size.height) {
            drawLine(
                color = stripe,
                start = Offset(x, size.height),
                end = Offset(x + size.height, 0f),
                strokeWidth = step,
            )
            x += step * 2
        }
    }

/** A dashed outline that follows a rounded rect. */
fun Modifier.dashedBorder(color: Color, width: Dp, radius: Dp): Modifier =
    this.drawBehind {
        val stroke = width.toPx()
        drawRoundRect(
            color = color,
            topLeft = Offset(stroke / 2, stroke / 2),
            size = Size(size.width - stroke, size.height - stroke),
            cornerRadius = CornerRadius(radius.toPx()),
            style = Stroke(
                width = stroke,
                pathEffect = PathEffect.dashPathEffect(
                    floatArrayOf(stroke * 2.5f, stroke * 2f),
                ),
            ),
        )
    }

/* --------------------------------------------------------------- progress */

/**
 * The generic progress track — job progress, house loads, boss health.
 *
 * Not tappable, so no shadow. The value goes into the semantics rather than
 * being left to the bar's width: a bar has no accessible value on its own, and
 * "62 percent" is the entire information it carries.
 */
@Composable
fun PopProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    height: Dp = 12.dp,
    track: Color = PopTokens.SandFill,
    fill: Color = PopTokens.Teal,
    borderColor: Color = PopTokens.Ink,
    borderWidth: Dp = 2.dp,
    label: String? = null,
) {
    val reducedMotion = LocalPopReducedMotion.current
    val animated by animateFloatAsState(targetValue = progress, label = "popProgress")
    val shown = (if (reducedMotion) progress else animated).coerceIn(0f, 1f)
    val shape = RoundedCornerShape(999.dp)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .background(track, shape)
            .border(borderWidth, borderColor, shape)
            .clip(shape)
            .semantics { contentDescription = label ?: "${(shown * 100).toInt()} percent" },
    ) {
        Box(Modifier.fillMaxWidth(shown).height(height).background(fill, shape))
    }
}

/* ----------------------------------------------------------------- toggle */

/**
 * The pill switch used by Toolbox Time and the accessibility screen.
 *
 * A real toggleable with a state description, because the only visual
 * difference between on and off is the knob's side and the track's colour —
 * neither of which a screen reader can see.
 */
@Composable
fun PopToggle(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(999.dp)
    Box(
        modifier = modifier
            .size(width = 52.dp, height = 30.dp)
            .background(if (checked) PopTokens.Teal else PopTokens.GradeNone, shape)
            .border(2.5.dp, PopTokens.Ink, shape)
            .clickable(role = Role.Switch) { onCheckedChange(!checked) }
            .semantics {
                toggleableState = if (checked) ToggleableState.On else ToggleableState.Off
                stateDescription = if (checked) "On" else "Off"
            }
            .padding(3.dp),
        contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(
            Modifier
                .size(20.dp)
                .background(PopTokens.White, CircleShape)
                .border(2.dp, PopTokens.Ink, CircleShape),
        )
    }
}

/* ------------------------------------------------------------ choice chips */

/**
 * A selectable chip — tables, operations, sticker packs, shop categories.
 *
 * Selection is carried by fill *and* by the accessible selected flag, so it
 * survives both colourblindness and TalkBack.
 */
@Composable
fun PopChoice(
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selectedFill: Color = PopTokens.Yellow,
    selectedContent: Color = PopTokens.Ink,
    enabled: Boolean = true,
) {
    val shape = RoundedCornerShape(PopTokens.RadiusSm)
    val fill = when {
        !enabled -> PopTokens.SandPanel
        isSelected -> selectedFill
        else -> PopTokens.White
    }
    Box(
        modifier = modifier
            .background(fill, shape)
            .border(2.5.dp, if (enabled) PopTokens.Ink else PopTokens.SandLight, shape)
            .clickable(enabled = enabled, role = Role.RadioButton, onClick = onClick)
            .semantics { selected = isSelected }
            .padding(horizontal = 13.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = PopType.Small.copy(fontWeight = FontWeight.Black),
            color = when {
                !enabled -> PopTokens.Sand
                isSelected -> selectedContent
                else -> PopTokens.Ink
            },
        )
    }
}

/* ------------------------------------------------------------------ stats */

/** One figure with its caption — the trio on results, rank and mode stats. */
@Composable
fun PopStat(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
    valueColor: Color = PopTokens.Ink,
    labelColor: Color = PopTokens.Mud,
) {
    Column(
        modifier = modifier.semantics(mergeDescendants = true) {
            contentDescription = "$label: $value"
        },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(value, style = PopType.DisplayMedium, color = valueColor)
        Text(
            text = label,
            style = TextStyle(
                fontFamily = PopType.Sans,
                fontWeight = FontWeight.Black,
                fontSize = 10.sp,
            ),
            color = labelColor,
            textAlign = TextAlign.Center,
        )
    }
}

/* ------------------------------------------------------------------- rows */

/** The divider inside white cards — a hairline, never an ink border. */
@Composable
fun PopHairline(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(PopTokens.GradeNone))
}

/** Label / value on one line, as used by the briefing and rank cards. */
@Composable
fun PopSpecRow(
    label: String,
    modifier: Modifier = Modifier,
    value: String? = null,
    valueColor: Color = PopTokens.Ink,
    trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = PopType.Small, color = PopTokens.Mud)
        if (value != null) {
            Text(
                text = value,
                style = PopType.Body.copy(fontWeight = FontWeight.Black),
                color = valueColor,
            )
        }
        trailing?.invoke()
    }
}

/* ------------------------------------------------------------- currencies */

/** The coin token, drawn rather than shipped as an asset. */
@Composable
fun PopCoin(size: Dp = 17.dp, modifier: Modifier = Modifier) {
    Box(
        modifier
            .size(size)
            .background(
                Brush.radialGradient(listOf(Color(0xFFFFE08A), Color(0xFFF4B71E))),
                CircleShape,
            )
            .border(2.dp, PopTokens.Ink, CircleShape)
            .clearAndSetSemantics { },
    )
}

/** The timber token — the second currency, and the one that builds the house. */
@Composable
fun PopTimber(width: Dp = 17.dp, height: Dp = 12.dp, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(3.dp)
    Box(
        modifier
            .size(width, height)
            .background(PopTokens.Brick, shape)
            .border(2.dp, PopTokens.Ink, shape)
            .clearAndSetSemantics { },
    )
}

/**
 * A read-out pill — coins, timber, streak.
 *
 * Display only, so no shadow: the locked spec is explicit that drop shadows
 * appear on tappable elements and nowhere else, and the HUD is where that rule
 * is most visible.
 */
@Composable
fun PopReadout(
    value: String,
    spoken: String,
    modifier: Modifier = Modifier,
    fill: Color = PopTokens.White,
    /**
     * Optional destination.
     *
     * The coin read-out opens the shop, because that is the only question a
     * child has when they look at it. It still carries no shadow: the shadow is
     * reserved for buttons, and a HUD chip that suddenly grew one would make the
     * other two look broken.
     */
    onClick: (() -> Unit)? = null,
    icon: @Composable (() -> Unit)? = null,
) {
    val shape = RoundedCornerShape(11.dp)
    Row(
        modifier = modifier
            .background(fill, shape)
            .border(PopTokens.BorderWidth, PopTokens.Ink, shape)
            .then(
                if (onClick != null) {
                    Modifier.clickable(role = Role.Button, onClick = onClick)
                } else {
                    Modifier
                },
            )
            .padding(horizontal = 10.dp, vertical = 4.dp)
            .semantics(mergeDescendants = true) { contentDescription = spoken },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        icon?.invoke()
        Text(
            text = value,
            style = TextStyle(
                fontFamily = PopType.Display,
                fontWeight = FontWeight.Normal,
                fontSize = 12.sp,
            ),
            color = PopTokens.Ink,
        )
    }
}

/* ------------------------------------------------------------- containers */

/**
 * A card whose whole surface is the tap target.
 *
 * Job cards, shop tiles, zone rows and crew rows are all "the card *is* the
 * button", and building them from [PopCard] plus a nested button would give
 * TalkBack two targets for one thing.
 */
@Composable
fun PopTapCard(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fill: Color = PopTokens.White,
    shadow: PopShadow = PopShadow.Medium,
    radius: Dp = PopTokens.RadiusMd,
    borderColor: Color = PopTokens.Ink,
    enabled: Boolean = true,
    padding: PaddingValues = PaddingValues(14.dp),
    spoken: String? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val interactionSource = rememberPopInteractionSource()

    Column(
        modifier = modifier
            .popPressSurface(
                interactionSource = interactionSource,
                fill = fill,
                radius = radius,
                shadow = shadow,
                borderColor = borderColor,
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = onClick,
            )
            .then(
                if (spoken != null) {
                    Modifier.semantics(mergeDescendants = true) { contentDescription = spoken }
                } else {
                    Modifier
                },
            )
            .padding(padding),
        content = content,
    )
}

/* -------------------------------------------------------------- full bleed */

/**
 * A screen with one flat backdrop instead of the paper texture.
 *
 * Used by everything that happens *inside* a job — the runner, the boss battle,
 * the briefing. The colour change is the signal that the child has left the
 * site and is on a task, which is also why these screens drop the nav bar.
 */
@Composable
fun PopFullScreen(
    backdrop: Color,
    modifier: Modifier = Modifier,
    scrollable: Boolean = true,
    arrangement: Arrangement.Vertical = Arrangement.spacedBy(12.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    val scroll = rememberScrollState()
    Box(modifier = modifier.fillMaxSize().background(backdrop)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(PopInsets.content)
                .then(if (scrollable) Modifier.verticalScroll(scroll) else Modifier)
                .padding(horizontal = 18.dp, vertical = 16.dp),
            verticalArrangement = arrangement,
            content = content,
        )
    }
}

/** Vertical breathing room, named so call sites read as layout not arithmetic. */
@Composable
fun PopGap(height: Dp = 8.dp) {
    Spacer(Modifier.height(height))
}

/** Horizontal breathing room. */
@Composable
fun PopWideGap(width: Dp = 8.dp) {
    Spacer(Modifier.width(width))
}
