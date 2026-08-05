package com.timestabletradies.data

import android.content.Context
import java.time.LocalDate

/**
 * Which of today's jobs are already done.
 *
 * The job board offers a handful of jobs a day, and a job a child has finished
 * should say so rather than sitting there looking untouched — otherwise the
 * board stops being a to-do list and becomes an infinite menu, which is how a
 * daily habit turns into a grind.
 *
 * **This is device-local and it shouldn't be.** The board itself is a stub until
 * §1.3 delivers real content, and when it does, "which jobs did this child do
 * today" belongs on the server with the board that issued them — a child who
 * plays on a tablet and then a phone should see one day's work, not two. Until
 * then this is honest about what it is: a per-install note, cleared when the
 * date rolls over.
 */
class DailyJobLog(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences("tradies_daily", Context.MODE_PRIVATE)

    /**
     * The jobs finished today, or an empty set if the day has turned over.
     *
     * The date is stored alongside rather than the entries being expired on a
     * timer: a phone that was asleep at midnight never runs a timer, and the
     * only moment that matters is the next time the board is read.
     */
    fun completedToday(): Set<String> {
        if (prefs.getString(KEY_DATE, null) != today()) return emptySet()
        return prefs.getStringSet(KEY_JOBS, emptySet()).orEmpty()
    }

    fun markDone(jobId: String) {
        val existing = completedToday()
        prefs.edit()
            .putString(KEY_DATE, today())
            // A fresh set: SharedPreferences returns the *live* set from its
            // cache, and mutating that in place makes the write a no-op.
            .putStringSet(KEY_JOBS, existing + jobId)
            .apply()
    }

    private fun today(): String = LocalDate.now().toString()

    private companion object {
        const val KEY_DATE = "completed_date"
        const val KEY_JOBS = "completed_jobs"
    }
}
