/**
 * shop — buy a cosmetic, or wear one you own.
 *
 * The coin sink. Until this existed the economy minted currency and had nowhere
 * to spend it: `run-finish` paid coins correctly and the Android shop kept
 * purchases in a `mutableStateMap` that died with the process, so every item a
 * child bought was gone when they came back (docs/native/screens.md).
 *
 * ## Why the price is re-read here
 *
 * The client is told what a thing costs so it can draw the card. It is not
 * *asked*. Both the balance and the price are read server-side and `canPurchase`
 * decides — the same function the web calls — so a client that lied about
 * either gets nothing. RLS can stop a child writing to a sibling's row; it
 * cannot stop them writing a larger number into their own.
 *
 * Runs as the caller, not the service role: a purchase is scoped to a student
 * the signed-in parent's family already owns, and that is exactly what the
 * existing policies express.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

import { canPurchase, findItem } from "../_shared/game/shop.ts";
import { levelFromXp } from "../_shared/game/city-level.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type Payload = {
  action?: "purchase" | "equip";
  studentId?: string;
  itemKey?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Not signed in" }, 401);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  const { action, studentId, itemKey } = payload;
  if (!studentId || !itemKey) return json({ error: "Missing studentId or itemKey" }, 400);

  const item = findItem(itemKey);
  if (!item) return json({ error: "That item isn't in the shop." }, 404);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );

  if (action === "equip") return equip(supabase, studentId, item);
  return purchase(supabase, studentId, item);
});

type Item = NonNullable<ReturnType<typeof findItem>>;
// deno-lint-ignore no-explicit-any
type Client = any;

async function purchase(supabase: Client, studentId: string, item: Item) {
  const [{ data: student }, { data: owned }] = await Promise.all([
    supabase.from("students").select("coins, city_xp").eq("id", studentId).maybeSingle(),
    supabase.from("student_cosmetics").select("item_key").eq("student_id", studentId),
  ]);

  // RLS already scoped that read to the caller's family, so a missing row means
  // "not yours" rather than "not found" — and both deserve the same answer.
  if (!student) return json({ error: "No such student" }, 403);

  const ownedKeys = (owned ?? []).map((o: { item_key: string }) => o.item_key);

  const check = canPurchase(item, {
    coins: student.coins,
    level: levelFromXp(student.city_xp).level,
    owned: ownedKeys,
  });
  if (!check.ok) return json({ error: check.message, reason: check.reason }, 409);

  const { error } = await supabase
    .from("student_cosmetics")
    .insert({ student_id: studentId, item_key: item.key });

  // A unique violation means a second tap landed while the first was in flight.
  // The child owns it either way, so this is a success, not an error.
  if (error && error.code !== "23505") {
    return json({ error: "Could not add that to your locker." }, 500);
  }

  if (!error) {
    await supabase
      .from("students")
      .update({ coins: student.coins - item.coins })
      .eq("id", studentId);
  }

  return json({
    ok: true,
    itemKey: item.key,
    coins: error ? student.coins : student.coins - item.coins,
    message: `${item.name} is in your locker.`,
  });
}

async function equip(supabase: Client, studentId: string, item: Item) {
  const { data: ownedRow } = await supabase
    .from("student_cosmetics")
    .select("item_key")
    .eq("student_id", studentId)
    .eq("item_key", item.key)
    .maybeSingle();

  if (!ownedRow) return json({ error: "You don't own that yet." }, 409);

  const { data: all } = await supabase
    .from("student_cosmetics")
    .select("item_key")
    .eq("student_id", studentId);

  // One item per category, so everything else on this slot comes off first.
  // Filtered here rather than in the query because the slot a key belongs to is
  // a fact about the catalogue, not about the row.
  const sameSlot = (all ?? [])
    .map((row: { item_key: string }) => row.item_key)
    .filter((key: string) => findItem(key)?.category === item.category);

  if (sameSlot.length > 0) {
    await supabase
      .from("student_cosmetics")
      .update({ equipped: false })
      .eq("student_id", studentId)
      .in("item_key", sameSlot);
  }

  await supabase
    .from("student_cosmetics")
    .update({ equipped: true })
    .eq("student_id", studentId)
    .eq("item_key", item.key);

  return json({ ok: true, itemKey: item.key, category: item.category });
}
