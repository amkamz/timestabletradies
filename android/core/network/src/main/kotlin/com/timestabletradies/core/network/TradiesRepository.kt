package com.timestabletradies.core.network

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import io.ktor.client.call.body
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpMethod
import io.ktor.http.contentType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Everything the app reads or asks for, in one place.
 *
 * Reads go straight to Postgres through RLS (§1.1) — there is no endpoint to
 * write for them, and adding one would only be a second thing to keep correct.
 * *Writes* are a different matter: they go through Edge Functions so the
 * server stays the authority on what a run earned, and none of them are here
 * yet because those functions don't exist.
 */
class TradiesRepository(private val client: SupabaseClient) {

    /* ------------------------------------------------------------- session */

    /** True whenever a parent is signed in. Drives the nav gate (§2.4). */
    val isSignedIn: Flow<Boolean>
        get() = client.auth.sessionStatus.map { it is SessionStatus.Authenticated }

    /**
     * Wait for the stored session to be read back off disk.
     *
     * Loading is asynchronous, so asking [currentUserId] the instant the app
     * composes gets `null` even when a perfectly good session exists — and the
     * nav gate then sends a signed-in parent to the sign-in screen. Anything
     * deciding a route has to wait for this first.
     */
    suspend fun awaitSessionRestore() {
        client.auth.awaitInitialization()
    }

    suspend fun signIn(email: String, password: String) {
        client.auth.signInWith(Email) {
            this.email = email.trim()
            this.password = password
        }
    }

    suspend fun signOut() {
        client.auth.signOut()
    }

    fun currentUserId(): String? = client.auth.currentUserOrNull()?.id

    /* -------------------------------------------------------------- family */

    /**
     * The signed-in user's family and role.
     *
     * RLS scopes this to their own membership, so a missing row means no
     * access rather than an error worth surfacing.
     */
    suspend fun familyMembership(): FamilyMemberDto? =
        client.from("family_members")
            .select()
            .decodeSingleOrNull<FamilyMemberDto>()

    /**
     * The family's student profiles.
     *
     * Kids never hold credentials — the parent's session is what reaches this,
     * and the profile is chosen in-session. That is the mechanism behind "kids
     * can't search for or add other users", not a UI convention.
     */
    suspend fun students(): List<StudentDto> =
        client.from("students")
            .select()
            .decodeList<StudentDto>()

    suspend fun student(studentId: String): StudentDto? =
        client.from("students")
            .select {
                filter { eq("id", studentId) }
            }
            .decodeSingleOrNull<StudentDto>()

    /* ------------------------------------------------------------ progress */

    suspend fun unlockedTables(studentId: String): List<StudentTableDto> =
        client.from("student_tables")
            .select {
                filter { eq("student_id", studentId) }
            }
            .decodeList<StudentTableDto>()

    suspend fun mastery(studentId: String): List<FactMasteryDto> =
        client.from("fact_mastery")
            .select {
                filter { eq("student_id", studentId) }
            }
            .decodeList<FactMasteryDto>()

    /* --------------------------------------------------------------- modes */

    /**
     * Which modes this student can play, decided server-side.
     *
     * Worth the round trip rather than working it out locally: the same server
     * refuses the run, so a client that disagreed would offer a mode and then
     * fail it — and the lock reason is the only explanation a child gets.
     */
    suspend fun modes(studentId: String): ModesResponse =
        client.functions
            .invoke("modes?studentId=$studentId") {
                method = HttpMethod.Get
            }
            .body()

    /**
     * The fact grid, with stages already decided.
     *
     * Separate from [mastery] on purpose: that returns raw counters for a
     * headline count, this returns the staged grid for the screen that shows
     * every cell.
     */
    suspend fun masteryGrid(studentId: String): MasteryGrid =
        client.functions
            .invoke("mastery?studentId=$studentId") {
                method = HttpMethod.Get
            }
            .body()

    /** The house build: stage, loads, and the rare items won so far. */
    suspend fun house(studentId: String): HouseState =
        client.functions
            .invoke("house?studentId=$studentId") {
                method = HttpMethod.Get
            }
            .body()

    /* ------------------------------------------------------------ settings */

    /**
     * Accessibility preferences, or the defaults when none are saved.
     *
     * Straight to Postgres: these are preferences, not rules, and there is
     * nothing here a client gains by lying about.
     */
    suspend fun settings(studentId: String): StudentSettings =
        client.from("student_settings")
            .select {
                filter { eq("student_id", studentId) }
            }
            .decodeSingleOrNull<StudentSettings>()
            ?: StudentSettings(studentId = studentId)

    suspend fun saveSettings(settings: StudentSettings) {
        client.from("student_settings").upsert(settings) {
            // One row per student, so a repeat save updates rather than
            // colliding on the primary key.
            onConflict = "student_id"
        }
    }

    /* ---------------------------------------------------------------- runs */

    /**
     * Ask the server for a run.
     *
     * The questions come from here, not from the client. That is what makes
     * The Garage genuinely adaptive — selection weights by the mastery ladder,
     * which a client would need the whole ruleset to do — and it is what keeps
     * a second implementation of question generation from existing at all.
     */
    suspend fun startRun(request: RunStartRequest): RunStartResponse =
        client.functions
            .invoke("run-start") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            .body()

    /**
     * Bank a finished run.
     *
     * The only write path in the app, and deliberately the only one — it goes
     * through an Edge Function rather than straight to Postgres because the
     * payout has to be recomputed somewhere the client can't reach. RLS could
     * stop a child writing to someone else's row; it could not stop them
     * writing a larger number into their own.
     */
    suspend fun finishRun(submission: RunSubmission): RunOutcome =
        client.functions
            .invoke("run-finish") {
                // Ktor won't serialize a typed body without being told the
                // content type — it fails at request-preparation time with
                // "Content-Type: null" rather than sending anything.
                contentType(ContentType.Application.Json)
                setBody(submission)
            }
            .body()
}
