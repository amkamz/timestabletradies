package com.timestabletradies

import android.net.Uri
import android.os.Bundle
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
import androidx.fragment.app.FragmentActivity
import com.timestabletradies.core.designsystem.PopTheme
import com.timestabletradies.ui.AppEntry
import com.timestabletradies.ui.TradiesApp
import org.godotengine.godot.Godot
import org.godotengine.godot.GodotFragment
import org.godotengine.godot.GodotHost
import org.godotengine.godot.plugin.GodotPlugin
import com.timestabletradies.godot.BridgeHolder
import com.timestabletradies.godot.CityBridge

/**
 * The app's one activity, and the engine's host.
 *
 * **It is a `FragmentActivity` rather than a `ComponentActivity` because
 * `GodotFragment` is an AndroidX fragment.** That is the whole reason for the
 * change; nothing about the Compose content depends on it.
 *
 * [GodotHost] has exactly two members that must be implemented — the rest are
 * defaults — plus [getCommandLine], which is how the engine is told where its
 * project data is. Everything else about the engine's behaviour is left alone.
 */
class MainActivity : FragmentActivity(), GodotHost, BridgeHolder {

    /**
     * The engine bridge, created when Godot first asks for its plugins.
     *
     * **Compose state, not a plain field.** The plugin cannot exist until the
     * engine is initialising, which happens *after* the city screen has already
     * composed and read this — so a plain field is null at the only moment
     * anything looks at it, and the screen never learns otherwise. Making it
     * observable is what lets the composable pick the bridge up when it appears.
     */
    override var cityBridge: CityBridge? by mutableStateOf(null)
        private set


    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        goImmersive()

        // Read once, from the intent that started the activity. A /cheer link
        // is the grandparent's entire way in — they hold a link, not an
        // account — so it has to be honoured before the nav gate, which would
        // otherwise send them to a sign-in they can never complete.
        val entry = intent?.data?.let(::deepLinkEntry)

        setContent {
            // The student's accessibility preferences sit above the theme,
            // because the theme is what applies them — and they have to
            // survive navigation, so they can't live inside a screen.
            var reducedMotion by remember { mutableStateOf(false) }
            var textScale by remember { mutableFloatStateOf(1f) }

            PopTheme(reducedMotion = reducedMotion, textScale = textScale) {
                TradiesApp(
                    entry = entry,
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

    /* ------------------------------------------------------------ GodotHost */

    override fun getActivity(): android.app.Activity = this

    override fun getGodot(): Godot? =
        (supportFragmentManager.findFragmentByTag("godot_city") as? GodotFragment)?.godot

    /**
     * The one plugin, supplied by the host.
     *
     * A host-provided plugin needs no manifest metadata and no `.gdap`, and its
     * lifetime is the activity's — which is what we want, because the engine
     * outlives every individual screen and the bridge has to outlive it too.
     *
     * Built once and remembered: Godot asks for this more than once, and
     * handing back a fresh instance each time would leave the Compose layer
     * holding a callback on a bridge the engine is no longer using.
     */
    override fun getHostPlugins(godot: Godot): MutableSet<GodotPlugin> {
        val bridge = cityBridge ?: CityBridge(godot).also { cityBridge = it }
        return mutableSetOf(bridge)
    }

    /**
     * What the engine is started with: nothing.
     *
     * The project is not passed in, because it cannot be. Passing
     * `--main-pack` at a copy in internal storage is refused outright — export
     * templates are built without path-override support, and the engine aborts
     * rather than load a project from outside the APK.
     *
     * So the project lives in the APK's assets as loose files, which is the
     * layout Godot's own Android export produces: `res://x` at `assets/x`,
     * `assets/project.binary` as the root marker, and `assets/_cl_` carrying
     * any arguments. The engine finds all of that by itself.
     */
    override fun getCommandLine(): MutableList<String> = mutableListOf()
}

/**
 * Turn an incoming link into a starting point.
 *
 * Only two paths are honoured, and neither of them can reach a child's data:
 * `/cheer` opens the grandparent's sticker screen, `/join` drops a parent at
 * sign-in with an invite code to redeem. Anything else falls through to the
 * normal launch, because a deep link is untrusted input and the safe default is
 * to ignore it rather than guess.
 */
private fun deepLinkEntry(uri: Uri): AppEntry? = when {
    uri.path?.startsWith("/cheer") == true -> AppEntry.Cheer(
        childName = uri.getQueryParameter("name")?.take(40) ?: "them",
        milestone = uri.getQueryParameter("milestone")?.take(60),
    )

    uri.path?.startsWith("/join") == true -> AppEntry.Join(
        code = uri.getQueryParameter("code")?.take(16),
    )

    else -> null
}
