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

private const val PACK_ASSET = "project.binary"
private const val FRAGMENT_TAG = "godot_city"

/**
 * Whether there is a city to render at all.
 *
 * ## Why there is no pack file to point at
 *
 * The obvious design — ship a `.pck`, copy it to internal storage, start the
 * engine with `--main-pack /path/to/it` — is refused by a stock export
 * template:
 *
 * ```
 * ERROR: --main-pack is attempting to load from outside of the executable, but
 * this Godot binary was compiled without support for path overrides. Aborting.
 * ```
 *
 * Templates are hardened against loading a project from an arbitrary path. The
 * engine will only read its project from inside the APK, and what it expects
 * there is not a pack but the project as **loose files**: `res://x` maps to
 * `assets/x`, with `assets/project.binary` as the root marker and `assets/_cl_`
 * carrying the command line.
 *
 * `godot/export-pck.ps1` produces exactly that by exporting a real Android APK
 * and lifting its `assets/` directory, which lets Godot's own export plugin
 * decide the layout rather than this file guessing at it.
 */
object GodotPack {
    /**
     * True when the project has been packed into assets.
     *
     * Checked rather than assumed: the packed project is a build artifact, it
     * is gitignored, and a clean checkout builds an APK without it. A screen
     * that says "not packed yet" beats a black rectangle nobody can diagnose.
     */
    fun isAvailable(context: Context): Boolean = try {
        // `open`, not `openFd`. The latter answers "is this asset stored
        // uncompressed" rather than "does this asset exist", and answering the
        // wrong question here once put a "city isn't packed yet" card in front
        // of a project that was sitting in the APK the whole time.
        context.assets.open(PACK_ASSET).close()
        true
    } catch (_: Exception) {
        Log.w(TAG, "no $PACK_ASSET in assets; run godot/export-pck.ps1")
        false
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
