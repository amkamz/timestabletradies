package com.timestabletradies.core.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Per-student accessibility preferences (spec §13).
 *
 * These are settings, not rules, so they read and write straight to Postgres
 * through RLS — there is nothing here a client could cheat by changing.
 *
 * `timerMode` is the exception worth noting: it lengthens or removes the clock
 * on every timed mode. That changes what a run measures, so the *server*
 * applies it when building a run rather than trusting the client to slow its
 * own timer down.
 */
@Serializable
data class StudentSettings(
    @SerialName("student_id") val studentId: String,
    @SerialName("read_aloud") val readAloud: Boolean = false,
    @SerialName("dyslexia_font") val dyslexiaFont: Boolean = false,
    @SerialName("high_contrast") val highContrast: Boolean = false,
    @SerialName("reduced_motion") val reducedMotion: Boolean = false,
    @SerialName("text_scale") val textScale: Double = 1.0,
    /** standard | extended | off */
    @SerialName("timer_mode") val timerMode: String = "standard",
)
