"use client";

import { useActionState, useState } from "react";

import { PopButton, cx } from "@/components/ui/pop";
import { saveName, type ActionState } from "@/lib/actions/onboarding";

type Pools = { trades: string[]; adjectives: string[]; surnames: string[] };

/**
 * A6 · Name generator.
 *
 * Ten options from each of three master pools (spec §7). Every entry is
 * pre-vetted and workman-themed, and there is no free-text entry anywhere —
 * so no combination can land inappropriately.
 */
export function NamePicker({ studentId, pools }: { studentId: string; pools: Pools }) {
  const [trade, setTrade] = useState(pools.trades[0]);
  const [adjective, setAdjective] = useState(pools.adjectives[0]);
  const [surname, setSurname] = useState(pools.surnames[0]);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveName, {});

  function shuffle() {
    const rand = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
    setTrade(rand(pools.trades));
    setAdjective(rand(pools.adjectives));
    setSurname(rand(pools.surnames));
  }

  return (
    <form action={formAction} className="flex flex-1 flex-col">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="trade" value={trade} />
      <input type="hidden" name="adjective" value={adjective} />
      <input type="hidden" name="surname" value={surname} />

      <h1 className="text-center font-display text-xl text-ink">Build your tradie name</h1>

      <div className="mt-3 rounded-2xl bg-ink p-3 text-center">
        <p className="font-mono text-[10px] tracking-[0.14em] text-teal-light">YOUR NAME</p>
        <p aria-live="polite" className="mt-0.5 font-display text-xl text-yellow">
          {trade} {adjective} {surname}
        </p>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-2.5 overflow-y-auto pop-scroll">
        <Row legend="Trade" options={pools.trades} value={trade} onChange={setTrade} tone="yellow" />
        <Row
          legend="Adjective"
          options={pools.adjectives}
          value={adjective}
          onChange={setAdjective}
          tone="teal"
        />
        <Row
          legend="Surname"
          options={pools.surnames}
          value={surname}
          onChange={setSurname}
          tone="red"
        />
      </div>

      {state.error ? (
        <p role="alert" className="mt-2 font-sans text-sm font-bold text-red-deep">
          {state.error}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2.5">
        <PopButton type="button" tone="white" size="md" className="flex-1" onClick={shuffle}>
          🎲 SHUFFLE
        </PopButton>
        <PopButton type="submit" tone="teal" size="md" className="flex-[1.4]" disabled={pending}>
          {pending ? "SAVING…" : "THAT'S ME!"}
        </PopButton>
      </div>
    </form>
  );
}

function Row({
  legend,
  options,
  value,
  onChange,
  tone,
}: {
  legend: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  tone: "yellow" | "teal" | "red";
}) {
  const selectedTone = {
    yellow: "bg-yellow text-ink",
    teal: "bg-teal text-white",
    red: "bg-red text-white",
  }[tone];

  return (
    <fieldset>
      <legend className="mb-1.5 font-sans text-[10px] font-black tracking-wide text-mud uppercase">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option === value;
          return (
            <label key={option} className="cursor-pointer">
              <input
                type="radio"
                name={legend}
                checked={selected}
                onChange={() => onChange(option)}
                className="peer sr-only"
              />
              <span
                className={cx(
                  "block rounded-[9px] border-[2.5px] border-ink px-2.5 py-1.5 font-display text-[11px] peer-focus-visible:outline-4 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue",
                  selected ? selectedTone : "bg-white text-ink",
                )}
              >
                {option}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
