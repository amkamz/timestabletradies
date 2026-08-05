package com.timestabletradies.ui

import com.timestabletradies.core.designsystem.PopTab
import com.timestabletradies.ui.state.JobCard
import com.timestabletradies.ui.state.QuestionStyle

/**
 * Where the app can be, and how those places connect.
 *
 * The storyboard's flow map, expressed as types:
 *
 * ```
 * Daily loop   Site → Job Board → briefing → play → results → house grows
 * Progress     jobs feed the Mastery Grid; a full trade → Boss Battle → rare item
 * Social       parents link families → kids race as crew (bots fill gaps)
 * Adults       money, stats, crew and classroom live in the dashboard — none here
 * ```
 *
 * Two shapes, because the app has two kinds of screen:
 *
 * - [Panel] — lives *inside* a tab, so the nav bar stays put and the wipe still
 *   works. The Site, the board, the grid, the shop and everything one step off
 *   them.
 * - [FullRoute] — takes the whole window and hides the bar. Onboarding, any
 *   screen with a clock running, boss battles, live races and celebrations.
 *   The bar disappearing is the signal that the child is *in* something.
 */

/* ------------------------------------------------------------------ panels */

/** A destination that keeps the tab bar. Each tab owns a small stack of one. */
sealed interface Panel {

    /** Which cell of the bar lights up while this panel is showing. */
    val tab: PopTab

    /* THE SITE */
    data object Site : Panel {
        override val tab get() = PopTab.Site
    }

    data object House : Panel {
        override val tab get() = PopTab.Site
    }

    data object Zones : Panel {
        override val tab get() = PopTab.Site
    }

    /* JOBS */
    data object Board : Panel {
        override val tab get() = PopTab.Jobs
    }

    data object Shed : Panel {
        override val tab get() = PopTab.Jobs
    }

    data object Expo : Panel {
        override val tab get() = PopTab.Jobs
    }

    data object Challenges : Panel {
        override val tab get() = PopTab.Jobs
    }

    /* MASTERY · SHOP · LOCKER */
    data object Grid : Panel {
        override val tab get() = PopTab.Mastery
    }

    data object Shop : Panel {
        override val tab get() = PopTab.Shop
    }

    data object Locker : Panel {
        override val tab get() = PopTab.Locker
    }
}

/** The panel a tab lands on when its cell is tapped. */
fun PopTab.home(): Panel = when (this) {
    PopTab.Site -> Panel.Site
    PopTab.Jobs -> Panel.Board
    PopTab.Mastery -> Panel.Grid
    PopTab.Shop -> Panel.Shop
    PopTab.Locker -> Panel.Locker
}

/* ------------------------------------------------------------------ routes */

/**
 * A destination that takes the whole window.
 *
 * Deliberately not `@Serializable` nav routes: several of them carry a whole
 * [JobCard] or a run in progress, and threading that through a savable bundle
 * would mean either duplicating the board or re-fetching it on rotation. The
 * app holds one of these at a time and the back gesture pops it.
 */
sealed interface FullRoute {

    /* onboarding */
    data object Welcome : FullRoute
    data object SignIn : FullRoute
    data object Picker : FullRoute

    /** The grown-up gate, and what to do once it is passed. */
    data class Gate(val then: GateTarget, val reason: String? = null) : FullRoute

    data object ParentAccount : FullRoute
    data object AddStudents : FullRoute
    data object PickLook : FullRoute
    data object PickName : FullRoute
    data object MeetTradie : FullRoute

    /* the loop */
    data class Briefing(val job: JobCard) : FullRoute

    data class Run(
        val modeKey: String,
        val label: String,
        val style: QuestionStyle,
        val tableNo: Int? = null,
        /** Toolbox Time's table picks. Empty means "whatever is unlocked". */
        val tables: List<Int> = emptyList(),
        /** Toolbox Time's operation pick: multiply | divide | both. */
        val operation: String? = null,
        val chrome: ChromeKind = ChromeKind.Job,
        /** Set when the run came from a job card, so AGAIN can replay it. */
        val job: JobCard? = null,
        /** Toolbox Time can ask for read-aloud without changing the setting. */
        val readAloud: Boolean = false,
    ) : FullRoute

    data object Results : FullRoute

    /**
     * A mode the server offers that this client cannot yet play.
     *
     * The alternative was what used to happen: an unhandled key fell through to
     * a plain keypad run, and the server served ten generic questions for any
     * mode it had no count for. So Cable Run, Ute Rally and Scaffold Stack were
     * one identical drill under three names and three colours, with nothing
     * anywhere saying so. Saying "not yet" is worth more than quietly serving
     * the wrong game.
     */
    data class NotOnAndroidYet(val modeName: String) : FullRoute

    /* modes with their own intro */
    data object Garage : FullRoute
    data object Yard : FullRoute
    /** Toolbox Time, optionally arriving with tables already ticked. */
    data class Toolbox(val preselect: List<Int> = emptyList()) : FullRoute
    data object BigJob : FullRoute

    /* boss + house */
    data class BossIntro(val table: Int) : FullRoute
    data class BossVictory(val table: Int) : FullRoute
    data object MoveIn : FullRoute

    /* crew */
    data object CrewLobby : FullRoute

    /* shop */
    data class TryOn(val itemKey: String) : FullRoute

    /* settings */
    data object Accessibility : FullRoute

    /** Above the gate: where a grown-up is told how trades are opened. */
    data object MoreTrades : FullRoute

    /** The whole grandparent app. Reached by its own deep link, not from play. */
    data class Grandparent(val childName: String, val milestone: String?) : FullRoute
}

/** Which chrome a run wears. Kept flat so a route stays cheap to compare. */
enum class ChromeKind { Job, Inspection, Boss, Race }

/**
 * How the app was opened, when it wasn't opened normally.
 *
 * Deep links land here. Both of them belong to grown-ups: a grandparent holding
 * a `/cheer` link and no account, and a parent following a `/join` invite. A
 * child never arrives this way, which is why neither entry point can reach play.
 */
sealed interface AppEntry {
    /** The grandparent's whole app, in one link. */
    data class Cheer(val childName: String, val milestone: String?) : AppEntry

    /** A crew invite. Redeeming it needs a signed-in parent, so it goes there. */
    data class Join(val code: String?) : AppEntry
}

/**
 * What happens once a grown-up clears the gate.
 *
 * Only three things sit behind it, and all three are the parent's: setting the
 * account up, opening more trades, and the settings a child could otherwise
 * turn against themselves. Nothing a child needs mid-play is ever back here.
 */
enum class GateTarget {
    /** A1 → A2 → A3: the setup wizard. */
    Setup,

    /**
     * "Ask a grown-up to open more trades."
     *
     * The child-side of this path names no price and shows no store. Above the
     * gate the parent is handed off to the dashboard on the web, which is where
     * money lives and the only place it is allowed to (§0.6, §1.10).
     */
    MoreTrades,

    /** Switching which child is playing. */
    SwitchTradie,
}
