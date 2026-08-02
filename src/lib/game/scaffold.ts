/**
 * Scaffold Stack — docs/game-modes/04-scaffold-stack.md
 *
 * An endless stacking arcade. Correct answers earn planks; the player chooses
 * which side to place each one on, and the tower's lean is the running sum of
 * those choices. The run ends when the tower topples.
 *
 * Everything here is pure and synchronous — no React, no Supabase, no clock —
 * so a whole run replays from `(seed, moves[])` in a test.
 */

import { applyDailyCap } from "./economy";
import { generateQuestionSet, type Question } from "./questions";

/* -------------------------------------------------------------- the tower */

/** Negative tilt leans left, positive leans right. */
export type Side = "left" | "right";

export type Plank = {
  /** One of the two factors of the fact just answered. */
  length: number;
  side: Side;
};

export type Tower = {
  height: number;
  tilt: number;
  planks: Plank[];
};

/** The tower topples at this lean, in either direction. */
export const TOPPLE_AT = 6;

/** Planks longer than this are top-heavy and cost an extra step of lean. */
export const TOP_HEAVY_ABOVE = 8;

export function emptyTower(): Tower {
  return { height: 0, tilt: 0, planks: [] };
}

function push(tilt: number, side: Side): number {
  return tilt + (side === "left" ? -1 : 1);
}

/**
 * Place a plank. Placing on the side the tower leans away from pulls it back
 * toward centre; placing on the heavy side makes it worse. A long plank is
 * worth more but always leaves the tower one step further out than a short
 * one would have — that trade is the whole decision.
 */
export function place(tower: Tower, plank: Plank): Tower {
  let tilt = push(tower.tilt, plank.side);

  if (plank.length > TOP_HEAVY_ABOVE) {
    // Top-heavy: push the *resulting* lean one further from centre.
    tilt = tilt === 0 ? push(tilt, plank.side) : tilt + Math.sign(tilt);
  }

  return {
    height: tower.height + 1,
    tilt,
    planks: [...tower.planks, plank],
  };
}

/**
 * A wrong answer earns no plank and nudges the tower further the way it is
 * already going. From dead centre it leans right, arbitrarily — a tower is
 * never perfectly balanced for long, which is what keeps the decision live.
 */
export function wobble(tower: Tower): Tower {
  return { ...tower, tilt: tower.tilt + Math.sign(tower.tilt || 1) };
}

/** A brace costs the turn's plank and pulls the lean two steps toward centre. */
export function brace(tower: Tower): Tower {
  const pull = Math.min(2, Math.abs(tower.tilt));
  return { ...tower, tilt: tower.tilt - Math.sign(tower.tilt) * pull };
}

export function hasToppled(tower: Tower): boolean {
  return Math.abs(tower.tilt) >= TOPPLE_AT;
}

/** How close to falling, 0–1. Drives the creak and the meter, never colour alone. */
export function danger(tower: Tower): number {
  return Math.min(1, Math.abs(tower.tilt) / TOPPLE_AT);
}

/** A brace is offered instead of a question every N planks. */
export const BRACE_EVERY = 10;

export function braceOffered(height: number): boolean {
  return height > 0 && height % BRACE_EVERY === 0;
}

/* --------------------------------------------------------------- the ramp */

/** Seconds per question at the start of a run. */
export const RAMP_START_SECONDS = 8;
/** Removed from the clock every `RAMP_EVERY` planks. */
export const RAMP_STEP_SECONDS = 0.25;
export const RAMP_EVERY = 5;
/** The clock never drops below this. */
export const RAMP_FLOOR_SECONDS = 3.5;

/**
 * The base clock for the question at a given height, before the student's
 * timer preference is applied. Returns fractional seconds — callers run this
 * off a deadline rather than a 1-second tick.
 */
export function timerSecondsFor(height: number): number {
  const steps = Math.floor(height / RAMP_EVERY);
  return Math.max(RAMP_FLOOR_SECONDS, RAMP_START_SECONDS - steps * RAMP_STEP_SECONDS);
}

/* ------------------------------------------------------------ question mix */

export type Tier = {
  /** Which end of the mastery range the questions come from. */
  source: "strong" | "weighted" | "weak";
  format: "choice" | "type";
  /** Whether division is allowed at this height (still gated per table). */
  division: boolean;
};

