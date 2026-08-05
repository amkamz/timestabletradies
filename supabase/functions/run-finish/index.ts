/**
 * run-finish — the anti-cheat boundary.
 *
 * This is the only place coins and materials are minted. The client posts what
 * it was asked and what it answered; the server recomputes the payout from
 * that log and ignores anything the client claims to have earned. A tampered
 * request can lie about its answers, but lying about answers means getting the
 * maths wrong, which pays less.
 *
 * Ported from `finishRun` in `src/lib/actions/play.ts`, for the question-and-
 * answer modes. The five puzzle modes replay a board rather than an answer log
 * and are still to come.
 *
 * The Supabase client is built from the *caller's* JWT rather than the service
 * role, so RLS scopes every read and write to their own family for free. A
 * request for someone else's student simply finds nothing.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

import {
  scoreJob,
  garageCoins,
  type AnswerRecord,
} from "../_shared/game/questions.ts";
import { rewardMultiplier } from "../_shared/game/difficulty.ts";
import {
  applyAttempt,
  emptyFactStats,
  factKey,
  isDueForReview,
  stageForFact,
  type FactStats,
} from "../_shared/game/mastery.ts";
import { countsForSpeed } from "../_shared/game/modes.ts";
import { applyDailyCap } from "../_shared/game/economy.ts";
import { playableTables, type Entitlement } from "../_shared/game/entitlement.ts";
import { bankMaterials } from "../_shared/game/progression.ts";
import { levelFromXp, levelsGained, xpForRun } from "../_shared/game/city-level.ts";
import { recordPlay } from "../_shared/game/streak.ts";
import type { RunMode } from "../_shared/game/supabase-types.ts";

/**
 * What the client submits per question.
 *
 * Note what is absent: `correct`. The client reports the number a child typed
 * and how long they took; whether that was right is decided here, against the
 * board this server generated and stored. A client that could assert
 * correctness could assert a perfect run.
 */
type SubmittedAnswer = {
  questionId: string;
  /** The value typed, or null if the question timed out unanswered. */
  answer: number | null;
  elapsedMs: number;
};

/** A question as `run-start` stored it. */
type StoredQuestion = {
  id: string;
  operation: "multiply" | "divide";
  a: number;
  b: number;
  answer: number;
};

