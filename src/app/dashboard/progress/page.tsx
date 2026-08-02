import { PopCard, cx } from "@/components/ui/pop";
import { MasteryGrid, MasteryLegend } from "@/components/mastery/grid";
import { StudentSwitcher } from "@/components/dashboard/student-switcher";
import { requireParent } from "@/lib/actions/auth";
import { getMastery, getRecentRuns, stagesFrom } from "@/lib/data/student";
import { tradeName } from "@/lib/game/zones";
import { createClient } from "@/lib/supabase/server";

/** H2 · Progress + Mastery — by table, by fact, and by operation. */
export default async function ProgressPage(props: PageProps<"/dashboard/progress">) {
  const { familyId } = await requireParent();
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  const roster = students ?? [];
  const { student: studentParam } = await props.searchParams;
  const selected =
    roster.find((s) => s.id === studentParam) ?? roster[0] ?? null;

  if (!selected) {
    return <p className="font-sans font-bold text-mud">No student profiles yet.</p>;
  }

  const [mastery, runs] = await Promise.all([
    getMastery(selected.id),
    getRecentRuns(selected.id, 100),
  ]);
  const stages = stagesFrom(mastery);

  // Split accuracy and speed by operation (spec §12).
  const { data: answers } = await supabase
    .from("answers")
    .select("operation, correct, elapsed_ms, a, b")
    .eq("student_id", selected.id);

  const byOp = { multiply: emptyBucket(), divide: emptyBucket() };
  const byTable = new Map<number, { attempts: number; correct: number; msSum: number }>();

  for (const row of answers ?? []) {
    const bucket = byOp[row.operation];
    bucket.attempts += 1;
    if (row.correct) bucket.correct += 1;
    bucket.msSum += row.elapsed_ms;

    const t = byTable.get(row.a) ?? { attempts: 0, correct: 0, msSum: 0 };
    t.attempts += 1;
    if (row.correct) t.correct += 1;
    t.msSum += row.elapsed_ms;
    byTable.set(row.a, t);
  }

  return (
    <>
      <StudentSwitcher roster={roster} selectedId={selected.id} basePath="/dashboard/progress" />

      <h1 className="mt-5 font-display text-2xl text-ink">{selected.display_name}</h1>
      <p className="mt-1 font-sans text-sm font-bold text-mud">
        {runs.length} sessions recorded.
      </p>

      <section className="mt-6">
        <h2 className="font-display text-lg text-ink">By operation</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <OpCard title="Multiplication" bucket={byOp.multiply} />
          <OpCard title="Division" bucket={byOp.divide} />
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-lg text-ink">Mastery grid</h2>
        <PopCard className="mt-2 p-4">
          <MasteryGrid stages={stages} />
          <div className="mt-4">
            <MasteryLegend />
          </div>
        </PopCard>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-lg text-ink">By table</h2>
        <PopCard className="mt-2 overflow-x-auto p-0">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b-[3px] border-ink">
                <th scope="col" className="px-3 py-2 font-sans text-[11px] font-black text-mud uppercase">
                  Table
                </th>
                <th scope="col" className="px-3 py-2 font-sans text-[11px] font-black text-mud uppercase">
                  Trade
                </th>
                <th scope="col" className="px-3 py-2 font-sans text-[11px] font-black text-mud uppercase">
                  Accuracy
                </th>
                <th scope="col" className="px-3 py-2 font-sans text-[11px] font-black text-mud uppercase">
                  Avg time
                </th>
              </tr>
            </thead>
            <tbody>
              {[...byTable.entries()]
                .sort((a, b) => a[0] - b[0])
                .map(([table, t]) => {
                  const accuracy = t.attempts === 0 ? 0 : t.correct / t.attempts;
                  return (
                    <tr key={table} className="border-b border-sand-pale last:border-0">
                      <td className="px-3 py-2 font-display text-sm text-ink">×{table}</td>
                      <td className="px-3 py-2 font-sans text-xs font-bold text-mud">
                        {tradeName(table)}
                      </td>
                      <td
                        className={cx(
                          "px-3 py-2 font-display text-sm",
                          accuracy >= 0.9 ? "text-teal" : accuracy >= 0.7 ? "text-ink" : "text-red",
                        )}
                      >
                        {Math.round(accuracy * 100)}%
                      </td>
                      <td className="px-3 py-2 font-display text-sm text-ink">
                        {(t.msSum / t.attempts / 1000).toFixed(1)}s
                      </td>
                    </tr>
                  );
                })}
              {byTable.size === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 font-sans text-sm font-bold text-mud">
                    No answers recorded yet.
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

function emptyBucket() {
  return { attempts: 0, correct: 0, msSum: 0 };
}

function OpCard({
  title,
  bucket,
}: {
  title: string;
  bucket: { attempts: number; correct: number; msSum: number };
}) {
  const accuracy = bucket.attempts === 0 ? 0 : bucket.correct / bucket.attempts;
  const avg = bucket.attempts === 0 ? 0 : bucket.msSum / bucket.attempts / 1000;

  return (
    <PopCard className="p-4">
      <h3 className="font-display text-base text-ink">{title}</h3>
      {bucket.attempts === 0 ? (
        <p className="mt-1.5 font-sans text-xs font-bold text-mud">Not attempted yet.</p>
      ) : (
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <dd className="font-display text-lg text-teal">{Math.round(accuracy * 100)}%</dd>
            <dt className="font-sans text-[9px] font-black text-mud uppercase">Accuracy</dt>
          </div>
          <div>
            <dd className="font-display text-lg text-red">{avg.toFixed(1)}s</dd>
            <dt className="font-sans text-[9px] font-black text-mud uppercase">Avg time</dt>
          </div>
          <div>
            <dd className="font-display text-lg text-ink">{bucket.attempts}</dd>
            <dt className="font-sans text-[9px] font-black text-mud uppercase">Questions</dt>
          </div>
        </dl>
      )}
    </PopCard>
  );
}

