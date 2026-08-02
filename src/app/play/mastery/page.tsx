import Link from "next/link";
import { redirect } from "next/navigation";

import { Banner, PopCard, PopNote } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { MasteryGrid, MasteryLegend } from "@/components/mastery/grid";
import { requireActiveStudent } from "@/lib/data/session";
import { getMastery, getUnlockState, stagesFrom } from "@/lib/data/student";
import { MASTERY_STAGES, type MasteryStage } from "@/lib/game/mastery";

/** G1 · Mastery Grid — 144 individual fact cells. */
export default async function MasteryPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const [mastery, { unlocked }] = await Promise.all([
    getMastery(student.id),
    getUnlockState(student.id),
  ]);
  const stages = stagesFrom(mastery);
  const maxTable = Math.max(12, ...(unlocked.length > 0 ? unlocked : [12]));

  // Tally for the summary row.
  const counts = new Map<MasteryStage, number>(MASTERY_STAGES.map((s) => [s, 0]));
  for (let a = 1; a <= maxTable; a++) {
    for (let b = 1; b <= 12; b++) {
      const stage = stages.get(`${a}x${b}`) ?? "none";
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
  }
  const totalCells = maxTable * 12;
  const blue = counts.get("blue") ?? 0;

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <Banner tone="teal">MASTERY GRID</Banner>

        <PopCard className="mt-3 p-3 shadow-pop">
          <p className="font-display text-sm text-ink">
            {blue} of {totalCells} facts fully mastered
          </p>
          <p className="mt-0.5 font-sans text-[11px] font-bold text-mud">
            A fact turns Blue once it&apos;s fast, accurate, and stays that way over time.
          </p>
        </PopCard>

        <div className="mt-3.5 flex justify-center">
          <MasteryGrid stages={stages} maxTable={maxTable} />
        </div>

        <div className="mt-3.5">
          <MasteryLegend />
        </div>

        <div className="mt-4">
          {blue === totalCells ? (
            <PopNote>
              Every fact is Blue — a brand new trade zone has opened up. Go and take a look.
            </PopNote>
          ) : (
            <PopNote>
              Facts you&apos;ve nailed come back now and then in Mixed Muster and Toolbox Time, just
              to check they&apos;ve stuck.
            </PopNote>
          )}
        </div>

        <Link
          href="/play/zones"
          className="mt-3 block rounded-2xl border-[3px] border-ink bg-white px-4 py-3 text-center font-display text-sm text-ink shadow-pop"
        >
          SEE YOUR TRADE ZONES ▸
        </Link>
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}
