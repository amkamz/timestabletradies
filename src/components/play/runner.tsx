"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ArtSlot, cx } from "@/components/ui/pop";
import { PlayHeader, Screen } from "@/components/shell/screen";
import { useA11y } from "@/components/a11y/a11y-provider";
import { Keypad } from "./keypad";
import { MatchBoard } from "./match-board";
import { ResultsScreen } from "./results";
import { finishRun, type RunPayload, type RunResult } from "@/lib/actions/play";
import type { JobFormat, Question } from "@/lib/game/questions";
import { simulatedProgress, type Racer } from "@/lib/game/crew";

export type RunnerConfig = {
  studentId: string;
  mode: RunPayload["mode"];
  jobType?: RunPayload["jobType"];
  table?: number | null;
  operation?: RunPayload["operation"];
  format: JobFormat;
  label: string;
  questions: Question[];
  reward?: { coins: number; materials: number };
  /** Seconds per question. null means untimed. */
  timerSeconds?: number | null;
  /** Whole-run time limit in seconds (The Big Job). */
  totalSeconds?: number | null;
  tone?: "teal" | "red" | "blue" | "orange" | "ink";
  /** Where the close button and the results screen return to. */
  homeHref?: string;
  /** Opponents for the race modes. Simulated ones are labelled as such. */
  racers?: Racer[];
};

type Answered = {
  a: number;
  b: number;
  operation: "multiply" | "divide";
  correct: boolean;
  elapsedMs: number;
};

type Feedback = { correct: boolean; shown: number } | null;

/**
 * Runs a question set in any of the five job formats (B4–B8) and every
 * single-player mode. All timing is measured client-side but every reward is
 * recomputed server-side in `finishRun`, so the numbers can't be forged.
 */
