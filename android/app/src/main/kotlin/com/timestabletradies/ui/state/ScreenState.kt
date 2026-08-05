package com.timestabletradies.ui.state

import com.timestabletradies.core.designsystem.PopTokens
import androidx.compose.ui.graphics.Color

/**
 * The shapes the storyboard screens render.
 *
 * ## Why these are here and not in `core/model`
 *
 * `core/model` carries the *contract* — things the server has decided and the
 * client displays. Most of what follows has no endpoint yet: the job board, the
 * shop catalogue, crew rosters and the expo leaderboard are all Part 1 work that
 * hasn't been written (docs/native/README.md §1.1, §1.3). Putting speculative
 * shapes into `core/model` would imply iOS inherits them, and they will change
 * the moment the endpoints are real.
 *
 * ## What is wired and what is not
 *
 * Screens fed by a live endpoint — the runner, results, mastery, the house,
 * modes, settings — take their state from [com.timestabletradies.core.network].
 * Screens below that end in `Stub` are rendered from [Storyboard], which is
 * clearly-labelled stand-in content so the flow is walkable end to end. Each one
 * names the endpoint it is waiting on.
 */

/* -------------------------------------------------------------- the site */

/** What the home screen shows. Assembled from `students` + the house endpoint. */
data class SiteState(
    val tradieName: String,
    val coins: Int,
    val timber: Int,
    val streakDays: Int,
    /** e.g. "Sparkie's Cottage". */
    val houseName: String,
    /** e.g. "Framing". */
    val stageName: String,
    val housePercent: Int,
    val jobsToday: Int,
    val bossReady: Boolean,
)

/* ---------------------------------------------------------- the job board */

enum class JobDifficulty(
    val label: String,
    val fill: Color,
    val content: Color,
    val border: Color,
) {
    Easy("EASY", PopTokens.TealTint, PopTokens.TealDeep, PopTokens.Teal),
    Medium("MEDIUM", PopTokens.YellowTint, PopTokens.AmberDeep, PopTokens.Amber),
    Hard("HARD", PopTokens.RedTint, PopTokens.RedDeep, PopTokens.Red),
    Review("REVIEW", PopTokens.Red, PopTokens.White, PopTokens.Ink),
}

/**
 * How a job's questions are put in front of the child.
 *
 * Presentation only. Every style posts the same answer log to `run-finish`, and
 * the server marks all of them the same way — so a style is a choice about how
 * a seven-year-old meets a fact, never about what the fact is worth.
 */
enum class QuestionStyle {
    /** B4 — four tiles, one right. */
    Tiles,

    /** B5 — the keypad. The default, and the only one that teaches recall. */
    Keypad,

    /** B6 — the fact wrapped in a site scenario, with read-aloud. */
    WordProblem,

    /** B7 — match four questions to four totals. */
    MeasureUp,

    /** B8 — three steps building toward one grand total. */
    BuildOrder,
}

/** One row on the job board. */
data class JobCard(
    val id: String,
    val title: String,
    /** The `run-start` mode key this job maps to. */
    val modeKey: String,
    val tableNo: Int?,
    val blurb: String,
    val zone: String,
    val difficulty: JobDifficulty,
    val questions: Int,
    val coins: Int,
    val timber: Int,
    val style: QuestionStyle,
    /** e.g. "Division for ×7 unlocks once you finish a full multiply round." */
    val divisionNote: String? = null,
    val summary: String? = null,
)

/* ------------------------------------------------------------ trade zones */

enum class ZoneState { Fluent, Current, Locked }

data class ZoneRow(
    val table: Int,
    val trade: String,
    val fluencyPercent: Int,
    val state: ZoneState,
)

/* -------------------------------------------------------------- the shop */

/**
 * Mirrors `ShopCategory` in `lib/game/shop.ts`, which is the authority.
 *
 * All five. `Extras` was missing for a while and the seven `acc-*` items were
 * unreachable on Android as a result — buyable on the web, invisible here, and
 * impossible to equip on either. A catalogue split across two clients has to
 * agree on its own shape before anything else about it can be right.
 */
enum class ShopCategory(val label: String) {
    Hats("HATS"),
    Vests("VESTS"),
    Tools("TOOLS"),
    Rides("RIDES"),
    Extras("EXTRAS"),
}

data class ShopItem(
    val key: String,
    val name: String,
    val category: ShopCategory,
    val priceCoins: Int,
    val owned: Boolean = false,
    /** Boss drops only. Never purchasable, so it shows in the locker not the shop. */
    val rare: Boolean = false,
)

enum class LockerSlot(val label: String) {
    Head("HEAD"),
    Body("BODY"),
    Tools("TOOLS"),
    Ride("RIDE"),
    Extras("EXTRAS"),
}

data class LockerItem(
    val key: String,
    val name: String,
    val slot: LockerSlot,
    val owned: Boolean,
    val equipped: Boolean,
    val rare: Boolean = false,
)

/* ------------------------------------------------------------------ crew */

/**
 * A racer.
 *
 * [bot] is surfaced, never hidden. A child racing a simulated opponent is told
 * so — labelling them "PRACTICE" is the difference between filling an empty
 * lobby and pretending a friend turned up.
 */
data class CrewRacer(
    val name: String,
    val you: Boolean = false,
    val bot: Boolean = false,
    val ready: Boolean = true,
    val tint: Color = PopTokens.NavIcon,
    /** 0–1 along the track. */
    val progress: Float = 0f,
)

data class ExpoRow(
    val rank: Int,
    val name: String,
    val score: Int,
    val you: Boolean = false,
    val tint: Color = PopTokens.NavIcon,
)

data class ChallengeOutcome(
    val opponent: String,
    val yourScore: Int,
    val theirScore: Int,
    val outOf: Int,
) {
    val won: Boolean get() = yourScore > theirScore
    val drawn: Boolean get() = yourScore == theirScore
}

/** Someone a grown-up has linked. Children can never add to this list. */
data class CrewContact(
    val name: String,
    val role: String? = null,
    val tint: Color = PopTokens.NavIcon,
)

/* ------------------------------------------------------------ boss battle */

data class BossBrief(
    val name: String,
    val zoneLabel: String,
    val table: Int,
    val questions: Int,
    val timerLabel: String,
    val rewardLabel: String,
)

data class RareDrop(
    val name: String,
    val blurb: String,
    val coins: Int,
    val timber: Int,
)

/* ------------------------------------------------------------ grandparent */

data class StickerChoice(val key: String, val label: String)

/* --------------------------------------------------------- tradie builder */

/** The look and name being assembled during onboarding (A5–A7). */
data class TradieDraft(
    val displayName: String = "",
    val model: Int = 1,
    val skinTone: Int = 2,
    val hair: Int = 0,
    val trade: String = "Sparky",
    val adjective: String = "Speedy",
    val surname: String = "McGee",
) {
    val fullName: String get() = "$trade $adjective $surname"
}
