"use client";

import { useActionState, useState } from "react";

import { ArtSlot, Eyebrow, PopButton, cx } from "@/components/ui/pop";
import {
  CHARACTER_MODEL_COUNT,
  HAIR_COLOURS,
  SKIN_TONES,
} from "@/lib/game/character";
import { saveLook, type ActionState } from "@/lib/actions/onboarding";

/**
 * A5 · Pick your look.
 *
 * A scrollable gallery of character models. There is deliberately no
 * male/female toggle, label or category anywhere here (spec §7) — models are
 * numbered, and the only other choices are skin tone and hair colour.
 */
export function LookPicker({ studentId }: { studentId: string }) {
  const [model, setModel] = useState(1);
  const [skin, setSkin] = useState<string>(SKIN_TONES[2].key);
  const [hair, setHair] = useState<string>(HAIR_COLOURS[0].key);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveLook, {});

  const step = (delta: number) =>
    setModel((m) => ((m - 1 + delta + CHARACTER_MODEL_COUNT) % CHARACTER_MODEL_COUNT) + 1);

  return (
    <form action={formAction} className="flex flex-1 flex-col">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="model" value={model} />
      <input type="hidden" name="skin" value={skin} />
      <input type="hidden" name="hair" value={hair} />

      <Eyebrow>Step 3 of 3 · Your tradie</Eyebrow>
      <h1 className="mt-1.5 font-display text-[23px] text-ink">Pick your look</h1>

      {/* model gallery */}
      <div className="relative mt-3.5 flex h-[246px] items-center justify-center rounded-2xl border-[3px] border-ink bg-teal-pale shadow-pop">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous character model"
          className="pop-press absolute left-2 flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-ink bg-white font-display text-ink"
        >
          <span aria-hidden>‹</span>
        </button>

        <ArtSlot
          label={`CHARACTER\nMODEL ${model} / ${CHARACTER_MODEL_COUNT}\n(full body)`}
          tone="red"
          className="h-[180px] w-[118px] flex-col"
        />

        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next character model"
          className="pop-press absolute right-2 flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-ink bg-white font-display text-ink"
        >
          <span aria-hidden>›</span>
        </button>

        <p aria-live="polite" className="sr-only">
          Character model {model} of {CHARACTER_MODEL_COUNT}
        </p>
      </div>

      <Swatches
        legend="Skin tone"
        options={SKIN_TONES}
        value={skin}
        onChange={setSkin}
        className="mt-3"
      />
      <Swatches
        legend="Hair"
        options={HAIR_COLOURS}
        value={hair}
        onChange={setHair}
        className="mt-2.5"
      />

      {state.error ? (
        <p role="alert" className="mt-3 font-sans text-sm font-bold text-red-deep">
          {state.error}
        </p>
      ) : null}

      <PopButton type="submit" tone="teal" size="lg" full disabled={pending} className="mt-auto">
        {pending ? "SAVING…" : "LOOKS GOOD →"}
      </PopButton>
    </form>
  );
}

function Swatches({
  legend,
  options,
  value,
  onChange,
  className,
}: {
  legend: string;
  options: readonly { key: string; hex: string }[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 font-sans text-[10px] font-black tracking-wide text-mud uppercase">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option, i) => {
          const selected = value === option.key;
          return (
            <label key={option.key} className="cursor-pointer">
              <input
                type="radio"
                name={legend}
                checked={selected}
                onChange={() => onChange(option.key)}
                className="peer sr-only"
              />
              <span
                className={cx(
                  "block h-7 w-7 rounded-lg border-[2.5px] peer-focus-visible:outline-4 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue",
                  selected ? "border-yellow outline-2 outline-ink" : "border-ink",
                )}
                style={{ background: option.hex }}
              />
              {/* Colour alone never carries the selection — the label names it. */}
              <span className="sr-only">
                {legend} option {i + 1}
                {selected ? " (selected)" : ""}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
