package com.timestabletradies.core.network

import kotlinx.serialization.Serializable

/**
 * The wire format for `run-start` and `run-finish`.
 *
 * The server generates the questions and remembers exactly what it sent, so
 * the client never expands a seed and there is no PRNG three languages have to
 * agree on fact-for-fact (docs/native/README.md §0.2).
 */
@Serializable
data class RunStartRequest(
    val studentId: String,
    val mode: String,
    val tableNo: Int? = null,
)

@Serializable
data class RunStartResponse(
    val runId: String,
    val expiresAt: String,
    /** Seconds per question, or null for the untimed modes. */
    val timerSeconds: Int? = null,
    val questions: List<ServedQuestion>,
)

/**
 * A question as the server asked it.
 *
 * `answer` ships with it deliberately — `a x b` is derivable by anyone holding
 * a and b, so withholding it would be theatre, and it costs the thing that
 * matters most: telling a child straight away that they got it wrong and what
 * the answer was.
 */
@Serializable
data class ServedQuestion(
    val id: String,
    val operation: String,
    val a: Int,
    val b: Int,
    val prompt: String,
    val spoken: String,
    val answer: Int,
)

/**
 * What the client reports back.
 *
 * Note what is absent: whether the answer was right. The client sends the
 * number a child typed; the server marks it against the board it stored. A
 * client that could assert correctness could assert a perfect run.
 */
@Serializable
data class RunSubmission(
    val runId: String,
    val answers: List<AnswerSubmission>,
)

@Serializable
data class AnswerSubmission(
    val questionId: String,
    /** The value typed, or null if the question ran out of time unanswered. */
    val answer: Int?,
    val elapsedMs: Long,
)

/**
 * What the server decided the run was worth.
 *
 * `rejected` counts answers dropped because the family's plan doesn't cover
 * that table. Non-zero means the client offered something it shouldn't have —
 * worth logging in a debug build, and worth never showing a child.
 */
@Serializable
data class RunOutcome(
    val runId: String,
    val correct: Int,
    val total: Int,
    val accuracyPercent: Int,
    val averageMs: Long,
    val coins: Int,
    val uncappedCoins: Int,
    val capped: Boolean,
    val materials: Int,
    val coinsTotal: Int,
    val houseStagesCompleted: List<String> = emptyList(),
    val rejected: Int = 0,
    /** Set when The Yard pushed the student up the Trade Rank ladder. */
    val newRank: Int? = null,
    /** Set when a full multiplication round opened division for a table. */
    val divisionUnlockedFor: Int? = null,
)
