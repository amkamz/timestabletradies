import { redirect } from "next/navigation";

import { DuelBoard } from "@/components/play/duel-board";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import { newRunSeed } from "@/lib/game/seed";
import { rivalsFor } from "@/lib/game/tool-off";
import { levelFromXp } from "@/lib/game/city-level";

/**
 * The Tool-Off — docs/game-modes/03-the-tool-off.md
 *
 * The rival roster opens up with Trade Rank. Everything the duel needs is
 * derived from the seed and the student's unlocked tables, so the server can
 * rebuild the identical belt and targets when it replays the swings.
 */
export default async function ToolOffPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { unlocked } = await getUnlockState(student.id);
  if (unlocked.length === 0) redirect("/play");

  return (
    <DuelBoard
      studentId={student.id}
      seed={newRunSeed(student.id, "tooloff")}
      unlocked={unlocked}
      rivals={rivalsFor(levelFromXp(student.city_xp).level)}
    />
  );
}
