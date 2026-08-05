package com.timestabletradies.core.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Row shapes, matching `supabase/migrations/20260801000000_baseline.sql`.
 *
 * Hand-maintained, like `src/lib/supabase/types.ts` on the web side. Only the
 * columns the app actually reads are here — a DTO is not an excuse to select *.
 */

@Serializable
data class StudentDto(
    val id: String,
    @SerialName("family_id") val familyId: String,
    @SerialName("display_name") val displayName: String,
    @SerialName("name_trade") val nameTrade: String? = null,
    @SerialName("name_adjective") val nameAdjective: String? = null,
    @SerialName("name_surname") val nameSurname: String? = null,
    @SerialName("look_model") val lookModel: Int = 1,
    val coins: Int = 0,
    /** Deprecated: Trade Rank was replaced by [cityXp]. Kept because the row still has it. */
    @SerialName("rank_rung") val rankRung: Int = 1,
    @SerialName("city_xp") val cityXp: Int = 0,
    @SerialName("streak_tier") val streakTier: Int = 0,
    @SerialName("streak_points") val streakPoints: Int = 0,
    @SerialName("house_stage") val houseStage: Int = 0,
    @SerialName("house_loads") val houseLoads: Int = 0,
) {
    /**
     * The assembled tradie name, or the display name if one hasn't been picked.
     *
     * Names only ever come from the three vetted pools (spec §7) — this just
     * joins what the server stored.
     */
    val tradieName: String
        get() = listOfNotNull(nameAdjective, nameTrade, nameSurname)
            .takeIf { it.isNotEmpty() }
            ?.joinToString(" ")
            ?: displayName
}

/**
 * Parent sign-up.
 *
 * The password crosses the wire to an Edge Function rather than to Postgres —
 * it is handed to Supabase Auth server-side, alongside creating the family row
 * and membership in the same transaction (§1.4).
 */
@Serializable
data class SignUpRequest(
    val name: String,
    val email: String,
    val password: String,
)

@Serializable
data class FamilyMemberDto(
    @SerialName("family_id") val familyId: String,
    val role: String,
)

@Serializable
data class StudentTableDto(
    @SerialName("table_no") val tableNo: Int,
    @SerialName("division_unlocked") val divisionUnlocked: Boolean = false,
)

/**
 * A fact's raw counters. The *stage* is derived from these, and derived
 * server-side — `stageForFact` in `lib/game/mastery.ts` owns that ladder and
 * this client does not reimplement it.
 */
@Serializable
data class FactMasteryDto(
    val a: Int,
    val b: Int,
    val attempts: Int = 0,
    val correct: Int = 0,
    @SerialName("avg_ms") val avgMs: Int = 0,
    @SerialName("speed_attempts") val speedAttempts: Int = 0,
    @SerialName("retention_hits") val retentionHits: Int = 0,
)

/**
 * One row of the answer log.
 *
 * Read-only here — the client posts answers through `run-finish` and never
 * writes this table directly, which is what stops a client asserting its own
 * accuracy. Reading it back is fine: RLS scopes it to the family.
 */
@Serializable
data class AnswerRowDto(
    val a: Int,
    val b: Int,
    val correct: Boolean,
    @SerialName("elapsed_ms") val elapsedMs: Int = 0,
)
