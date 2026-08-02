package com.timestabletradies.core.model

/**
 * A run: the questions the server handed over, and the log the client posts back.
 *
 * Note what is absent. There is no question *generator* here and there must
 * never be one — the server generates content and delivers it whole
 * (docs/native/README.md §0.2). A Kotlin generator would have to agree with
 * the TypeScript one fact-for-fact forever, and the moment it drifted a child
 * would answer a question the server then refused to score.
 */

enum class Operation { MULTIPLY, DIVIDE }

/**
 * One question, exactly as `/run/start` will deliver it.
 *
 * `spoken` is separate from `prompt` because read-aloud has to say "seven
 * times eight", not "seven multiplication-sign eight" (spec §13).
 */
data class Question(
    val id: String,
    val operation: Operation,
    /** The fact cell this exercises. For divide, the prompt is (a×b) ÷ a. */
    val a: Int,
    val b: Int,
    val prompt: String,
    val spoken: String,
    val answer: Int,
) {
    val factKey: String get() = "${a}x$b"
}

/**
 * One answer, as posted back for server-side scoring.
 *
 * `correct` is here for the feedback flash only — it is a local check so a
 * child sees straight away whether they got it, and it is *not* what the
 * server scores. `run-finish` marks [answer] against the board it stored and
 * ignores this field entirely.
 */
data class AnsweredFact(
    val questionId: String,
    val a: Int,
    val b: Int,
    val operation: Operation,
    /** What the child typed, or null if the question ran out of time. */
    val answer: Int?,
    val correct: Boolean,
    val elapsedMs: Long,
)

/**
 * What a finished run was worth.
 *
 * Computed by the server from the answer log — `finishRun` recomputes coins
 * and materials so a tampered client cannot mint currency. The client only
 * ever displays this.
 */
data class RunResult(
    val correct: Int,
    val total: Int,
    val accuracyPercent: Int,
    val averageMs: Long,
    val coins: Int,
    val materials: Int,
)

/** A question set plus how it should be presented. */
data class RunConfig(
    /** The run the server handed out. Submitted back to close it. */
    val runId: String,
    val label: String,
    val questions: List<Question>,
    /** Seconds per question; null is untimed. */
    val timerSeconds: Int?,
)
