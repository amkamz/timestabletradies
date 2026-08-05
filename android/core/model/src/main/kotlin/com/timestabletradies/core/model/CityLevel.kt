package com.timestabletradies.core.model

/**
 * City level and XP — a mirror of `lib/game/city-level.ts`.
 *
 * Pure Kotlin, no Android dependencies, because this module is what iOS
 * inherits if KMP is adopted (§0.3).
 *
 * **The server is still the authority.** `run-finish` recomputes the level it
 * banks and sends it back, so nothing here decides what a child has earned.
 * This exists for the screens that hold a `city_xp` and need to render a level
 * without a round trip — the Yard's header, the shop's level gate, a crewmate
 * in a lobby. A divergence from the TypeScript would be a wrong number on a
 * card, not a wrong number in the database.
 *
 * Replaces Trade Rank, which was recomputed from a single Yard round and could
 * *fall*. Nothing could be gated on it: a shop item that disappears after one
 * slow afternoon reads to a child as punishment. Levels only rise.
 */
object CityLevel {

    /** Deliberately cheap, so the tutorial boss can land a full level on day one. */
    const val FIRST_LEVEL_XP = 60

    const val BASE_LEVEL_XP = 120
    const val LEVEL_XP_STEP = 40

    /** What completing [level] costs. Levels are 1-based. */
    fun xpForLevel(level: Int): Int =
        if (level <= 1) FIRST_LEVEL_XP else BASE_LEVEL_XP + LEVEL_XP_STEP * (level - 2)

    data class Progress(
        val level: Int,
        val intoLevel: Int,
        val levelNeeds: Int,
        /** 0–100, for the bar under Sparky's City. */
        val percent: Int,
        val remaining: Int,
    )

    fun fromXp(totalXp: Int): Progress {
        val xp = maxOf(0, totalXp)
        var level = 1
        var consumed = 0

        while (consumed + xpForLevel(level) <= xp) {
            consumed += xpForLevel(level)
            level += 1
        }

        val levelNeeds = xpForLevel(level)
        val intoLevel = xp - consumed

        return Progress(
            level = level,
            intoLevel = intoLevel,
            levelNeeds = levelNeeds,
            percent = (intoLevel * 100) / levelNeeds,
            remaining = levelNeeds - intoLevel,
        )
    }

    fun levelOf(totalXp: Int): Int = fromXp(totalXp).level
}
