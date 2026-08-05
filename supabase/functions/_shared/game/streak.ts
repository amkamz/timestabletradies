// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/streak.ts
// Regenerate with: npm run edge:sync
/**
 * Streaks — docs/native/vision.md.
 *
 * Two numbers, and keeping them apart is the whole design:
 *
 * - **Tier** (0–10) is the rate. It rises one step per ten consecutive days
 *   played, and falls one step per day missed. This is the number a child
 *   watches.
 * - **Points** are the spendable balance. Completing a ten-day block pays out
 *   *tier* points, so the longer a habit holds the faster the special things
 *   arrive.
 *
 * A single stored counter cannot do both jobs. Deriving tier from a
 * consecutive-day count means one missed day takes a child from tier 9 to
 * nothing, which is a punishment out of all proportion to a swimming lesson.
 * Tier is therefore stored and decays gently — miss a day and you go 9, 8, 7,
 * not 9 → 0.
 *
 * **What the curve actually costs.** Payout is the tier *after* the increase,
 * so the blocks pay 1, 2, 3 … 10 and then 10 forever:
 *
 * | Days played | Tier | Total points |
 * |---|---|---|
 * | 10 | 1 | 1 |
 * | 50 | 5 | 15 |
 * | 100 | 10 | 55 |
 * | 150 | 10 | 105 |
 *
 * So a 50-point item is around three months of turning up and a 100-point one
 * around five. That is the intended weight for "very special", but the numbers
 * are a starting position — tune them against real play, not against this
 * comment.
 */

export const MAX_TIER = 10;

/** Consecutive days in a block. Complete one and the tier goes up. */
export const DAYS_PER_TIER = 10;

export type StreakState = {
  /** 0–10. The earn rate, and the number the child sees. */
  tier: number;
  /** Spendable balance. */
  points: number;
  /** Days completed toward the next tier, 0 … DAYS_PER_TIER - 1. */
  daysIntoBlock: number;
  /** ISO date (YYYY-MM-DD) of the last day the child played, or null. */
  lastPlayedOn: string | null;
};

export const EMPTY_STREAK: StreakState = {
  tier: 0,
  points: 0,
  daysIntoBlock: 0,
  lastPlayedOn: null,
};

/** Whole days between two ISO dates. Negative if `to` is before `from`. */
export function daysBetween(from: string, to: string): number {
  const MS_PER_DAY = 86_400_000;
  const a = Date.UTC(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10)),
  );
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((b - a) / MS_PER_DAY);
}

export type StreakOutcome = {
  state: StreakState;
  /** Points awarded by this play, if a block completed. */
  pointsAwarded: number;
  /** Tiers lost to missed days. Never negative. */
  tiersLost: number;
};

/**
 * Record a day of play.
 *
 * Idempotent within a day: a child who does four jobs before breakfast has
 * still played one day, so only the first call of the day moves anything.
 * That matters because this is called from `finishRun`, which fires on every
 * completed run rather than once a morning.
 */
export function recordPlay(state: StreakState, today: string): StreakOutcome {
  // First ever play. One day toward the first block, nothing lost.
  if (state.lastPlayedOn === null) {
    return {
      state: { ...state, daysIntoBlock: 1, lastPlayedOn: today },
      pointsAwarded: 0,
      tiersLost: 0,
    };
  }

  const gap = daysBetween(state.lastPlayedOn, today);

  // Same day, or a clock that went backwards. Either way nothing changes —
  // a device with the wrong date must not be able to mint streak points.
  if (gap <= 0) {
    return { state, pointsAwarded: 0, tiersLost: 0 };
  }

  // Missed days. Each one costs a tier, and the part-finished block is lost —
  // but the points already banked are never clawed back.
  if (gap > 1) {
    const missed = gap - 1;
    const tier = Math.max(0, state.tier - missed);
    return {
      state: { ...state, tier, daysIntoBlock: 1, lastPlayedOn: today },
      pointsAwarded: 0,
      tiersLost: state.tier - tier,
    };
  }

  // Consecutive day.
  const daysIntoBlock = state.daysIntoBlock + 1;
  if (daysIntoBlock < DAYS_PER_TIER) {
    return {
      state: { ...state, daysIntoBlock, lastPlayedOn: today },
      pointsAwarded: 0,
      tiersLost: 0,
    };
  }

  // Block complete. The tier rises first, so the payout is the new rate.
  const tier = Math.min(MAX_TIER, state.tier + 1);
  return {
    state: {
      tier,
      points: state.points + tier,
      daysIntoBlock: 0,
      lastPlayedOn: today,
    },
    pointsAwarded: tier,
    tiersLost: 0,
  };
}

/** Whether a streak-priced item is affordable. Never priced in coins. */
export function canAffordWithStreak(state: StreakState, cost: number): boolean {
  return state.points >= cost;
}

export function spendStreakPoints(state: StreakState, cost: number): StreakState | null {
  if (!canAffordWithStreak(state, cost)) return null;
  return { ...state, points: state.points - cost };
}

/** For the streak meter: how far through the current block, 0–100. */
export function blockProgress(state: StreakState): number {
  return Math.round((state.daysIntoBlock / DAYS_PER_TIER) * 100);
}
