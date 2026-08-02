"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "./auth";
import { garageCoins, scoreJob, type AnswerRecord } from "@/lib/game/questions";
import { rewardMultiplier } from "@/lib/game/difficulty";
import { canUnlockZone } from "@/lib/game/entitlement";
import { getEntitlementForStudent } from "@/lib/data/entitlement";
import { factKey, isDueForReview, stageForFact, emptyFactStats } from "@/lib/game/mastery";
import {
  bankMaterials,
  rankFromYardResult,
  rareItemForZone,
  type HouseStage,
} from "@/lib/game/progression";
import { scaffoldReward, type ScaffoldReward } from "@/lib/game/scaffold";
import {
  getMastery,
  getUnlockState,
  maybeUnlockNextAdvancedTable,
  recordMastery,
} from "@/lib/data/student";
import { countsForSpeed } from "@/lib/game/modes";
import {
  replayCableRun,
  type CableMove,
  type CableOutcome,
  type Difficulty as CableDifficulty,
} from "@/lib/game/cable-run";
import {
  replayDuel,
  type DuelMove,
  type DuelOutcome,
  type RivalKey,
} from "@/lib/game/tool-off";
import {
  replayFloorPlan,
  type Difficulty as FloorDifficulty,
  type FloorMove,
  type FloorOutcome,
} from "@/lib/game/floor-plan";
import { replayRally, type RallyOutcome, type Route } from "@/lib/game/rally";
import { createClient } from "@/lib/supabase/server";
import type { RunMode, StudentRow } from "@/lib/supabase/types";

export type RunPayload = {
  studentId: string;
  mode: RunMode;
  jobType?: "quick" | "delivery" | "measure" | "build" | "muster";
  table?: number | null;
  operation?: "multiply" | "divide" | "both";
  /** Base reward for the job, before accuracy weighting. */
  reward?: { coins: number; materials: number };
  /**
   * Cable Run submits the board it was given and the moves it made, and the
   * server replays them. Both the payout and the mastery log come out of that
   * replay, so `answers` is ignored for this mode.
   */
  puzzle?: {
    seed: string;
    difficulty: CableDifficulty;
    moves: CableMove[];
  };
  /** The Tool-Off submits its swings the same way, for the same reason. */
  duel?: {
    seed: string;
    rival: RivalKey;
    moves: DuelMove[];
  };
  /** Floor Plan submits its placements. */
  floor?: {
    seed: string;
    difficulty: FloorDifficulty;
    moves: FloorMove[];
  };
  /**
   * Ute Rally answers questions like any other mode, but the road taken each
   * leg decides the distance — so the routes come across and get checked
   * against the facts the answers actually cover.
   */
  rally?: {
    seed: string;
    routes: Route[];
  };
  answers: Array<{
    a: number;
    b: number;
    operation: "multiply" | "divide";
    correct: boolean;
    elapsedMs: number;
  }>;
};

export type RunResult = {
  coins: number;
  materials: number;
  accuracy: number;
  avgMs: number;
  correct: number;
  total: number;
  /** House stages finished by this run, for the celebration. */
  stagesCompleted: HouseStage[];
  houseStage: number;
  houseLoads: number;
  /** Set when this run pushed the student up the Trade Rank ladder. */
  newRank?: number;
  /** Set when a full multiplication round opened division for a table. */
  divisionUnlockedFor?: number;
  /** Set when the 12×12 grid went fully Blue and a new table opened. */
  newTable?: number;
  /** Set when a Boss Battle win dropped a rare house item. */
  rareItem?: { key: string; name: string };
  /** Scaffold Stack: planks placed, and whether that beat the old record. */
  height?: number;
  previousBest?: number;
  newPersonalBest?: boolean;
  /** True when the daily coin cap reduced the payout (Scaffold, Cable Run). */
  coinsCapped?: boolean;
  /** Cable Run: whether the circuit was completed, and how efficiently. */
  solved?: boolean;
  movesUsed?: number;
  parLength?: number;
  /** Ute Rally: lengths travelled, and where that finished in the field. */
  distance?: number;
  place?: number;
  fieldSize?: number;
};

