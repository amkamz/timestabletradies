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
    val Orange = Color(0xFFE0842B)
    val Brick = Color(0xFFD2552E)

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

    // Colourblind-safe, and always paired with a glyph — see MasteryStage.
    val GradeNone = Color(0xFFD8D2C4)
    val GradeBronze = Color(0xFFC17C3A)
    val GradeSilver = Color(0xFF9AA4AD)
    val GradeGold = Color(0xFFEDB521)
    val GradeBlue = Color(0xFF2F6FD0)

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
}
