package com.timestabletradies.core.designsystem

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Toolbox Pop tokens — ported from the `@theme` block in `src/app/globals.css`.
 *
 * These values are the contract between the web app, this app and the eventual
 * iOS app. They are duplicated by hand for now; docs/native/README.md §0.4
 * calls for generating all three from one `design/tokens.json`, and that should
 * happen before a third platform copies them again.
 *
 * Until then: **do not tune a colour here.** Change it in `globals.css` and
 * bring it across, or the two drift and nobody notices until a screenshot
 * comparison.
 */
object PopTokens {

    /* ---------------------------------------------------------- ink & paper */

    val Ink = Color(0xFF111111)
    val InkSoft = Color(0xFF2A2722)
    val Paper = Color(0xFFFDF4DD)
    val PaperDot = Color(0xFFE9DCAE)
    val Canvas = Color(0xFFE4E1D8)

    /* --------------------------------------------------------------- brand */

    val Red = Color(0xFFE5322D)
    val RedDeep = Color(0xFFC22620)
    val RedTint = Color(0xFFFFD9D7)

    val Teal = Color(0xFF17B5A4)
    val TealLight = Color(0xFF8FD8CD)
    val TealPale = Color(0xFFBFEEE7)
    val TealTint = Color(0xFFDFF3EF)
    val TealDeep = Color(0xFF0F7C70)
    val TealMist = Color(0xFFD6F5F0)
    val TealWash = Color(0xFFEAFFFB)

    val Yellow = Color(0xFFFFD400)
    val YellowTint = Color(0xFFFFF3D6)
    val YellowDeep = Color(0xFF7A6A00)
    val Amber = Color(0xFFE0A021)
    val AmberDeep = Color(0xFFA8721A)

    val Blue = Color(0xFF3F7FD1)
    val BlueTint = Color(0xFFE4EFFF)
    val Orange = Color(0xFFE0842B)
    val Brick = Color(0xFFD2552E)

    /* ----------------------------------------------------------- the site */

    // The home screen's landscape, from the signed-off build spec. These are
    // the one place in the app where a colour describes a *place* rather than
    // a role, so they are named after what they draw.

    val SkyTop = Color(0xFFA9E6F5)
    val SkyBottom = Color(0xFFD8F3EE)
    val Hill = Color(0xFF9BD8BD)
    val Ground = Color(0xFFCBB98D)

    /**
     * The deck the buttons sit on: `rgba(203,185,141,.55)`.
     *
     * Translucent on purpose — the ground runs *behind* it, which is what makes
     * the deck read as a platform laid over the site rather than a panel
     * covering it.
     */
    val Deck = Color(0xFFCBB98D).copy(alpha = 0.55f)
    val DeckBorder = Color(0xFF3A2F16)

    /** `rgba(35,28,12,.34)` — the progress well recessed into the deck. */
    val DeckWell = Color(0xFF231C0C).copy(alpha = 0.34f)
    val DeckWellTrack = Color(0xFF231C0C).copy(alpha = 0.35f)
    val DeckTitle = Color(0xFFFFF6E2)
    val DeckPercent = Color(0xFFFFB1AE)

    /* -------------------------------------------------------- the nav bar */

    // Five cells that touch. The bar is the one surface in the app with no
    // shadow, no radius and no gaps — it is furniture, not a sticker.

    val NavRest = Color(0xFFDCEBE6)
    val NavIcon = Color(0xFFC8DED7)
    val NavJoint = Color(0xFF25332F)
    val NavLive = Color(0xFF0F5A52)

    /* ------------------------------------------------------------ neutrals */

    val Slate = Color(0xFF2B2F36)
    val SlateDeep = Color(0xFF15171B)
    val SlatePanel = Color(0xFF22262C)
    val Mud = Color(0xFF7A7266)
    val MudLight = Color(0xFF8A857C)
    val Stone = Color(0xFF9A948A)
    val Sand = Color(0xFFA99A72)
    val SandLight = Color(0xFFB7AB86)
    val SandPale = Color(0xFFCBBF9F)
    val SandFill = Color(0xFFE0D7BD)
    val SandPanel = Color(0xFFEFE8D4)
    val Bone = Color(0xFFEFE1C4)

    val White = Color(0xFFFFFFFF)

    /* ------------------------------------------------------ mastery ladder */

    /**
     * Not-started → shaky → getting there → good → perfect.
     *
     * A traffic-light ramp read left to right, because that is what a child and
     * a parent both already know how to read at a glance across 144 cells. Blue
     * sits deliberately *outside* the ramp: perfect is not "very green", it is a
     * different thing, and the sheen is the only gradient in the app.
     *
     * Colour is the primary channel here by design. The shapes that used to be
     * stamped on every cell are now opt-in — see `student_settings` — because
     * 144 glyphs at 20dp is noise for the readers who don't need them, and the
     * ones who do get them everywhere the moment the switch is on.
     */
    val GradeNone = Color(0xFFCFCFCF)
    val GradeBronze = Color(0xFFE5322D)
    val GradeSilver = Color(0xFFF08A24)
    val GradeGold = Color(0xFF3FA34D)
    val GradeBlue = Color(0xFF2F6FD0)

    /** The "shiny blue — perfect and locked in" sheen on a mastered cell. */
    val GradeBlueSheen = Color(0xFFEAFFFF)
    val GradeBlueDeep = Color(0xFF5CC8FF)

    /* --------------------------------------------------------------- shape */

    /** The 3px ink outline every Toolbox Pop surface carries. */
    val BorderWidth: Dp = 3.dp

    val RadiusSm: Dp = 12.dp // Tailwind rounded-xl
    val RadiusMd: Dp = 16.dp // Tailwind rounded-2xl
    val RadiusLg: Dp = 24.dp // Tailwind rounded-3xl
}

/**
 * The hard, zero-blur offset shadows that give Toolbox Pop its look.
 *
 * These are the one token that cannot be expressed the same way on both
 * platforms. SwiftUI draws them natively — `.shadow(radius: 0, x:, y:)` — but
 * Compose's `Modifier.shadow` is elevation-based and always blurred, with no
 * hard-shadow parameter. See [popShadow] for the Android implementation.
 */
enum class PopShadow(val x: Dp, val y: Dp) {
    /** `--shadow-pop-sm: 3px 3px 0` */
    Small(3.dp, 3.dp),

    /** `--shadow-pop: 4px 5px 0` */
    Medium(4.dp, 5.dp),

    /** `--shadow-pop-lg: 6px 7px 0` */
    Large(6.dp, 7.dp),

    /**
     * `5px 6px 0` — the one-off on START WORK, from the locked home spec.
     *
     * It sits between Medium and Large because the home screen's primary action
     * has to out-weigh the two buttons beneath it without reading as a
     * different kind of object.
     */
    Hero(5.dp, 6.dp),
}
