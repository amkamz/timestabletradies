"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireParent } from "./auth";
import { FAMILY_LIMITS } from "@/lib/game/billing";
import { isValidLook } from "@/lib/game/character";
import { isValidNameSelection } from "@/lib/game/names";
import { DEFAULT_UNLOCK_ORDER } from "@/lib/game/zones";
import { setActiveStudentId } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean };

/** Add a student profile, up to the 5-per-account cap (spec §2). */
export async function addStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { familyId } = await requireParent();
  const supabase = await createClient();

  const displayName = String(formData.get("display_name") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const yearLevel = String(formData.get("year_level") ?? "").trim();

  if (!displayName) return { error: "Give the profile a name." };

  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId);

  if ((count ?? 0) >= FAMILY_LIMITS.maxStudents) {
    return { error: `This account is full — ${FAMILY_LIMITS.maxStudents} profiles is the limit.` };
  }

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      family_id: familyId,
      display_name: displayName,
      age: ageRaw ? Number(ageRaw) : null,
      year_level: yearLevel || null,
    })
    .select()
    .single();

  if (error || !student) return { error: error?.message ?? "Could not add that profile." };

  // Every new tradie starts with the first table in the curriculum order,
  // multiplication only (spec §4).
  await supabase.from("student_tables").insert({
    student_id: student.id,
    table_no: DEFAULT_UNLOCK_ORDER[0],
    division_unlocked: false,
  });
  await supabase.from("student_settings").insert({ student_id: student.id });

  revalidatePath("/onboarding/students");
  revalidatePath("/dashboard/family");
  return { ok: true };
}

export async function removeStudent(formData: FormData) {
  await requireParent();
  const supabase = await createClient();
  const id = String(formData.get("student_id") ?? "");
  if (id) await supabase.from("students").delete().eq("id", id);
  revalidatePath("/dashboard/family");
}

/** Save the chosen character look (spec §7 — nothing gendered is recorded). */
export async function saveLook(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireParent();
  const supabase = await createClient();

  const studentId = String(formData.get("student_id") ?? "");
  const look = {
    model: Number(formData.get("model") ?? 1),
    skin: String(formData.get("skin") ?? "s3"),
    hair: String(formData.get("hair") ?? "h1"),
  };

  if (!studentId) return { error: "Pick a profile first." };
  if (!isValidLook(look)) return { error: "That look isn't available." };

  const { error } = await supabase
    .from("students")
    .update({ look_model: look.model, look_skin: look.skin, look_hair: look.hair })
    .eq("id", studentId);

  if (error) return { error: error.message };

  redirect(`/onboarding/name?student=${studentId}`);
}

/** Save the generated tradie name. Only vetted pool values are accepted. */
export async function saveName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireParent();
  const supabase = await createClient();

  const studentId = String(formData.get("student_id") ?? "");
  const parts = {
    trade: String(formData.get("trade") ?? ""),
    adjective: String(formData.get("adjective") ?? ""),
    surname: String(formData.get("surname") ?? ""),
  };

  if (!studentId) return { error: "Pick a profile first." };
  // Belt and braces: the UI only offers pool values, and so does the server.
  if (!isValidNameSelection(parts)) {
    return { error: "Pick one option from each row." };
  }

  const { error } = await supabase
    .from("students")
    .update({
      name_trade: parts.trade,
      name_adjective: parts.adjective,
      name_surname: parts.surname,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) return { error: error.message };

  redirect(`/onboarding/meet?student=${studentId}`);
}

/** Switch which student profile the app is currently in. */
export async function selectStudent(formData: FormData) {
  await requireParent();
  const id = String(formData.get("student_id") ?? "");
  if (id) await setActiveStudentId(id);
  redirect("/play");
}
