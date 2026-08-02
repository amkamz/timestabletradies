"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PopButton, PopCard } from "@/components/ui/pop";

/** Generated per request on the server, so it re-rolls on every visit. */
export type GateChallenge = { a: number; b: number };

/**
 * A2 · Grown-up gate.
 *
 * Blocks kids from setup, crew linking and anything to do with money
 * (spec §2). Deliberately uses a two-digit product that sits outside the
 * range the app itself teaches, so a strong young player can't walk through it.
 */
export function GateForm({ next, challenge }: { next: string; challenge: GateChallenge }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (Number(value) === challenge.a * challenge.b) {
      router.push(next);
    } else {
      setError("Not quite — ask a grown-up to help with this one.");
      setValue("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-1 flex-col items-center">
      <PopCard flat className="mt-6 w-full border-[3px] px-4 py-5 text-center">
        <p className="font-sans text-xs font-black tracking-wider text-mud">WHAT IS</p>
        <p className="font-display text-[34px] text-ink" aria-hidden>
          {challenge.a} × {challenge.b}
        </p>
        <label htmlFor="gate-answer" className="sr-only">
          What is {challenge.a} times {challenge.b}?
        </label>
        <input
          id="gate-answer"
          type="number"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "gate-error" : undefined}
          className="mt-3 w-32 border-b-4 border-ink bg-transparent text-center font-display text-3xl text-ink outline-none"
          placeholder="?"
        />
      </PopCard>

      {error ? (
        <p
          id="gate-error"
          role="alert"
          className="mt-3 font-sans text-sm font-bold text-red-deep"
        >
          {error}
        </p>
      ) : null}

      <PopButton type="submit" tone="teal" size="lg" full className="mt-auto">
        CONTINUE
      </PopButton>
    </form>
  );
}
