import { redirect } from "next/navigation";

import { FloorGrid } from "@/components/play/floor-grid";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import {
  difficultyFor,
  generateRoom,
  type Difficulty,
  type Room,
} from "@/lib/game/floor-plan";
import { newRunSeed } from "@/lib/game/seed";
import { puzzleTables } from "@/lib/game/zones";

/**
 * Floor Plan — docs/game-modes/05-floor-plan.md
 *
 * The room is generated here and handed over without its solution: the client
 * gets the same pallet a player can see, and the server rebuilds the room from
 * the seed to score the session.
 */
export default async function FloorPlanPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { unlocked, divisionUnlocked } = await getUnlockState(student.id);
  // Counted on the tables a room can actually be tiled from — ×1 is a zone but
  // a 1-wide room is not a room.
  const usable = puzzleTables(unlocked);
  if (usable.length < 2) redirect("/play");

  const seed = newRunSeed(student.id, "floorplan");

  // Step down a tier rather than fail: a narrow unlock set can leave no room
  // of the intended size that also has a block worth withholding.
  const wanted = difficultyFor(usable.length);
  const tiers: Difficulty[] = ["hard", "standard", "easy"];
  const room = tiers
    .slice(tiers.indexOf(wanted))
    .reduce<Room | null>(
      (found, difficulty) => found ?? generateRoom({ seed, tables: unlocked, difficulty }),
      null,
    );

  if (!room) redirect("/play/modes");

  return (
    <FloorGrid studentId={student.id} room={room} divisionUnlocked={divisionUnlocked} />
  );
}
