package com.timestabletradies.godot

import com.timestabletradies.core.network.MasteryGrid
import org.json.JSONArray
import org.json.JSONObject

/**
 * What the shell tells the engine about a city.
 *
 * One message, carrying everything needed to draw a town. Deliberately the
 * *inputs* to the size rule rather than a size — `CityGrid.size_for` in
 * GDScript owns that rule and is tested there, so sending a number this side
 * had worked out would create a second implementation to keep in step.
 *
 * The rule itself: an n × n city opens when ×n is unlocked **and** n × n has
 * been answered correctly at least n times. The fact gates the grid that shares
 * its number, which is the whole charm of it.
 */
object CityState {

    /**
     * Build the message.
     *
     * @param pieces the saved layout, as the `pieces` array the grid serialises
     *   to. Empty for a child who has not built anything yet.
     */
    fun encode(
        unlockedTables: List<Int>,
        grid: MasteryGrid?,
        pieces: JSONArray,
    ): String {
        val payload = JSONObject()
        payload.put("unlocked_tables", JSONArray(unlockedTables))
        payload.put("square_correct", squareCorrect(grid))
        payload.put("pieces", pieces)
        return payload.toString()
    }

    /**
     * How often each square number has been answered correctly — 6 × 6, 7 × 7
     * and so on.
     *
     * Only the diagonal is needed, and the diagonal is the one part of the grid
     * immune to the `7×10` / `10×7` key problem noted in the README: a square is
     * its own commutation, so there is no mirror cell holding half the count.
     */
    private fun squareCorrect(grid: MasteryGrid?): JSONObject {
        val out = JSONObject()
        val cells = grid?.cells ?: return out
        for (cell in cells) {
            if (cell.a == cell.b) out.put(cell.a.toString(), cell.correct)
        }
        return out
    }

    /**
     * Parse a saved layout, or lay out the streets for a city that has none.
     *
     * A brand-new town starting as bare ground is technically correct and reads
     * as broken — a grey square with nothing on it does not look like something
     * a child is about to build, it looks like something that failed to load.
     *
     * So a new city arrives with its **roads already in** and every block empty.
     * The streets are the part nobody would choose to spend bricks on first,
     * and having them there makes the empty blocks read as spaces waiting to be
     * filled rather than as an absence.
     */
    fun piecesFrom(saved: String?): JSONArray {
        if (saved.isNullOrBlank()) return starterStreets()
        return runCatching { JSONArray(saved) }.getOrDefault(starterStreets())
    }

    /** A crossroads through the middle of a 5 × 5. */
    private fun starterStreets(): JSONArray {
        val pieces = JSONArray()
        val middle = BASE_SIZE / 2

        for (i in 0 until BASE_SIZE) {
            if (i == middle) continue
            // The north-south arm, and the east-west arm as the same tile
            // turned a quarter. One authored shape, two directions.
            pieces.put(piece("road_straight", middle, i, rotation = 0))
            pieces.put(piece("road_straight", i, middle, rotation = 1))
        }
        pieces.put(piece("road_junction", middle, middle, rotation = 0))

        return pieces
    }

    private fun piece(key: String, x: Int, z: Int, rotation: Int): JSONObject =
        JSONObject().apply {
            put("key", key)
            put("rot", rotation)
            put("anchor", JSONArray(listOf(x, z)))
            put("footprint", JSONArray(listOf(1, 1)))
        }

    const val BASE_SIZE = 5
    const val MAX_SIZE = 12

    /**
     * How big the town is, **for the spoken description only**.
     *
     * The authority is `CityGrid.size_for` in GDScript, which is tested there
     * and is what actually decides. This exists because a screen reader needs
     * to say "a six by six town" before the engine has drawn anything, and
     * asking the engine would mean a round trip for a label.
     *
     * A divergence here is a wrong word read aloud, not a wrong city — but keep
     * the two in step anyway.
     */
    fun describedGridSize(unlockedTables: List<Int>, grid: MasteryGrid?): Int {
        val squares = grid?.cells.orEmpty()
            .filter { it.a == it.b }
            .associate { it.a to it.correct }

        var best = BASE_SIZE
        for (n in (BASE_SIZE + 1)..MAX_SIZE) {
            if (unlockedTables.contains(n) && (squares[n] ?: 0) >= n) best = n
        }
        return best
    }
}
