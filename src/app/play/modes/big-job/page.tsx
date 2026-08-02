import Link from "next/link";
import { redirect } from "next/navigation";

import { PopLink, PopNote } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { getRecentRuns } from "@/lib/data/student";

/** C7 · The Big Job — monthly benchmark, shared to the teacher. */
export default async function BigJobPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const runs = await getRecentRuns(student.id, 50);
  const lastBigJob = runs.find((r) => r.mode === "bigjob");

  // Runs once a month (spec §6.1).
  const availableFrom = lastBigJob?.finished_at
    ? new Date(new Date(lastBigJob.finished_at).getTime() + 30 * 86_400_000)
    : null;
  const available = !availableFrom || availableFrom <= new Date();

  return (
    <Screen tone="ink">
      <div aria-hidden className="pop-hazard absolute top-[150px] right-0 left-0 h-3" />

      <ScreenBody className="items-center px-6 pt-9 text-center">
        <div className="flex w-full justify-start">
          <Link
            href="/play/modes"
            aria-label="Back to the training shed"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </Link>
        </div>

        <span className="mt-2 rounded-full border-[3px] border-yellow bg-red px-3.5 py-1 font-display text-[11px] text-white">
          ONCE A MONTH
        </span>

        <h1 className="mt-[140px] font-display text-[34px] text-yellow [text-shadow:2px_2px_0_rgba(0,0,0,.4)]">
          THE BIG JOB
        </h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed font-extrabold text-[#c9c4ba]">
          100 questions. 5 minutes. Your best fluency check of the month.
        </p>

        <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-slate-panel p-3">
            <p className="font-display text-xl text-white">100</p>
            <p className="font-sans text-[9px] font-black text-stone uppercase">Questions</p>
          </div>
          <div className="rounded-xl bg-slate-panel p-3">
            <p className="font-display text-xl text-white">5:00</p>
            <p className="font-sans text-[9px] font-black text-stone uppercase">On the clock</p>
          </div>
        </div>

        <div className="mt-3 w-full">
          <PopNote tone="yellow">
            Results go automatically to your teacher and parent.
          </PopNote>
        </div>

        {available ? (
          <PopLink href="/play/run?mode=bigjob" tone="yellow" size="lg" full className="mt-auto">
            START THE BIG JOB ▸
          </PopLink>
        ) : (
          <p className="mt-auto w-full rounded-2xl border-[3px] border-stone bg-slate-panel px-4 py-4 font-display text-sm text-stone">
            NEXT BIG JOB:{" "}
            {availableFrom?.toLocaleDateString("en-AU", { day: "numeric", month: "long" })}
          </p>
        )}
      </ScreenBody>
    </Screen>
  );
}
