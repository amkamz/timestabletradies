/**
 * The mode registry.
 *
 * Every mode the app can record a run for has a label here, and every mode a
 * student can *choose* from the training shed has an entry in PRACTICE_MODES.
 * Both the student hub (C2) and the parent dashboard (H3) read from this, so
 * adding a mode can't leave one of them showing a raw database key.
 */

import { puzzleTables } from "./zones";
import type { RunMode } from "@/lib/supabase/types";

/** Human labels for every value of `runs.mode`. */
export const MODE_LABELS: Record<RunMode, string> = {
  job: "Job board",
  garage: "The Garage",
  yard: "The Yard",
  inspection: "Site Inspection",
  toolbox: "Toolbox Time",
  bigjob: "The Big Job",
  boss: "Boss Battles",
  crewrace: "Crew Race",
  expo: "Trade Expo",
  challenge: "Job Challenge",
  // docs/game-modes/
  cablerun: "Cable Run",
  rally: "Ute Rally",
  tooloff: "The Tool-Off",
  scaffold: "Scaffold Stack",
  floorplan: "Floor Plan",
};

export function modeLabel(mode: string): string {
  return MODE_LABELS[mode as RunMode] ?? mode;
}

/**
 * Modes with no clock, whose elapsed times are thinking time rather than
 * recall speed. Their answers still move accuracy — they just can't touch the
 * speed average or certify fluency
 * (docs/game-modes/00-integration-contract.md §2.3).
 *
 * Toolbox Time is on this list because it always should have been: it is
 * explicitly the untimed relaxed mode, and every answer it recorded was
 * inflating the average it was measured against.
 */
export const UNTIMED_MODES: readonly RunMode[] = ["toolbox", "cablerun", "floorplan"];

export function countsForSpeed(mode: RunMode): boolean {
  return !UNTIMED_MODES.includes(mode);
}

/* --------------------------------------------------------- mode unlocking */

/**
 * What a mode needs before it will run — docs/native/README.md §1.8.
 *
 * Gated on zones unlocked, never on Trade Rank. `rankFromYardResult`
 * recomputes rank from a *single* Yard round and can hand back a lower number
 * than last time, so a rank-gated mode would vanish after one bad speed test.
 * Zones unlocked only ever goes up.
 *
 * Thresholds are set by what each mode needs to be *honest*, not by what
 * converts. Below its threshold a mode isn't hidden — it is shown with the
 * requirement on it, so the ladder is legible from the first day.
 */
export type ModeRequirement = {
  /** Zones unlocked, counting the ×1 tutorial zone like any other. */
  zones: number;
  /** Needs division on at least one table the generators can use. */
  division?: boolean;
};

export const MODE_REQUIREMENTS: Record<RunMode, ModeRequirement> = {
  // The core loop, available from the tutorial zone onward.
  job: { zones: 1 },
  garage: { zones: 1 },

  // Need a second table before "a mix" or "your unlocked range" means anything.
  toolbox: { zones: 2 },
  yard: { zones: 2 },
  inspection: { zones: 2 },
  scaffold: { zones: 2 },
  rally: { zones: 2 },
  boss: { zones: 2 },

  // Social modes need something worth racing on.
  crewrace: { zones: 3 },
  expo: { zones: 3 },
  challenge: { zones: 3 },

  // Cable Run routes a value up and back down again, so it needs division and
  // two usable tables. `canPlayCableRun` re-checks this against the board.
  cablerun: { zones: 3, division: true },

  // Both need real breadth or they degrade into something dishonest: Floor
  // Plan runs out of distinct rooms, and the Tool-Off belt runs out of factor
  // pairs. At five zones there is enough of both.
  tooloff: { zones: 5 },
  floorplan: { zones: 5 },

  // The monthly capstone assessment covers the whole unlocked range.
  bigjob: { zones: 6 },
};

/* ---------------------------------------------------------- retired modes */

/**
 * Modes the game no longer offers, and what absorbed each one
 * (docs/native/rescope.md, docs/native/vision.md).
 *
 * They keep their `MODE_LABELS` entry and their place in the `runs_mode_check`
 * constraint, so historical runs still render and still count toward a child's
 * totals. Retiring a mode is a registry edit, not a migration.
 *
 * They also keep their `MODE_REQUIREMENTS` entry, which looks redundant until
 * you notice that `run-start` looks the mode up before anything else and an
 * unknown key doesn't 404 — it throws inside the function and returns a 500.
 * A retired mode has to fail *politely*.
 */
export const RETIRED_MODES: Partial<Record<RunMode, string>> = {
  inspection: "The Yard, which was the same test with different numbers",
  scaffold: "Ute Rally — and it was the one mode a modified client could never lose",
  tooloff: "Floor Plan, which teaches factor pairs earlier and better",
  expo: "a leaderboard screen rather than a run of its own",
  challenge: "Crew Race, as its asynchronous form",
};

export function isRetired(mode: RunMode): boolean {
  return RETIRED_MODES[mode] !== undefined;
}

export type UnlockState = {
  tables: number[];
  divisionUnlocked: number[];
};

export type ModeAvailability =
  | { playable: true }
  | { playable: false; reason: string; requirement: ModeRequirement };

