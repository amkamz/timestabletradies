// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/difficulty.ts
// Regenerate with: npm run edge:sync
/**
 * Per-fact difficulty and reward weighting — docs/native/README.md §1.9.
 *
 * The economy used to be flat: every correct answer paid the same whether it
 * was 7×8 or 2×1. Two rules replace that.
 *
 *  1. Reward scales steeply with how hard the *fact* is. Not the table — 7×8
 *     is hard, 7×10 is easy and 7×1 is free, so a table-level weight would
 *     pay the same for all three.
 *  2. Once a fact is mastered it stops paying for repetition. Trivial facts
 *     stop paying altogether.
 *
 * Rule 2 has a trap in it, and the shape of this module is the way round it:
 * `mastery.ts` deliberately resurfaces Blue facts on a widening schedule so
 * regression gets caught, and `hasFullBlueGrid` gates tables 13+ on that
 * staying true. Paying nothing for Blue would teach kids to avoid exactly the
 * check-ins the ladder depends on. So the decay pays for the *due check-in*
 * and not for the repetition — the same rule `applyAttempt` already applies to
 * retention hits.
 */

import type { MasteryStage } from "./mastery.ts";

/* -------------------------------------------------------------- difficulty */

/**
 * Per-operand difficulty, 0–1.
 *
 * Rule-based operands score near zero because they aren't recall at all: ×1 is
 * the identity, ×10 appends a zero, ×2 is doubling, ×5 lands on 0 or 5, and
 * ×11 repeats the digit (up to 9 — 11×11 and 11×12 are harder than this
 * suggests, which is imprecision worth accepting for one lookup table).
 *
 * The top of the scale is the cluster every teacher knows: 6, 7, 8 and 12.
 */
const OPERAND: Readonly<Record<number, number>> = {
  1: 0.0,
  10: 0.05,
  2: 0.15,
  5: 0.25,
  11: 0.3,
  3: 0.45,
  9: 0.5,
  4: 0.55,
  6: 0.8,
  12: 0.85,
  8: 0.9,
  7: 1.0,
};

/** Tables 13+ are generated on demand and are all harder than the 12×12 grid. */
const ADVANCED_OPERAND = 1.0;

function operandDifficulty(n: number): number {
  return OPERAND[n] ?? ADVANCED_OPERAND;
}

/**
 * Squares are better anchored than their operands suggest — kids learn 7×7
 * as its own landmark well before they're reliable on 7×8.
 */
const SQUARE_DISCOUNT = 0.8;

/**
 * How hard one fact is, 0–1.
 *
 * Commutative by construction, which is correct: 7×8 and 8×7 are one fact,
 * and `fact_mastery` stores them as one cell.
 */
export function factDifficulty(a: number, b: number): number {
  const d = operandDifficulty(a) * operandDifficulty(b);
  return a === b ? d * SQUARE_DISCOUNT : d;
}

/**
 * Mean difficulty of a whole table, for weighting a job offer before anyone
 * knows which facts it will actually ask.
 */
export function tableDifficulty(table: number, maxFactor = 12): number {
  let sum = 0;
  for (let b = 1; b <= maxFactor; b++) sum += factDifficulty(table, b);
  return sum / maxFactor;
}

/* ------------------------------------------------------------ coin weight */

/**
 * Spread between the cheapest fact and the dearest. At 8, 7×8 pays a little
 * over 8× what anything-×1 pays, which is the "much more" this is for.
 */
export const DIFFICULTY_SPREAD = 8;

/** Raw reward multiplier from difficulty alone: 1× at the floor, ~8.2× at 7×8. */
export function coinWeight(a: number, b: number): number {
  return 1 + DIFFICULTY_SPREAD * factDifficulty(a, b);
}

/**
 * Mean raw weight across the 12×12 grid.
 *
 * Computed rather than written down, so retuning OPERAND can't silently
 * inflate or deflate the whole economy behind someone's back.
 */
