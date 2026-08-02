package com.timestabletradies.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import android.util.Log
import com.timestabletradies.data.Graph
import com.timestabletradies.core.model.AnsweredFact
import com.timestabletradies.core.model.ModeAvailability
import com.timestabletradies.core.model.Operation
import com.timestabletradies.core.model.PracticeMode
import com.timestabletradies.core.model.Question
import com.timestabletradies.core.model.RunConfig
import com.timestabletradies.core.network.RunStartRequest
import com.timestabletradies.core.network.AnswerSubmission
import com.timestabletradies.core.network.RunSubmission
import com.timestabletradies.core.network.StudentDto
import com.timestabletradies.core.network.TradiesRepository
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

/**
 * Post a finished run and turn the server's verdict into something to show.
 *
 * The client never decides what a run was worth — it hands over the answer log
 * and displays what comes back (§0.2). A failure here is a *display* problem,
 * not a scoring one: the run genuinely didn't bank, and saying so is more
 * honest than inventing a total.
 */
private suspend fun submitRun(
    repository: TradiesRepository,
    runId: String,
    answers: List<AnsweredFact>,
): RunSummary {
    val fallback = localTally(answers)

    return runCatching {
        repository.finishRun(
            RunSubmission(
                runId = runId,
                answers = answers.map {
                    AnswerSubmission(
                        questionId = it.questionId,
                        answer = it.answer,
                        elapsedMs = it.elapsedMs,
                    )
                },
            ),
        )
    }.fold(
        onSuccess = { outcome ->
            if (outcome.rejected > 0) {
                // Means the client offered a table the plan doesn't cover.
                Log.w("TradiesRun", "server rejected ${outcome.rejected} answers")
            }
            RunSummary.Banked(
                correct = outcome.correct,
                total = outcome.total,
                accuracyPercent = outcome.accuracyPercent,
                averageMs = outcome.averageMs,
                coins = outcome.coins,
                materials = outcome.materials,
                coinsTotal = outcome.coinsTotal,
                capped = outcome.capped,
                housesCompleted = outcome.houseStagesCompleted,
                newRank = outcome.newRank?.let { rankName(it) },
                divisionUnlockedFor = outcome.divisionUnlockedFor,
            )
        },
        onFailure = { cause ->
            Log.w("TradiesRun", "run-finish failed", cause)
            RunSummary.NotSaved(
                correct = fallback.correct,
                total = fallback.total,
                accuracyPercent = fallback.accuracyPercent,
                averageMs = fallback.averageMs,
                reason = cause.message ?: "Network error",
            )
        },
    )
}

@Serializable
data object SignInRoute

@Serializable
data object PickerRoute

@Serializable
data object HubRoute

@Serializable
data class RunRoute(val modeKey: String, val label: String)

@Serializable
data object ResultsRoute

@Serializable
data object MasteryRoute

/**
 * The nav host, and the gate.
 *
 * `proxy.ts` refreshes the session and redirects unauthenticated requests on
 * the web; there is no native equivalent (§2.4), so the same three questions
 * are asked here instead — is there a session, is a student chosen, and only
 * then is the play area reachable.
 */
