import Link from "next/link";
import { redirect } from "next/navigation";

import { Banner, Brick, Coin, PopCard, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import { DIFFICULTY_META, JOB_TYPES, generateJobBoard } from "@/lib/game/questions";
import { dailySeed } from "@/lib/game/seed";
import { tradeName } from "@/lib/game/zones";

/** B2 · Job Board — difficulty and reward shown up front. */
export default async function JobBoardPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { unlocked } = await getUnlockState(student.id);
  const jobs = generateJobBoard(dailySeed(student.id), unlocked);

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <Banner tone="teal">THE JOB BOARD</Banner>

        <ul className="mt-3 flex flex-1 flex-col gap-2.5">
          {jobs.map((job) => {
            const meta = JOB_TYPES[job.type];
            const diff = DIFFICULTY_META[job.difficulty];
            return (
              <li key={job.id}>
                <Link href={`/play/jobs/${job.id}`} className="block">
                  <PopCard className="px-3 py-2.5 shadow-pop">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm text-ink">
                        {meta.name} · ×{job.table}
                      </span>
                      <span
                        className={cx(
                          "rounded-lg border-2 px-1.5 py-0.5 font-sans text-[9px] font-black",
                          diff.chip,
                        )}
                      >
                        {diff.label}
                      </span>
                    </div>
                    <p className="mt-1 font-sans text-[11px] font-bold text-mud">
                      {job.questions} questions · {tradeName(job.table)} zone
                    </p>
                    <p className="mt-1.5 flex items-center gap-2.5">
                      <span className="flex items-center gap-1 font-display text-[11px] text-ink">
                        <Coin size={14} />
                        <span aria-hidden>{job.coins}</span>
                        <span className="sr-only">{job.coins} coins</span>
                      </span>
                      {job.materials > 0 ? (
                        <span className="flex items-center gap-1 font-display text-[11px] text-ink">
                          <Brick size={14} />
                          <span aria-hidden>{job.materials}</span>
                          <span className="sr-only">{job.materials} loads of materials</span>
                        </span>
                      ) : null}
                    </p>
                  </PopCard>
                </Link>
              </li>
            );
          })}

          {/* Mixed Muster: everything unlocked, for review and retention. */}
          <li>
            <Link href="/play/jobs/muster" className="block">
              <div className="rounded-2xl bg-ink px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-yellow">Mixed Muster</span>
                  <span className="rounded-lg bg-red px-1.5 py-0.5 font-sans text-[9px] font-black text-white">
                    REVIEW
                  </span>
                </div>
                <p className="mt-1 font-sans text-[11px] font-bold text-[#c9c4ba]">
                  Everything you&apos;ve unlocked
                </p>
              </div>
            </Link>
          </li>

          <li>
            <Link href="/play/modes" className="block">
              <div className="rounded-2xl bg-slate px-3 py-2.5">
                <span className="font-display text-sm text-teal-light">The Training Shed ▸</span>
                <p className="mt-1 font-sans text-[11px] font-bold text-[#9a948a]">
                  Garage, Yard, Site Inspection, Toolbox Time and The Big Job
                </p>
              </div>
            </Link>
          </li>
        </ul>
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}
