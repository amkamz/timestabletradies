package com.timestabletradies.data

import android.content.Context

/**
 * A child's city layout, per student, on this device.
 *
 * **This is device-local and it shouldn't be**, exactly like [DailyJobLog]. A
 * city is the most personal thing in the app — months of daily work made into a
 * picture — and a child who plays on a tablet and then a phone should find the
 * same town, not two. It belongs on the server beside the XP that grew it.
 *
 * There is no endpoint for it yet (§1.1), so this is honest about what it is: a
 * per-install note. Stored as the same JSON the bridge sends, so the day an
 * endpoint exists this becomes a cache rather than a rewrite.
 */
class CityStore(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences("tradies_city", Context.MODE_PRIVATE)

    /** The saved layout, or null when this student has never built anything. */
    fun layout(studentId: String): String? = prefs.getString(key(studentId), null)

    fun save(studentId: String, piecesJson: String) {
        prefs.edit().putString(key(studentId), piecesJson).apply()
    }

    private fun key(studentId: String) = "layout_$studentId"
}
