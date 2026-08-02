import Link from "next/link";
import { redirect } from "next/navigation";

import { ArtSlot, PopCard, PopLink } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { CableGrid } from "@/components/play/cable-grid";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import { canPlayCableRun, difficultyFor, generateBoard } from "@/lib/game/cable-run";
import { newRunSeed } from "@/lib/game/seed";
import { puzzleTables } from "@/lib/game/zones";

/**
 * Cable Run — docs/game-modes/01-cable-run.md
 *
 * The board is generated here and handed over whole. The client never learns
 * the solution: it gets the same junction values a player can see, and the
 * server regenerates the board from the seed to score the session.
 */
export default async function CableRunPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { unlocked, divisionUnlocked } = await getUnlockState(student.id);

  // The mode needs division: without it a route can only escalate, and the
  // second hop would need a factor the mastery grid can't record.
  if (!canPlayCableRun({ tables: unlocked, divisionUnlocked })) {
    return <LockedScreen />;
  }

  const seed = newRunSeed(student.id, "cablerun");
  // Difficulty tracks the tables the board can actually be built from, so the
  // ×1 tutorial zone doesn't push a beginner up a tier it can't fill.
  const difficulty = difficultyFor(puzzleTables(unlocked).length);
  const board = generateBoard({ seed, tables: unlocked, divisionUnlocked, difficulty });

  if (!board) return <LockedScreen />;

  return <CableGrid studentId={student.id} board={board} />;
}

function LockedScreen() {
  return (
    <Screen tone="ink">
      <ScreenBody className="px-5 pt-7">
        <Link
          href="/play/modes"
          aria-label="Back to the training shed"
          className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
        >
          <span aria-hidden>✕</span>
        </Link>

        <h1 className="mt-4 font-display text-[28px] text-white [text-shadow:2px_2px_0_#111]">
          Cable Run
        </h1>
        <ArtSlot tone="light" label="SWITCHBOARD / CABLE ART" className="mt-4 h-[110px] w-full" />

        <PopCard className="mt-3.5 p-3 shadow-pop">
          <p className="font-display text-[15px] text-ink">Not open yet</p>
          <p className="mt-1.5 font-sans text-[12px] font-bold text-mud">
            Cable Run needs division. Finish a full multiplication round on one of your zones to
            unlock it, then come back and wire up the switchboard.
          </p>
        </PopCard>

        <PopLink href="/play/jobs" tone="red" size="lg" full className="mt-auto">
          FIND A JOB ▸
        </PopLink>
      </ScreenBody>
    </Screen>
  );
}
