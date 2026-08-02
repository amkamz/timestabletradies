package com.timestabletradies.core.network

import kotlinx.serialization.Serializable

/**
 * What the `modes` endpoint returns.
 *
 * The client renders this; it does not compute it. Whether a mode is playable
 * is a rule, and the rules live on the server (docs/native/README.md §1.10) —
 * so `playable` and `reason` arrive decided, and the reason text is identical
 * on web, Android and eventually iOS.
 */
@Serializable
data class ModesResponse(
    val playableTables: List<Int> = emptyList(),
    /** Tables the puzzle generators can build from — ×1 excluded. */
    val puzzleTables: List<Int> = emptyList(),
    val divisionUnlocked: List<Int> = emptyList(),
    val zoneCount: Int = 0,
    val entitled: Boolean = false,
    /**
     * True when a free player has opened every trade their plan allows.
     * The cue for "you've mastered everything here — ask a grown-up", which is
     * the only honest way to end a free tier.
     */
    val atFreeCeiling: Boolean = false,
    val modes: List<ModeDto> = emptyList(),
)

@Serializable
data class ModeDto(
    val key: String,
    val name: String,
    val blurb: String,
    val playable: Boolean,
    /** Player-facing, and never about money. e.g. "Unlocks with 5 trades". */
    val reason: String? = null,
    val requiresZones: Int = 1,
)
