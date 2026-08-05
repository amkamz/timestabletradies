package com.timestabletradies.ui.state

import androidx.compose.ui.graphics.Color
import com.timestabletradies.core.designsystem.PopTokens

/**
 * Content the screens need that no endpoint serves yet.
 *
 * Three different things live here and they are worth telling apart:
 *
 * 1. **Mirrors of `lib/game`** — the trade zones, the name pools, the character
 *    options and the shop catalogue. These are real product
 *    data that happens to live in TypeScript today. Duplicating them is the
 *    same compromise `PopTokens` already makes, and it carries the same rule:
 *    **do not tune a value here** — change it in `lib/game` and bring it
 *    across, or the two drift and nobody notices.
 *
 * 2. **Stand-in content** — the job board, crew rosters, the expo leaderboard
 *    and boss briefs. These are waiting on Part 1 endpoints (§1.1, §1.3) and
 *    are marked `Stub` at their call sites. They exist so the flow is walkable
 *    end to end, not because the values mean anything.
 *
 * 3. **Copy** — word-problem scenarios and preset cheers. Text, vetted once,
 *    with no rule attached.
 *
 * Nothing here decides what a run is worth. Every payout is recomputed by
 * `run-finish` from the answer log (§0.2), so a wrong number in this file is a
 * cosmetic bug rather than an economic one.
 */
object Storyboard {

    /** `QUESTION_COUNT.job` in `supabase/functions/run-start`. */
    private const val JOB_QUESTIONS = 10

    /* ------------------------------------------- mirrors of lib/game/zones.ts */

    /** `TRADE_ZONES`. Order is the curriculum order, not numerical order. */
    val trades: Map<Int, String> = mapOf(
        1 to "Labouring",
        2 to "Landscaping",
        3 to "Carpentry",
        4 to "Bricklaying",
        5 to "Plumbing",
        6 to "Painting",
        7 to "Roofing",
        8 to "Electrical",
        9 to "Tiling",
        10 to "Concreting",
        11 to "Cabinetmaking",
        12 to "Site Management",
    )

    /** `DEFAULT_UNLOCK_ORDER`. ×1 leads; the first three are the free tier. */
    val unlockOrder: List<Int> = listOf(1, 2, 10, 5, 3, 4, 8, 6, 9, 7, 11, 12)

    fun tradeFor(table: Int): String = trades[table] ?: "Trade ×$table"

    /* ---------------------------------------- mirrors of lib/game/character.ts */

    /** `SKIN_TONES`. Numbered, never named by type — nothing implies gender. */
    val skinTones: List<Color> = listOf(
        Color(0xFFF2CFA8), Color(0xFFE8B98C), Color(0xFFDBA071), Color(0xFFC08552),
        Color(0xFFA9713F), Color(0xFF8A5A30), Color(0xFF7A4A24), Color(0xFF4D2F18),
    )

    /** `HAIR_COLOURS`. */
    val hairColours: List<Color> = listOf(
        Color(0xFF2B2622), Color(0xFF4A3427), Color(0xFF7A4A24), Color(0xFFC98A3A),
        Color(0xFFE0C078), Color(0xFFB23B2F), Color(0xFF9AA0A6), Color(0xFFE8E4DC),
    )

    /** `CHARACTER_MODEL_COUNT`. */
    const val CHARACTER_MODELS = 20

    /* -------------------------------------------- mirrors of lib/game/names.ts */

    // The pools are long; the app serves ten of each, which is what keeps the
    // choice small for a child while the underlying variety stays large. These
    // are the first ten of each pool — the server picks its own ten per seed.

    val tradeNames = listOf(
        "Sparky", "Chippie", "Plumber", "Brickie", "Roofer",
        "Tiler", "Painter", "Plasterer", "Concreter", "Landscaper",
    )

    val adjectives = listOf(
        "Speedy", "Deliberate", "Trusty", "Sharp", "Steady",
        "Handy", "Solid", "Nimble", "Tidy", "Rapid",
    )

    val surnames = listOf(
        "McGee", "Radler", "Boltz", "Nails", "Hammersmith",
        "Ironside", "Steelworth", "Woodward", "Stoneham", "Bricklow",
    )

    /* --------------------------------------------- mirrors of lib/game/shop.ts */

