"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean };

function makeJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export async function createClassroom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the class a name." };

  const { error } = await supabase.from("classrooms").insert({
    name,
    teacher_id: user.id,
    join_code: makeJoinCode(),
  });
  if (error) return { error: "Could not create that class." };

  revalidatePath("/dashboard/classroom");
  return { ok: true };
}

/**
 * Set the focus tables for a class or a single student. This is what The
 * Garage practises against (spec §6.1, §12).
 */
export async function setAssignment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const classroomId = String(formData.get("classroom_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "") || null;
  const tables = formData
    .getAll("tables")
    .map((t) => Number(t))
    .filter((t) => Number.isInteger(t) && t > 0);
  const operation = String(formData.get("operation") ?? "multiply");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!classroomId) return { error: "Pick a class." };
  if (tables.length === 0) return { error: "Choose at least one table." };

  const { error } = await supabase.from("assignments").insert({
    classroom_id: classroomId,
    student_id: studentId,
    tables,
    operation: operation === "divide" || operation === "both" ? operation : "multiply",
    note,
  });
  if (error) return { error: "Could not save that assignment." };

  revalidatePath("/dashboard/classroom");
  return { ok: true };
}