@Composable
fun TradiesApp() {
    val context = LocalContext.current
    val repository = remember { Graph.repository(context) }
    val navController: NavHostController = rememberNavController()
    val scope = rememberCoroutineScope()

    // Session and selected profile. Held here because they gate the graph;
    // once the JWT carries a student_id claim (§0.5) the selection moves into
    // the token and RLS enforces it rather than this variable.
    var activeStudent by remember { mutableStateOf<StudentDto?>(null) }
    var lastSummary by remember { mutableStateOf<RunSummary?>(null) }
    var hubState by remember { mutableStateOf<HubState?>(null) }

    // Restore the persisted session *before* deciding where to start.
    //
    // The await matters: reading the session off disk is asynchronous, so
    // asking for the user id immediately returns null even when a valid
    // session exists, and a returning parent lands on sign-in for no reason.
    var startRoute by remember { mutableStateOf<Any?>(null) }
    LaunchedEffect(Unit) {
        repository.awaitSessionRestore()
        startRoute = if (repository.currentUserId() != null) PickerRoute else SignInRoute
    }

    val start = startRoute ?: return

    NavHost(navController = navController, startDestination = start) {

        composable<SignInRoute> {
            SignInScreen(
                repository = repository,
                onSignedIn = {
                    navController.navigate(PickerRoute) {
                        popUpTo(SignInRoute) { inclusive = true }
                    }
                },
            )
        }

        composable<PickerRoute> {
            StudentPickerScreen(
                repository = repository,
                onPicked = { student ->
                    activeStudent = student
                    hubState = null
                    navController.navigate(HubRoute)
                },
                onSignOut = {
                    scope.launch {
                        repository.signOut()
                        activeStudent = null
                        navController.navigate(SignInRoute) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                },
            )
        }

        composable<HubRoute> {
            val student = activeStudent
            if (student == null) {
                LaunchedEffect(Unit) { navController.popBackStack() }
                return@composable
            }

            LaunchedEffect(student.id) {
                if (hubState != null) return@LaunchedEffect
                runCatching {
                    // Re-read the student: coins and rank move every run.
                    val fresh = repository.student(student.id) ?: student
                    val facts = repository.mastery(student.id)
                    val modes = repository.modes(student.id)

                    HubState(
                        tradieName = fresh.tradieName,
                        coins = fresh.coins,
                        rankRung = fresh.rankRung,
                        factsSeen = facts.count { it.attempts > 0 },
                        // From the modes endpoint, not from student_tables —
                        // the plan may be withholding zones the student owns.
                        playableTables = modes.playableTables,
                        atFreeCeiling = modes.atFreeCeiling,
                        modes = modes.modes.map { dto ->
                            PracticeMode(
                                key = dto.key,
                                name = dto.name,
                                blurb = dto.blurb,
                                tone = toneForMode(dto.key),
                                availability = if (dto.playable) {
                                    ModeAvailability.Playable
                                } else {
                                    ModeAvailability.Locked(dto.reason ?: "Locked")
                                },
                            )
                        },
                    )
                }.onFailure { Log.w("TradiesHub", "hub load failed", it) }
                    .onSuccess { hubState = it }
            }

            HubScreen(
                state = hubState,
                onPlay = { mode ->
                    navController.navigate(RunRoute(mode.key, mode.name))
                },
                onOpenGrid = { navController.navigate(MasteryRoute) },
                onSwitchStudent = {
                    activeStudent = null
                    navController.navigate(PickerRoute) {
                        popUpTo(PickerRoute) { inclusive = true }
                    }
                },
            )
        }

        composable<RunRoute> { entry ->
            val route: RunRoute = entry.toRoute()
            val student = activeStudent
            var config by remember(route.modeKey) { mutableStateOf<RunConfig?>(null) }
            var startError by remember(route.modeKey) { mutableStateOf<String?>(null) }

            // The server builds the run. That is what makes The Garage
            // adaptive — selection weights by the mastery ladder — and it is
            // why no question generator exists on this side at all (§0.2).
            LaunchedEffect(route.modeKey, student?.id) {
                val id = student?.id ?: return@LaunchedEffect
                runCatching {
                    repository.startRun(RunStartRequest(studentId = id, mode = route.modeKey))
                }.onSuccess { started ->
                    config = RunConfig(
                        runId = started.runId,
                        label = route.label,
                        timerSeconds = started.timerSeconds,
                        questions = started.questions.map { q ->
                            Question(
                                id = q.id,
                                operation = if (q.operation == "divide") {
                                    Operation.DIVIDE
                                } else {
                                    Operation.MULTIPLY
                                },
                                a = q.a,
                                b = q.b,
                                prompt = q.prompt,
                                spoken = q.spoken,
                                answer = q.answer,
                            )
                        },
                    )
                }.onFailure {
                    Log.w("TradiesRun", "run-start failed", it)
                    startError = it.message ?: "Couldn't start that job"
                }
            }

            val ready = config
            when {
                startError != null -> RunStartFailed(
                    message = startError!!,
                    onBack = { navController.popBackStack() },
                )
                ready == null -> RunLoading()
                else -> RunScreen(
                    config = ready,
                    onFinished = { answers: List<AnsweredFact> ->
                        scope.launch {
                            lastSummary = submitRun(repository, ready.runId, answers)
                            // Coins and rank moved; make the hub re-read rather
                            // than showing a stale total behind the results.
                            hubState = null
                            navController.navigate(ResultsRoute) { popUpTo(HubRoute) }
                        }
                    },
                    onQuit = { navController.popBackStack() },
                )
            }
        }

        composable<MasteryRoute> {
            val student = activeStudent
            if (student == null) {
                LaunchedEffect(Unit) { navController.popBackStack() }
            } else {
                MasteryScreen(
                    repository = repository,
                    studentId = student.id,
                    onBack = { navController.popBackStack() },
                )
            }
        }

        composable<ResultsRoute> {
            val summary = lastSummary
            if (summary == null) {
                LaunchedEffect(Unit) {
                    navController.popBackStack(HubRoute, inclusive = false)
                }
            } else {
                ResultsScreen(
                    summary = summary,
                    onDone = { navController.popBackStack(HubRoute, inclusive = false) },
                )
            }
        }
    }
}
