/**
 * Mastery Grid & retention — spec §11.
 *
 * Mastery is tracked per individual fact (7×8, 9×6, …) rather than per table,
 * so a kid can see exactly which facts still need work. Each cell climbs a
 * five-stage ladder and only reaches Blue once it has been *retained* across
 * spaced-repetition check-ins.
 */

import { factDifficulty } from "./difficulty";

export type MasteryStage = "none" | "bronze" | "silver" | "gold" | "blue";

export const MASTERY_STAGES: readonly MasteryStage[] = [
  "none",
  "bronze",
  "silver",
  "gold",
  "blue",
] as const;

/**
 * Colourblind-safe presentation (spec §13): every stage carries a distinct
 * glyph and fill pattern, so colour is never the only channel.
 */
export const STAGE_META: Record<
  MasteryStage,
  { label: string; glyph: string; className: string; description: string }
> = {
  none: {
    label: "Not started",
    glyph: "·",
    className: "bg-grade-none text-mud",
    description: "Not yet attempted",
  },
  bronze: {
    label: "Bronze",
    glyph: "▲",
    className: "bg-grade-bronze text-white",
    description: "Attempted, still inconsistent",
  },
  silver: {
    label: "Silver",
    glyph: "◆",
    className: "bg-grade-silver text-white",
    description: "Mostly accurate, working on speed",
  },
  gold: {
    label: "Gold",
    glyph: "★",
    className: "bg-grade-gold text-ink",
    description: "Fast and accurate",
  },
  blue: {
    label: "Blue",
    glyph: "●",
    className: "bg-grade-blue text-white",
    description: "Fully mastered and retained over time",
  },
};

export type FactStats = {
  a: number;
  b: number;
  attempts: number;
  correct: number;
  /** Rolling mean answer time in milliseconds, over `speedAttempts` only. */
  avgMs: number;
  /**
   * Attempts that actually measured speed. Untimed modes (Cable Run, Floor
   * Plan, Toolbox Time) raise `attempts` but not this, so a child thinking
   * over a puzzle isn't recorded as slow at the fact they were thinking about.
   */
  speedAttempts: number;
  /** Consecutive correct answers at Gold speed, across separate sessions. */
  retentionHits: number;
  /** ISO timestamp of the last attempt, or null if never attempted. */
  lastSeenAt: string | null;
};

/** Speed threshold (ms) below which an answer counts as "fluent". */
export const FLUENT_MS = 3000;
/** Retention check-ins required at Gold before a fact turns Blue. */
export const RETENTION_HITS_FOR_BLUE = 3;

export function stageForFact(stats: FactStats): MasteryStage {
  if (stats.attempts === 0) return "none";

  const accuracy = stats.correct / stats.attempts;
  // Gold and Blue are claims about speed, so they need a timed sample to
  // stand on. A fact only ever practised in an untimed mode tops out at
  // Silver no matter how accurate it is — which is the honest reading.
  const fluent = stats.speedAttempts > 0 && stats.avgMs > 0 && stats.avgMs <= FLUENT_MS;

  // Blue: fast, accurate, and proven to stick across spaced check-ins.
  if (accuracy >= 0.95 && fluent && stats.retentionHits >= RETENTION_HITS_FOR_BLUE) {
    return "blue";
  }
  // Gold: fast and accurate, but not yet re-proven over time.
  if (accuracy >= 0.9 && fluent) return "gold";
  // Silver: reliable, still slow.
  if (accuracy >= 0.8) return "silver";
  return "bronze";
}

/** Build the full 12×12 (or N×12) grid of facts for a set of unlocked tables. */
export function buildGrid(maxTable: number): Array<{ a: number; b: number }> {
  const cells: Array<{ a: number; b: number }> = [];
  for (let a = 1; a <= maxTable; a++) {
    for (let b = 1; b <= 12; b++) cells.push({ a, b });
  }
  return cells;
}

export function factKey(a: number, b: number): string {
  return `${a}x${b}`;
}

/**
 * Table 13+ unlocks only once *every* cell in the 1–12 grid is Blue
 * (spec §11), then one table at a time after that.
 */
export function hasFullBlueGrid(stages: Map<string, MasteryStage>, upToTable = 12): boolean {
  for (let a = 1; a <= upToTable; a++) {
    for (let b = 1; b <= 12; b++) {
      if (stages.get(factKey(a, b)) !== "blue") return false;
    }
  }
  return true;
}

