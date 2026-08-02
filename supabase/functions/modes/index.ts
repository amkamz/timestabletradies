/**
 * modes — what this student can play, and why not.
 *
 * Availability is a rule, so it is decided here rather than in each client
 * (docs/native/README.md §1.10). Three clients working it out independently is
 * three chances to disagree with the server that will actually refuse the run,
 * and the reason string is the only explanation a child ever sees for a lock —
 * it must not differ between platforms.
 *
 * Note what the reasons never mention: money. A free player is told "Unlocks
 * with 5 trades", which is a goal. The upgrade conversation happens above the
 * grown-up gate, with the parent.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

import {
  PRACTICE_MODES,
  modeAvailability,
  MODE_REQUIREMENTS,
} from "../_shared/game/modes.ts";
import {
  playableTables,
  isEntitled,
  atFreeTierCeiling,
  type Entitlement,
} from "../_shared/game/entitlement.ts";
import { puzzleTables } from "../_shared/game/zones.ts";

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );

  // RLS is the authorisation: a student outside the caller's family isn't
  // visible, so a miss is a refusal rather than an error worth explaining.
  const { data: student } = await supabase
    .from("students")
    .select("id, family_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return json({ error: "No such student" }, 403);

  const [{ data: tableRows }, { data: entitlementRow }] = await Promise.all([
    supabase
      .from("student_tables")
      .select("table_no, division_unlocked")
      .eq("student_id", student.id),
    supabase
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

  const unlock = { tables, divisionUnlocked };

  const modes = PRACTICE_MODES.map((mode) => {
    const availability = modeAvailability(mode.key, unlock);
    return {
      key: mode.key,
      name: mode.name,
      blurb: mode.blurb,
      playable: availability.playable,
      reason: availability.playable ? null : availability.reason,
      requiresZones: MODE_REQUIREMENTS[mode.key].zones,
    };
  });

  return json({
    // What the run generators can actually build from — x1 is a real zone but
    // no puzzle mode uses it.
    playableTables: tables,
    puzzleTables: puzzleTables(tables),
    divisionUnlocked,
    zoneCount: tables.length,
    entitled: isEntitled(entitlement),
    /**
     * True when a free player has run out of trades to open. The cue for
     * "you've mastered everything here — ask a grown-up", which is the only
     * honest way to end a free tier: going quiet reads as the game breaking.
     */
    atFreeCeiling: atFreeTierCeiling(owned, entitlement),
    modes,
  });
});
