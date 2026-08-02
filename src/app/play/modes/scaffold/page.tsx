import { redirect } from "next/navigation";

import { ScaffoldTower } from "@/components/play/scaffold-tower";
import { requireActiveStudent } from "@/lib/data/session";
import { getMastery, getUnlockState, statsFor } from "@/lib/data/student";
import { practiceWeight } from "@/lib/game/mastery";
import { newRunSeed } from "@/lib/game/seed";
import { createClient } from "@/lib/supabase/server";

/**
 * Scaffold Stack — docs/game-modes/04-scaffold-stack.md
 *
 * Endless stacking arcade. The run has no known length, so this hands the
 * client a seed and the adaptive weights rather than a fixed question set;
 * questions are generated in a rolling window as the tower grows.
 */
export default async function ScaffoldPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const [{ unlocked, divisionUnlocked }, mastery] = await Promise.all([
    getUnlockState(student.id),
    getMastery(student.id),
  ]);

  if (unlocked.length === 0) redirect("/play");

  // Weights can't cross the server/client boundary as a function, so the grid
  // of facts the student has unlocked goes over as plain numbers.
  const weights: Record<string, number> = {};
  for (const table of unlocked) {
    for (let b = 1; b <= 12; b++) {
      weights[`${table}x${b}`] = practiceWeight(statsFor(mastery, table, b));
    }
  }

  // The record to beat. `runs.correct` is the plank count — one per correct
  // answer — so the personal best needs no table of its own.
  const supabase = await createClient();
  const { data: best } = await supabase
    .from("runs")
    .select("correct")
    .eq("student_id", student.id)
    .eq("mode", "scaffold")
    .order("correct", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <ScaffoldTower
      studentId={student.id}
      seed={newRunSeed(student.id, "scaffold")}
      tables={unlocked}
      divisionUnlocked={divisionUnlocked}
      weights={weights}
      personalBest={best?.correct ?? 0}
    />
  );
}
