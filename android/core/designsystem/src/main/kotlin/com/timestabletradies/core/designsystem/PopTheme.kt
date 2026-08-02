package com.timestabletradies.core.designsystem

import android.provider.Settings
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Toolbox Pop as a Compose theme.
 *
 * Material 3 is scaffolding only — the colour scheme below exists so M3
 * components don't render purple, but nothing in this app should be reaching
 * for M3 defaults. Surfaces come from [popSurface], type from [PopType].
 */

/* ------------------------------------------------------------------- type */

/**
 * The three faces, bundled as assets rather than fetched at runtime (§2.3).
 *
 * All three are the same OFL families the web app loads through
 * `next/font/google` in `src/app/layout.tsx`, so the two platforms render the
 * same text in the same face. Shipping them means no network dependency for a
 * first paint and no Play Services requirement — which matters for a kids' app
 * that has to work offline in the back of a car.
 *
 * **Titan One has exactly one weight.** Asking it for Bold or Black makes
 * Android synthesise a fake one by smearing the outlines, which on a face this
 * heavy turns to mud. Every display style below is deliberately Normal.
 */
object PopType {
    val Display = FontFamily(Font(R.font.titan_one, FontWeight.Normal))

    /**
     * Nunito ships as a variable font, so each weight is one file instructed
     * to a different point on the axis rather than four separate faces.
     */
    val Sans = FontFamily(
        nunito(FontWeight.Normal),
        nunito(FontWeight.Medium),
        nunito(FontWeight.SemiBold),
        nunito(FontWeight.Bold),
    )

    val Mono = FontFamily(
        Font(R.font.space_mono_regular, FontWeight.Normal),
        Font(R.font.space_mono_bold, FontWeight.Bold),
    )

    val DisplayLarge = TextStyle(
        fontFamily = Display,
        fontWeight = FontWeight.Normal,
        fontSize = 34.sp,
        lineHeight = 40.sp,
    )
    val DisplayMedium = TextStyle(
        fontFamily = Display,
        fontWeight = FontWeight.Normal,
        fontSize = 24.sp,
        lineHeight = 30.sp,
    )
    val Title = TextStyle(
        fontFamily = Display,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp,
        lineHeight = 24.sp,
    )
    val Body = TextStyle(
        fontFamily = Sans,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    )
    val Small = TextStyle(
        fontFamily = Sans,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 18.sp,
    )
    val Numeric = TextStyle(
        fontFamily = Mono,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
    )
}

@OptIn(ExperimentalTextApi::class)
private fun nunito(weight: FontWeight) = Font(
    resId = R.font.nunito_variable,
    weight = weight,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
)

/* ---------------------------------------------------------- accessibility */

/**
 * Reduced motion, as the union of the app preference and the OS setting.
 *
 * A child who turned animations down at OS level should not have to turn them
 * down again in here — §2.7. The app's own `student_settings.reduced_motion`
 * is folded in by whoever provides this.
 */
val LocalPopReducedMotion: ProvidableCompositionLocal<Boolean> =
    compositionLocalOf { false }

/** Text scale from `student_settings.text_scale`, applied on top of the system's. */
val LocalPopTextScale: ProvidableCompositionLocal<Float> =
    staticCompositionLocalOf { 1f }

/** True when the OS animator duration scale is zero — "remove animations". */
@Composable
private fun systemReducedMotion(): Boolean {
    val context = LocalContext.current
    return remember(context) {
        runCatching {
            Settings.Global.getFloat(
                context.contentResolver,
                Settings.Global.ANIMATOR_DURATION_SCALE,
                1f,
            ) == 0f
        }.getOrDefault(false)
    }
}

/* ------------------------------------------------------------------ theme */

private val PopColorScheme = lightColorScheme(
    primary = PopTokens.Teal,
    onPrimary = PopTokens.White,
    secondary = PopTokens.Red,
    onSecondary = PopTokens.White,
    tertiary = PopTokens.Yellow,
    onTertiary = PopTokens.Ink,
    background = PopTokens.Paper,
    onBackground = PopTokens.Ink,
    surface = PopTokens.White,
    onSurface = PopTokens.Ink,
    error = PopTokens.RedDeep,
    onError = PopTokens.White,
)

@Composable
fun PopTheme(
    /** From `student_settings.reduced_motion`; OR'd with the OS setting. */
    reducedMotion: Boolean = false,
    textScale: Float = 1f,
    content: @Composable () -> Unit,
) {
    // Toolbox Pop is a single committed look — paper and ink, in daylight.
    // There is no dark variant yet, so the theme does not follow the system.
    @Suppress("UNUSED_EXPRESSION")
    isSystemInDarkTheme()

    val motionOff = reducedMotion || systemReducedMotion()

    // Applied by scaling the density's fontScale, which multiplies on top of
    // whatever the phone is already set to rather than replacing it. A child
    // who enlarged text system-wide keeps that and gets this as well.
    val density = LocalDensity.current
    val scaled = remember(density, textScale) {
        Density(density.density, density.fontScale * textScale)
    }

    CompositionLocalProvider(
        LocalPopReducedMotion provides motionOff,
        LocalPopTextScale provides textScale,
        LocalDensity provides scaled,
    ) {
        MaterialTheme(
            colorScheme = PopColorScheme,
            typography = Typography(),
            content = content,
        )
    }
}
