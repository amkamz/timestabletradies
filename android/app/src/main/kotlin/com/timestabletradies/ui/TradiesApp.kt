package com.timestabletradies.ui

import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.platform.LocalContext
import com.timestabletradies.core.designsystem.PopTab
import com.timestabletradies.core.designsystem.PopTabScaffold
import com.timestabletradies.core.designsystem.PopTokens
import com.timestabletradies.core.model.AnsweredFact
import com.timestabletradies.core.model.ModeAvailability
import com.timestabletradies.core.model.Operation
import com.timestabletradies.core.model.PracticeMode
import com.timestabletradies.core.model.Question
import com.timestabletradies.core.model.RunConfig
import com.timestabletradies.core.network.AnswerSubmission
import com.timestabletradies.core.network.HouseState
import com.timestabletradies.core.network.MasteryCell
import com.timestabletradies.core.network.MasteryGrid
import com.timestabletradies.core.network.ModesResponse
import com.timestabletradies.core.network.RunStartRequest
import com.timestabletradies.core.network.RunSubmission
import com.timestabletradies.core.network.StudentDto
import com.timestabletradies.core.network.StudentSettings
import com.timestabletradies.core.network.TradiesRepository
import com.timestabletradies.data.DailyJobLog
import com.timestabletradies.data.Graph
import com.timestabletradies.ui.boss.BossIntroScreen
import com.timestabletradies.ui.boss.BossVictoryScreen
import com.timestabletradies.ui.crew.CrewRaceLobbyScreen
import com.timestabletradies.ui.crew.JobChallengeScreen
import com.timestabletradies.ui.crew.TradeExpoScreen
import com.timestabletradies.ui.grandparent.StickerSendScreen
import com.timestabletradies.ui.house.HouseProjectScreen
import com.timestabletradies.ui.house.MoveInDayScreen
import com.timestabletradies.ui.jobs.JobBoardScreen
import com.timestabletradies.ui.jobs.JobBriefingScreen
import com.timestabletradies.ui.jobs.JobResultsScreen
import com.timestabletradies.ui.jobs.JobRunScreen
import com.timestabletradies.ui.jobs.RunChrome
import com.timestabletradies.ui.mastery.FactDetail
import com.timestabletradies.ui.mastery.MasteryGridScreen
import com.timestabletradies.ui.modes.BigJobScreen
import com.timestabletradies.ui.modes.GarageScreen
import com.timestabletradies.ui.modes.ToolboxTimeScreen
import com.timestabletradies.ui.modes.TradeRankScreen
import com.timestabletradies.ui.modes.TradeZonesScreen
import com.timestabletradies.ui.modes.TrainingShedScreen
import com.timestabletradies.ui.modes.toneForMode
import com.timestabletradies.ui.onboarding.AddStudentScreen
import com.timestabletradies.ui.onboarding.CharacterGalleryScreen
import com.timestabletradies.ui.onboarding.GrownUpGateScreen
import com.timestabletradies.ui.onboarding.MeetTradieScreen
import com.timestabletradies.ui.onboarding.NameGeneratorScreen
import com.timestabletradies.ui.onboarding.ParentAccountScreen
import com.timestabletradies.ui.onboarding.StudentDraft
import com.timestabletradies.ui.onboarding.WelcomeScreen
import com.timestabletradies.ui.settings.AccessibilityScreen
import com.timestabletradies.ui.settings.MoreTradesScreen
import com.timestabletradies.ui.shop.LockerScreen
import com.timestabletradies.ui.shop.ShopScreen
import com.timestabletradies.ui.shop.TryOnScreen
import com.timestabletradies.ui.site.SiteHomeScreen
import com.timestabletradies.ui.state.ChallengeOutcome
import com.timestabletradies.ui.state.JobCard
import com.timestabletradies.ui.state.LockerItem
import com.timestabletradies.ui.state.LockerSlot
import com.timestabletradies.ui.state.QuestionStyle
import com.timestabletradies.ui.state.ShopCategory
import com.timestabletradies.ui.state.SiteState
import com.timestabletradies.ui.state.Storyboard
import com.timestabletradies.ui.state.TradieDraft
import com.timestabletradies.ui.state.ZoneRow
import com.timestabletradies.ui.state.ZoneState
import com.timestabletradies.ui.state.rankNameFor
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * The whole app: the gate, the tabs, and every full-screen destination.
 *
 * ## The gate
 *
 * `proxy.ts` refreshes the session and redirects unauthenticated requests on
 * the web; there is no native equivalent (§2.4), so the same questions are asked
 * here — is there a session, is a student chosen, and only then is the site
 * reachable.
 *
 * ## Two kinds of screen
 *
 * The tab bar is furniture: it stays put and only its selected cell moves. So
 * anything that keeps the bar is a [Panel] inside [PopTabScaffold], and anything
 * that takes the window is a [FullRoute] on the stack above it. Onboarding,
 * every screen with a clock running, boss battles, live races and celebrations
 * are full-screen — the bar vanishing is how a child knows they are *in*
 * something rather than browsing.
 *
 * ## What is server-backed and what is not
 *
 * Wired for real: sign-in, the student list, `modes`, `mastery`, `house`,
 * `student_settings`, and both halves of a run. Everything else — the job
 * board, the shop catalogue, crew rosters, boss briefs — renders from
 * [Storyboard], which says at its own definition which endpoint each is
 * waiting on (§1.1, §1.3). The seams are deliberate and marked rather than
 * hidden behind a fake network layer.
 */
