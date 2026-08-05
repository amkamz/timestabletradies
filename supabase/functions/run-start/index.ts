/**
 * run-start — hand the client a run.
 *
 * The server generates the questions and stores exactly what it sent
 * (docs/native/README.md §0.2). The client renders them and plays; it never
 * expands a seed, so there is no PRNG that three languages have to agree on
 * fact-for-fact forever.
 *
 * This is also where adaptive practice actually happens. The Garage weights by
 * `practiceWeight` — weakest and most-overdue facts first — which a client
 * can't do without the whole mastery ladder, and shouldn't.
 *
 * Two clients of Supabase here, on purpose:
 *   - the caller's JWT authorises (RLS decides which students are visible)
 *   - the service role writes `pending_runs`, which no client may write, or it
 *     could hand itself a board and call it whatever pays best
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

import { generateQuestionSet } from "../_shared/game/questions.ts";
import {
  emptyFactStats,
  factKey,
  practiceWeight,
  type FactStats,
} from "../_shared/game/mastery.ts";
import { modeAvailability } from "../_shared/game/modes.ts";
import { playableTables, type Entitlement } from "../_shared/game/entitlement.ts";
import { newRunSeed } from "../_shared/game/seed.ts";
import type { RunMode } from "../_shared/game/supabase-types.ts";

/** How many questions each mode asks. Mirrors the web app's mode screens. */
const QUESTION_COUNT: Partial<Record<RunMode, number>> = {
  garage: 10,
  yard: 20,
  inspection: 25,
  toolbox: 12,
  bigjob: 100,
  job: 10,
  boss: 12,
};

/**
 * Seconds per question, or null for untimed.
 *
 * Sent with the run rather than decided by the client, so the clock a mode
 * advertises is the clock it gets on every platform. `UNTIMED_MODES` in
 * `modes.ts` is the related rule — those modes record accuracy but can't
 * touch the speed average, since thinking time isn't recall time.
 */
