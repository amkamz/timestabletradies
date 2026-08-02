import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  applyAttempt,
  emptyFactStats,
  factKey,
  hasFullBlueGrid,
  stageForFact,
  type FactStats,
  type MasteryStage,
} from "@/lib/game/mastery";
import { DEFAULT_UNLOCK_ORDER } from "@/lib/game/zones";
import {
  canUnlockZone,
  isEntitled,
  playableTables,
  tablesLockedByPlan,
} from "@/lib/game/entitlement";
import { getEntitlementForStudent } from "@/lib/data/entitlement";
import type { AssignmentRow, FactMasteryRow, RunRow, StudentRow } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ tables */

export type UnlockState = {
  /**
   * The tables the student may actually play, already gated by the family's
   * plan. Every caller reads this, which is the point: a table the plan
   * doesn't cover must never reach question generation or a mode's pool.
   */
  unlocked: number[];
  /** Division unlocks, filtered the same way. */
  divisionUnlocked: number[];
  /** The next table that will unlock, or null if the grid isn't ready. */
  nextTable: number | null;

  /* --- the parent's view of the same state, for /dashboard --------------- */

  /** Everything ever unlocked, including what the plan is holding back. */
  ownedTables: number[];
  /** Earned but withheld — empty for an entitled family. */
  lockedByPlan: number[];
  entitled: boolean;
  /** The next zone exists, but opening it needs a subscription. */
  nextTableRequiresPlan: boolean;
};

export async function getUnlockState(studentId: string): Promise<UnlockState> {
  const supabase = await createClient();
  const [{ data }, entitlement] = await Promise.all([
    supabase
      .from("student_tables")
      .select("table_no, division_unlocked")
      .eq("student_id", studentId),
    getEntitlementForStudent(studentId),
  ]);

  const rows = data ?? [];
  const ownedTables = rows.map((r) => r.table_no).sort((x, y) => x - y);
  const ownedDivision = rows.filter((r) => r.division_unlocked).map((r) => r.table_no);

  // Lapsing caps what can be played without deleting anything, so `owned` is
  // the durable record and `unlocked` is what today's plan permits.
  const unlocked = playableTables(ownedTables, entitlement);
  const playable = new Set(unlocked);

  // Next in the curriculum order that isn't owned yet.
  const nextTable = DEFAULT_UNLOCK_ORDER.find((t) => !ownedTables.includes(t)) ?? null;

  return {
    unlocked,
    divisionUnlocked: ownedDivision.filter((t) => playable.has(t)),
    nextTable,
    ownedTables,
    lockedByPlan: tablesLockedByPlan(ownedTables, entitlement),
    entitled: isEntitled(entitlement),
    nextTableRequiresPlan: nextTable !== null && !canUnlockZone(ownedTables, entitlement),
  };
}

/* ----------------------------------------------------------------- mastery */

export async function getMastery(studentId: string): Promise<Map<string, FactStats>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fact_mastery")
    .select("*")
    .eq("student_id", studentId);

  const map = new Map<string, FactStats>();
  for (const row of (data ?? []) as FactMasteryRow[]) {
    map.set(factKey(row.a, row.b), {
      a: row.a,
      b: row.b,
      attempts: row.attempts,
      correct: row.correct,
      avgMs: row.avg_ms,
      speedAttempts: row.speed_attempts,
      retentionHits: row.retention_hits,
      lastSeenAt: row.last_seen_at,
    });
  }
  return map;
}

export function stagesFrom(mastery: Map<string, FactStats>): Map<string, MasteryStage> {
  const out = new Map<string, MasteryStage>();
  for (const [key, stats] of mastery) out.set(key, stageForFact(stats));
  return out;
}

export function statsFor(mastery: Map<string, FactStats>, a: number, b: number): FactStats {
  return mastery.get(factKey(a, b)) ?? emptyFactStats(a, b);
}

/* ------------------------------------------------------------------- runs */

export async function getRecentRuns(studentId: string, limit = 20): Promise<RunRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("runs")
    .select("*")
    .eq("student_id", studentId)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as RunRow[];
}

export type ModeStats = {
  mode: string;
  runs: number;
  questions: number;
  correct: number;
  accuracy: number;
  avgMs: number;
};

