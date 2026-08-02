// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/modes.ts
// Regenerate with: npm run edge:sync
/**
 * The mode registry.
 *
 * Every mode the app can record a run for has a label here, and every mode a
 * student can *choose* from the training shed has an entry in PRACTICE_MODES.
 * Both the student hub (C2) and the parent dashboard (H3) read from this, so
 * adding a mode can't leave one of them showing a raw database key.
 */

import { puzzleTables } from "./zones.ts";
import type { RunMode } from "./supabase-types.ts";

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

export type PracticeMode = {
  key: RunMode;
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
 * C2 · The training shed, in the order it's offered. Order is deliberate:
 * the adaptive mode first, the ranked one second, and the endless one last —
 * it's the one that eats a session if you let it.
 */
export const PRACTICE_MODES: readonly PracticeMode[] = [
  {
    key: "garage",
    href: "/play/modes/garage",
    name: "The Garage",
    blurb: "Smart practice · 10 coins / correct",
    tone: "bg-teal text-white",
    sub: "text-teal-mist",
  },
  {
    key: "yard",
    href: "/play/modes/yard",
    name: "The Yard",
    blurb: "Speed test → your Trade Rank",
    tone: "bg-white text-ink",
    sub: "text-mud",
  },
  {
    key: "inspection",
    href: "/play/modes/inspection",
    name: "Site Inspection",
    blurb: "25 questions · 6s each · no coasting",
    tone: "bg-white text-ink",
    sub: "text-mud",
  },
  {
    key: "toolbox",
    href: "/play/modes/toolbox",
    name: "Toolbox Time",
    blurb: "Relaxed · no timer · you choose the mix",
    tone: "bg-white text-ink",
    sub: "text-mud",
  },
  {
    key: "scaffold",
    href: "/play/modes/scaffold",
    name: "Scaffold Stack",
    blurb: "Endless · stack it high without toppling",
    tone: "bg-ink text-white",
    sub: "text-white/70",
  },
  {
    key: "cablerun",
    href: "/play/modes/cable-run",
    name: "Cable Run",
    blurb: "Puzzle · no timer · route the cable home",
    tone: "bg-blue text-white",
    sub: "text-white/75",
  },
  {
    key: "tooloff",
    href: "/play/modes/tool-off",
    name: "The Tool-Off",
    blurb: "Duel · build the number they call",
    tone: "bg-orange text-white",
    sub: "text-white/75",
  },
  {
    key: "floorplan",
    href: "/play/modes/floor-plan",
    name: "Floor Plan",
    blurb: "Puzzle · no timer · tile the room exactly",
    tone: "bg-teal text-white",
    sub: "text-teal-mist",
  },
  {
    key: "rally",
    href: "/play/modes/rally",
    name: "Ute Rally",
    blurb: "Race · sealed road or the dirt shortcut",
    tone: "bg-yellow text-ink",
    sub: "text-amber-deep",
  },
  {
    key: "bigjob",
    href: "/play/modes/big-job",
    name: "The Big Job",
    blurb: "Monthly · 100 Q / 5 min · shared to teacher",
    tone: "bg-red text-white",
    sub: "text-red-tint",
  },
] as const;
