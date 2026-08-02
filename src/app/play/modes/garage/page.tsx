import Link from "next/link";
import { redirect } from "next/navigation";

import { ArtSlot, Pill, PopCard, PopLink } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { getAssignment, getUnlockState } from "@/lib/data/student";
import { GARAGE_COINS_PER_CORRECT } from "@/lib/game/questions";

/** C3 · The Garage — teacher-set focus, adaptive question mix. */
export default async function GaragePage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const [assignment, { unlocked }] = await Promise.all([
    getAssignment(student.id),
    getUnlockState(student.id),
  ]);

  const focus =
    assignment && assignment.tables.length > 0
      ? assignment.tables.filter((t) => unlocked.includes(t))
      : unlocked;

  return (
    <Screen tone="teal">
      <ScreenBody className="px-5 pt-7">
        <div className="flex items-center justify-between">
          <Link
            href="/play/modes"
            aria-label="Back to the training shed"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </Link>
          <Pill tone="ink">{assignment ? "TEACHER SET" : "YOUR MIX"}</Pill>
        </div>

        <h1 className="mt-4 font-display text-[28px] text-white [text-shadow:2px_2px_0_#111]">
          The Garage
        </h1>
        <p className="mt-1 font-sans text-[13px] font-extrabold text-teal-wash">
          Your practice bay adapts to what you need most.
        </p>

        <ArtSlot tone="light" label="GARAGE / WORKBENCH ART" className="mt-4 h-[110px] w-full" />

        <PopCard className="mt-3.5 p-3 shadow-pop">
          <p className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
            {assignment ? "Focus from your teacher" : "Focus for today"}
          </p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            {focus.map((t) => (
              <span
                key={t}
                className="rounded-[9px] border-[2.5px] border-ink bg-yellow px-2.5 py-1 font-display text-xs text-ink"
              >
                ×{t}
              </span>
            ))}
          </p>
          {assignment?.note ? (
            <p className="mt-2 font-sans text-[11px] font-bold text-mud">{assignment.note}</p>
          ) : null}
          <p className="mt-2.5 font-sans text-[11px] font-extrabold text-teal">
            💰 {GARAGE_COINS_PER_CORRECT} coins for every correct answer
          </p>
        </PopCard>

        <PopLink href="/play/run?mode=garage" tone="red" size="lg" full className="mt-auto">
          START PRACTICE ▸
        </PopLink>
      </ScreenBody>
    </Screen>
  );
}