    /**
     * `SHOP_ITEMS`, grouped the way the storyboard groups them.
     *
     * The catalogue's own categories are hats / vests / belts / utes /
     * accessories; the tabs are HATS / VESTS / TOOLS / RIDES / EXTRAS. Belts
     * are the tools tab and utes are the rides tab — the same items under the
     * labels a child reads.
     *
     * Accessories used to be folded into TOOLS because the storyboard drew four
     * tabs. Only four of the seven fitted, so three were unreachable and none
     * could be equipped — the locker slot they map to did not exist either.
     * EXTRAS is the fifth tab, and every item in `shop.ts` now has a home.
     */
    val shopItems: List<ShopItem> = listOf(
        ShopItem("hat-classic-white", "Classic White", ShopCategory.Hats, 0, owned = true),
        ShopItem("hat-safety-yellow", "Safety Yellow", ShopCategory.Hats, 120),
        ShopItem("hat-fire-red", "Fire Red", ShopCategory.Hats, 180),
        ShopItem("hat-deep-teal", "Deep Teal", ShopCategory.Hats, 180),
        ShopItem("hat-racing-stripe", "Racing Stripe", ShopCategory.Hats, 320),
        ShopItem("hat-camo", "Bush Camo", ShopCategory.Hats, 380),
        ShopItem("hat-chrome", "Chrome Finish", ShopCategory.Hats, 900),
        ShopItem("hat-legend", "Legend Gold", ShopCategory.Hats, 1500),

        ShopItem("vest-standard", "Standard Hi-Vis", ShopCategory.Vests, 0, owned = true),
        ShopItem("vest-orange", "Traffic Orange", ShopCategory.Vests, 140),
        ShopItem("vest-night", "Night Shift", ShopCategory.Vests, 260),
        ShopItem("vest-stripe", "Double Stripe", ShopCategory.Vests, 300),
        ShopItem("vest-crew", "Crew Colours", ShopCategory.Vests, 420),
        ShopItem("vest-jacket", "Wet-Weather Jacket", ShopCategory.Vests, 620),
        ShopItem("vest-foreman", "Foreman's Jacket", ShopCategory.Vests, 1100),

        ShopItem("belt-canvas", "Canvas Belt", ShopCategory.Tools, 0, owned = true),
        ShopItem("belt-leather", "Oiled Leather", ShopCategory.Tools, 200),
        ShopItem("belt-red-handles", "Red-Handled Set", ShopCategory.Tools, 340),
        ShopItem("belt-titanium", "Titanium Set", ShopCategory.Tools, 780),
        ShopItem("belt-glow", "Glow Grips", ShopCategory.Tools, 950),

        ShopItem("ute-white", "Site White", ShopCategory.Rides, 500),
        ShopItem("ute-yellow", "Hi-Vis Yellow", ShopCategory.Rides, 700),
        ShopItem("ute-teal", "Teal Tradie", ShopCategory.Rides, 900),
        ShopItem("ute-flames", "Flame Job", ShopCategory.Rides, 1400),
        ShopItem("ute-vintage", "Restored Classic", ShopCategory.Rides, 2200),

        // Accessories. Present in `shop.ts` all along; unreachable here until
        // Android grew the fifth category to match.
        ShopItem("acc-sunnies", "Site Sunnies", ShopCategory.Extras, 90),
        ShopItem("acc-gloves", "Grip Gloves", ShopCategory.Extras, 110),
        ShopItem("acc-knee-pads", "Knee Pads", ShopCategory.Extras, 130),
        ShopItem("acc-earmuffs", "Ear Muffs", ShopCategory.Extras, 140),
        ShopItem("acc-boots", "Steel Caps", ShopCategory.Extras, 160),
        ShopItem("acc-headtorch", "Head Torch", ShopCategory.Extras, 240),
        ShopItem("acc-thermos", "Smoko Thermos", ShopCategory.Extras, 300),
    )

    /* ---------------------------------------------------------- word problems */

