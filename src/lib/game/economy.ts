/**
 * Shared reward rules for the repeatable modes — docs/game-modes/00-integration-contract.md §4.
 *
 * Endless and replayable modes need a ceiling, or the shop becomes something
 * you grind rather than something you play toward. The cap is deliberately
 * soft: past the line the mode still runs, still records mastery, and still
 * tracks records — it just pays a quarter.
 */

/** Coins per mode per day before the reduced rate kicks in. */
export const DAILY_COIN_CAP = 300;
export const CAPPED_RATE = 0.25;

export type CappedCoins = {
  coins: number;
  /** What the run would have paid with no cap, for the results screen. */
  uncappedCoins: number;
  capped: boolean;
};

/**
 * Pay at full rate up to the cap and at the reduced rate beyond it, so a run
 * that straddles the line isn't punished for where it happened to land.
 */
export function applyDailyCap(
  uncapped: number,
  earnedToday: number,
  cap = DAILY_COIN_CAP,
): CappedCoins {
  const room = Math.max(0, cap - earnedToday);
  const atFullRate = Math.min(uncapped, room);
  const overflow = uncapped - atFullRate;

  return {
    coins: Math.round(atFullRate + overflow * CAPPED_RATE),
    uncappedCoins: uncapped,
    capped: overflow > 0,
  };
}
