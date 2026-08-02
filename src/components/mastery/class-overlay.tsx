import { cx } from "@/components/ui/pop";
import { factKey, type MasteryStage } from "@/lib/game/mastery";

/**
 * H9 · Class Mastery overlay.
 *
 * Stacks every student's grid into one view, so a teacher can spot patterns
 * across the whole class — "most of them are stuck on ×7 and ×8" — rather
 * than reading 30 grids one at a time.
 *
 * Encoded by both fill *and* a printed percentage, never colour alone.
 */
export function ClassMasteryOverlay({
  grids,
  maxTable = 12,
}: {
  grids: Array<Map<string, MasteryStage>>;
  maxTable?: number;
}) {
  const rows = Array.from({ length: maxTable }, (_, i) => i + 1);
  const cols = Array.from({ length: 12 }, (_, i) => i + 1);
  const students = grids.length;

  /** Share of the class that has this fact at Gold or Blue. */
  function strength(a: number, b: number): number {
    if (students === 0) return 0;
    let strong = 0;
    for (const grid of grids) {
      const stage = grid.get(factKey(a, b));
      if (stage === "gold" || stage === "blue") strong += 1;
    }
    return strong / students;
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-[2px]">
        <caption className="sr-only">
          Class mastery overlay: percentage of the class confident on each fact.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Times table
            </th>
            {cols.map((c) => (
              <th key={c} scope="col" className="font-sans text-[10px] font-black text-mud">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a}>
              <th scope="row" className="pr-1 text-right font-sans text-[10px] font-black text-mud">
                {a}
              </th>
              {cols.map((b) => {
                const value = strength(a, b);
                const pct = Math.round(value * 100);
                // Weak facts are the ones worth reteaching, so they read loudest.
                const band =
                  pct >= 80
                    ? "bg-grade-blue text-white"
                    : pct >= 60
                      ? "bg-grade-gold text-ink"
                      : pct >= 35
                        ? "bg-grade-bronze text-white"
                        : "bg-red text-white";

                return (
                  <td key={b} className="p-0">
                    <span
                      className={cx(
                        "flex h-7 w-7 items-center justify-center rounded-[3px] border border-ink/25 font-sans text-[9px] font-black",
                        band,
                      )}
                      title={`${a} × ${b}: ${pct}% of the class confident`}
                    >
                      <span aria-hidden>{pct}</span>
                      <span className="sr-only">
                        {a} times {b}: {pct} percent of the class confident
                      </span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