/**
 * The single write path for finishing any run — jobs, modes, boss battles
 * and races all land here. Rewards are computed server-side from the
 * answer log, so a tampered client can't mint coins.
 */
export async function finishRun(payload: RunPayload): Promise<RunResult> {
  await requireParent();
  const supabase = await createClient();

  const { data: studentData } = await supabase
    .from("students")
    .select("*")
    .eq("id", payload.studentId)
    .single();

  // RLS already scopes this to the caller's family; a miss means no access.
  if (!studentData) throw new Error("Student not found");
  const student = studentData as StudentRow;

  // Cable Run doesn't submit an answer log at all — it submits the board it
  // was handed and the moves it made, and the server regenerates that board
  // and replays them. A tampered client can claim a harder board, but then it
  // has to actually solve that board.
  let cable: CableOutcome | null = null;
  if (payload.mode === "cablerun" && payload.puzzle) {
    const [{ unlocked, divisionUnlocked }, coinsToday] = await Promise.all([
      getUnlockState(student.id),
      coinsEarnedToday(supabase, student.id, "cablerun"),
    ]);

    cable = replayCableRun({
      seed: payload.puzzle.seed,
      difficulty: payload.puzzle.difficulty,
      tables: unlocked,
      divisionUnlocked,
      moves: payload.puzzle.moves,
      coinsToday,
    });
  }

  let duel: DuelOutcome | null = null;
  if (payload.mode === "tooloff" && payload.duel) {
    const [{ unlocked }, coinsToday] = await Promise.all([
      getUnlockState(student.id),
      coinsEarnedToday(supabase, student.id, "tooloff"),
    ]);

    duel = replayDuel({
      seed: payload.duel.seed,
      rival: payload.duel.rival,
      unlocked,
      moves: payload.duel.moves,
      coinsToday,
    });
  }

  let floor: FloorOutcome | null = null;
  if (payload.mode === "floorplan" && payload.floor) {
    const [{ unlocked, divisionUnlocked }, coinsToday] = await Promise.all([
      getUnlockState(student.id),
      coinsEarnedToday(supabase, student.id, "floorplan"),
    ]);

    floor = replayFloorPlan({
      seed: payload.floor.seed,
      difficulty: payload.floor.difficulty,
      tables: unlocked,
      divisionUnlocked,
      moves: payload.floor.moves,
      coinsToday,
    });
  }

  const submitted = cable?.answers ?? duel?.answers ?? floor?.answers ?? payload.answers;

  // Drop anything outside what this family's plan actually covers.
  //
  // The three replayed modes above are already safe — their answer logs come
  // from a board the server generated and replayed. `payload.answers` does
  // not: it is whatever the client posted, so without this a tampered request
  // could submit ×7 answers on a free account and be paid for them, and would
  // pollute the mastery grid with facts the child was never taught.
  const { unlocked: playable } = await getUnlockState(student.id);
  const playableTableSet = new Set(playable);
  const answers = submitted.filter((a) => playableTableSet.has(a.a));

  const total = answers.length;
  const records: AnswerRecord[] = answers.map((a) => ({
    factKey: `${a.a}x${a.b}`,
    operation: a.operation,
    correct: a.correct,
    elapsedMs: a.elapsedMs,
  }));

  // ---- rewards ------------------------------------------------------------

  const isGarage = payload.mode === "garage";
  const base = payload.reward ?? { coins: 0, materials: 0 };

  // Reward weighting, read *before* this run's answers are folded in
  // (`recordMastery` runs further down). Otherwise the run that finally
  // masters a fact would be the first one docked for having mastered it.
  const mastery = await getMastery(student.id);
  const rewardFor = (a: number, b: number) => {
    const stats = mastery.get(factKey(a, b)) ?? emptyFactStats(a, b);
    return rewardMultiplier(a, b, {
      stage: stageForFact(stats),
      due: isDueForReview(stats),
    });
  };

  const scored = scoreJob(records, base, rewardFor);

  // The Garage pays per correct answer, weighted by fact (spec §6.1).
  let coins = isGarage ? garageCoins(records, rewardFor) : scored.coins;
  // Untimed/relaxed practice still counts for mastery but banks no materials.
  let materials = payload.mode === "toolbox" ? 0 : scored.materials;

  // Scaffold Stack is endless, so its payout comes from the answer log rather
  // than from a job's advertised reward: the height a client claims can't
  // inflate what it earns (docs/game-modes/04-scaffold-stack.md §6).
  let scaffold: ScaffoldReward | null = null;
  let previousBest = 0;
  if (payload.mode === "scaffold") {
    const [bestResult, coinsToday] = await Promise.all([
      supabase
        .from("runs")
        .select("correct")
        .eq("student_id", student.id)
        .eq("mode", "scaffold")
        .order("correct", { ascending: false })
        .limit(1)
        .maybeSingle(),
      coinsEarnedToday(supabase, student.id, "scaffold"),
    ]);

    previousBest = bestResult.data?.correct ?? 0;

    // One plank per correct answer, so the log *is* the height.
    scaffold = scaffoldReward({ height: scored.correct, previousBest, coinsToday });
    coins = scaffold.coins;
    materials = scaffold.materials;
  }

  // Ute Rally scores from the answer log plus the roads taken, which are
  // verified against the facts those answers cover.
  let rally: RallyOutcome | null = null;
  if (payload.mode === "rally" && payload.rally) {
    const [{ unlocked, divisionUnlocked }, coinsToday] = await Promise.all([
      getUnlockState(student.id),
      coinsEarnedToday(supabase, student.id, "rally"),
    ]);

    rally = replayRally({
      seed: payload.rally.seed,
      tables: unlocked,
      divisionUnlocked,
      routes: payload.rally.routes,
      answers: records.map((r, i) => ({
        a: answers[i].a,
        b: answers[i].b,
        operation: r.operation,
        correct: r.correct,
        elapsedMs: r.elapsedMs,
      })),
      coinsToday,
    });
  }

  const replayed = cable ?? duel ?? floor ?? rally;
  if (replayed) {
    coins = replayed.coins;
    materials = replayed.materials;
  }

  // ---- record the run -----------------------------------------------------

  const { data: run } = await supabase
    .from("runs")
    .insert({
      student_id: student.id,
      mode: payload.mode,
      job_type: payload.jobType ?? null,
      table_no: payload.table ?? null,
      operation: payload.operation ?? "multiply",
      questions: total,
      correct: scored.correct,
      avg_ms: scored.avgMs,
      coins,
      materials,
      // The Big Job goes to the teacher automatically, no opt-in (spec §6.1).
      shared_with_teacher: payload.mode === "bigjob",
      finished_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (run && answers.length > 0) {
    await supabase.from("answers").insert(
      answers.map((a) => ({
        run_id: run.id,
        student_id: student.id,
        a: a.a,
        b: a.b,
        operation: a.operation,
        correct: a.correct,
        elapsed_ms: a.elapsedMs,
      })),
    );
  }

  // Whether an attempt counts toward speed is a property of the mode, decided
  // here rather than claimed by the client.
  await recordMastery(student.id, answers, countsForSpeed(payload.mode));

  // ---- house project ------------------------------------------------------

  const house = bankMaterials(
    { stageIndex: student.house_stage, loads: student.house_loads },
    materials,
  );

  // ---- trade rank ---------------------------------------------------------

  let newRank: number | undefined;
  if (payload.mode === "yard") {
    const rung = rankFromYardResult({
      accuracy: scored.accuracy,
      avgMs: scored.avgMs,
      questions: total,
    });
    // The Yard sets the rank outright, but never demotes on a bad day.
    if (rung > student.rank_rung) newRank = rung;
  }

  await supabase
    .from("students")
    .update({
      coins: student.coins + coins,
      house_stage: house.stageIndex,
      house_loads: house.loads,
      ...(newRank ? { rank_rung: newRank } : {}),
    })
    .eq("id", student.id);

  // ---- unlocks ------------------------------------------------------------

  const result: RunResult = {
    coins,
    materials,
    accuracy: scored.accuracy,
    avgMs: scored.avgMs,
    correct: scored.correct,
    total,
    stagesCompleted: house.completed,
    houseStage: house.stageIndex,
    houseLoads: house.loads,
    newRank,
    ...(scaffold
      ? {
          height: scored.correct,
          previousBest,
          newPersonalBest: scaffold.newPersonalBest,
          coinsCapped: scaffold.capped,
        }
      : {}),
    ...(cable
      ? {
          solved: cable.solved,
          movesUsed: cable.movesUsed,
          parLength: cable.parLength,
          coinsCapped: cable.capped,
        }
      : {}),
    ...(duel
      ? {
          solved: duel.won,
          movesUsed: duel.turns,
          coinsCapped: duel.capped,
        }
      : {}),
    ...(floor
      ? {
          solved: floor.completed,
          movesUsed: floor.answers.length,
          coinsCapped: floor.capped,
        }
      : {}),
    ...(rally
      ? {
          distance: rally.distance,
          place: rally.place,
          fieldSize: rally.fieldSize,
          coinsCapped: rally.capped,
        }
      : {}),
  };

  // Multiplication-first: a full multiplication round on a table opens
  // division for that table (spec §4).
  const table = payload.table;
  if (
    table &&
    total > 0 &&
    answers.every((a) => a.operation === "multiply") &&
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
      result.divisionUnlockedFor = table;
    }
  }

  // Boss wins drop a rare house item that normal jobs never give (spec §8).
  if (payload.mode === "boss" && scored.accuracy >= 0.8 && table) {
    const item = rareItemForZone(table);
    const { error } = await supabase.from("student_rare_items").insert({
      student_id: student.id,
      item_key: item.key,
    });
    // A duplicate just means they'd already won it — not an error worth raising.
    if (!error) result.rareItem = { key: item.key, name: item.name };
  }

  const newTable = await maybeUnlockNextAdvancedTable(student);
  if (newTable) result.newTable = newTable;

  revalidatePath("/play");
  revalidatePath("/play/house");
  revalidatePath("/play/mastery");

  return result;
}

/**
 * Coins a student has already earned from one mode today, for the daily cap
 * on the repeatable modes (docs/game-modes/00-integration-contract.md §4).
 */
async function coinsEarnedToday(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  mode: RunMode,
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("runs")
    .select("coins")
    .eq("student_id", studentId)
    .eq("mode", mode)
    .gte("finished_at", startOfDay.toISOString());

  return (data ?? []).reduce((sum, row) => sum + row.coins, 0);
}

/** Unlock the next table in the curriculum order once a zone is fluent. */
export async function unlockNextZone(studentId: string, table: number) {
  await requireParent();
  const supabase = await createClient();

  // The free tier stops at FREE_ZONE_COUNT zones. Checked here rather than in
  // the UI because this is a write path a client can call directly — RLS can
  // express "this student is in my family" but not "this zone is paid for".
  const { ownedTables } = await getUnlockState(studentId);
  const entitlement = await getEntitlementForStudent(studentId);
  if (!canUnlockZone(ownedTables, entitlement)) return;

  await supabase
    .from("student_tables")
    .insert({ student_id: studentId, table_no: table, division_unlocked: false });
  revalidatePath("/play/zones");
}