    /**
     * Scenarios for the Site Delivery style.
     *
     * Copy, not maths — but the copy has to ask for the number the server is
     * marking, and **that depends on the operation**.
     *
     * A served question carries `a`, `b` and the answer it expects. For multiply
     * the answer is `a × b`; for divide the prompt is `(a×b) ÷ a` and the answer
     * is `b`. Wrapping a division question in a multiplication sentence — "2
     * panels, 3 palings each, how many palings?" — asks for 6 while the server
     * is marking 3, so a child who reasons correctly is told they are wrong.
     * That is the worst class of bug this app can ship.
     *
     * So there are two pools, and [multiplyProblems] and [divideProblems] are
     * the same six situations seen from either end: one hands out groups and
     * asks for the total, the other hands out the total and asks for the group.
     */
    val multiplyProblems: List<(Int, Int) -> String> = listOf(
        { a, b -> "The ute is loaded with **$a pallets**. Each pallet holds **$b bricks**. How many bricks all up?" },
        { a, b -> "You're running **$a cable reels** to the board. Each reel is **$b metres**. How many metres of cable?" },
        { a, b -> "There are **$a rooms** to tile and each takes **$b boxes**. How many boxes off the truck?" },
        { a, b -> "The roof needs **$a rows** of **$b sheets**. How many sheets on the order?" },
        { a, b -> "You mix **$a barrows**, **$b shovels** of sand in each. How many shovels all up?" },
        { a, b -> "**$a fence panels**, **$b palings** on every one. How many palings do you cut?" },
    )

    /**
     * The same situations, sharing rather than grouping.
     *
     * Each takes (a, b) from the served question and asks for **b** — the total
     * is `a × b`, split `a` ways.
     */
    val divideProblems: List<(Int, Int) -> String> = listOf(
        { a, b -> "**${a * b} bricks** came off the ute on **$a pallets**. How many bricks on each pallet?" },
        { a, b -> "You've run **${a * b} metres** of cable off **$a reels**. How long was each reel?" },
        { a, b -> "**${a * b} boxes** of tiles cover **$a rooms**. How many boxes for one room?" },
        { a, b -> "**${a * b} sheets** go on the roof in **$a rows**. How many sheets in a row?" },
        { a, b -> "**${a * b} shovels** of sand filled **$a barrows**. How many shovels in each?" },
        { a, b -> "**${a * b} palings** made **$a fence panels**. How many palings on one panel?" },
    )

    /* --------------------------------------------------------- preset cheers */

    /** Grandparents pick from these. There is no free text anywhere near a child. */
    val cheers = listOf(
        "Great job!",
        "So proud of you!",
        "Keep on building!",
        "That's the way!",
        "Top effort today.",
    )

    val stickers = listOf(
        StickerChoice("star", "STAR"),
        StickerChoice("thumb", "THUMB"),
        StickerChoice("trowel", "TROWEL"),
        StickerChoice("hat", "HAT"),
        StickerChoice("heart", "HEART"),
        StickerChoice("medal", "MEDAL"),
    )

    /* -------------------------------------------------------- stand-in content */

    /**
     * The job board, until the board endpoint exists (§1.3).
     *
     * Real jobs are drawn from the child's entitled tables server-side; these
     * four exist so the board, the briefing and all five question styles are
     * reachable and can be walked in order.
     */
    fun jobBoardStub(tables: List<Int>): List<JobCard> {
        // Every card starts mode `job`, and `run-start`'s QUESTION_COUNT deals
        // 10 for that mode. The briefing must not promise a different number to
        // the one the very next screen counts down from.
        val pick = { n: Int -> tables.getOrElse(n) { tables.lastOrNull() ?: 2 } }
        val quick = pick(tables.lastIndex)
        val delivery = pick(tables.lastIndex - 1)
        val measure = pick(tables.lastIndex - 2)

        return listOf(
            JobCard(
                id = "quick",
                title = "Quick Job · ×$quick",
                modeKey = "job",
                tableNo = quick,
                blurb = "10 fast questions · ${tradeFor(quick)} zone",
                zone = tradeFor(quick),
                difficulty = JobDifficulty.Easy,
                questions = JOB_QUESTIONS,
                coins = 60,
                timber = 3,
                style = QuestionStyle.Tiles,
                summary = "Pick the right answer from four.",
            ),
            JobCard(
                id = "delivery",
                title = "Site Delivery · ×$delivery",
                modeKey = "job",
                tableNo = delivery,
                blurb = "Word problems · ${tradeFor(delivery)} zone",
                zone = tradeFor(delivery),
                difficulty = JobDifficulty.Medium,
                questions = JOB_QUESTIONS,
                coins = 90,
                timber = 5,
                style = QuestionStyle.WordProblem,
                divisionNote = "Division for ×$delivery unlocks once you finish a " +
                    "full multiply round.",
                summary = "Word problems about hauling materials round the site.",
            ),
            JobCard(
                id = "measure",
                title = "Measure Up · ×$measure",
                modeKey = "job",
                tableNo = measure,
                blurb = "Match them up · ${tradeFor(measure)} zone",
                zone = tradeFor(measure),
                difficulty = JobDifficulty.Medium,
                questions = JOB_QUESTIONS,
                coins = 85,
                timber = 0,
                style = QuestionStyle.MeasureUp,
                summary = "Match each job to its total.",
            ),
            JobCard(
                id = "muster",
                title = "Mixed Muster",
                modeKey = "job",
                tableNo = null,
                blurb = "Everything you've unlocked",
                zone = "All trades",
                difficulty = JobDifficulty.Review,
                questions = JOB_QUESTIONS,
                coins = 120,
                timber = 6,
                style = QuestionStyle.Keypad,
                summary = "A bit of everything you've opened so far.",
            ),
        )
    }

