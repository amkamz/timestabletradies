import { PopCard, PopNote, cx } from "@/components/ui/pop";
import { StudentSwitcher } from "@/components/dashboard/student-switcher";
import { requireParent } from "@/lib/actions/auth";
import { getModeStats, getRecentRuns } from "@/lib/data/student";
import { modeLabel } from "@/lib/game/modes";
import { createClient } from "@/lib/supabase/server";

/** H3 · Mode stats — accuracy and average time per mode. */
export default async function ModeStatsPage(props: PageProps<"/dashboard/modes">) {
  const { familyId } = await requireParent();
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, display_name")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  const roster = students ?? [];
  const { student: studentParam } = await props.searchParams;
  const selected = roster.find((s) => s.id === studentParam) ?? roster[0] ?? null;

  if (!selected) {
    return <p className="font-sans font-bold text-mud">No student profiles yet.</p>;
  }

  const [stats, runs] = await Promise.all([
    getModeStats(selected.id),
    getRecentRuns(selected.id, 100),
  ]);

  const bigJobs = runs.filter((r) => r.mode === "bigjob");

  return (
    <>
      <StudentSwitcher roster={roster} selectedId={selected.id} basePath="/dashboard/modes" />

      <h1 className="mt-5 font-display text-2xl text-ink">Mode stats</h1>
      <p className="mt-1 font-sans text-sm font-bold text-mud">
        Every mode shows average time per question alongside accuracy.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <PopCard key={stat.mode} className="p-4">
            <h2 className="font-display text-base text-ink">
              {modeLabel(stat.mode)}
            </h2>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <dd
                  className={cx(
                    "font-display text-lg",
                    stat.accuracy >= 0.9 ? "text-teal" : stat.accuracy >= 0.7 ? "text-ink" : "text-red",
                  )}
                >
                  {Math.round(stat.accuracy * 100)}%
                </dd>
                <dt className="font-sans text-[9px] font-black text-mud uppercase">Accuracy</dt>
              </div>
              <div>
                <dd className="font-display text-lg text-ink">{(stat.avgMs / 1000).toFixed(1)}s</dd>
                <dt className="font-sans text-[9px] font-black text-mud uppercase">Avg time</dt>
              </div>
              <div>
                <dd className="font-display text-lg text-ink">{stat.runs}</dd>
                <dt className="font-sans text-[9px] font-black text-mud uppercase">Sessions</dt>
              </div>
            </dl>
          </PopCard>
        ))}

        {stats.length === 0 ? (
          <PopCard className="p-4 sm:col-span-2 lg:col-span-3">
            <p className="font-sans text-sm font-bold text-mud">
              No sessions recorded yet.
            </p>
          </PopCard>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">The Big Job · monthly benchmark</h2>
        <div className="mt-2">
          <PopNote>
            Big Job results are shared with the student&apos;s teacher automatically — no opt-in
            needed — as well as being visible here.
          </PopNote>
        </div>

        <PopCard className="mt-3 overflow-x-auto p-0">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b-[3px] border-ink">
                <th scope="col" className="px-3 py-2 font-sans text-[11px] font-black text-mud uppercase">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 font-sans text-[11px] font-black text-mud uppercase">
                  Answered
                </th>
                <th scope="col" className="px-3 py-2 font-sans text-[11px] font-black text-mud uppercase">
                  Correct
                </th>
                <th scope="col" className="px-3 py-2 font-sans text-[11px] font-black text-mud uppercase">
                  Avg time
                </th>
              </tr>
            </thead>
            <tbody>
              {bigJobs.map((run) => (
                <tr key={run.id} className="border-b border-sand-pale last:border-0">
                  <td className="px-3 py-2 font-sans text-xs font-bold text-ink">
                    {run.finished_at
                      ? new Date(run.finished_at).toLocaleDateString("en-AU")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 font-display text-sm text-ink">{run.questions}</td>
                  <td className="px-3 py-2 font-display text-sm text-teal">{run.correct}</td>
                  <td className="px-3 py-2 font-display text-sm text-ink">
                    {(run.avg_ms / 1000).toFixed(1)}s
                  </td>
                </tr>
              ))}
              {bigJobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 font-sans text-sm font-bold text-mud">
                    No Big Job attempts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </PopCard>
      </section>
    </>
  );
}
