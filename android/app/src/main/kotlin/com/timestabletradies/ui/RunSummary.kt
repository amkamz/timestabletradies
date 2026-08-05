package com.timestabletradies.ui

/**
 * How a finished run is presented.
 *
 * [Banked] carries the server's figures — `run-finish` recomputed them from the
 * answer log, so the client is displaying a decision rather than making one.
 * [NotSaved] is the offline case, and says so plainly rather than showing a coin
 * total that never happened. Inventing a payout to keep a screen tidy is how a
 * child ends up watching coins appear and then vanish on the next launch.
 */
sealed interface RunSummary {
    val correct: Int
    val total: Int
    val accuracyPercent: Int
    val averageMs: Long

    data class Banked(
        override val correct: Int,
        override val total: Int,
        override val accuracyPercent: Int,
        override val averageMs: Long,
        val coins: Int,
        val materials: Int,
        val coinsTotal: Int,
        val capped: Boolean,
        val housesCompleted: List<String>,
        /** Set when The Yard pushed them up the ladder. */
        val newRank: String? = null,
        /** Set when a full multiplication round opened division for a table. */
        val divisionUnlockedFor: Int? = null,
    ) : RunSummary

    data class NotSaved(
        override val correct: Int,
        override val total: Int,
        override val accuracyPercent: Int,
        override val averageMs: Long,
        val reason: String,
    ) : RunSummary
}