type RunPayload = {
  /** The run handed out by `run-start`. */
  runId: string;
  answers: SubmittedAnswer[];
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );

  let payload: RunPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  if (!payload.runId || !Array.isArray(payload.answers)) {
    return json({ error: "Missing runId or answers" }, 400);
  }

  /* ---- the run this claims to be ----------------------------------------- */

  // RLS does the authorisation: a pending run belonging to another family is
  // simply not visible, so a miss is a refusal.
  const { data: pending } = await supabase
    .from("pending_runs")
    .select("id, student_id, mode, job_type, table_no, content, reward, expires_at, consumed_at")
    .eq("id", payload.runId)
    .maybeSingle();

  if (!pending) return json({ error: "No such run" }, 403);
  if (pending.consumed_at) return json({ error: "Run already submitted" }, 409);
  if (new Date(pending.expires_at) < new Date()) {
    return json({ error: "Run expired" }, 410);
  }

  // Claim the run *before* minting anything.
  //
  // Checking `consumed_at` above and marking it at the end would leave a gap
  // two concurrent submissions could both pass through, and both get paid for.
  // The `.is("consumed_at", null)` filter makes this a compare-and-swap: the
  // update returns a row only for whoever got there first, and the loser stops
  // here having changed nothing.
  //
  // The service role is required. `pending_runs` deliberately has no write
  // policy — a client that could update it could clear its own `consumed_at`
  // and resubmit forever — so with the caller's client this write is silently
  // swallowed by RLS and the guard never engages at all.
  const asServer = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: claimed } = await asServer
    .from("pending_runs")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", pending.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();

  if (!claimed) return json({ error: "Run already submitted" }, 409);

  const mode = pending.mode as RunMode;
  const asked: StoredQuestion[] = pending.content?.questions ?? [];
  if (asked.length === 0) return json({ error: "Run has no questions" }, 500);

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, family_id, coins, city_xp, house_stage, house_loads, " +
        "streak_tier, streak_points, streak_days_into_block, streak_last_played_on",
    )
    .eq("id", pending.student_id)
    .maybeSingle();

  if (!student) return json({ error: "No such student" }, 403);

  /* ---- mark correctness here, not there ---------------------------------- */

  const byId = new Map(asked.map((q) => [q.id, q]));
  const seen = new Set<string>();

  const answers = payload.answers.flatMap((submitted) => {
    const question = byId.get(submitted.questionId);
    // Unknown id, or the same question twice: not something an honest client
    // does, and scoring it would be scoring something never asked.
    if (!question || seen.has(submitted.questionId)) return [];
    seen.add(submitted.questionId);

    return [{
      a: question.a,
      b: question.b,
      operation: question.operation,
      // The whole point: correctness is decided against the stored board.
      correct: submitted.answer !== null && submitted.answer === question.answer,
      elapsedMs: Math.max(0, submitted.elapsedMs),
    }];
  });

  if (answers.length === 0) {
    return json({ error: "No answers matched this run" }, 400);
  }

  // Entitlement was checked at `run-start`, but re-check here: a plan can lapse
  // between starting and finishing, and this is the write path.
  const { data: entitlementRow } = await supabase
    .from("entitlements")
    .select("tier, status, expires_at")
    .eq("family_id", student.family_id)
    .maybeSingle();

  const entitlement: Entitlement = entitlementRow
    ? {
        tier: entitlementRow.tier,
        status: entitlementRow.status,
        expiresAt: entitlementRow.expires_at,
      }
    : null;

  const { data: tableRows } = await supabase
    .from("student_tables")
    .select("table_no")
    .eq("student_id", student.id);

  const owned = (tableRows ?? []).map((r: { table_no: number }) => r.table_no);
  const playable = new Set(playableTables(owned, entitlement));

  const entitled = answers.filter((a) => playable.has(a.a));
  const rejected = answers.length - entitled.length;
  if (entitled.length === 0) {
    return json({ error: "No answers on tables this account can play" }, 403);
  }

  /* ---- reward weighting, read before this run is folded in ---------------- */

  const { data: masteryRows } = await supabase
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

  // Read *before* the run is applied. Otherwise the run that finally masters a
  // fact would be the first one docked for having mastered it.
  const rewardFor = (a: number, b: number) => {
    const stats = mastery.get(factKey(a, b)) ?? emptyFactStats(a, b);
    return rewardMultiplier(a, b, {
      stage: stageForFact(stats),
      due: isDueForReview(stats),
    });
  };

  /* ---- score ------------------------------------------------------------- */

  const records: AnswerRecord[] = entitled.map((a) => ({
    factKey: `${a.a}x${a.b}`,
    operation: a.operation,
    correct: a.correct,
    elapsedMs: a.elapsedMs,
  }));

  const offer = pending.reward ?? { coins: 0, materials: 0 };
  const scored = scoreJob(records, offer, rewardFor);

  const uncappedCoins =
    mode === "garage" ? garageCoins(records, rewardFor) : scored.coins;

  // Endless and replayable modes need a ceiling or the shop becomes something
  // you grind rather than play toward.
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data: todayRuns } = await supabase
    .from("runs")
    .select("coins")
    .eq("student_id", student.id)
    .eq("mode", mode)
    .gte("started_at", since.toISOString());

  const earnedToday = (todayRuns ?? []).reduce(
    (sum: number, r: { coins: number }) => sum + r.coins,
    0,
  );
  const capped = applyDailyCap(uncappedCoins, earnedToday);

  // Toolbox Time is relaxed practice: it counts for mastery but banks nothing
  // toward the house.
  const materials = mode === "toolbox" ? 0 : scored.materials;

  /* ---- persist ----------------------------------------------------------- */

  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      student_id: student.id,
      mode,
      job_type: pending.job_type,
      table_no: pending.table_no,
      questions: entitled.length,
      correct: scored.correct,
      avg_ms: scored.avgMs,
      coins: capped.coins,
      materials,
      shared_with_teacher: mode === "bigjob",
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runError || !run) return json({ error: runError?.message ?? "Save failed" }, 500);

  await supabase.from("answers").insert(
    entitled.map((a) => ({
      run_id: run.id,
      student_id: student.id,
      a: a.a,
      b: a.b,
      operation: a.operation,
      correct: a.correct,
      elapsed_ms: a.elapsedMs,
    })),
  );

  /* ---- mastery ----------------------------------------------------------- */

  const timed = countsForSpeed(mode);
  const touched = new Map<string, FactStats>();
  for (const answer of entitled) {
    const key = factKey(answer.a, answer.b);
    const before = touched.get(key) ?? mastery.get(key) ?? emptyFactStats(answer.a, answer.b);
    touched.set(
      key,
      applyAttempt(before, {
        correct: answer.correct,
        elapsedMs: answer.elapsedMs,
        countsForSpeed: timed,
      }),
    );
  }

  if (touched.size > 0) {
    await supabase.from("fact_mastery").upsert(
      [...touched.values()].map((s) => ({
        student_id: student.id,
        a: s.a,
        b: s.b,
        attempts: s.attempts,
        correct: s.correct,
        avg_ms: s.avgMs,
        speed_attempts: s.speedAttempts,
        retention_hits: s.retentionHits,
        last_seen_at: s.lastSeenAt,
      })),
      { onConflict: "student_id,a,b" },
    );
  }

  /* ---- progression ------------------------------------------------------- */

  // City level replaced Trade Rank outright. Rank was recomputed from a single
  // Yard round and could fall, so nothing could be gated on it; XP only
  // accumulates. Correct answers only — XP is for work done — and daily jobs
  // pay the full rate while games pay less, so a game is never worth more than
  // the work.
  const xpEarned = xpForRun(mode, scored.correct);
  const newXp = student.city_xp + xpEarned;

  // One play per day, however many runs it took. This fires per finished run,
  // and `recordPlay` is idempotent within a date for exactly that reason.
  const streak = recordPlay(
    {
      tier: student.streak_tier,
      points: student.streak_points,
      daysIntoBlock: student.streak_days_into_block,
      lastPlayedOn: student.streak_last_played_on,
    },
    new Date().toISOString().slice(0, 10),
  );

  // Multiplication-first: a full multiplication round on a table opens
  // division for that table (spec §4).
  let divisionUnlockedFor: number | undefined;
  const table = pending.table_no;
  if (
    table &&
    entitled.length > 0 &&
    entitled.every((a) => a.operation === "multiply") &&
    scored.accuracy >= 0.8
  ) {
    const { data: tableRow } = await supabase
      .from("student_tables")
      .select("division_unlocked")
      .eq("student_id", student.id)
      .eq("table_no", table)
      .maybeSingle();

    if (tableRow && !tableRow.division_unlocked) {
      await supabase
        .from("student_tables")
        .update({ division_unlocked: true })
        .eq("student_id", student.id)
        .eq("table_no", table);
      divisionUnlockedFor = table;
    }
  }

  /* ---- bank ------------------------------------------------------------- */

  const house = bankMaterials(
    { stageIndex: student.house_stage, loads: student.house_loads },
    materials,
  );

  await supabase
    .from("students")
    .update({
      coins: student.coins + capped.coins,
      city_xp: newXp,
      house_stage: house.stageIndex,
      house_loads: house.loads,
      streak_tier: streak.state.tier,
      streak_points: streak.state.points,
      streak_days_into_block: streak.state.daysIntoBlock,
      streak_last_played_on: streak.state.lastPlayedOn,
    })
    .eq("id", student.id);

  return json({
    xpEarned,
    cityLevel: levelFromXp(newXp).level,
    levelsGained: levelsGained(student.city_xp, newXp),
    streakTier: streak.state.tier,
    streakPoints: streak.state.points,
    streakPointsAwarded: streak.pointsAwarded,
    streakTiersLost: streak.tiersLost,
    divisionUnlockedFor,
    runId: run.id,
    correct: scored.correct,
    total: entitled.length,
    accuracyPercent: Math.round(scored.accuracy * 100),
    averageMs: scored.avgMs,
    coins: capped.coins,
    uncappedCoins: capped.uncappedCoins,
    capped: capped.capped,
    materials,
    coinsTotal: student.coins + capped.coins,
    houseStagesCompleted: house.completed.map((s) => s.name),
    /** Answers dropped because the plan doesn't cover that table. */
    rejected,
  });
});
