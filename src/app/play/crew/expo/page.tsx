import { redirect } from "next/navigation";

import { Runner } from "@/components/play/runner";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import { simulatedCrew } from "@/lib/game/crew";
import { generateQuestionSet } from "@/lib/game/questions";
import { newRunSeed } from "@/lib/game/seed";

/** E3 · Trade Expo — open race across the full linked-crew network. */
export default async function ExpoPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { unlocked, divisionUnlocked } = await getUnlockState(student.id);
  const seed = newRunSeed(student.id, "expo");

  return (
    <Runner
      studentId={student.id}
      mode="expo"
      format="choice"
      label="Trade Expo"
      tone="teal"
      operation="both"
      questions={generateQuestionSet({
        seed,
        tables: unlocked,
        divisionUnlocked,
        operation: "both",
        count: 20,
      })}
      racers={simulatedCrew(seed, 4)}
      homeHref="/play/crew"
    />
  );
}
