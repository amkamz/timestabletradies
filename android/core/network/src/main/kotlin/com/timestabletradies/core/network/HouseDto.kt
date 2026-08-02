package com.timestabletradies.core.network

import kotlinx.serialization.Serializable

/**
 * The house build.
 *
 * Stage thresholds come from the server rather than a local copy: the server
 * rolls loads forward through them when banking, so a client with its own
 * table would draw a bar that disagrees with when a stage actually completes.
 */
@Serializable
data class HouseState(
    val stageIndex: Int = 0,
    val loads: Int = 0,
    /** Null on Move-in Day, which has no target. */
    val loadsNeeded: Int? = null,
    val percent: Int = 0,
    val movedIn: Boolean = false,
    val stages: List<HouseStageDto> = emptyList(),
    val rareItems: List<RareItemDto> = emptyList(),
)

@Serializable
data class HouseStageDto(
    val key: String,
    val name: String,
    val loads: Int,
    /** e.g. "loads of concrete poured" — the progress line's noun. */
    val unit: String,
    val done: Boolean = false,
    val current: Boolean = false,
)

/** Only ever dropped by a Boss Battle win, never by a normal job (spec §8). */
@Serializable
data class RareItemDto(
    val key: String,
    val name: String,
    val blurb: String,
    val zone: Int,
    val owned: Boolean = false,
)
