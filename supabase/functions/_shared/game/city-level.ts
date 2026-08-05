// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/city-level.ts
// Regenerate with: npm run edge:sync
/**
 * City level and XP — docs/native/vision.md.
 *
 * The one progression number the child sees. It replaces two things:
 *
 * - **The house percentage.** A bar that fills to 100% and then has nothing
 *   left to say. A level always has a next one.
 * - **Trade Rank.** Two numbers that both mean "how good am I" is one too many
 *   for a seven-year-old, and rank had the worse problem besides: it was
 *   recomputed from a single Yard round and could *fall*. A gate that vanishes
 *   reads as punishment. City level only rises.
 *
 * **Levels and tables move on different clocks, deliberately.** Tables unlock
 * fast, on merit — 100% on a Quick Job promotes you to the next number that
 * day. Levels move slowly, on habit, because XP comes from turning up and
 * working through the daily jobs. A quick child races up the tables without
 * racing up the city; a steady child builds a fine city on ×2. That is what
 * lets "don't hold them back" and "reward turning up every day" both be true.
 */

/** XP to get from level 1 to level 2. */
export const BASE_LEVEL_XP = 120;

/** Added to the requirement at each level, so the climb lengthens gently. */
export const LEVEL_XP_STEP = 40;

/**
 * The first level is deliberately cheap.
 *
 * A child should reach the tutorial boss on day one, beat it, and see a full
 * level land — the whole feature set inside ten or fifteen minutes. A first
 * level priced like the tenth would make that impossible.
 */
export const FIRST_LEVEL_XP = 60;

export type LevelProgress = {
  level: number;
  /** XP earned inside the current level. */
  intoLevel: number;
  /** XP the current level needs in total. */
  levelNeeds: number;
  /** 0–100, for the bar under Sparky's City. */
  percent: number;
  /** XP still to go. Zero only at the moment of levelling. */
  remaining: number;
};

/** What level `level` costs to complete. Levels are 1-based. */
export function xpForLevel(level: number): number {
  if (level <= 1) return FIRST_LEVEL_XP;
  return BASE_LEVEL_XP + LEVEL_XP_STEP * (level - 2);
}

/** Total XP to have *completed* every level below `level`. */
export function xpToReachLevel(level: number): number {
  let total = 0;
  for (let n = 1; n < level; n++) total += xpForLevel(n);
  return total;
}

/**
 * Where a total XP figure lands.
 *
 * Loops rather than solving the quadratic: the numbers are small, the curve is
 * meant to be tunable without anyone re-deriving algebra, and a level is read
 * far less often than it is looked at.
 */
export function levelFromXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let consumed = 0;

  while (consumed + xpForLevel(level) <= xp) {
    consumed += xpForLevel(level);
    level += 1;
  }

  const levelNeeds = xpForLevel(level);
  const intoLevel = xp - consumed;

  return {
    level,
    intoLevel,
    levelNeeds,
    percent: Math.round((intoLevel / levelNeeds) * 100),
    remaining: levelNeeds - intoLevel,
  };
}

/**
 * XP that finishes the level a child is currently on.
 *
 * Bosses award exactly this: "beating a boss advances a full level" has to mean
 * the bar completes, not that a fixed lump is added and a child three XP short
 * of levelling gets robbed of the moment.
 */
export function xpToCompleteLevel(totalXp: number): number {
  return levelFromXp(totalXp).remaining;
}

/**
 * Whether a level crossed between two totals, and how many.
 *
 * Returns 0 when nothing changed, so the results screen can decide whether to
 * play the celebration without comparing objects.
 */
export function levelsGained(beforeXp: number, afterXp: number): number {
  return Math.max(0, levelFromXp(afterXp).level - levelFromXp(beforeXp).level);
}
