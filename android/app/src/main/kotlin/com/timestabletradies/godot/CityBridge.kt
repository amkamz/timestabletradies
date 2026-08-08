package com.timestabletradies.godot

import android.util.Log
import org.godotengine.godot.Godot
import org.godotengine.godot.plugin.GodotPlugin
import org.godotengine.godot.plugin.SignalInfo
import org.godotengine.godot.plugin.UsedByGodot

/**
 * The seam between the app and the engine.
 *
 * **JSON in, JSON out, and nothing else** (docs/native/rescope.md). Godot holds
 * no session, makes no network call, and decides nothing about what a child has
 * earned. It is handed a city and it draws it; when a square is touched it says
 * which square, and the shell decides what that means.
 *
 * Keeping the decisions on this side is not tidiness. Every control a child can
 * press has to be a Compose node, because a Godot surface is one unlabelled
 * node to TalkBack — so the engine reporting *"cell (2,3) was touched"* and the
 * shell owning what happens next is the only arrangement where the screen works
 * without sight.
 *
 * ## Which way each thing goes
 *
 * | Direction | Mechanism |
 * |---|---|
 * | Shell → engine | the `city_state` signal, carrying a JSON string |
 * | Engine → shell | [`cellTouched`] and [`sceneReady`], annotated `@UsedByGodot` |
 *
 * Registered by `MainActivity.getHostPlugins`, which is the supported way for a
 * host app to supply a plugin — it needs no manifest metadata and no separate
 * `.gdap`, and it means the plugin's lifetime is the activity's.
 */
/**
 * Implemented by the activity, so a composable can reach the bridge.
 *
 * The bridge is created when Godot asks for its plugins and lives as long as
 * the activity does — longer than any screen — so screens read it off the host
 * rather than owning one.
 */
interface BridgeHolder {
    val cityBridge: CityBridge?
}

class CityBridge(godot: Godot) : GodotPlugin(godot) {

    /** Set by the Compose layer. Null whenever no city screen is on top. */
    var onCellTouched: ((x: Int, z: Int) -> Unit)? = null

    /**
     * The most recent city the shell wanted drawn, and whether the engine is
     * in a position to draw it.
     *
     * **Neither side can wait for the other, so neither does.** The engine boots
     * asynchronously and outlives any one screen; a Compose effect runs whenever
     * composition commits. The first attempt at this used a callback — "tell me
     * when the scene is ready and I'll push" — and lost the race in exactly one
     * direction: the engine announced itself before the effect had set the
     * listener, the shell's own eager push had already gone into a scene tree
     * that did not exist, and the city stayed on its fallback with nothing in
     * any log to say why.
     *
     * Holding the state instead makes the order irrelevant. Whichever arrives
     * second does the sending.
     */
    private var latestState: String? = null
    private var sceneIsReady = false

    override fun getPluginName(): String = PLUGIN_NAME

    override fun getPluginSignals(): MutableSet<SignalInfo> =
        mutableSetOf(SignalInfo(SIGNAL_CITY_STATE, String::class.java))

    /**
     * Push a city down to the engine.
     *
     * The whole city, every time, rather than a diff. A 6 × 6 town is thirty-six
     * cells and the message is a few hundred bytes; an incremental protocol
     * would buy nothing and would eventually disagree with the model it is
     * meant to mirror.
     */
    @Synchronized
    fun sendState(json: String) {
        latestState = json
        if (sceneIsReady) emit(json)
    }

    @UsedByGodot
    fun cellTouched(x: Int, z: Int) {
        // Godot calls this from its own thread. Everything downstream is
        // Compose state, so it has to cross back to the UI thread first.
        runOnUiThread { onCellTouched?.invoke(x, z) }
    }

    /**
     * The engine's scene is up.
     *
     * Anything the shell already wanted drawn goes down now. Called again if
     * the scene is ever rebuilt, which is why it re-sends rather than only
     * flipping a flag.
     */
    @UsedByGodot
    @Synchronized
    fun sceneReady() {
        sceneIsReady = true
        latestState?.let { emit(it) }
    }

    private fun emit(json: String) {
        runCatching { emitSignal(SIGNAL_CITY_STATE, json) }
            .onFailure { Log.w(TAG, "could not push city state", it) }
    }

    companion object {
        const val PLUGIN_NAME = "TradiesCity"
        const val SIGNAL_CITY_STATE = "city_state"
        private const val TAG = "CityBridge"
    }
}
