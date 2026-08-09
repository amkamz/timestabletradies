/**
 * jobs — today's board.
 *
 * The core loop's own menu was the last thing in the app still invented on the
 * client: `Storyboard.jobBoardStub` made up four offers, including what each
 * one paid (docs/native/screens.md). A board that promises coins the server
 * never agreed to is a results screen waiting to disappoint somebody.
 *
 * `generateJobBoard` already exists, is tested, and already weights every
 * offer by per-fact difficulty — a job on ×7 is worth more than the same job on
 * ×10 (§1.9). All this does is run it against tables the family is actually
 * entitled to, and hand back the same shape.
 *
 * ## The seed is the day
 *
 * Same student, same day, same board — so closing the app and coming back does
 * not reroll the work, and a child cannot shop for an easier set by force
 * quitting. It changes at midnight in the *device's* reckoning of the date,
 * which is a compromise: the alternative is a timezone stored per family, and
 * that is a decision for when the board is stored rather than derived.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

import { generateJobBoard } from "../_shared/game/questions.ts";
import { playableTables, type Entitlement } from "../_shared/game/entitlement.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Not signed in" }, 401);

  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");
  if (!studentId) return json({ error: "Missing studentId" }, 400);

  // The client's date, because the client is where midnight is felt. Validated
  // to a plain ISO day so it can only ever be a seed, never an injection.
  const day = url.searchParams.get("day") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: "Bad day" }, 400);

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

  const [{ data: tableRows }, { data: entitlementRow }] = await Promise.all([
    supabase.from("student_tables").select("table_no").eq("student_id", student.id),
    supabase
      .from("entitlements")
      .select("tier, status, expires_at")
      .eq("family_id", student.family_id)
      .maybeSingle(),
  ]);

  // Mapped the same way `run-start` maps it — a null row is the free tier, and
  // both endpoints have to agree or the board offers a table the run refuses.
  const entitlement: Entitlement = entitlementRow
    ? {
        tier: entitlementRow.tier,
        status: entitlementRow.status,
        expiresAt: entitlementRow.expires_at,
      }
    : null;

  const owned = (tableRows ?? []).map((row: { table_no: number }) => row.table_no);

  // Drawn only from what the family is entitled to (§1.10). A table a child has
  // unlocked but no longer has access to must not appear on the board — the run
  // would be refused at `run-start` and the offer would be a lie.
  const tables = playableTables(owned, entitlement);

  return json({
    day,
    tables,
    jobs: generateJobBoard(`${student.id}-${day}`, tables),
  });
});