@Composable
fun TradiesApp(
    /** Set when a deep link opened the app. Null on a normal launch. */
    entry: AppEntry? = null,
    onPreferences: (reducedMotion: Boolean, textScale: Float) -> Unit = { _, _ -> },
) {
    val context = LocalContext.current
    val repository = remember { Graph.repository(context) }
    val dailyJobs = remember { DailyJobLog(context) }
    val scope = rememberCoroutineScope()

    /* ------------------------------------------------------------- session */

    var activeStudent by remember { mutableStateOf<StudentDto?>(null) }
    var house by remember { mutableStateOf<HouseState?>(null) }
    var houseError by remember { mutableStateOf<String?>(null) }
    var modes by remember { mutableStateOf<ModesResponse?>(null) }
    var grid by remember { mutableStateOf<MasteryGrid?>(null) }
    var gridError by remember { mutableStateOf<String?>(null) }
    var settings by remember { mutableStateOf<StudentSettings?>(null) }
    var settingsError by remember { mutableStateOf<String?>(null) }

    /* ------------------------------------------------------------ position */

    var tab by remember { mutableStateOf(PopTab.Site) }
    var panel by remember { mutableStateOf<Panel>(Panel.Site) }
    val stack: SnapshotStateList<FullRoute> = remember { mutableStateListOf() }

    /* --------------------------------------------------------- screen state */

    var lastSummary by remember { mutableStateOf<RunSummary?>(null) }
    var lastJobTitle by remember { mutableStateOf("") }
    var lastRun by remember { mutableStateOf<FullRoute.Run?>(null) }
    var selectedFact by remember { mutableStateOf<MasteryCell?>(null) }
    var factDetail by remember { mutableStateOf<FactDetail?>(null) }
    var shopCategory by remember { mutableStateOf(ShopCategory.Hats) }
    var lockerSlot by remember { mutableStateOf(LockerSlot.Head) }
    var stickerSendFailed by remember { mutableStateOf(false) }
    var jobsDoneToday by remember { mutableStateOf(dailyJobs.completedToday()) }

    // Purchases and equips are held here until `purchaseItem` / `equipItem`
    // become Edge Functions (§1.1). Marked rather than hidden: they do not
    // survive a restart, and pretending otherwise would be worse than the gap.
    val ownedLocally = remember { mutableStateListOf<String>() }
    val equippedLocally = remember { mutableStateMapOf<LockerSlot, String>() }

    // Onboarding drafts, held in memory for the length of the wizard.
    val studentDrafts = remember { mutableStateListOf<StudentDraft>() }
    var tradieDraft by remember { mutableStateOf(TradieDraft()) }
    var signUpBusy by remember { mutableStateOf(false) }
    var signUpError by remember { mutableStateOf<String?>(null) }

    fun push(route: FullRoute) {
        stack.add(route)
    }

    fun pop() {
        if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex)
    }

    fun resetTo(route: FullRoute) {
        stack.clear()
        stack.add(route)
    }

    fun goToSite() {
        stack.clear()
        tab = PopTab.Site
        panel = Panel.Site
    }

    /* --------------------------------------------------------------- loads */

    // Every failure below logs the throwable and shows a line this app wrote.
    //
    // Not politeness — safety. These calls go out through Ktor, and Ktor builds
    // its exception message from the failed request including the
    // `Authorization: Bearer …` header. Any `it.message` that reaches a
    // Composable puts the session token on screen.
    suspend fun loadStudentData(student: StudentDto) {
        runCatching { repository.modes(student.id) }
            .onSuccess { modes = it }
            .onFailure { Log.w("TradiesApp", "modes failed", it) }

        runCatching { repository.house(student.id) }
            .onSuccess { house = it; houseError = null }
            .onFailure {
                Log.w("TradiesApp", "house failed", it)
                houseError = "Couldn't load the build just now."
            }

        runCatching { repository.masteryGrid(student.id) }
            .onSuccess { grid = it; gridError = null }
            .onFailure {
                Log.w("TradiesApp", "mastery failed", it)
                gridError = "Couldn't load the grid just now."
            }

        runCatching { repository.settings(student.id) }
            .onSuccess {
                settings = it
                settingsError = null
                onPreferences(it.reducedMotion, it.textScale.toFloat())
            }
            .onFailure {
                Log.w("TradiesApp", "settings failed", it)
                settingsError = "Couldn't load your settings just now."
            }
    }

    /** Re-read everything a finished run moved. */
    fun refresh() {
        val student = activeStudent ?: return
        scope.launch {
            runCatching { repository.student(student.id) }.onSuccess { fresh ->
                if (fresh != null) activeStudent = fresh
            }
            loadStudentData(activeStudent ?: student)
        }
    }

    fun selectStudent(student: StudentDto) {
        activeStudent = student
        house = null
        grid = null
        modes = null
        settings = null
        scope.launch { loadStudentData(student) }
        goToSite()
    }

    // Restore the persisted session *before* deciding where to start. Reading
    // it off disk is asynchronous, so asking for the user id immediately
    // returns null even when a good session exists — and a returning parent
    // lands on sign-in for no reason.
    var restored by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        repository.awaitSessionRestore()
        stack.add(
            when (entry) {
                // A grandparent holds a link, not an account. Sending them to
                // sign-in would be sending them to a wall.
                is AppEntry.Cheer -> FullRoute.Grandparent(entry.childName, entry.milestone)
                // An invite needs a signed-in parent to attach to, so it lands
                // wherever the session already is.
                is AppEntry.Join,
                null,
                -> if (repository.currentUserId() != null) {
                    FullRoute.Picker
                } else {
                    FullRoute.Welcome
                }
            },
        )
        restored = true
    }

    if (!restored) return

    /* ------------------------------------------------------------- derived */

    val student = activeStudent
    val playableTables = modes?.playableTables ?: emptyList()
    val jobs = remember(playableTables) {
        if (playableTables.isEmpty()) emptyList() else Storyboard.jobBoardStub(playableTables)
    }

    val site = student?.let {
        val stage = house?.stages?.firstOrNull { s -> s.current }
        SiteState(
            tradieName = it.tradieName,
            coins = it.coins,
            timber = house?.loads ?: it.houseLoads,
            // Streak has no column yet; shown as zero rather than invented.
            streakDays = 0,
            houseName = "${it.displayName}'s Cottage",
            stageName = stage?.name ?: "Foundations",
            housePercent = house?.percent ?: 0,
            jobsToday = jobs.size,
            // A boss opens when a zone is finished. Until the boss endpoint
            // exists this asks the nearest question of data the client already
            // holds: has anything reached Blue yet.
            bossReady = (grid?.counts?.blue ?: 0) > 0,
        )
    }

    val practiceModes = modes?.modes.orEmpty().map { dto ->
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
    }

    val zones = remember(playableTables, grid) {
        Storyboard.unlockOrder.map { table ->
            val open = table in playableTables
            val cells = grid?.cells.orEmpty().filter { it.a == table || it.b == table }
            val solid = cells.count { it.stage == "gold" || it.stage == "blue" }
            val percent = if (cells.isEmpty()) 0 else solid * 100 / cells.size
            ZoneRow(
                table = table,
                trade = Storyboard.tradeFor(table),
                fluencyPercent = percent,
                state = when {
                    !open -> ZoneState.Locked
                    percent >= 100 -> ZoneState.Fluent
                    else -> ZoneState.Current
                },
            )
        }
    }

    val shopItems = remember(ownedLocally.size) {
        Storyboard.shopItems.map {
            if (it.key in ownedLocally) it.copy(owned = true) else it
        }
    }

    val lockerItems: List<LockerItem> = remember(ownedLocally.size, equippedLocally.size) {
        Storyboard.shopItems
            .filter { it.owned || it.key in ownedLocally }
            .map {
                val slot = it.category.toLockerSlot()
                LockerItem(
                    key = it.key,
                    name = it.name,
                    slot = slot,
                    owned = true,
                    equipped = equippedLocally[slot] == it.key,
                )
            } + house?.rareItems.orEmpty().filter { it.owned }.map {
            LockerItem(
                key = it.key,
                name = it.name,
                slot = LockerSlot.Tools,
                owned = true,
                equipped = false,
                rare = true,
            )
        }
    }

    /* ---------------------------------------------------------------- back */

    // Back pops the full-screen stack first, then unwinds a tab's own panel to
    // its home, then falls through to the system.
    //
    // The last route is only poppable when there is a site to land on. Welcome,
    // sign-in, the picker before a profile is chosen, and the grandparent's
    // one-screen app are all roots — backing out of them means leaving the app,
    // which is right. Backing out of a *run* means stopping the run, which the
    // ✕ also does, and a child pressing back mid-question must not be dropped
    // out of the app entirely.
    val top = stack.lastOrNull()
    val rootish = top == null ||
        top is FullRoute.Welcome ||
        top is FullRoute.SignIn ||
        top is FullRoute.Picker ||
        top is FullRoute.Grandparent
    val canPopRoute = stack.size > 1 || (stack.size == 1 && student != null && !rootish)

    BackHandler(enabled = canPopRoute || (stack.isEmpty() && panel != tab.home())) {
        if (canPopRoute) pop() else panel = tab.home()
    }

    /* -------------------------------------------------------------- render */

    val route = stack.lastOrNull()

    if (route == null) {
        PopTabScaffold(
            selected = tab,
            onSelect = { next ->
                tab = next
                panel = next.home()
            },
        ) { shownTab ->
            // The wipe animates on the tab, so the panel shown has to be the one
            // belonging to whichever tab is being drawn — mid-transition that is
            // the *outgoing* tab for one of the two frames.
            val shownPanel = if (shownTab == tab) panel else shownTab.home()

            when (shownPanel) {
                Panel.Site -> if (site != null) {
                    SiteHomeScreen(
                        state = site,
                        onStartWork = { tab = PopTab.Jobs; panel = Panel.Board },
                        onBossBattle = {
                            push(FullRoute.BossIntro(playableTables.lastOrNull() ?: 2))
                        },
                        onCrewRace = { push(FullRoute.CrewLobby) },
                        onSettings = { push(FullRoute.Accessibility) },
                        onHouse = { panel = Panel.House },
                        onShop = { tab = PopTab.Shop; panel = Panel.Shop },
                    )
                }

                Panel.House -> HouseProjectScreen(
                    house = house,
                    houseName = site?.houseName ?: "Cottage",
                    error = houseError,
                    onBack = { panel = Panel.Site },
                    onMoveIn = { push(FullRoute.MoveIn) },
                )

                Panel.Zones -> TradeZonesScreen(
                    zones = zones,
                    atCeiling = modes?.atFreeCeiling == true,
                    onPlay = { zone ->
                        push(
                            FullRoute.Run(
                                modeKey = MODE_JOB,
                                label = "${zone.trade} · ×${zone.table}",
                                style = QuestionStyle.Keypad,
                                tableNo = zone.table,
                            ),
                        )
                    },
                    // The only place a child is sent toward money, and it says
                    // nothing about money: a grown-up gate, then the parent's
                    // own dashboard on the web (§1.10).
                    onAskGrownUp = {
                        push(
                            FullRoute.Gate(
                                then = GateTarget.MoreTrades,
                                reason = "Opening more trades is a grown-up job. " +
                                    "Ask them to key in the answer.",
                            ),
                        )
                    },
                )

                Panel.Board -> JobBoardScreen(
                    jobs = jobs,
                    completed = jobsDoneToday,
                    onPick = { push(FullRoute.Briefing(it)) },
                    onTrainingShed = { panel = Panel.Shed },
                    onTradeZones = { tab = PopTab.Site; panel = Panel.Zones },
                )

                Panel.Shed -> TrainingShedScreen(
                    modes = practiceModes,
                    loading = modes == null,
                    onPlay = { mode -> openMode(mode) { push(it) } },
                )

                Panel.Expo -> TradeExpoScreen(
                    rows = Storyboard.expoStub(student?.displayName ?: "You"),
                    onJoinNextRace = { push(FullRoute.CrewLobby) },
                    onBack = { panel = Panel.Board },
                )

                Panel.Challenges -> JobChallengeScreen(
                    latest = ChallengeOutcome("Leah", 9, 7, 10),
                    contacts = Storyboard.challengeContacts,
                    onSend = { push(FullRoute.CrewLobby) },
                    onBack = { panel = Panel.Board },
                )

                Panel.Grid -> MasteryGridScreen(
                    grid = grid,
                    error = gridError,
                    selected = selectedFact,
                    detail = factDetail,
                    // Rides on `high_contrast` until it has a column of its own.
                    showShapes = settings?.highContrast == true,
                    unlockedTables = playableTables,
                    onSelect = { cell ->
                        selectedFact = cell
                        factDetail = null
                        val id = student?.id
                        if (cell != null && id != null) {
                            // The rolling window is read on tap rather than for
                            // all 144 up front: one small query when a child
                            // asks, instead of 144 they never look at.
                            scope.launch {
                                runCatching { repository.recentAnswers(id, cell.a, cell.b) }
                                    .onSuccess { rows ->
                                        factDetail = FactDetail(
                                            attemptsInWindow = rows.size,
                                            correctInWindow = rows.count { r -> r.correct },
                                            averageMs = if (rows.isEmpty()) {
                                                0
                                            } else {
                                                rows.sumOf { r -> r.elapsedMs } / rows.size
                                            },
                                            lifetimeAttempts = cell.attempts,
                                        )
                                    }
                                    .onFailure { Log.w("TradiesApp", "answer log failed", it) }
                            }
                        }
                    },
                    onPractise = { tables -> push(FullRoute.Toolbox(tables)) },
                )

                Panel.Shop -> ShopScreen(
                    coins = student?.coins ?: 0,
                    items = shopItems,
                    category = shopCategory,
                    onCategory = { shopCategory = it },
                    onPick = { push(FullRoute.TryOn(it.key)) },
                )

                Panel.Locker -> LockerScreen(
                    tradieName = student?.displayName ?: "Your",
                    items = lockerItems,
                    slot = lockerSlot,
                    onSlot = { lockerSlot = it },
                    onEquip = { equippedLocally[it.slot] = it.key },
                )
            }
        }
        return
    }

    when (route) {

        /* ---------------------------------------------------- onboarding */

        FullRoute.Welcome -> WelcomeScreen(
            onNewSite = { push(FullRoute.Gate(GateTarget.Setup)) },
            onExistingSite = { push(FullRoute.SignIn) },
        )

        is FullRoute.Gate -> GrownUpGateScreen(
            reason = route.reason ?: "Setting up, adding crew and anything to do " +
                "with money is done by a parent. Ask them to key in the answer.",
            onPassed = {
                pop()
                when (route.then) {
                    GateTarget.Setup -> push(FullRoute.ParentAccount)
                    GateTarget.SwitchTradie -> push(FullRoute.Picker)
                    GateTarget.MoreTrades -> push(FullRoute.MoreTrades)
                }
            },
            onCancel = { pop() },
        )

        FullRoute.SignIn -> SignInScreen(
            repository = repository,
            onSignedIn = { resetTo(FullRoute.Picker) },
        )

        FullRoute.Picker -> StudentPickerScreen(
            repository = repository,
            onPicked = { selectStudent(it) },
            onSignOut = {
                scope.launch {
                    repository.signOut()
                    activeStudent = null
                    resetTo(FullRoute.Welcome)
                }
            },
        )

        FullRoute.ParentAccount -> ParentAccountScreen(
            busy = signUpBusy,
            error = signUpError,
            onCreate = { name, email, password ->
                signUpBusy = true
                signUpError = null
                scope.launch {
                    runCatching { repository.signUpParent(name, email, password) }
                        .onSuccess {
                            signUpBusy = false
                            push(FullRoute.AddStudents)
                        }
                        .onFailure {
                            Log.w("TradiesApp", "sign-up failed", it)
                            signUpBusy = false
                            signUpError = "Couldn't create the account just now. " +
                                "Check the connection and try again."
                        }
                }
            },
            onBack = { pop() },
        )

        FullRoute.AddStudents -> AddStudentScreen(
            students = studentDrafts,
            onAdd = { studentDrafts.add(it) },
            onRemove = { studentDrafts.removeAt(it) },
            onNext = {
                tradieDraft = tradieDraft.copy(
                    displayName = studentDrafts.firstOrNull()?.name.orEmpty(),
                )
                push(FullRoute.PickLook)
            },
            onBack = { pop() },
        )

        FullRoute.PickLook -> CharacterGalleryScreen(
            draft = tradieDraft,
            onChange = { tradieDraft = it },
            onNext = { push(FullRoute.PickName) },
            onBack = { pop() },
        )

        FullRoute.PickName -> NameGeneratorScreen(
            draft = tradieDraft,
            onChange = { tradieDraft = it },
            onConfirm = { push(FullRoute.MeetTradie) },
            onBack = { pop() },
        )

        FullRoute.MeetTradie -> MeetTradieScreen(
            draft = tradieDraft,
            // Straight into the picker, which is where the newly-created
            // profiles appear. The next tap after setup should land on a job.
            onStart = { resetTo(FullRoute.Picker) },
        )

        /* ---------------------------------------------------------- loop */

        is FullRoute.Briefing -> JobBriefingScreen(
            job = route.job,
            onStart = {
                pop()
                push(
                    FullRoute.Run(
                        modeKey = route.job.modeKey,
                        label = route.job.title,
                        style = route.job.style,
                        tableNo = route.job.tableNo,
                        job = route.job,
                    ),
                )
            },
            onCancel = { pop() },
        )

        is FullRoute.Run -> {
            val id = student?.id
            if (id == null) {
                LaunchedEffect(Unit) { pop() }
            } else {
                RunHost(
                    repository = repository,
                    studentId = id,
                    route = route,
                    readAloud = settings?.readAloud == true || route.readAloud,
                    onFinished = { summary ->
                        lastSummary = summary
                        lastJobTitle = route.label
                        lastRun = route
                        // A job only counts as done when it was finished. Quitting
                        // still banks the answers (below) but leaves the card on
                        // the board, because the child hasn't done that job yet.
                        route.job?.let { card ->
                            dailyJobs.markDone(card.id)
                            jobsDoneToday = dailyJobs.completedToday()
                        }
                        // Coins, mastery and the house all moved; make the tabs
                        // re-read rather than show a stale total behind results.
                        refresh()
                        pop()
                        push(
                            if (route.chrome == ChromeKind.Boss) {
                                FullRoute.BossVictory(route.tableNo ?: 2)
                            } else {
                                FullRoute.Results
                            },
                        )
                    },
                    // Banked from *this* scope, not the runner's.
                    //
                    // The obvious version — pop, then launch the submit inside
                    // RunHost — silently loses every answer: popping takes
                    // RunHost out of the composition, which cancels its
                    // `rememberCoroutineScope` before the request goes out. The
                    // work has to be owned by something that outlives the screen
                    // being left, and that is this composable.
                    onLeave = { runId, answers ->
                        pop()
                        if (answers.isNotEmpty()) {
                            scope.launch {
                                submitRun(repository, runId, answers)
                                refresh()
                            }
                        }
                    },
                )
            }
        }

        FullRoute.Results -> {
            val summary = lastSummary
            if (summary == null) {
                LaunchedEffect(Unit) { goToSite() }
            } else {
                JobResultsScreen(
                    summary = summary,
                    jobTitle = lastJobTitle,
                    onAgain = {
                        val again = lastRun
                        pop()
                        if (again != null) push(again)
                    },
                    onBackToSite = { goToSite() },
                )
            }
        }

        /* --------------------------------------------------------- modes */

        FullRoute.Garage -> GarageScreen(
            focusTables = playableTables.takeLast(3),
            teacherSet = false,
            coinsPerCorrect = GARAGE_COINS_PER_CORRECT,
            onStart = {
                pop()
                push(
                    FullRoute.Run(
                        modeKey = "garage",
                        label = "The Garage",
                        style = QuestionStyle.Keypad,
                    ),
                )
            },
            onBack = { pop() },
        )

        FullRoute.Yard -> TradeRankScreen(
            currentRung = student?.rankRung ?: 1,
            justRankedUp = (lastSummary as? RunSummary.Banked)?.newRank != null,
            onRunTheYard = {
                pop()
                push(
                    FullRoute.Run(
                        modeKey = "yard",
                        label = "The Yard",
                        style = QuestionStyle.Keypad,
                    ),
                )
            },
            onBack = { pop() },
        )

        is FullRoute.Toolbox -> ToolboxTimeScreen(
            availableTables = playableTables,
            divisionUnlocked = modes?.divisionUnlocked.orEmpty(),
            preselect = route.preselect,
            onStart = { operation, tables, aloud ->
                pop()
                push(
                    FullRoute.Run(
                        modeKey = "toolbox",
                        label = "Toolbox Time",
                        style = QuestionStyle.Keypad,
                        // The whole picker goes to the server, which intersects
                        // it with what this family may actually play.
                        tables = tables,
                        operation = operation,
                        readAloud = aloud,
                    ),
                )
            },
            onBack = { pop() },
        )

        FullRoute.BigJob -> BigJobScreen(
            available = true,
            nextAvailableLabel = null,
            onStart = {
                pop()
                push(
                    FullRoute.Run(
                        modeKey = "bigjob",
                        label = "The Big Job",
                        style = QuestionStyle.Tiles,
                    ),
                )
            },
            onBack = { pop() },
        )

        /* -------------------------------------------------- boss & house */

        is FullRoute.BossIntro -> BossIntroScreen(
            brief = Storyboard.bossFor(route.table),
            onFight = {
                pop()
                push(
                    FullRoute.Run(
                        modeKey = MODE_BOSS,
                        label = Storyboard.bossFor(route.table).name,
                        style = QuestionStyle.Tiles,
                        tableNo = route.table,
                        chrome = ChromeKind.Boss,
                    ),
                )
            },
            onBack = { pop() },
        )

        is FullRoute.BossVictory -> BossVictoryScreen(
            drop = Storyboard.rareDropFor(route.table),
            onAddToHouse = {
                stack.clear()
                tab = PopTab.Site
                panel = Panel.House
            },
        )

        FullRoute.MoveIn -> MoveInDayScreen(
            houseName = site?.houseName ?: "Cottage",
            housesFinished = 1,
            onSeeTheStreet = {
                stack.clear()
                tab = PopTab.Site
                panel = Panel.House
            },
            onStartNewBuild = { goToSite() },
        )

        /* ---------------------------------------------------------- crew */

        FullRoute.CrewLobby -> CrewRaceLobbyScreen(
            racers = Storyboard.crewStub(student?.displayName ?: "You"),
            tableLabel = playableTables.lastOrNull()?.let { "×$it" } ?: "MIXED",
            teacherSet = false,
            onStart = {
                pop()
                push(
                    FullRoute.Run(
                        modeKey = MODE_CREW_RACE,
                        label = "Crew Race",
                        style = QuestionStyle.Tiles,
                        chrome = ChromeKind.Race,
                    ),
                )
            },
            onExpo = {
                pop()
                tab = PopTab.Jobs
                panel = Panel.Expo
            },
            onChallenges = {
                pop()
                tab = PopTab.Jobs
                panel = Panel.Challenges
            },
            onBack = { pop() },
        )

        /* ---------------------------------------------------------- shop */

        is FullRoute.TryOn -> {
            val item = shopItems.firstOrNull { it.key == route.itemKey }
            if (item == null) {
                LaunchedEffect(Unit) { pop() }
            } else {
                TryOnScreen(
                    item = item,
                    coins = student?.coins ?: 0,
                    onBuy = {
                        // Local until `purchaseItem` is an Edge Function (§1.1).
                        // The coin balance is the server's and is deliberately
                        // *not* decremented here — a client that could spend its
                        // own coins could also mint them.
                        ownedLocally.add(item.key)
                        pop()
                    },
                    onNotNow = { pop() },
                    onBack = { pop() },
                )
            }
        }

        /* ------------------------------------------------------ settings */

        FullRoute.Accessibility -> AccessibilityScreen(
            settings = settings,
            error = settingsError,
            readAloudReady = true,
            onChange = { next ->
                settings = next
                onPreferences(next.reducedMotion, next.textScale.toFloat())
                // Saved as it changes rather than behind a Save button: a child
                // should not have to understand committing a form to make text
                // bigger.
                scope.launch { runCatching { repository.saveSettings(next) } }
            },
            onSwitchTradie = {
                pop()
                push(
                    FullRoute.Gate(
                        then = GateTarget.SwitchTradie,
                        reason = "Choosing who's playing is a grown-up job. " +
                            "Ask them to key in the answer.",
                    ),
                )
            },
            onBack = { pop() },
        )

        FullRoute.MoreTrades -> MoreTradesScreen(onDone = { goToSite() })

        is FullRoute.Grandparent -> StickerSendScreen(
            childName = route.childName,
            milestone = route.milestone,
            sendFailed = stickerSendFailed,
            // `sendSticker` is still a server action on the web and has no Edge
            // Function yet (§1.1), so there is nowhere to post this. The screen
            // says so rather than confirming a delivery that never happened.
            onSend = { _, _ -> stickerSendFailed = true },
        )
    }
}

