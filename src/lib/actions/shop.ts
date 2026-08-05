"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "./auth";
import { canPurchase, findItem } from "@/lib/game/shop";
import { levelFromXp } from "@/lib/game/city-level";
import { createClient } from "@/lib/supabase/server";

export type ShopResult = { ok: boolean; message?: string };

/**
 * Buy a cosmetic. Coins only — there is no real-money path anywhere in the
 * student app (spec §2, §5). The coin balance is re-read and the price
 * re-checked server-side so the client can't spend what it doesn't have.
 */
export async function purchaseItem(studentId: string, itemKey: string): Promise<ShopResult> {
  await requireParent();
  const supabase = await createClient();

  const item = findItem(itemKey);
  if (!item) return { ok: false, message: "That item isn't in the shop." };

  const [{ data: student }, { data: owned }] = await Promise.all([
    supabase.from("students").select("coins, city_xp").eq("id", studentId).single(),
    supabase.from("student_cosmetics").select("item_key").eq("student_id", studentId),
  ]);

  if (!student) return { ok: false, message: "Profile not found." };

  const check = canPurchase(item, {
    coins: student.coins,
    level: levelFromXp(student.city_xp).level,
    owned: (owned ?? []).map((o) => o.item_key),
  });
  if (!check.ok) return { ok: false, message: check.message };

  const { error } = await supabase
    .from("student_cosmetics")
    .insert({ student_id: studentId, item_key: itemKey });
  if (error) return { ok: false, message: "Could not add that to your locker." };

  await supabase
    .from("students")
    .update({ coins: student.coins - item.coins })
    .eq("id", studentId);

  revalidatePath("/play/shop");
  revalidatePath("/play/locker");
  return { ok: true, message: `${item.name} is in your locker.` };
}

/** Equip an owned item, swapping out whatever else is on that slot. */
export async function equipItem(studentId: string, itemKey: string): Promise<ShopResult> {
  await requireParent();
  const supabase = await createClient();

  const item = findItem(itemKey);
  if (!item) return { ok: false, message: "Unknown item." };

  const { data: owned } = await supabase
    .from("student_cosmetics")
    .select("item_key")
    .eq("student_id", studentId)
    .eq("item_key", itemKey)
    .maybeSingle();

  if (!owned) return { ok: false, message: "You don't own that yet." };

  // One item per category: unequip the rest of the slot first.
  const slotKeys = (await supabase
    .from("student_cosmetics")
    .select("item_key")
    .eq("student_id", studentId)
    .then(({ data }) =>
      (data ?? [])
        .map((r) => r.item_key)
        .filter((k) => findItem(k)?.category === item.category),
    )) as string[];

  if (slotKeys.length > 0) {
    await supabase
      .from("student_cosmetics")
      .update({ equipped: false })
      .eq("student_id", studentId)
      .in("item_key", slotKeys);
  }

  await supabase
    .from("student_cosmetics")
    .update({ equipped: true })
    .eq("student_id", studentId)
    .eq("item_key", itemKey);

  revalidatePath("/play/locker");
  return { ok: true };
}
