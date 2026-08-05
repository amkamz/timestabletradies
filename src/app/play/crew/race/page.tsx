import { redirect } from "next/navigation";

import { Runner } from "@/components/play/runner";
import { requireActiveStudent } from "@/lib/data/session";
import { getAssignment, getUnlockState } from "@/lib/data/student";
import { simulatedCrew } from "@/lib/game/crew";
import { generateQuestionSet } from "@/lib/game/questions";
import { newRunSeed } from "@/lib/game/seed";
import { createClient } from "@/lib/supabase/server";

/** E2 · Crew Race — live race on the teacher's tables. */
export default async function CrewRacePage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const supabase = await createClient();
  const [{ unlocked, divisionUnlocked }, assignment, { data: crew }] = await Promise.all([
    getUnlockState(student.id),
    getAssignment(student.id),
    supabase.from("crew_roster").select("id, display_name, city_xp"),
  ]);

  const tables =
    assignment && assignment.tables.length > 0
      ? assignment.tables.filter((t) => unlocked.includes(t))
      : unlocked;

  const seed = newRunSeed(student.id, "race");

  // Live presence isn't wired up yet, so every race currently fills with
  // simulated crew. They're labelled as practice opponents in the UI.
  const racers = simulatedCrew(seed, Math.max(2, (crew ?? []).length || 3));

  return (
    <Runner
      studentId={student.id}
      mode="crewrace"
      format="choice"
      label="Crew Race"
      tone="blue"
      operation={assignment?.operation ?? "multiply"}
      questions={generateQuestionSet({
        seed,
        tables: tables.length > 0 ? tables : unlocked,
        divisionUnlocked,
        operation: assignment?.operation ?? "multiply",
        count: 15,
      })}
      racers={racers}
      homeHref="/play/crew"
    />
  );
}