export function Runner(config: RunnerConfig) {
  const router = useRouter();
  const { speak, resolveTimer, settings } = useA11y();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [streak, setStreak] = useState(0);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Clocks live in refs and are started from an effect, never during render —
  // reading Date.now() while rendering makes the value depend on when React
  // happens to re-run the component.
  const startedAt = useRef(0);
  const runStartedAt = useRef(0);
  const locked = useRef(false);

  useEffect(() => {
    const now = Date.now();
    startedAt.current = now;
    runStartedAt.current = now;
  }, []);

  const total = config.questions.length;
  const question = config.questions[index];
  const done = index >= total;

  // Timers honour the student's preference — extended or off (spec §13).
  const perQuestion = config.timerSeconds ? resolveTimer(config.timerSeconds) : null;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(perQuestion);

  const homeHref = config.homeHref ?? "/play";

  /* ------------------------------------------------------------ submitting */

  const submitRun = useCallback(
    async (final: Answered[]) => {
      setSaving(true);
      try {
        const res = await finishRun({
          studentId: config.studentId,
          mode: config.mode,
          jobType: config.jobType,
          table: config.table ?? null,
          operation: config.operation ?? "multiply",
          reward: config.reward,
          answers: final,
        });
        setResult(res);
      } finally {
        setSaving(false);
      }
    },
    [config],
  );

  const advance = useCallback(
    (record: Answered) => {
      const next = [...answers, record];
      setAnswers(next);
      setStreak((s) => (record.correct ? s + 1 : 0));

      if (next.length >= total) {
        void submitRun(next);
        setIndex(total);
      } else {
        setIndex((i) => i + 1);
        setTyped("");
        startedAt.current = Date.now();
        setSecondsLeft(perQuestion);
      }
      locked.current = false;
    },
    [answers, perQuestion, submitRun, total],
  );

  const answer = useCallback(
    (value: number | null) => {
      if (!question || locked.current) return;
      locked.current = true;

      const elapsedMs = Date.now() - startedAt.current;
      const correct = value === question.answer;

      setFeedback({ correct, shown: question.answer });

      const record: Answered = {
        a: question.a,
        b: question.b,
        operation: question.operation,
        correct,
        elapsedMs,
      };

      // Hold the feedback briefly so the kid sees the tick or the right answer.
      const delay = settings.reduced_motion ? 350 : correct ? 550 : 1100;
      window.setTimeout(() => {
        setFeedback(null);
        advance(record);
      }, delay);
    },
    [advance, question, settings.reduced_motion],
  );

  /* ---------------------------------------------------------------- timers */

  // Per-question countdown. A timeout scores as a miss.
  useEffect(() => {
    if (done || perQuestion === null || feedback) return;
    if (secondsLeft === null) return;

    if (secondsLeft <= 0) {
      answer(null);
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft, done, perQuestion, feedback, answer]);

  // Whole-run clock (The Big Job). Ends the run wherever the player is up to.
  useEffect(() => {
    if (!config.totalSeconds || done) return;
    const limit = resolveTimer(config.totalSeconds);
    if (limit === null) return;

    const elapsed = runStartedAt.current === 0 ? 0 : Date.now() - runStartedAt.current;
    const t = window.setTimeout(() => {
      setIndex(total);
      void submitRun(answers);
    }, Math.max(0, limit * 1000 - elapsed));
    return () => window.clearTimeout(t);
  }, [config.totalSeconds, done, resolveTimer, submitRun, answers, total]);

  // Read the question aloud when the setting is on.
  useEffect(() => {
    if (question) speak(question.story ?? question.spoken);
  }, [question, speak]);

  /* ------------------------------------------------------------- keyboard */

  useEffect(() => {
    if (done || !question) return;

    function onKey(event: KeyboardEvent) {
      if (feedback) return;

      if (config.format === "choice") {
        const n = Number(event.key);
        if (question?.choices && n >= 1 && n <= question.choices.length) {
          answer(question.choices[n - 1]);
        }
        return;
      }
      if (event.key >= "0" && event.key <= "9") {
        setTyped((v) => (v.length < 4 ? v + event.key : v));
      } else if (event.key === "Backspace") {
        setTyped((v) => v.slice(0, -1));
      } else if (event.key === "Enter") {
        setTyped((v) => {
          if (v !== "") answer(Number(v));
          return v;
        });
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, config.format, done, feedback, question]);

  /* --------------------------------------------------------------- render */

  if (done) {
    return (
      <ResultsScreen
        label={config.label}
        result={result}
        saving={saving || !result}
        homeHref={homeHref}
        onAgain={() => router.refresh()}
      />
    );
  }

  if (!question) return null;

  const progress = (index / total) * 100;
  const tone = config.tone ?? "orange";

  // Build Order steps add up toward one bigger total, so only the steps
  // answered correctly so far are counted.
  const runningTotal = config.questions
    .slice(0, index)
    .reduce((sum, q, i) => sum + (answers[i]?.correct ? q.answer : 0), 0);

  return (
    <Screen tone={tone}>
      <PlayHeader
        closeHref={homeHref}
        label={config.label}
        progressLabel={`${index + 1}/${total}`}
        progressValue={progress}
      />

      {/* streak / countdown strip */}
      <div className="flex items-start justify-between px-5 pt-2.5">
        {perQuestion !== null ? (
          <Countdown seconds={secondsLeft ?? 0} total={perQuestion} />
        ) : (
          <span />
        )}
        <div className="text-right">
          <p className="font-display text-[11px] text-white">STREAK</p>
          <p className="font-display text-2xl leading-none text-yellow" aria-live="polite">
            ×{streak}
          </p>
        </div>
      </div>

      {config.racers && config.racers.length > 0 ? (
        <RaceStrip racers={config.racers} total={total} you={index} />
      ) : null}

      <main id="main" className="flex flex-1 flex-col">
        {config.format === "match" ? (
          <MatchBoard
            questions={config.questions}
            onComplete={(records) => {
              setAnswers(records);
              setIndex(total);
              void submitRun(records);
            }}
          />
        ) : (
          <>
            <QuestionCard
              question={question}
              format={config.format}
              typed={typed}
              feedback={feedback}
              onSpeak={() => speak(question.story ?? question.spoken)}
              readAloudOn={settings.read_aloud}
            />

            <div className="px-4 pb-5">
              {config.format === "choice" ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {question.choices?.map((choice, i) => (
                    <button
                      key={choice}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => answer(choice)}
                      className={cx(
                        "pop-press rounded-2xl border-[3px] border-ink py-4 text-center font-display text-2xl shadow-pop",
                        feedback && choice === question.answer
                          ? "bg-teal text-white"
                          : "bg-white text-ink",
                      )}
                    >
                      <span className="sr-only">Option {i + 1}: </span>
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {/* B8 · Build Order keeps the running total in view. */}
                  {config.format === "sequence" ? (
                    <p className="mb-2.5 rounded-xl border-[3px] border-ink bg-yellow py-2.5 text-center font-display text-sm text-ink">
                      GRAND TOTAL SO FAR: {runningTotal}
                    </p>
                  ) : null}
                  <Keypad
                    onDigit={(d) => setTyped((v) => (v.length < 4 ? v + d : v))}
                    onBackspace={() => setTyped((v) => v.slice(0, -1))}
                    onSubmit={() => typed !== "" && answer(Number(typed))}
                    disabled={Boolean(feedback)}
                    compact={config.format === "word" || config.format === "sequence"}
                  />
                </>
              )}
            </div>
          </>
        )}
      </main>
    </Screen>
  );
}

/* ----------------------------------------------------------------- pieces */

/**
 * Live opponent positions during a race (E2/E3). Simulated racers are always
 * marked "practice" so a kid is never misled about who they're up against.
 */
function RaceStrip({ racers, total, you }: { racers: Racer[]; total: number; you: number }) {
  // The strip owns its own clock, measured from its own mount, so the parent
  // never has to hold a timestamp in render-visible state.
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const t = window.setInterval(() => setElapsed(Date.now() - startedAt), 400);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section aria-label="Race positions" className="flex flex-col gap-1.5 px-5 pt-2.5">
      <Lane label="You" value={(you / total) * 100} tone="bg-yellow" />
      {racers.map((racer) => (
        <Lane
          key={racer.id}
          label={racer.name}
          badge={racer.simulated ? "practice" : undefined}
          value={(simulatedProgress(racer, elapsed, total) / total) * 100}
          tone="bg-white/70"
        />
      ))}
    </section>
  );
}

function Lane({
  label,
  value,
  tone,
  badge,
}: {
  label: string;
  value: number;
  tone: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[92px] shrink-0 truncate font-sans text-[9.5px] font-black text-white">
        {label}
        {badge ? <span className="ml-1 font-bold text-white/70">({badge})</span> : null}
      </span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-black/25">
        <span
          className={cx("block h-full transition-[width] duration-500", tone)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </span>
    </div>
  );
}

function Countdown({ seconds, total }: { seconds: number; total: number }) {
  const urgent = seconds <= 3;
  return (
    <div className="flex flex-col items-center">
      <span
        className={cx(
          "flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-white bg-black/15 font-display text-2xl",
          urgent ? "text-red-tint" : "text-yellow",
        )}
        aria-hidden
      >
        {seconds}
      </span>
      <span className="mt-1 font-sans text-[9px] font-black tracking-wider text-white/80 uppercase">
        seconds left
      </span>
      <span className="sr-only" role="timer" aria-live="off">
        {seconds} of {total} seconds remaining
      </span>
    </div>
  );
}

function QuestionCard({
  question,
  format,
  typed,
  feedback,
  onSpeak,
  readAloudOn,
}: {
  question: Question;
  format: JobFormat;
  typed: string;
  feedback: Feedback;
  onSpeak: () => void;
  readAloudOn: boolean;
}) {
  const isWord = format === "word";

  return (
    <div className="flex flex-1 flex-col justify-center gap-3.5 px-5">
      {isWord ? (
        <ArtSlot
          tone="light"
          label="DELIVERY SCENE ART · pallets on a ute"
          className="h-24 w-full"
        />
      ) : null}

      <div
        className={cx(
          "rounded-[20px] border-4 bg-white px-6 py-5 text-center",
          feedback?.correct
            ? "border-teal shadow-[0_0_0_4px_#111]"
            : feedback
              ? "anim-shake border-red shadow-[0_0_0_4px_#111]"
              : "border-ink",
        )}
      >
        {isWord ? (
          <>
            {readAloudOn ? (
              <button
                type="button"
                onClick={onSpeak}
                className="mb-2 flex items-center gap-2"
                aria-label="Read the question aloud"
              >
                <span
                  aria-hidden
                  className="flex h-6 w-6 items-center justify-center rounded-full border-[2.5px] border-ink bg-yellow text-xs"
                >
                  🔊
                </span>
                <span className="font-sans text-[10px] font-black text-mud">TAP TO HEAR</span>
              </button>
            ) : null}
            <p className="text-left font-sans text-base leading-relaxed font-extrabold text-ink">
              {question.story}
            </p>
          </>
        ) : (
          <>
            <p className="font-sans text-[11px] font-black tracking-widest text-mud">WHAT IS</p>
            <p className="font-display text-[44px] leading-tight text-ink">{question.prompt}</p>
          </>
        )}

        {format !== "choice" ? (
          <p
            className={cx(
              "mt-3 inline-block min-w-[110px] border-b-4 font-display text-3xl",
              feedback?.correct
                ? "border-teal text-teal"
                : feedback
                  ? "border-red text-red"
                  : "border-ink text-ink",
            )}
            aria-live="polite"
          >
            {feedback && !feedback.correct ? feedback.shown : typed || "?"}
            {feedback?.correct ? " ✓" : ""}
          </p>
        ) : null}
      </div>

      {feedback && !feedback.correct ? (
        <p role="status" className="text-center font-sans text-sm font-black text-white">
          The answer was {feedback.shown}. Keep going!
        </p>
      ) : null}
    </div>
  );
}