export const MEAN_COIN_WEIGHT: number = (() => {
  let sum = 0;
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) sum += coinWeight(a, b);
  }
  return sum / 144;
})();

/**
 * Difficulty weight normalised so an average fact pays 1×.
 *
 * This is the one to multiply a base rate by. Difficulty *redistributes*
 * reward, it does not inflate it: 7×8 pays roughly eight times what 3×1 pays,
 * but a typical run pays about what it always did — so `DAILY_COIN_CAP`, the
 * shop prices and the house material costs all stay tuned where they were.
 */
export function normalisedCoinWeight(a: number, b: number): number {
  return coinWeight(a, b) / MEAN_COIN_WEIGHT;
}

/**
 * The same, for a whole table, before anyone knows which facts a job will ask.
 *
 * `coinWeight` is affine in difficulty, so the mean of the row means is the
 * grid mean — which is why this normalises against the same constant.
 */
export function normalisedTableWeight(table: number, maxFactor = 12): number {
  return (1 + DIFFICULTY_SPREAD * tableDifficulty(table, maxFactor)) / MEAN_COIN_WEIGHT;
}

/* ---------------------------------------------------------- mastery decay */

/**
 * Below this, a mastered fact pays nothing at all — there is nothing left to
 * retain. At 0.005 that is the whole ×1 row (difficulty exactly 0) plus 10×10.
 *
 * This constant is the free tier's floor, so it is the one to reach for if
 * that tier turns out too harsh or too soft. Free play is ×1, ×2 and ×10 —
 * the three lowest-difficulty tables — so raising this to ~0.05 silences the
 * free economy completely once those tables are mastered, and lowering it
 * toward 0 leaves everything except literal ×1 facts trickling.
 */
export const TRIVIAL_DIFFICULTY = 0.005;

/**
 * What a fact still pays once it has climbed the ladder.
 *
 * Blue splits on whether the fact is actually *due* for its spaced-repetition
 * check-in. Answering a Blue fact because the system asked for it is worth
 * real coins; hammering the same one twenty times in a sitting is not.
 */
const STAGE_MULTIPLIER: Record<MasteryStage, number> = {
  none: 1.0,
  bronze: 1.0,
  silver: 0.9,
  gold: 0.6,
  blue: 0.4, // when due — see rewardMultiplier
};

/** What a mastered fact pays when it is *not* due for review. */
export const BLUE_NOT_DUE_MULTIPLIER = 0.05;

export type RewardContext = {
  stage: MasteryStage;
  /** `isDueForReview(stats)` at the time the question was asked. */
  due: boolean;
};

/**
 * The full multiplier for one answered fact: difficulty, decayed by how well
 * the child already knows it. Normalised, so an average unseen fact pays 1×.
 *
 * Multiply a base rate by this. A fresh 7×8 pays ~2.9×; an average fresh fact
 * pays 1×; a fresh 3×1 pays ~0.35×; and a mastered 3×1 pays nothing.
 */
export function rewardMultiplier(a: number, b: number, ctx: RewardContext): number {
  const difficulty = factDifficulty(a, b);

  // Mastered and trivial: the ×1 rule. Nothing is being retained.
  if (ctx.stage === "blue" && difficulty < TRIVIAL_DIFFICULTY) return 0;

  const decay =
    ctx.stage === "blue" && !ctx.due ? BLUE_NOT_DUE_MULTIPLIER : STAGE_MULTIPLIER[ctx.stage];

  return normalisedCoinWeight(a, b) * decay;
}

/**
 * Parse the `${a}x${b}` fact key the answer log carries, so scoring can weight
 * an `AnswerRecord` without the caller unpacking it first.
 */
export function parseFactKey(key: string): { a: number; b: number } | null {
  const [rawA, rawB] = key.split("x");
  const a = Number(rawA);
  const b = Number(rawB);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) return null;
  return { a, b };
}
