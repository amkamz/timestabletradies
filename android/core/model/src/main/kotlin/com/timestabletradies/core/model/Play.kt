package com.timestabletradies.core.model

/**
 * The shapes the server hands the client.
 *
 * These are *data*, not rules. Difficulty weighting, reward decay, unlock
 * thresholds and mastery staging all live in TypeScript on the server
 * (docs/native/README.md §0.1) and this module never recomputes them — it
 * carries what the server already decided.
 *
 * The test for whether something belongs here: if getting it wrong would
 * change what a child earns or may access, it does not go in this file.
 */

/** A times table, themed as a trade. */
data class TradeZone(
    val table: Int,
    val trade: String,
    val accent: ZoneAccent,
    val blurb: String,
)

enum class ZoneAccent { TEAL, RED, YELLOW, BLUE, ORANGE, SLATE }

/**
 * The five-stage fact ladder.
 *
 * Colour is never the only signal — every stage carries a glyph and a text
 * description so the grid works for colourblind users and screen readers
 * (spec §13). That is a presentation rule, which is why it lives client-side.
 */
enum class MasteryStage(
    val label: String,
    val glyph: String,
    val description: String,
) {
    NONE("Not started", "·", "Not yet attempted"),
    BRONZE("Bronze", "▲", "Attempted, still inconsistent"),
    SILVER("Silver", "◆", "Mostly accurate, working on speed"),
    GOLD("Gold", "★", "Fast and accurate"),
    BLUE("Blue", "●", "Fully mastered and retained over time"),
}

/** One cell of the mastery grid. */
data class FactCell(
    val a: Int,
    val b: Int,
    val stage: MasteryStage,
)

/**
 * Whether a mode can be played, and what to put on the card when it can't.
 *
 * The reason is computed server-side and passed through verbatim. Three
 * clients recomputing it independently is three chances to disagree with the
 * server that will actually refuse the run (§1.10) — and the reason text is
 * also the one place a lock is explained to a child, so it must never differ
 * between platforms.
 */
sealed interface ModeAvailability {
    data object Playable : ModeAvailability

    /** e.g. "Unlocks with 5 trades" — a goal, never a price. */
    data class Locked(val reason: String) : ModeAvailability
}

/** A mode as offered on the training-shed hub. */
data class PracticeMode(
    val key: String,
    val name: String,
    val blurb: String,
    val tone: ModeTone,
    val availability: ModeAvailability,
)

enum class ModeTone { TEAL, WHITE, INK, BLUE, ORANGE, YELLOW, RED }