/**
 * Difficulty escalates with height as well as tempo — otherwise a long run is
 * a reflex test on the two times table.
 */
export function questionTier(height: number): Tier {
  if (height < 10) return { source: "strong", format: "choice", division: false };
  if (height < 25) return { source: "weighted", format: "choice", division: false };
  if (height < 45) return { source: "weighted", format: "type", division: false };
  return { source: "weak", format: "type", division: true };
}

/** The `n` tables the student is weakest on, worst first. */
export function weakestTables(
  tables: number[],
  weightFor: (a: number, b: number) => number,
  n: number,
): number[] {
  return [...tables]
    .map((t) => {
      let sum = 0;
      for (let b = 1; b <= 12; b++) sum += weightFor(t, b);
      return { table: t, weight: sum };
    })
    .sort((x, y) => y.weight - x.weight)
    .slice(0, n)
    .map((x) => x.table);
}

/**
 * Build the next few questions. The run has no known length, so these are
 * generated in a rolling window rather than all at once.
 */
export function buildQuestions(opts: {
  seed: string;
  height: number;
  count: number;
  tables: number[];
  divisionUnlocked: number[];
  weightFor: (a: number, b: number) => number;
}): Question[] {
  const tier = questionTier(opts.height);

  // `weightFor` favours the facts that need work. Inverting it gives the
  // opposite: the facts the student is most solid on, for the opening climb.
  const weight =
    tier.source === "strong"
      ? (a: number, b: number) => 1 / Math.max(0.001, opts.weightFor(a, b))
      : opts.weightFor;

  const tables =
    tier.source === "weak" && opts.tables.length > 3
      ? weakestTables(opts.tables, opts.weightFor, 3)
      : opts.tables;

  return generateQuestionSet({
    seed: `${opts.seed}:h${opts.height}`,
    tables,
    divisionUnlocked: tier.division ? opts.divisionUnlocked : [],
    operation: tier.division ? "both" : "multiply",
    count: opts.count,
    withChoices: tier.format === "choice",
    weightFor: weight,
  });
}

/* ------------------------------------------------------------------ payout */

export const COINS_PER_PLANK = 6;
export const MILESTONE_EVERY = 10;
export const MILESTONE_COINS = 15;
export const PERSONAL_BEST_COINS = 50;
/** Below this height there's nothing to pay for. */
export const MIN_PAID_HEIGHT = 5;

export const MATERIALS_PER_PLANKS = 5;
export const MATERIALS_CAP = 12;

/**
 * Past the daily cap the mode keeps running and keeps recording mastery but
 * pays a quarter — an endless mode without a cap is an invitation to grind the
 * shop instead of learning. The rule is shared with the other repeatable
 * modes; see `lib/game/economy`.
 */
export { DAILY_COIN_CAP, CAPPED_RATE } from "./economy";

/**
 * Runs are unbounded, so the answer log needs a ceiling — but the ceiling is a
 * sanity bound, not a truncation anyone should hit. 500 planks is over half an
 * hour of unbroken correct answers at the floor tempo. Past it the tail is kept
 * and the recorded height plateaus, because height is only ever paid and
 * recorded from answers the log can actually prove.
 */
export const MAX_SUBMITTED_ANSWERS = 500;

export type ScaffoldReward = {
  coins: number;
  materials: number;
  /** Coins before the daily cap was applied, for the results screen. */
  uncappedCoins: number;
  capped: boolean;
  newPersonalBest: boolean;
};

export function scaffoldReward(input: {
  height: number;
  previousBest: number;
  /** Coins already earned from this mode today. */
  coinsToday: number;
}): ScaffoldReward {
  const { height, previousBest, coinsToday } = input;
  const newPersonalBest = height > previousBest && height >= MIN_PAID_HEIGHT;

  if (height < MIN_PAID_HEIGHT) {
    return {
      coins: 0,
      materials: 0,
      uncappedCoins: 0,
      capped: false,
      newPersonalBest: false,
    };
  }

  const earned = applyDailyCap(
    height * COINS_PER_PLANK +
      Math.floor(height / MILESTONE_EVERY) * MILESTONE_COINS +
      (newPersonalBest ? PERSONAL_BEST_COINS : 0),
    coinsToday,
  );

  return {
    ...earned,
    materials: Math.min(MATERIALS_CAP, Math.floor(height / MATERIALS_PER_PLANKS)),
    newPersonalBest,
  };
}
