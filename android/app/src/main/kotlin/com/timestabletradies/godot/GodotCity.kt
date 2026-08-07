package com.timestabletradies.godot

import android.content.Context
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.viewinterop.AndroidView
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.commit
import androidx.fragment.app.findFragment
import org.godotengine.godot.GodotFragment
import java.io.File

/**
 * The Godot engine, inside a Compose screen.
 *
 * **Godot is a renderer here, not a client** (docs/native/rescope.md). It holds
 * no session, makes no network call and decides nothing about what a run
 * earned. It is handed a scene and it draws it, and every control the child can
 * press stays in Compose — which is not a stylistic preference but the only way
 * the screen keeps an accessibility tree. A Godot surface is a single
 * unlabelled node to TalkBack; a Compose button is a real one.
 *
 * That is why this composable takes a [contentDescription] and nothing else:
 * from the outside it is a picture, and pictures are allowed to be pictures.
 */
private const val TAG = "GodotCity"

private const val PACK_ASSET = "city.pck"
private const val FRAGMENT_TAG = "godot_city"

/** Whether there is a city to render at all. */
object GodotPack {
    /**
     * True when `city.pck` is present in assets.
     *
     * Checked rather than assumed because the pack is a build artifact: it is
     * gitignored and produced by `godot/export-pck.ps1`, so a clean checkout
     * builds an APK without one. A screen that says "not packed yet" beats a
     * black rectangle nobody can diagnose.
     */
    fun isAvailable(context: Context): Boolean = try {
        context.assets.openFd(PACK_ASSET).close()
        true
    } catch (_: Exception) {
        false
    }
}

/**
 * Copy the packed project out of assets and onto the filesystem.
 *
 * The engine wants a real path for `--main-pack`, and Android assets are not
 * files — they are entries inside the APK. So it is unpacked once into internal
 * storage and reused after that.
 *
 * Re-copied whenever the sizes differ, which is what makes a rebuilt city
 * actually appear rather than the app quietly rendering last week's one. A
 * cheap check rather than a hash: the pack is regenerated wholesale by
 * `export-pck.ps1`, so a content change is a size change in all but the most
 * unlucky case, and the cost of being wrong is one stale frame in a debug build.
 */
fun ensurePackExtracted(context: Context): File? {
    val target = File(context.filesDir, PACK_ASSET)
    return try {
        val packed = context.assets.openFd(PACK_ASSET).use { it.length }
        if (!target.exists() || target.length() != packed) {
            context.assets.open(PACK_ASSET).use { input ->
                target.outputStream().use { output -> input.copyTo(output) }
            }
            Log.i(TAG, "unpacked $PACK_ASSET (${target.length()} bytes)")
        }
        target
    } catch (cause: Exception) {
        // A missing pack means `export-pck.ps1` was not run. Say so in the log
        // and let the caller draw its fallback — a screen with no city on it is
        // recoverable, a crash on the app's home screen is not.
        Log.e(TAG, "no $PACK_ASSET in assets; run godot/export-pck.ps1", cause)
        null
    }
}

/**
 * Hosts [GodotFragment] in a Compose tree.
 *
 * The fragment goes into a plain [FrameLayout] with a generated id rather than
 * a `FragmentContainerView`. `FragmentContainerView` insists on inflating its
 * fragment itself and disposes of it on detach, which fights Compose's habit of
 * detaching and reattaching an `AndroidView` as it recomposes — and a disposed
 * Godot instance does not come back.
 *
 * **One engine per process.** Godot on Android is effectively a singleton, so
 * this composable must appear once at a time. Showing two would not give you
 * two cities; it would give you one and an error.
 */
@Composable
fun GodotCityView(
    modifier: Modifier = Modifier,
    contentDescription: String,
) {
    AndroidView(
        modifier = modifier.semantics { this.contentDescription = contentDescription },
        factory = { context ->
            FrameLayout(context).apply {
                id = androidx.core.view.ViewCompat.generateViewId()
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )

                val activity = context as? FragmentActivity
                if (activity == null) {
                    Log.e(TAG, "host is not a FragmentActivity; no city will render")
                    return@apply
                }

                val existing = activity.supportFragmentManager.findFragmentByTag(FRAGMENT_TAG)
                if (existing == null) {
                    activity.supportFragmentManager.commit {
                        setReorderingAllowed(true)
                        add(this@apply.id, GodotFragment(), FRAGMENT_TAG)
                    }
                }
            }
        },
    )

    DisposableEffect(Unit) {
        onDispose {
            // Deliberately left running. Tearing the engine down on every
            // navigation would mean paying engine boot each time the child
            // opens their city, and Godot's Android lifecycle does not
            // reliably survive a re-init inside one process anyway.
            Log.d(TAG, "city view disposed; engine left resident")
        }
    }
}
