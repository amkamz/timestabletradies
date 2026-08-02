"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireParent } from "./auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Send a head-to-head challenge (spec §6.2). The recipient must be linked
 * crew — RLS enforces that too, so a tampered form can't reach a stranger.
 */
export async function sendChallenge(formData: FormData) {
  await requireParent();
  const supabase = await createClient();

  const fromStudent = String(formData.get("from_student") ?? "");
  const toStudent = String(formData.get("to_student") ?? "");
  const table = Number(formData.get("table") ?? 0) || null;
  if (!fromStudent || !toStudent) return;

  const { data } = await supabase
    .from("challenges")
    .insert({
      seed: crypto.randomUUID(),
      from_student: fromStudent,
      to_student: toStudent,
      table_no: table,
      questions: 10,
    })
    .select()
    .single();

  revalidatePath("/play/crew");
  if (data) redirect(`/play/crew/challenge/${data.id}?side=from`);
}

/** Attach a finished run to one side of a challenge. */
export async function attachChallengeRun(
  challengeId: string,
  side: "from" | "to",
  runId: string,
) {
  await requireParent();
  const supabase = await createClient();

  const patch = side === "from" ? { from_run: runId } : { to_run: runId };
  const { data } = await supabase
    .from("challenges")
    .update(patch)
    .eq("id", challengeId)
    .select()
    .single();

  // Both sides in — the challenge is settled.
  if (data?.from_run && data?.to_run) {
    await supabase.from("challenges").update({ status: "complete" }).eq("id", challengeId);
  }

  revalidatePath(`/play/crew/challenge/${challengeId}`);
}