const TIMER_SECONDS: Partial<Record<RunMode, number | null>> = {
  garage: null,
  toolbox: null,
  yard: 10,
  inspection: 6,
  bigjob: 3,
  job: null,
  boss: 8,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Not signed in" }, 401);

  let payload: {
    studentId?: string;
    mode?: RunMode;
    tableNo?: number | null;
    /**
     * Toolbox Time lets a child pick several tables, so one `tableNo` cannot
     * carry the request. Every entry is still filtered against what they are
     * actually entitled to below — this narrows the pool, it never widens it.
     */
    tables?: number[] | null;
    /** Also Toolbox Time. Clamped to what division they have unlocked. */
    operation?: "multiply" | "divide" | "both" | null;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  const { studentId, mode } = payload;
  if (!studentId || !mode) return json({ error: "Missing studentId or mode" }, 400);

  const asCaller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: student } = await asCaller
    .from("students")
    .select("id, family_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return json({ error: "No such student" }, 403);

  /* ---- what may they play? ----------------------------------------------- */

  const [{ data: tableRows }, { data: entitlementRow }] = await Promise.all([
    asCaller
      .from("student_tables")
      .select("table_no, division_unlocked")
      .eq("student_id", student.id),
    asCaller
      .from("entitlements")
      .select("tier, status, expires_at")
      .eq("family_id", student.family_id)
      .maybeSingle(),
  ]);

  const entitlement: Entitlement = entitlementRow
    ? {
        tier: entitlementRow.tier,
        status: entitlementRow.status,
        expiresAt: entitlementRow.expires_at,
      }
    : null;

  type Row = { table_no: number; division_unlocked: boolean };
  const rows: Row[] = tableRows ?? [];
  const owned = rows.map((r) => r.table_no);
  const tables = playableTables(owned, entitlement);
  const divisionUnlocked = rows
    .filter((r) => r.division_unlocked)
    .map((r) => r.table_no)
    .filter((t) => tables.includes(t));

  // The load-bearing check (§1.10). Refusing here is what makes the lock on
  // the card true rather than decorative — a client that skipped the UI and
  // called this directly gets nothing.
  const availability = modeAvailability(mode, { tables, divisionUnlocked });
  if (!availability.playable) {
    return json({ error: availability.reason, locked: true }, 403);
  }

  // Refuse a mode this endpoint cannot actually build.
  //
  // Everything below generates a *question sequence*. The puzzle and race
  // modes need a `content` board instead (§1.3), which is not written yet —
  // and until this check existed they fell through `QUESTION_COUNT[mode] ?? 10`
  // and were handed ten plain questions. So Cable Run, Ute Rally and Floor Plan
  // were served as the same generic drill, under their own names, with a 200
  // and no complaint from either side. A 501 is the honest answer: the mode is
  // real and permitted, this endpoint just cannot serve it yet.
  if (!(mode in QUESTION_COUNT)) {
    return json(
      { error: `${mode} needs a delivered board, which this endpoint cannot build yet`, unbuilt: true },
      501,
    );
  }

  if (tables.length === 0) return json({ error: "No tables unlocked" }, 403);

  /* ---- adaptive selection ------------------------------------------------ */

  const { data: masteryRows } = await asCaller
    .from("fact_mastery")
    .select("*")
    .eq("student_id", student.id);

  const mastery = new Map<string, FactStats>();
  for (const row of masteryRows ?? []) {
    mastery.set(factKey(row.a, row.b), {
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

  // Only the adaptive mode steers by weakness; the rest sample evenly so a
  // speed test stays a fair measure rather than a targeted drill.
  const weightFor =
    mode === "garage"
      ? (a: number, b: number) =>
          practiceWeight(mastery.get(factKey(a, b)) ?? emptyFactStats(a, b))
      : undefined;

  // A requested pool is an *intersection*, never a substitution: whatever the
  // client asks for is filtered against what this family is entitled to, so a
  // modified client asking for ×7 on the free tier gets back the free tier.
  const table = payload.tableNo ?? null;
  const requested = (payload.tables ?? []).filter((t) => tables.includes(t));
  const pool = requested.length > 0
    ? requested
    : table && tables.includes(table)
    ? [table]
    : tables;

  // The Yard is a speed test and stays multiply-only so ranks stay comparable.
  // Otherwise the child may choose, clamped to the division they have actually
  // unlocked — asking for "divide" without it would build an empty run.
  const canDivide = divisionUnlocked.length > 0 && mode !== "yard";
  const asked = payload.operation ?? null;
  const operation = !canDivide
    ? "multiply"
    : asked === "divide" || asked === "multiply" || asked === "both"
    ? asked
    : "both";

  const questions = generateQuestionSet({
    seed: newRunSeed(student.id, mode),
    tables: pool,
    divisionUnlocked,
    operation,
    // Guarded by the `mode in QUESTION_COUNT` check above, so the fallback is
    // unreachable — kept only so a typo in the table cannot produce a run of
    // zero questions.
    count: QUESTION_COUNT[mode] ?? 10,
    withChoices: false,
    weightFor,
  });

  if (questions.length === 0) return json({ error: "Could not build a run" }, 500);

  /* ---- store what was sent ----------------------------------------------- */

  const asServer = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: pending, error } = await asServer
    .from("pending_runs")
    .insert({
      student_id: student.id,
      mode,
      table_no: table,
      content: { questions },
    })
    .select("id, expires_at")
    .single();

  if (error || !pending) {
    return json({ error: error?.message ?? "Could not start the run" }, 500);
  }

  return json({
    runId: pending.id,
    expiresAt: pending.expires_at,
    timerSeconds: TIMER_SECONDS[mode] ?? null,
    // The answer ships with the question, deliberately.
    //
    // Withholding it would be theatre — `a × b` is derivable by anyone holding
    // a and b — and it would cost the thing that matters most in the loop:
    // telling a child immediately that they got it wrong, and what the answer
    // was. The anti-cheat isn't secrecy, it's that `run-finish` recomputes
    // correctness from the stored board and ignores what the client asserts.
    questions: questions.map((q) => ({
      id: q.id,
      operation: q.operation,
      a: q.a,
      b: q.b,
      prompt: q.prompt,
      spoken: q.spoken,
      answer: q.answer,
    })),
  });
});
