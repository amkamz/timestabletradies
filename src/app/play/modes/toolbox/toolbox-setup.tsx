"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PopButton, PopCard, PopToggle, cx } from "@/components/ui/pop";
import { useA11y } from "@/components/a11y/a11y-provider";

/**
 * C6 · Toolbox Time setup — relaxed, timer-free, student's own mix.
 * Division options only appear for tables that have actually unlocked it.
 */
export function ToolboxSetup({
  tables,
  divisionUnlocked,
}: {
  tables: number[];
  divisionUnlocked: number[];
}) {
  const router = useRouter();
  const { settings, update } = useA11y();
  const [operation, setOperation] = useState<"multiply" | "divide" | "both">("multiply");
  const [selected, setSelected] = useState<number[]>(tables.slice(0, 3));

  const anyDivision = divisionUnlocked.length > 0;

  function toggleTable(table: number) {
    setSelected((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table],
    );
  }

  function start() {
    const chosen = selected.length > 0 ? selected : tables;
    router.push(`/play/run?mode=toolbox&op=${operation}&tables=${chosen.join(",")}`);
  }

  return (
    <>
      <PopCard className="mt-4 p-3 shadow-pop">
        <fieldset>
          <legend className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
            Operation
          </legend>
          <div className="mt-2 flex gap-2">
            {(
              [
                { key: "multiply", label: "×" },
                { key: "divide", label: "÷" },
                { key: "both", label: "BOTH" },
              ] as const
            ).map((op) => {
              const locked = op.key !== "multiply" && !anyDivision;
              return (
                <button
                  key={op.key}
                  type="button"
                  disabled={locked}
                  aria-pressed={operation === op.key}
                  onClick={() => setOperation(op.key)}
                  className={cx(
                    "pop-press flex-1 rounded-[10px] border-[2.5px] border-ink py-2.5 text-center font-display text-xs",
                    operation === op.key ? "bg-teal text-white" : "bg-white text-ink",
                    locked && "opacity-45",
                  )}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
          {!anyDivision ? (
            <p className="mt-2 font-sans text-[10.5px] font-bold text-mud">
              Division opens up once you finish a full multiply round on a table.
            </p>
          ) : null}
        </fieldset>
      </PopCard>

      <PopCard className="mt-3 p-3 shadow-pop">
        <fieldset>
          <legend className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
            Tables
          </legend>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {tables.map((table) => {
              const on = selected.includes(table);
              return (
                <label key={table} className="cursor-pointer">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleTable(table)}
                    className="peer sr-only"
                  />
                  <span
                    className={cx(
                      "block rounded-lg border-2 border-ink py-1.5 text-center font-display text-[11px] peer-focus-visible:outline-4 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue",
                      on ? "bg-yellow text-ink" : "bg-white text-ink",
                    )}
                  >
                    {table}
                  </span>
                  <span className="sr-only">
                    {table} times table{on ? " (selected)" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </PopCard>

      <div className="mt-3">
        <PopToggle
          checked={settings.read_aloud}
          onChange={(next) => update({ read_aloud: next })}
          label="Read questions aloud"
        />
      </div>

      <PopButton tone="teal" size="lg" full className="mt-auto" onClick={start}>
        START · NO TIMER
      </PopButton>
    </>
  );
}