/**
 * Whether a student can play a mode yet, and what to put on the card if not.
 *
 * The reason is player-facing and deliberately says nothing about money. A
 * free player sees "Unlocks with 5 trades" — a goal, not a price — and the
 * upgrade conversation happens above the grown-up gate, with the parent.
 */
export function modeAvailability(mode: RunMode, unlock: UnlockState): ModeAvailability {
  const requirement = MODE_REQUIREMENTS[mode];

  // Checked before the thresholds, so a retired mode reads as closed rather
  // than as something to work toward. Nothing offers these any more, but a
  // stale client or an old deep link can still ask for one.
  if (isRetired(mode)) {
    return {
      playable: false,
      reason: "This job's been closed down",
      requirement,
    };
  }

  // ×1 counts here: it is a multiplication fact and a zone like any other.
  if (unlock.tables.length < requirement.zones) {
    const trades = requirement.zones;
    return {
      playable: false,
      reason: `Unlocks with ${trades} trade${trades === 1 ? "" : "s"}`,
      requirement,
    };
  }

  // Division on ×1 teaches nothing, so only usable tables count toward this.
  if (requirement.division && puzzleTables(unlock.divisionUnlocked).length === 0) {
    return {
      playable: false,
      reason: "Unlocks when you learn division",
      requirement,
    };
  }

  return { playable: true };
}

/** Convenience for the hub, which renders every practice mode in one pass. */
export function availablePracticeModes(unlock: UnlockState) {
  return PRACTICE_MODES.map((mode) => ({
    ...mode,
    availability: modeAvailability(mode.key, unlock),
  }));
}

/**
 * Which part of the shed a mode sits in.
 *
 * The count of modes was never the real problem — the trouble was that they
 * were not all on the same level and were shown as though they were. Ten cards
 * in one flat list, some of them daily assignments, some practice, some games,
 * some social. A seven-year-old cannot tell "The Garage" from "The Yard" from
 * "Toolbox Time" by name, ever, so the section header has to carry the meaning
 * the trade names never could.
 */
export type ModeSection = "practice" | "play" | "multiplayer";

export const SECTION_LABELS: Record<ModeSection, string> = {
  practice: "Practice",
  play: "Play",
  multiplayer: "Multiplayer",
};

export type PracticeMode = {
  key: RunMode;
  section: ModeSection;
  href: string;
  name: string;
  /** One line under the name on the hub card. */
  blurb: string;
  /** Card background classes. */
  tone: string;
  /** Blurb colour, paired with `tone`. */
  sub: string;
};

/**
 * C2 · The training shed, grouped and in the order it's offered.
 *
 * Two things are deliberately *not* here. **The Big Job** left: 100 questions
 * shared with a teacher is an assessment that arrives monthly, not something
 * picked from a list of ways to practise. And the five retired modes above are
 * gone entirely.
 *
 * **The Garage is still its own card.** The plan is for it to become Toolbox
 * Time's default — "smart practice, unless you opt out and pick your own" —
 * but that needs the Toolbox screen to grow the toggle first. Removing the
 * card before its replacement is wired would make adaptive practice
 * unreachable, which is exactly the silent degradation this rescope exists to
 * stop. It merges when the toggle lands, not before.
 */
export const PRACTICE_MODES: readonly PracticeMode[] = [
  {
    key: "garage",
    section: "practice",
    href: "/play/modes/garage",
    name: "The Garage",
    blurb: "Smart practice · picks your weak spots",
    tone: "bg-teal text-white",
    sub: "text-teal-mist",
  },
  {
    key: "toolbox",
    section: "practice",
    href: "/play/modes/toolbox",
    name: "Toolbox Time",
    blurb: "No timer · you choose the mix",
    tone: "bg-white text-ink",
    sub: "text-mud",
  },
  {
    key: "yard",
    section: "play",
    href: "/play/modes/yard",
    name: "The Yard",
    blurb: "Speed test · how fast can you go?",
    tone: "bg-white text-ink",
    sub: "text-mud",
  },
  {
    key: "cablerun",
    section: "play",
    href: "/play/modes/cable-run",
    name: "Cable Run",
    blurb: "Puzzle · no timer · route the cable home",
    tone: "bg-blue text-white",
    sub: "text-white/75",
  },
  {
    key: "rally",
    section: "play",
    href: "/play/modes/rally",
    name: "Ute Rally",
    blurb: "Race · sealed road or the dirt shortcut",
    tone: "bg-yellow text-ink",
    sub: "text-amber-deep",
  },
  {
    key: "floorplan",
    section: "play",
    href: "/play/modes/floor-plan",
    name: "Floor Plan",
    blurb: "Puzzle · no timer · tile the room exactly",
    tone: "bg-teal text-white",
    sub: "text-teal-mist",
  },
  {
    key: "crewrace",
    section: "multiplayer",
    href: "/play/crew/race",
    name: "Crew Race",
    blurb: "Race your crew · bots fill the empty seats",
    tone: "bg-red text-white",
    sub: "text-red-tint",
  },
] as const;

/** The shed renders section by section, skipping any that ends up empty. */
export function practiceModesBySection(): { section: ModeSection; modes: PracticeMode[] }[] {
  const order: ModeSection[] = ["practice", "play", "multiplayer"];
  return order
    .map((section) => ({
      section,
      modes: PRACTICE_MODES.filter((mode) => mode.section === section),
    }))
    .filter((group) => group.modes.length > 0);
}
