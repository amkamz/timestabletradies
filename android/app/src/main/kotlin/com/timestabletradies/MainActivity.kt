package com.timestabletradies

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.timestabletradies.core.designsystem.PopTheme
import com.timestabletradies.ui.TradiesApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        goImmersive()

        setContent {
            // The student's accessibility preferences sit above the theme,
            // because the theme is what applies them — and they have to
            // survive navigation, so they can't live inside a screen.
            var reducedMotion by remember { mutableStateOf(false) }
            var textScale by remember { mutableFloatStateOf(1f) }

            PopTheme(reducedMotion = reducedMotion, textScale = textScale) {
                TradiesApp(
                    onPreferences = { motion, scale ->
                        reducedMotion = motion
                        textScale = scale
                    },
                )
            }
        }
    }

    /**
     * Re-hide the bars whenever the window comes back to the front.
     *
     * Transient bars are shown by the system, not by us, and anything that
     * takes focus — a permission dialog, the recents switcher, returning from
     * background — leaves them up. Without this the app quietly stops being
     * full screen after the first interruption.
     */
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) goImmersive()
    }

    /**
     * Full screen, with the bars a swipe away.
     *
     * `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` is the part that matters: a
     * swipe from the top or bottom edge brings the bars back as an overlay,
     * and they hide themselves again shortly after. Because they overlay
     * rather than resize the window, insets stay at zero and content doesn't
     * jump when they appear.
     *
     * `safeDrawing` padding stays applied in PopScreen — with the bars hidden
     * it collapses to nothing, but it still keeps content clear of a display
     * cutout, which no amount of hiding removes.
     */
    private fun goImmersive() {
        WindowCompat.getInsetsController(window, window.decorView).apply {
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.systemBars())
        }
    }
}
