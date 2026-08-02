"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "./auth";
import { FAMILY_LIMITS } from "@/lib/game/billing";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean; code?: string };

function makeCode(): string {
  // Human-readable, no ambiguous characters.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

/**
 * Issue an invite code. Kinds:
 *  - parent: a second guardian (max 2 per family, spec §2)
 *  - grandparent: sticker-only access (uncapped)
 *  - crew: links another *family*, which is what makes multiplayer possible
 */
export async function createInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { familyId, userId } = await requireParent();
  const supabase = await createClient();

  const kind = String(formData.get("kind") ?? "") as "parent" | "grandparent" | "crew";
  if (!["parent", "grandparent", "crew"].includes(kind)) {
    return { error: "Unknown invite type." };
  }

  if (kind === "parent") {
    const { count } = await supabase
      .from("family_members")
      .select("user_id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("role", "parent");
    if ((count ?? 0) >= FAMILY_LIMITS.maxParents) {
      return { error: `Only ${FAMILY_LIMITS.maxParents} parent accounts per family.` };
    }
  }

  const code = makeCode();
  const { error } = await supabase.from("invites").insert({
    code,
    family_id: familyId,
    kind,
    created_by: userId,
  });

  if (error) return { error: "Could not create that invite." };

  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/crew");
  return { ok: true, code };
}

/**
 * Redeem an invite. For crew invites this links the two *families* — which
 * is the only way student profiles ever become visible to each other.
 * Kids cannot reach this action.
 */
export async function redeemInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Enter the code you were sent." };

  const { data: invite } = await supabase
    .from("invites")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!invite) return { error: "That code isn't valid." };
  if (invite.redeemed_at) return { error: "That code has already been used." };
  if (new Date(invite.expires_at) < new Date()) return { error: "That code has expired." };

  if (invite.kind === "crew") {
    const { data: mine } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .eq("role", "parent")
      .maybeSingle();

    if (!mine) return { error: "Only a parent account can link crew." };
    if (mine.family_id === invite.family_id) return { error: "That's your own family." };

    // Stored once per pair, in a stable order.
    const [a, b] = [mine.family_id, invite.family_id].sort();
    const { error } = await supabase.from("crew_links").insert({
      family_a: a,
      family_b: b,
      status: "active",
      created_by: user.id,
    });
    if (error && !error.message.includes("duplicate")) {
      return { error: "Could not link those families." };
    }
  } else {
    // parent or grandparent joining an existing family
    const { error } = await supabase.from("family_members").insert({
      family_id: invite.family_id,
      user_id: user.id,
      role: invite.kind === "parent" ? "parent" : "grandparent",
      display_name: user.user_metadata?.display_name ?? "",
    });
    if (error) return { error: "Could not join that family." };
  }

  await supabase
    .from("invites")
    .update({ redeemed_at: new Date().toISOString(), redeemed_by: user.id })
    .eq("code", code);

  revalidatePath("/dashboard/crew");
  return { ok: true };
}

/** Unlink a crew family. Parent-only. */
export async function removeCrewLink(formData: FormData) {
  await requireParent();
  const supabase = await createClient();
  const id = String(formData.get("link_id") ?? "");
  if (id) await supabase.from("crew_links").delete().eq("id", id);
  revalidatePath("/dashboard/crew");
}

/** Change the subscription plan. Parent-only, never visible to students. */
export async function updatePlan(formData: FormData) {
  const { familyId } = await requireParent();
  const supabase = await createClient();
  const plan = String(formData.get("plan") ?? "annual");
  if (plan === "annual" || plan === "monthly") {
    await supabase.from("families").update({ plan }).eq("id", familyId);
  }
  revalidatePath("/dashboard/billing");
}

/** Send a sticker. The only write a grandparent account can perform. */
export async function sendSticker(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const studentId = String(formData.get("student_id") ?? "");
  const stickerKey = String(formData.get("sticker_key") ?? "");
  if (!studentId || !stickerKey) return;

  // RLS restricts inserts to the sender's own grandchildren or their own kids.
  await supabase.from("stickers").insert({
    student_id: studentId,
    sender_id: user.id,
    sticker_key: stickerKey,
  });

  revalidatePath("/grandparent");
}