/** Per-mode accuracy and average time, for the dashboard (spec §12). */
export async function getModeStats(studentId: string): Promise<ModeStats[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("runs")
    .select("mode, questions, correct, avg_ms")
    .eq("student_id", studentId)
    .not("finished_at", "is", null);

  const buckets = new Map<string, { runs: number; questions: number; correct: number; msSum: number }>();
  for (const row of data ?? []) {
    const b = buckets.get(row.mode) ?? { runs: 0, questions: 0, correct: 0, msSum: 0 };
    b.runs += 1;
    b.questions += row.questions;
    b.correct += row.correct;
    // Weight the mean by question count so long runs count for more.
    b.msSum += row.avg_ms * row.questions;
    buckets.set(row.mode, b);
  }

  return [...buckets.entries()].map(([mode, b]) => ({
    mode,
    runs: b.runs,
    questions: b.questions,
    correct: b.correct,
    accuracy: b.questions === 0 ? 0 : b.correct / b.questions,
    avgMs: b.questions === 0 ? 0 : Math.round(b.msSum / b.questions),
  }));
}

/* ------------------------------------------------------------ assignments */

/** Teacher-set focus tables that drive The Garage (spec §6.1). */
export async function getAssignment(studentId: string): Promise<AssignmentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("*")
    .or(`student_id.eq.${studentId},student_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AssignmentRow) ?? null;
}

/* -------------------------------------------------------------- cosmetics */

export async function getCosmetics(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_cosmetics")
    .select("item_key, equipped")
    .eq("student_id", studentId);
  return data ?? [];
}

export async function getRareItems(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_rare_items")
    .select("item_key, won_at")
    .eq("student_id", studentId);
  return data ?? [];
}

/* --------------------------------------------------------------- settings */

export async function getSettings(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_settings")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  return (
    data ?? {
      student_id: studentId,
      read_aloud: false,
      dyslexia_font: false,
      high_contrast: false,
      reduced_motion: false,
      text_scale: 1,
      timer_mode: "standard" as const,
    }
  );
}

/* ------------------------------------------------------- mastery updates */

/**
 * Fold a run's answers into the student's fact mastery. Runs server-side
 * only, after the run has been recorded.
 */
export async function recordMastery(
  studentId: string,
  answers: Array<{ a: number; b: number; correct: boolean; elapsedMs: number }>,
  /**
   * False for untimed modes, whose elapsed times are thinking time rather than
   * recall speed. Defaults to true so timed callers are unaffected.
   */
  countsForSpeed = true,
) {
  if (answers.length === 0) return;

  const supabase = await createClient();
  const existing = await getMastery(studentId);

  // Apply every answer in order so retention counters advance correctly.
  const touched = new Map<string, FactStats>();
  for (const ans of answers) {
    const key = factKey(ans.a, ans.b);
    const current = touched.get(key) ?? existing.get(key) ?? emptyFactStats(ans.a, ans.b);
    touched.set(
      key,
      applyAttempt(current, {
        correct: ans.correct,
        elapsedMs: ans.elapsedMs,
        countsForSpeed,
      }),
    );
  }

  const rows = [...touched.values()].map((s) => ({
    student_id: studentId,
    a: s.a,
    b: s.b,
    attempts: s.attempts,
    correct: s.correct,
    avg_ms: s.avgMs,
    speed_attempts: s.speedAttempts,
    retention_hits: s.retentionHits,
    last_seen_at: s.lastSeenAt,
  }));

  await supabase.from("fact_mastery").upsert(rows, { onConflict: "student_id,a,b" });
}

/**
 * Unlock table 13+ once every cell in the current grid is Blue (spec §11).
 * Tables open one at a time.
 */
export async function maybeUnlockNextAdvancedTable(student: StudentRow): Promise<number | null> {
  const supabase = await createClient();
  const mastery = await getMastery(student.id);
  const stages = stagesFrom(mastery);

  const { unlocked } = await getUnlockState(student.id);
  const highest = unlocked.length > 0 ? Math.max(...unlocked) : 0;

  // The full 1–12 set must be Blue before anything past 12 opens.
  if (highest < 12) return null;
  if (!hasFullBlueGrid(stages, highest)) return null;

  const next = highest + 1;
  await supabase.from("student_tables").insert({
    student_id: student.id,
    table_no: next,
    division_unlocked: false,
  });
  return next;
}
