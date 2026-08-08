package com.timestabletradies.godot

import org.json.JSONArray
import org.json.JSONObject

/**
 * What is standing where, on the shell's side.
 *
 * The engine draws a city; this is the city. Placement is decided here rather
 * than in Godot for the same reason every control is a Compose node: the engine
 * reports *which* square was touched and nothing more, because a Godot surface
 * has no accessibility tree and a decision made inside one cannot be reached
 * without sight.
 *
 * Immutable — every edit returns a new layout. A city is small enough that
 * copying it is free, and it means the screen can hold one in Compose state and
 * have recomposition do the right thing without any mutation bookkeeping.
 */
data class CityLayout(private val pieces: List<Placed>) {

    data class Placed(val key: String, val x: Int, val z: Int, val rotation: Int)

    fun at(x: Int, z: Int): Placed? = pieces.firstOrNull { it.x == x && it.z == z }

    fun isEmpty(x: Int, z: Int): Boolean = at(x, z) == null

    /** Put a piece down, replacing whatever was on that square. */
    fun place(key: String, x: Int, z: Int, rotation: Int = 0): CityLayout =
        CityLayout(pieces.filterNot { it.x == x && it.z == z } + Placed(key, x, z, rotation))

    fun removeAt(x: Int, z: Int): CityLayout =
        CityLayout(pieces.filterNot { it.x == x && it.z == z })

    /** Turn a piece a quarter, in place. Roads care; a bush does not. */
    fun rotateAt(x: Int, z: Int): CityLayout {
        val existing = at(x, z) ?: return this
        return CityLayout(
            pieces.map {
                if (it.x == x && it.z == z) it.copy(rotation = (it.rotation + 1) % 4) else it
            },
        )
    }

    fun toJson(): JSONArray {
        val out = JSONArray()
        for (piece in pieces) {
            out.put(
                JSONObject().apply {
                    put("key", piece.key)
                    put("rot", piece.rotation)
                    put("anchor", JSONArray(listOf(piece.x, piece.z)))
                    // Everything placeable is one cell for now. Multi-cell
                    // pieces are supported by the grid and by the manifest;
                    // nothing in the catalogue uses one yet.
                    put("footprint", JSONArray(listOf(1, 1)))
                },
            )
        }
        return out
    }

    companion object {
        fun fromJson(array: JSONArray): CityLayout {
            val pieces = buildList {
                for (i in 0 until array.length()) {
                    val raw = array.optJSONObject(i) ?: continue
                    val anchor = raw.optJSONArray("anchor") ?: continue
                    add(
                        Placed(
                            key = raw.optString("key"),
                            x = anchor.optInt(0),
                            z = anchor.optInt(1),
                            rotation = raw.optInt("rot"),
                        ),
                    )
                }
            }
            return CityLayout(pieces)
        }
    }
}