    /** The crew lobby, until crew links are readable from the client (§1.1). */
    fun crewStub(you: String): List<CrewRacer> = listOf(
        CrewRacer(name = "$you (you)", you = true, tint = Color(0xFFFFD27A)),
        CrewRacer(name = "Priya M.", tint = Color(0xFFA7D8FF)),
        CrewRacer(name = "Sim Crew · Sam-bot", bot = true, tint = Color(0xFFC9D6E8)),
        CrewRacer(name = "Sim Crew · Rio-bot", bot = true, tint = Color(0xFFC9D6E8)),
    )

    /** Today's expo board, until the leaderboard endpoint exists. */
    fun expoStub(you: String): List<ExpoRow> = listOf(
        ExpoRow(1, "Priya M.", 980, tint = Color(0xFFA7D8FF)),
        ExpoRow(2, "$you (you)", 940, you = true, tint = Color(0xFFFFD27A)),
        ExpoRow(3, "Leah K.", 905, tint = Color(0xFFC8E6C0)),
        ExpoRow(4, "Noah B.", 870, tint = Color(0xFFE8C0C0)),
        ExpoRow(5, "Dev M.", 815, tint = Color(0xFFD8C0E8)),
    )

    /** Who a challenge can be sent to. Grown-ups link these; children never can. */
    val challengeContacts = listOf(
        CrewContact("Priya M.", tint = Color(0xFFA7D8FF)),
        CrewContact("Ms Taylor", role = "teacher", tint = Color(0xFFD8C0E8)),
        CrewContact("Dad", tint = Color(0xFFF0D6A0)),
    )

    /**
     * The boss for a zone.
     *
     * Boss battles unlock per-zone once that zone is complete (§1.8), and the
     * win drops a rare house item that cannot be bought. Names are per trade so
     * the fight belongs to the zone it ends.
     */
    fun bossFor(table: Int): BossBrief = BossBrief(
        name = when (table) {
            1, 2 -> "The Leading Hand"
            3, 4 -> "The Chippie"
            5, 6 -> "The Site Foreman"
            7, 8 -> "The Foreman"
            9, 10 -> "The Supervisor"
            else -> "The Site Manager"
        },
        zoneLabel = "END OF THE ${tradeFor(table).uppercase()} ZONE",
        table = table,
        questions = 15,
        timerLabel = "TIGHT",
        rewardLabel = "RARE ITEM",
    )

    fun rareDropFor(table: Int): RareDrop = RareDrop(
        name = when (table) {
            1, 2 -> "Feature Letterbox"
            3, 4 -> "Carved Front Door"
            5, 6 -> "Copper Downpipes"
            7, 8 -> "Skylight Run"
            9, 10 -> "Mosaic Entry"
            else -> "Weathervane"
        },
        blurb = "A one-off for your house — you can only get this from a boss.",
        coins = 120,
        timber = 8,
    )

    /* ------------------------------------------------------------- palette */

    /** Zone accent, mirroring the `accent` field on `TRADE_ZONES`. */
    fun accentFor(table: Int): Color = when (table) {
        1, 6 -> PopTokens.Yellow
        2, 8 -> PopTokens.Teal
        3, 7, 11 -> PopTokens.Orange
        4, 12 -> PopTokens.Red
        5, 9 -> PopTokens.Blue
        else -> PopTokens.Slate
    }
}

