/**
 * mastery — the fact grid, staged.
 *
 * The five-stage ladder is a rule: Gold and Blue are claims about *speed*, and
 * Blue additionally about retention across spaced check-ins. `stageForFact`
 * owns that and runs here (docs/native/README.md §1.10) — a client deriving
 * stages from raw counters would be a second implementation of the ladder, and
 * the grid is the one screen where being wrong is most visible to a parent.
 *
 * Raw counters ship alongside so a client can show "3 of 4 right, 2.1s" on a
 * cell without asking again.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

import {
  emptyFactStats,
  factKey,
  stageForFact,
  isDueForReview,
  type FactStats,
  type MasteryStage,
} from "../_shared/game/mastery.ts";
import { playableTables, type Entitlement } from "../_shared/game/entitlement.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** The grid is a×b for every unlocked table against factors 1–12. */
const MAX_FACTOR = 12;

Deno.serve(async (req) => {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Not signed in" }, 401);

  const studentId = new URL(req.url).searchParams.get("studentId");
  if (!studentId) return json({ error: "Missing studentId" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: student } = await supabase
    .from("students")
    .select("id, family_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return json({ error: "No such student" }, 403);

  const [{ data: tableRows }, { data: entitlementRow }, { data: masteryRows }] =
    await Promise.all([
      supabase.from("student_tables").select("table_no").eq("student_id", student.id),
      supabase
        .from("entitlements")
        .select("tier, status, expires_at")
        .eq("family_id", student.family_id)
        .maybeSingle(),
      supabase.from("fact_mastery").select("*").eq("student_id", student.id),
    ]);

  const entitlement: Entitlement = entitlementRow
    ? {
        tier: entitlementRow.tier,
        status: entitlementRow.status,
        expiresAt: entitlementRow.expires_at,
      }
    : null;

  const owned = (tableRows ?? []).map((r: { table_no: number }) => r.table_no);
  // Only what the plan currently covers. A lapsed family keeps its rows but
  // shouldn't be shown a grid it can't play.
  const tables = playableTables(owned, entitlement).sort((a, b) => a - b);

  const stats = new Map<string, FactStats>();
  for (const row of masteryRows ?? []) {
    stats.set(factKey(row.a, row.b), {
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

  const counts: Record<MasteryStage, number> = {
    none: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
    blue: 0,
  };

  const cells = [];
  for (const a of tables) {
    for (let b = 1; b <= MAX_FACTOR; b++) {
      const fact = stats.get(factKey(a, b)) ?? emptyFactStats(a, b);
      const stage = stageForFact(fact);
      counts[stage] += 1;
      cells.push({
        a,
        b,
        stage,
        attempts: fact.attempts,
        correct: fact.correct,
        avgMs: fact.avgMs,
        // Surfaced so a client can nudge toward what's overdue without
        // reimplementing the spaced-repetition schedule.
        due: fact.attempts > 0 && isDueForReview(fact),
      });
    }
  }

  return json({
    tables,
    maxFactor: MAX_FACTOR,
    counts,
    total: cells.length,
    cells,
  });
});
