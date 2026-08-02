import { cx } from "@/components/ui/pop";
import { MASTERY_STAGES, STAGE_META, factKey, type MasteryStage } from "@/lib/game/mastery";

/**
 * The Mastery Grid — one cell per individual fact (spec §11).
 *
 * Colour is never the only channel: every stage also carries a distinct
 * glyph, and each cell has a text label for screen readers (spec §13).
 */
export function MasteryGrid({
  stages,
  maxTable = 12,
  compact,
}: {
  stages: Map<string, MasteryStage>;
  maxTable?: number;
  compact?: boolean;
}) {
  const rows = Array.from({ length: maxTable }, (_, i) => i + 1);
  const cols = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-[2px]">
        <caption className="sr-only">
          Mastery grid: {maxTable} times 12 facts, each showing how well it is known.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Times table
            </th>
            {cols.map((c) => (
              <th
                key={c}
                scope="col"
                className={cx(
                  "font-sans font-black text-mud",
                  compact ? "text-[7px]" : "text-[9px]",
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a}>
              <th
                scope="row"
                className={cx(
                  "pr-1 text-right font-sans font-black text-mud",
                  compact ? "text-[7px]" : "text-[9px]",
                )}
              >
                {a}
              </th>
              {cols.map((b) => {
                const stage = stages.get(factKey(a, b)) ?? "none";
                const meta = STAGE_META[stage];
                return (
                  <td key={b} className="p-0">
                    <span
                      className={cx(
                        "flex items-center justify-center rounded-[3px] border border-ink/25 font-display leading-none",
                        meta.className,
                        compact ? "h-3 w-3 text-[6px]" : "h-5 w-5 text-[9px]",
                      )}
                      title={`${a} × ${b} — ${meta.label}`}
                    >
                      <span aria-hidden>{meta.glyph}</span>
                      <span className="sr-only">
                        {a} times {b}: {meta.description}
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

export function MasteryLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {MASTERY_STAGES.map((stage) => {
        const meta = STAGE_META[stage];
        return (
          <li key={stage} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cx(
                "flex h-4 w-4 items-center justify-center rounded-[3px] border border-ink/25 font-display text-[8px]",
                meta.className,
              )}
            >
              {meta.glyph}
            </span>
            <span className="font-sans text-[10px] font-black text-mud">{meta.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
