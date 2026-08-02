import { redirect } from "next/navigation";

import { RallyTrack } from "@/components/play/rally-track";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import { buildField } from "@/lib/game/rally";
import { newRunSeed } from "@/lib/game/seed";

/**
 * Ute Rally — docs/game-modes/02-ute-rally.md
 *
 * The field is simulated crew, always labelled as practice opponents — the
 * documented fallback until real-time matchmaking lands.
 */
export default async function RallyPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { unlocked, divisionUnlocked } = await getUnlockState(student.id);
  if (unlocked.length === 0) redirect("/play");

  const seed = newRunSeed(student.id, "rally");

  return (
    <RallyTrack
      studentId={student.id}
      seed={seed}
      tables={unlocked}
      divisionUnlocked={divisionUnlocked}
      field={buildField(seed)}
    />
  );
}
