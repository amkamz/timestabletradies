package com.timestabletradies.core.network

import kotlinx.serialization.Serializable

/**
 * The mastery grid, staged by the server.
 *
 * The client renders stages, it doesn't derive them. Gold and Blue are claims
 * about speed and retention, and `stageForFact` owns that ladder — a second
 * implementation here would be wrong in the one place a parent looks hardest
 * (docs/native/README.md §1.10).
 */
@Serializable
data class MasteryGrid(
    val tables: List<Int> = emptyList(),
    val maxFactor: Int = 12,
    val counts: StageCounts = StageCounts(),
    val total: Int = 0,
    val cells: List<MasteryCell> = emptyList(),
)

@Serializable
data class StageCounts(
    val none: Int = 0,
    val bronze: Int = 0,
    val silver: Int = 0,
    val gold: Int = 0,
    val blue: Int = 0,
)

@Serializable
data class MasteryCell(
    val a: Int,
    val b: Int,
    /** none | bronze | silver | gold | blue */
    val stage: String,
    val attempts: Int = 0,
    val correct: Int = 0,
    val avgMs: Int = 0,
    /** Due for its spaced-repetition check-in. */
    val due: Boolean = false,
)
