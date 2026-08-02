import Link from "next/link";

import { Coin, PopCard, cx } from "@/components/ui/pop";
import { MasteryGrid } from "@/components/mastery/grid";
import { requireParent } from "@/lib/actions/auth";
import { getMastery, getRecentRuns, getUnlockState, stagesFrom } from "@/lib/data/student";
import { HOUSE_STAGES, rankName, stageAt, stageProgress } from "@/lib/game/progression";
import { createClient } from "@/lib/supabase/server";

/** H1 · Dashboard home — one card per student. */
export default async function DashboardPage() {
  const { familyId } = await requireParent();
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  const roster = students ?? [];

  const summaries = await Promise.all(
    roster.map(async (student) => {
      const [mastery, runs, { unlocked }] = await Promise.all([
        getMastery(student.id),
        getRecentRuns(student.id, 30),
        getUnlockState(student.id),
      ]);

      const stages = stagesFrom(mastery);
      const questions = runs.reduce((s, r) => s + r.questions, 0);
      const correct = runs.reduce((s, r) => s + r.correct, 0);
      const msSum = runs.reduce((s, r) => s + r.avg_ms * r.questions, 0);

      let blue = 0;
      for (const stage of stages.values()) if (stage === "blue") blue += 1;

      return {
        student,
        stages,
        unlocked,
        runs: runs.length,
        accuracy: questions === 0 ? 0 : correct / questions,
        avgMs: questions === 0 ? 0 : Math.round(msSum / questions),
        blue,
        lastPlayed: runs[0]?.finished_at ?? null,
      };
    }),
  );

  return (
    <>
      <h1 className="font-display text-2xl text-ink">Your crew</h1>
      <p className="mt-1 font-sans text-sm font-bold text-mud">
        Progress, speed and mastery for each tradie on the account.
      </p>

      {summaries.length === 0 ? (
        <PopCard className="mt-6 p-5">
          <p className="font-sans text-sm font-bold text-mud">
            No student profiles yet.{" "}
            <Link href="/onboarding/students" className="text-red underline">
              Add one
            </Link>
            .
          </p>
        </PopCard>
      ) : null}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {summaries.map((s) => {
          const stage = stageAt(s.student.house_stage);
          return (
            <PopCard key={s.student.id} className="p-4 shadow-pop">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-ink">{s.student.display_name}</h2>
                  <p className="font-sans text-[11px] font-black text-red uppercase">
                    {rankName(s.student.rank_rung)}
                  </p>
                </div>
                <p className="flex items-center gap-1.5">
                  <Coin size={16} />
                  <span className="font-display text-sm text-ink" aria-hidden>
                    {s.student.coins.toLocaleString()}
                  </span>
                  <span className="sr-only">{s.student.coins.toLocaleString()} coins earned</span>
                </p>
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Accuracy" value={`${Math.round(s.accuracy * 100)}%`} />
                <Stat label="Avg time" value={`${(s.avgMs / 1000).toFixed(1)}s`} />
                <Stat label="Facts blue" value={String(s.blue)} />
              </dl>

              <div className="mt-3">
                <p className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
                  House · {stage.name}
                </p>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-[#eee]">
                  <div
                    className="h-full bg-teal"
                    style={{
                      width: `${stageProgress(s.student.house_stage, s.student.house_loads)}%`,
                    }}
                  />
                </div>
                <p className="mt-1 font-sans text-[10.5px] font-bold text-mud">
                  Stage {s.student.house_stage + 1} of {HOUSE_STAGES.length}
                </p>
              </div>

              <div className="mt-3">
                <p className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
                  Mastery
                </p>
                <div className="mt-1.5">
                  <MasteryGrid stages={s.stages} compact />
                </div>
              </div>

              <p className="mt-3 font-sans text-[10.5px] font-bold text-mud">
                {s.runs} sessions ·{" "}
                {s.lastPlayed
                  ? `last played ${new Date(s.lastPlayed).toLocaleDateString("en-AU")}`
                  : "not played yet"}
              </p>

              <Link
                href={`/dashboard/progress?student=${s.student.id}`}
                className={cx(
                  "mt-3 inline-block rounded-lg border-[2.5px] border-ink bg-teal px-3 py-1.5",
                  "font-display text-xs text-white",
                )}
              >
                Full breakdown →
              </Link>
            </PopCard>
          );
        })}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border-2 border-ink bg-paper py-2">
      <dd className="font-display text-base text-ink">{value}</dd>
      <dt className="font-sans text-[9px] font-black text-mud uppercase">{label}</dt>
    </div>
  );
}