/**
 * Spaced repetition: pick facts that are due for a retention check-in.
 * Gold/Blue facts resurface on a widening schedule so regression is caught
 * in Mixed Muster and Toolbox Time (spec §11).
 */
const REVIEW_INTERVAL_DAYS: Record<MasteryStage, number> = {
  none: 0,
  bronze: 0,
  silver: 1,
  gold: 3,
  blue: 10,
};

export function isDueForReview(stats: FactStats, now = new Date()): boolean {
  const stage = stageForFact(stats);
  if (stage === "none" || stage === "bronze") return true;
  if (!stats.lastSeenAt) return true;
  const days = REVIEW_INTERVAL_DAYS[stage];
  const elapsedDays = (now.getTime() - new Date(stats.lastSeenAt).getTime()) / 86_400_000;
  return elapsedDays >= days;
}

/**
 * How much intrinsic difficulty is allowed to shift practice order.
 *
 * Deliberately small. The tightest gap between adjacent stages is none (10)
 * to bronze (8) — a ratio of 1.25 — so anything at or above that would let a
 * hard-but-shaky fact outrank one the child has never seen at all. Need has to
 * win; difficulty only breaks ties within a stage.
 *
 * At 0.2 the factor spans 1.0–1.18, which stays under that ratio for every
 * pair on the ladder.
 */
export const PRACTICE_DIFFICULTY_NUDGE = 0.2;

/**
 * Weight a fact for adaptive practice (The Garage, spec §6.1): weakest and
 * most-overdue facts surface most often.
 *
 * Intrinsic difficulty is a tiebreaker on top, not a driver — it nudges 7×8
 * ahead of 2×5 when both are equally shaky, while leaving "you keep getting
 * this wrong" the thing that actually decides what comes up next.
 */
export function practiceWeight(stats: FactStats, now = new Date()): number {
  const stage = stageForFact(stats);
  const base: Record<MasteryStage, number> = {
    none: 10,
    bronze: 8,
    silver: 5,
    gold: 2,
    blue: 1,
  };
  const byStage = isDueForReview(stats, now) ? base[stage] * 2 : base[stage];
  return byStage * (1 + PRACTICE_DIFFICULTY_NUDGE * factDifficulty(stats.a, stats.b));
}

export function emptyFactStats(a: number, b: number): FactStats {
  return {
    a,
    b,
    attempts: 0,
    correct: 0,
    avgMs: 0,
    speedAttempts: 0,
    retentionHits: 0,
    lastSeenAt: null,
  };
}

/**
 * Fold a new attempt into a fact's rolling stats.
 *
 * `countsForSpeed` defaults to true, so every existing caller keeps its
 * behaviour. Untimed modes pass false: the attempt still moves accuracy and
 * can lift a fact off Bronze, but it can't touch the speed average and can't
 * advance the retention ladder — you can't certify fluency you didn't measure.
 */
export function applyAttempt(
  stats: FactStats,
  input: { correct: boolean; elapsedMs: number; at?: Date; countsForSpeed?: boolean },
): FactStats {
  const at = input.at ?? new Date();
  const countsForSpeed = input.countsForSpeed ?? true;

  const attempts = stats.attempts + 1;
  const correct = stats.correct + (input.correct ? 1 : 0);

  // Rolling mean over speed-counted attempts only.
  const speedAttempts = stats.speedAttempts + (countsForSpeed ? 1 : 0);
  const avgMs = countsForSpeed
    ? Math.round((stats.avgMs * stats.speedAttempts + input.elapsedMs) / speedAttempts)
    : stats.avgMs;

  const wasDue = isDueForReview(stats, at);
  const fluent = countsForSpeed && input.correct && input.elapsedMs <= FLUENT_MS;

  let retentionHits = stats.retentionHits;
  if (!input.correct) {
    // A miss drops the fact back down the retention ladder, timed or not.
    retentionHits = 0;
  } else if (fluent && wasDue) {
    // Only *due* check-ins count, so hammering one fact in a single sitting
    // can't fast-track it to Blue.
    retentionHits = stats.retentionHits + 1;
  }

  return {
    a: stats.a,
    b: stats.b,
    attempts,
    correct,
    avgMs,
    speedAttempts,
    retentionHits,
    lastSeenAt: at.toISOString(),
  };
}