/**
 * Ask the server for a run, then play it.
 *
 * The questions come from `run-start`, not from here. That is what makes The
 * Garage genuinely adaptive — selection weights by the mastery ladder, which a
 * client would need the whole ruleset to do — and it is what keeps a second
 * implementation of question generation from existing at all (§0.2).
 */
@Composable
private fun RunHost(
    repository: TradiesRepository,
    studentId: String,
    route: FullRoute.Run,
    readAloud: Boolean,
    onFinished: (RunSummary) -> Unit,
    /**
     * The child left mid-job, with whatever they had answered.
     *
     * Handed up rather than banked here: leaving unmounts this composable, and
     * a coroutine started on its scope dies with it.
     */
    onLeave: (runId: String, answers: List<AnsweredFact>) -> Unit,
) {
    var config by remember(route) { mutableStateOf<RunConfig?>(null) }
    var startError by remember(route) { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val chrome = remember(route) { route.chrome.toChrome(route) }

    /**
     * Whether the opening hold is over.
     *
     * `run-start` on a good connection can come back inside three frames, and a
     * loading screen that appears and vanishes that fast doesn't read as
     * loading — it reads as the screen flickering. Holding it for [PhaseHoldMs]
     * costs a beat and makes the seam deliberate.
     */
    var held by remember(route) { mutableStateOf(false) }
    LaunchedEffect(route) {
        delay(PhaseHoldMs)
        held = true
    }

    LaunchedEffect(route) {
        runCatching {
            repository.startRun(
                RunStartRequest(
                    studentId = studentId,
                    mode = route.modeKey,
                    tableNo = route.tableNo,
                    tables = route.tables.takeIf { it.isNotEmpty() },
                    operation = route.operation,
                ),
            )
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
            // The throwable is logged, never shown. Ktor builds its exception
            // message out of the whole failed request — which includes the
            // `Authorization: Bearer …` header — so putting `it.message` on
            // screen would print the session token onto a child's phone and
            // into any screenshot they take of it.
            //
            // Nothing is lost by the generic line: a mode that is genuinely
            // locked already explains itself on its card, from the `modes`
            // endpoint, in the words the server chose (§1.10).
            Log.w("TradiesRun", "run-start failed", it)
            startError = "Couldn't get that job ready. Have another go in a moment."
        }
    }

    val ready = config
    when {
        // A refusal is meaningful: the server checks entitlement and mode
        // unlocks before handing out a run, so this is also what a locked mode
        // looks like if a client somehow gets past the card (§1.10).
        // Nothing was dealt, so there is nothing to bank. Shown the moment it
        // lands rather than behind the hold — a child waiting on a job that is
        // never coming should not be made to wait a beat longer for the news.
        startError != null -> RunStartFailed(
            message = startError!!,
            onBack = { onLeave("", emptyList()) },
        )
        ready == null || !held -> RunLoading(chrome.backdrop)
        else -> JobRunScreen(
            config = ready,
            style = route.style,
            chrome = chrome,
            readAloud = readAloud,
            onFinished = { answers ->
                scope.launch {
                    // The runner is already showing the hand-over screen; this
                    // just makes sure the child sees it for long enough to read
                    // as a phase rather than a flash.
                    val startedAt = System.currentTimeMillis()
                    val summary = submitRun(repository, ready.runId, answers)
                    delay(PhaseHoldMs - (System.currentTimeMillis() - startedAt))
                    onFinished(summary)
                }
            },
            // Leaves immediately — the child asked to go, and making them watch
            // a spinner to get out is how an app earns a reputation for not
            // letting you stop. The banking happens above, out of this scope.
            onLeave = { answers -> onLeave(ready.runId, answers) },
        )
    }
}

/* --------------------------------------------------------------- helpers */

/**
 * The minimum a between-phases screen stays up.
 *
 * Both ends of a run are a network round trip, and on a good connection either
 * can come back inside a couple of frames. A loading screen shown for two
 * frames is not a loading screen, it is a flicker — so the seam is held to a
 * readable beat whether the server took 40ms or 2 seconds. Long enough to
 * register, short enough that nobody on a fast connection feels taxed for it.
 */
private const val PhaseHoldMs = 700L

/**
 * Mode keys, as the server's `RunMode` union spells them.
 *
 * These are not free text. `run-start` looks the key up in `MODE_REQUIREMENTS`
 * to decide whether the mode is playable at all, so a key that isn't in the
 * union doesn't 404 — it throws inside the function and comes back as a 500.
 */
private const val MODE_JOB = "job"
private const val MODE_BOSS = "boss"
private const val MODE_CREW_RACE = "crewrace"

/** Mirrors `GARAGE_COINS_PER_CORRECT` in `lib/game/questions.ts`. */
private const val GARAGE_COINS_PER_CORRECT = 10

private fun ChromeKind.toChrome(route: FullRoute.Run): RunChrome = when (this) {
    ChromeKind.Job -> RunChrome.Job(
        route.tableNo?.let { Storyboard.accentFor(it) } ?: PopTokens.Orange,
    )

    ChromeKind.Inspection -> RunChrome.Inspection
    ChromeKind.Boss -> RunChrome.Boss(route.label)
    ChromeKind.Race -> RunChrome.Race(Storyboard.crewStub("You"))
}

/**
 * Which full-screen intro a practice mode opens.
 *
 * Four of them have a screen of their own to set expectations before the clock
 * starts; the rest go straight to questions. The key comes from the server, so
 * an unknown one still plays rather than dead-ending.
 */
private fun openMode(mode: PracticeMode, push: (FullRoute) -> Unit) {
    when (mode.key) {
        "garage" -> push(FullRoute.Garage)
        "yard" -> push(FullRoute.Yard)
        "toolbox" -> push(FullRoute.Toolbox())
        "bigjob" -> push(FullRoute.BigJob)
        "inspection" -> push(
            FullRoute.Run(
                modeKey = mode.key,
                label = mode.name,
                style = QuestionStyle.Tiles,
                chrome = ChromeKind.Inspection,
            ),
        )

        else -> push(
            FullRoute.Run(
                modeKey = mode.key,
                label = mode.name,
                style = QuestionStyle.Keypad,
            ),
        )
    }
}

private fun ShopCategory.toLockerSlot(): LockerSlot = when (this) {
    ShopCategory.Hats -> LockerSlot.Head
    ShopCategory.Vests -> LockerSlot.Body
    ShopCategory.Tools -> LockerSlot.Tools
    ShopCategory.Rides -> LockerSlot.Ride
}

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
                newRank = outcome.newRank?.let { rankNameFor(it) },
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
                // Never the throwable's message — see loadStudentData.
                reason = "Couldn't reach the site office.",
            )
        },
    )
}
