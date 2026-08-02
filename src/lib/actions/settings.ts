"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "./auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Accessibility settings (spec §13). Stored per student so siblings sharing
 * an account each keep their own timers, font and contrast.
 */
export async function saveSettings(studentId: string, patch: Record<string, unknown>) {
  await requireParent();
  const supabase = await createClient();

  const allowed = [
    "read_aloud",
    "dyslexia_font",
    "high_contrast",
    "reduced_motion",
    "text_scale",
    "timer_mode",
  ] as const;

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in patch) update[key] = patch[key];
  }
  if (Object.keys(update).length === 0) return;

  await supabase
    .from("student_settings")
    .upsert({ student_id: studentId, ...update }, { onConflict: "student_id" });

  revalidatePath("/play/settings");
  revalidatePath("/play");
}
