"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cx } from "@/components/ui/pop";
import type { Question } from "@/lib/game/questions";

/** Stable order key derived from a question id (FNV-1a). */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Record_ = {
  a: number;
  b: number;
  operation: "multiply" | "divide";
  correct: boolean;
  elapsedMs: number;
};

/**
 * B7 · Measure Up — match each job to its total.
 *
 * The design calls this "drag & match", but dragging is unusable by keyboard
 * and awkward with a screen reader, so it ships as tap-to-pair: choose a job,
 * then choose its total. Same interaction on touch, and it satisfies
 * WCAG 2.2 SC 2.5.7 (dragging movements) by not requiring a drag at all.
 */
export function MatchBoard({
  questions,
  onComplete,
}: {
  questions: Question[];
  onComplete: (records: Record_[]) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [wrong, setWrong] = useState<string | null>(null);
  const records = useRef<Record_[]>([]);
  const startedAt = useRef(0);

  // Start the clock after mount rather than during render.
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Totals are reordered so they don't line up with their prompts. The order
  // is derived from each question's id rather than Math.random, so it is
  // stable across re-renders and identical on server and client.
  const totals = useMemo(
    () =>
      questions
        .map((q) => ({ id: q.id, value: q.answer, rank: hashId(q.id) }))
        .sort((a, b) => a.rank - b.rank),
    [questions],
  );

  function chooseTotal(totalId: string, value: number) {
    if (!selected) return;
    const question = questions.find((q) => q.id === selected);
    if (!question) return;

    const correct = question.answer === value;
    // Only ever reached from an onClick, so reading the clock here is safe;
    // the purity rule can't see the call site from the component body.
    // eslint-disable-next-line react-hooks/purity
    const tappedAt = Date.now();

    records.current.push({
      a: question.a,
      b: question.b,
      operation: question.operation,
      correct,
      elapsedMs: tappedAt - startedAt.current,
    });
    startedAt.current = tappedAt;

    if (correct) {
      const next = { ...matched, [question.id]: true, [totalId]: true };
      setMatched(next);
      setSelected(null);
      setWrong(null);

      if (questions.every((q) => next[q.id])) {
        onComplete(records.current);
      }
    } else {
      setWrong(totalId);
      window.setTimeout(() => setWrong(null), 600);
      setSelected(null);
    }
  }

  const remaining = questions.filter((q) => !matched[q.id]).length;

  return (
    <section className="flex flex-1 flex-col px-5 pb-5">
      <h2 className="pt-3 text-center font-display text-sm text-white [text-shadow:1px_1px_0_#111]">
        Match the job to its total
      </h2>
      <p className="mt-1 text-center font-sans text-[11px] font-bold text-white/85">
        {selected ? "Now pick its total" : "Pick a job, then pick its total"}
      </p>
      <p aria-live="polite" className="sr-only">
        {remaining} {remaining === 1 ? "pair" : "pairs"} left to match.
      </p>

      <div className="mt-3.5 flex flex-1 gap-3">
        <ul className="flex flex-1 flex-col gap-2.5">
          {questions.map((q) => {
            const isMatched = matched[q.id];
            const isSelected = selected === q.id;
            return (
              <li key={q.id}>
                <button
                  type="button"
                  disabled={isMatched}
                  aria-pressed={isSelected}
                  onClick={() => setSelected(isSelected ? null : q.id)}
                  className={cx(
                    "pop-press w-full rounded-xl border-[3px] border-ink px-2 py-3 text-center font-display text-[13px] shadow-pop-sm",
                    isMatched
                      ? "bg-teal-tint text-teal-deep opacity-70"
                      : isSelected
                        ? "bg-teal text-white"
                        : "bg-white text-ink",
                  )}
                >
                  {q.prompt}
                  {isMatched ? <span className="sr-only"> — matched</span> : null}
                </button>
              </li>
            );
          })}
        </ul>

        <ul className="flex flex-1 flex-col gap-2.5">
          {totals.map((t) => {
            const isMatched = matched[t.id];
            const isWrong = wrong === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={isMatched || !selected}
                  onClick={() => chooseTotal(t.id, t.value)}
                  className={cx(
                    "pop-press w-full rounded-xl border-[3px] px-2 py-3 text-center font-display text-[13px]",
                    isMatched
                      ? "border-teal bg-teal-tint text-teal-deep"
                      : isWrong
                        ? "anim-shake border-red bg-red/10 text-red-deep"
                        : "border-dashed border-ink bg-yellow-tint text-ink",
                  )}
                >
                  {t.value}
                  {isMatched ? <span className="sr-only"> — matched</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
