/**
 * house — the build, and what's left of it.
 *
 * Stage thresholds are a rule: `bankMaterials` rolls loads forward through
 * them server-side, so a client holding its own copy of HOUSE_STAGES would
 * draw a progress bar that disagrees with the number of loads it takes to
 * actually finish a stage. The whole ladder is returned instead.
 *
 * Rare items come back too. They only drop from Boss Battle wins (spec §8),
 * so the collection is the visible record of something a normal job can't give.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

import {
  HOUSE_STAGES,
  RARE_HOUSE_ITEMS,
  stageAt,
  stageProgress,
} from "../_shared/game/progression.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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
    .select("id, house_stage, house_loads")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return json({ error: "No such student" }, 403);

  const { data: rareRows } = await supabase
    .from("student_rare_items")
    .select("item_key, won_at")
    .eq("student_id", student.id);

  const owned = new Set((rareRows ?? []).map((r: { item_key: string }) => r.item_key));
  const current = stageAt(student.house_stage);

  return json({
    stageIndex: student.house_stage,
    loads: student.house_loads,
    /** Null on Move-in Day, which has no target. */
    loadsNeeded: current.loads > 0 ? current.loads : null,
    percent: stageProgress(student.house_stage, student.house_loads),
    movedIn: student.house_stage >= HOUSE_STAGES.length - 1,
    stages: HOUSE_STAGES.map((stage, i) => ({
      key: stage.key,
      name: stage.name,
      loads: stage.loads,
      unit: stage.unit,
      done: i < student.house_stage,
      current: i === student.house_stage,
    })),
    rareItems: RARE_HOUSE_ITEMS.map((item) => ({
      key: item.key,
      name: item.name,
      blurb: item.blurb,
      zone: item.zone,
      owned: owned.has(item.key),
    })),
  });
});
