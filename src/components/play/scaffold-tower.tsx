"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ArtSlot, PopButton, PopCard, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { useA11y } from "@/components/a11y/a11y-provider";
import { Keypad } from "./keypad";
import { ResultsScreen } from "./results";
import { finishRun, type RunResult } from "@/lib/actions/play";
import type { Question } from "@/lib/game/questions";
import {
  MAX_SUBMITTED_ANSWERS,
  TOPPLE_AT,
  brace,
  braceOffered,
  buildQuestions,
  emptyTower,
  hasToppled,
  place,
  questionTier,
  timerSecondsFor,
  wobble,
  type Side,
  type Tower,
} from "@/lib/game/scaffold";

type Phase = "briefing" | "question" | "placing" | "brace" | "done";

type Answered = {
  a: number;
  b: number;
  operation: "multiply" | "divide";
  correct: boolean;
  elapsedMs: number;
};

/**
 * Scaffold Stack — docs/game-modes/04-scaffold-stack.md
 *
 * Endless: correct answers earn planks, the player chooses which side each one
 * goes on, and the run ends when the lean reaches the topple point. All the
 * rules live in `lib/game/scaffold`; this component owns the clock, the
 * keyboard, and the drawing.
 */
export function ScaffoldTower({
  studentId,
  seed,
  tables,
  divisionUnlocked,
  weights,
  personalBest,
}: {
  studentId: string;
  seed: string;
  tables: number[];
  divisionUnlocked: number[];
  weights: Record<string, number>;
  personalBest: number;
}) {
  const router = useRouter();
  const { speak, resolveTimer, settings } = useA11y();

  const [phase, setPhase] = useState<Phase>("briefing");
  const [tower, setTower] = useState<Tower>(emptyTower);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [typed, setTyped] = useState("");
  /** When the current question expires, or null when this run is untimed. */
  const [deadline, setDeadline] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);

  const startedAt = useRef(0);
  const locked = useRef(false);

  const weightFor = useCallback(
    (a: number, b: number) => weights[`${a}x${b}`] ?? 1,
    [weights],
  );

  /* ------------------------------------------------------------- questions */

  // Keyed on the question counter rather than the height, so a wrong answer
  // doesn't re-serve the identical question at the same height.
  const question: Question | null = useMemo(() => {
    if (phase === "briefing" || phase === "done") return null;
    return (
      buildQuestions({
        seed: `${seed}:q${questionIndex}`,
        height: tower.height,
        count: 1,
        tables,
        divisionUnlocked,
        weightFor,
      })[0] ?? null
    );
  }, [phase, seed, questionIndex, tower.height, tables, divisionUnlocked, weightFor]);

  const tier = questionTier(tower.height);
  const limit = resolveTimer(timerSecondsFor(tower.height));

  /** The clock for the question asked at a given height. Null when timers are off. */
  const deadlineFor = useCallback(
    (height: number) => {
      const seconds = resolveTimer(timerSecondsFor(height));
      return seconds === null ? null : Date.now() + seconds * 1000;
    },
    [resolveTimer],
  );

  /* -------------------------------------------------------------- finishing */

  const submitRun = useCallback(
    async (final: Answered[]) => {
      setSaving(true);
      try {
        // Rewards are recomputed server-side from this log — the height this
        // client believes it reached never crosses the wire.
        const res = await finishRun({
          studentId,
          mode: "scaffold",
          table: null,
          operation: divisionUnlocked.length > 0 ? "both" : "multiply",
          answers: final.slice(-MAX_SUBMITTED_ANSWERS),
        });
        setResult(res);
      } finally {
        setSaving(false);
      }
    },
    [studentId, divisionUnlocked.length],
  );

  const topple = useCallback(
    (final: Answered[]) => {
      setPhase("done");
      void submitRun(final);
    },
    [submitRun],
  );

  /* --------------------------------------------------------------- answering */

  const nextTurn = useCallback(
    (next: Tower) => {
      const bracing = braceOffered(next.height);
      setQuestionIndex((i) => i + 1);
      setTyped("");
      startedAt.current = Date.now();
      // The clock only runs during a question, and the ramp is read off the
      // height the *next* question will be asked at.
      setDeadline(bracing ? null : deadlineFor(next.height));
      setPhase(bracing ? "brace" : "question");
      locked.current = false;
    },
    [deadlineFor],
  );

  const answer = useCallback(
    (value: number | null) => {
      if (!question || locked.current) return;
      locked.current = true;

      const elapsedMs = Date.now() - startedAt.current;
      const correct = value === question.answer;
      const record: Answered = {
        a: question.a,
        b: question.b,
        operation: question.operation,
        correct,
        elapsedMs,
      };
      const nextAnswers = [...answers, record];
      setAnswers(nextAnswers);

      if (correct) {
        // The plank is earned; where it goes is the next decision, and that
        // decision is deliberately untimed — the tempo lives in the questions.
        setDeadline(null);
        setPhase("placing");
        return;
      }

      const shaken = wobble(tower);
      setTower(shaken);
      setAnnouncement(
        `Wrong — ${question.prompt} is ${question.answer}. The scaffold wobbles. ${leanLabel(shaken)}`,
      );

      if (hasToppled(shaken)) {
        topple(nextAnswers);
        return;
      }
      nextTurn(shaken);
    },
    [answers, nextTurn, question, topple, tower],
  );

  /* --------------------------------------------------------------- placing */

  const placePlank = useCallback(
    (length: number, side: Side) => {
      const next = place(tower, { length, side });
      setTower(next);
      setAnnouncement(
        next.height > 0 && hasToppled(next)
          ? `Timber! The scaffold went over at height ${next.height}.`
          : `Height ${next.height}. ${leanLabel(next)}`,
      );

      if (hasToppled(next)) {
        topple(answers);
        return;
      }
      nextTurn(next);
    },
    [answers, nextTurn, topple, tower],
  );

  const applyBrace = useCallback(() => {
    const next = brace(tower);
    setTower(next);
    setAnnouncement(`Braced. ${leanLabel(next)}`);
    setQuestionIndex((i) => i + 1);
    startedAt.current = Date.now();
    setDeadline(deadlineFor(next.height));
    setPhase("question");
  }, [deadlineFor, tower]);

  const skipBrace = useCallback(() => {
    startedAt.current = Date.now();
    setDeadline(deadlineFor(tower.height));
    setPhase("question");
  }, [deadlineFor, tower.height]);

  const startRun = useCallback(() => {
    startedAt.current = Date.now();
    setDeadline(deadlineFor(0));
    setPhase("question");
  }, [deadlineFor]);

  /* ---------------------------------------------------------------- effects */

  // Read the question aloud when the setting is on.
  useEffect(() => {
    if (phase === "question" && question) speak(question.spoken);
  }, [phase, question, speak]);

  /* -------------------------------------------------------------- keyboard */

  useEffect(() => {
    if (phase === "question" && question) {
      const onKey = (event: KeyboardEvent) => {
        if (tier.format === "choice") {
          const n = Number(event.key);
          if (question.choices && n >= 1 && n <= question.choices.length) {
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
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }

    if (phase === "placing" && question) {
      // 1 / 2 pick which factor becomes the plank; arrows place it. With no
      // factor chosen, the arrows use the shorter, safer one.
      const factors = plankLengths(question);
      let chosen: number | null = null;

      const onKey = (event: KeyboardEvent) => {
        if (event.key === "1") chosen = factors[0];
        else if (event.key === "2") chosen = factors[1];
        else if (event.key === "ArrowLeft") placePlank(chosen ?? factors[0], "left");
        else if (event.key === "ArrowRight") placePlank(chosen ?? factors[0], "right");
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }

    if (phase === "brace") {
      const onKey = (event: KeyboardEvent) => {
        if (event.key.toLowerCase() === "b") applyBrace();
        else if (event.key === "Enter") setPhase("question");
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [answer, phase, placePlank, question, tier.format, applyBrace]);

  /* ---------------------------------------------------------------- render */

  if (phase === "done") {
    return (
      <ResultsScreen
        headline="TIMBER!"
        label={`Scaffold Stack · height ${tower.height}`}
        result={result}
        saving={saving || !result}
        homeHref="/play/modes"
        onAgain={() => router.refresh()}
      />
    );
  }

  if (phase === "briefing") {
    return (
      <Briefing personalBest={personalBest} onStart={startRun} />
    );
  }

  return (
    <Screen tone="ink">
      <ScreenBody className="gap-2.5 px-4 pt-4 pb-4">
        <TowerHeader height={tower.height} personalBest={personalBest} />
        <TiltMeter tilt={tower.tilt} />
        <TowerView tower={tower} reducedMotion={settings.reduced_motion} />

        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {phase === "brace" ? (
          <BracePanel tilt={tower.tilt} onBrace={applyBrace} onSkip={skipBrace} />
        ) : phase === "placing" && question ? (
          <PlacePanel question={question} onPlace={placePlank} />
        ) : question ? (
          <>
            {deadline !== null && limit !== null ? (
              <TimerBar
                key={questionIndex}
                deadline={deadline}
                limit={limit}
                onExpire={() => answer(null)}
              />
            ) : (
              <p className="text-center font-sans text-[10px] font-black tracking-wide text-white/50 uppercase">
                No timer — stack as long as you like
              </p>
            )}

            <p className="text-center font-display text-[34px] leading-none text-white">
              {question.prompt}
            </p>

            {tier.format === "choice" ? (
              <div className="grid grid-cols-2 gap-2.5">
                {question.choices?.map((choice, i) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => answer(choice)}
                    className="pop-press rounded-2xl border-[3px] border-ink bg-white py-3.5 text-center font-display text-2xl text-ink shadow-pop"
                  >
                    <span className="sr-only">Option {i + 1}: </span>
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <p
                  className="mx-auto min-h-[44px] w-32 rounded-xl border-[3px] border-ink bg-white text-center font-display text-2xl text-ink"
                  aria-live="polite"
                >
                  {typed || "?"}
                </p>
                <Keypad
                  onDigit={(d) => setTyped((v) => (v.length < 4 ? v + d : v))}
                  onBackspace={() => setTyped((v) => v.slice(0, -1))}
                  onSubmit={() => typed !== "" && answer(Number(typed))}
                  compact
                />
              </>
            )}
          </>
        ) : null}
      </ScreenBody>
    </Screen>
  );
}

/* ----------------------------------------------------------------- pieces */

/** The two factors of a fact, shorter first — the shorter one is the safe pick. */
function plankLengths(question: Question): [number, number] {
  const [x, y] = [question.a, question.b].sort((m, n) => m - n);
  return [x, y];
}

function leanLabel(tower: Tower): string {
  if (tower.tilt === 0) return "Dead level.";
  const side = tower.tilt < 0 ? "left" : "right";
  return `Leaning ${side}, ${Math.abs(tower.tilt)} of ${TOPPLE_AT}.`;
}

function Briefing({ personalBest, onStart }: { personalBest: number; onStart: () => void }) {
  return (
    <Screen tone="ink">
      <ScreenBody className="px-5 pt-7">
        <h1 className="font-display text-[28px] text-white [text-shadow:2px_2px_0_#111]">
          Scaffold Stack
        </h1>
        <p className="mt-1 font-sans text-[13px] font-extrabold text-white/70">
          Every right answer is another plank. Keep it balanced — the run ends when it goes over.
        </p>

        <ArtSlot tone="light" label="SCAFFOLD / TOWER ART" className="mt-4 h-[120px] w-full" />

        <PopCard className="mt-3.5 p-3 shadow-pop">
          <p className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
            Your record
          </p>
          <p className="mt-1 font-display text-[26px] text-ink">
            {personalBest > 0 ? `${personalBest} planks` : "No record yet"}
          </p>
          <ul className="mt-2 flex flex-col gap-1 font-sans text-[11px] font-bold text-mud">
            <li>▸ Pick which side each plank goes on — balance the lean.</li>
            <li>▸ Longer planks score more but leave the tower less steady.</li>
            <li>▸ A wrong answer costs no plank, but the scaffold wobbles.</li>
          </ul>
        </PopCard>

        <PopButton tone="red" size="lg" full className="mt-auto" onClick={onStart}>
          START STACKING ▸
        </PopButton>
      </ScreenBody>
    </Screen>
  );
}

function TowerHeader({ height, personalBest }: { height: number; personalBest: number }) {
  return (
    <div className="flex items-center justify-between">
      <a
        href="/play/modes"
        aria-label="Leave Scaffold Stack"
        className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
      >
        <span aria-hidden>✕</span>
      </a>
      <p className="font-display text-[13px] text-white">
        HEIGHT <span className="text-yellow">{height}</span>
      </p>
      <p className="font-sans text-[11px] font-black text-white/60">
        <span aria-hidden>⚑ </span>
        {personalBest}
        <span className="sr-only"> planks is your record</span>
      </p>
    </div>
  );
}

/**
 * The lean, as a number, a direction word and a position — never colour alone.
 */
function TiltMeter({ tilt }: { tilt: number }) {
  const steps = Array.from({ length: TOPPLE_AT * 2 + 1 }, (_, i) => i - TOPPLE_AT);
  const danger = Math.abs(tilt) >= TOPPLE_AT - 2;

  return (
    <div>
      <div className="flex items-center justify-between font-sans text-[9.5px] font-black text-white/60 uppercase">
        <span>◀ left</span>
        <span className={cx(danger && "text-yellow")}>
          {danger ? "leaning badly" : "lean"} {Math.abs(tilt)}/{TOPPLE_AT}
        </span>
        <span>right ▶</span>
      </div>
      <div
        className="mt-1 flex gap-[3px]"
        role="meter"
        aria-valuenow={Math.abs(tilt)}
        aria-valuemin={0}
        aria-valuemax={TOPPLE_AT}
        aria-label={tilt === 0 ? "Dead level" : `Leaning ${tilt < 0 ? "left" : "right"}`}
      >
        {steps.map((step) => {
          const lit = tilt === 0 ? step === 0 : step === tilt;
          const inRange = tilt < 0 ? step >= tilt && step <= 0 : step <= tilt && step >= 0;
          return (
            <span
              key={step}
              className={cx(
                "h-2.5 flex-1 rounded-[3px] border-2 border-ink",
                lit ? "bg-yellow" : inRange ? "bg-white/45" : "bg-black/30",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/** The last dozen planks, offset by the lean they were placed into. */
function TowerView({ tower, reducedMotion }: { tower: Tower; reducedMotion: boolean }) {
  const visible = tower.planks.slice(-12);

  return (
    <div
      className="flex min-h-[140px] flex-1 flex-col-reverse items-center justify-start overflow-hidden py-1"
      role="img"
      aria-label={
        tower.height === 0
          ? "An empty scaffold base."
          : `A scaffold ${tower.height} planks high. ${leanLabel(tower)}`
      }
    >
      <span className="h-1.5 w-full rounded-full border-2 border-ink bg-white/70" />
      {visible.map((plank, i) => (
        <span
          key={`${i}-${plank.length}-${plank.side}`}
          className={cx(
            "mb-[3px] flex h-[11px] items-center justify-center rounded-[3px] border-2 border-ink bg-orange font-sans text-[7.5px] font-black text-ink",
            !reducedMotion && "anim-rise",
          )}
          style={{
            width: `${34 + plank.length * 4}%`,
            marginLeft: plank.side === "left" ? "0" : "auto",
            marginRight: plank.side === "left" ? "auto" : "0",
          }}
        >
          {plank.length}
        </span>
      ))}
    </div>
  );
}

/**
 * Owns its own clock, measured against a deadline the parent set in an event
 * handler. Mounted fresh per question (keyed on the question index), so it
 * never carries a stale countdown across turns, and it re-renders 10× a second
 * without dragging the rest of the screen with it.
 */
function TimerBar({
  deadline,
  limit,
  onExpire,
}: {
  deadline: number;
  limit: number;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  // Held in a ref so a new closure each render doesn't restart the interval.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at >= deadline) {
        window.clearInterval(id);
        onExpireRef.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [deadline]);

  const remaining = Math.max(0, (deadline - now) / 1000);
  const pct = Math.max(0, Math.min(100, (remaining / limit) * 100));
  const urgent = remaining <= 2;
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-black/30"
      role="progressbar"
      aria-valuenow={Math.ceil(remaining)}
      aria-valuemin={0}
      aria-valuemax={Math.ceil(limit)}
      aria-label={`${Math.ceil(remaining)} seconds left`}
    >
      <span
        className={cx("block h-full", urgent ? "bg-red" : "bg-yellow")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** One tap picks both the plank's length and the side it goes on. */
function PlacePanel({
  question,
  onPlace,
}: {
  question: Question;
  onPlace: (length: number, side: Side) => void;
}) {
  const [short, long] = plankLengths(question);

  return (
    <section aria-label="Place your plank" className="flex flex-col gap-2">
      <p className="text-center font-display text-[15px] text-white">
        {question.prompt} = {question.answer} — plank earned
      </p>
      <p className="text-center font-sans text-[10.5px] font-black text-white/60 uppercase">
        Pick its length, then a side
      </p>

      {[short, long].map((length, row) => (
        <div key={length} className="flex items-center gap-2">
          <PopButton
            tone="white"
            size="md"
            className="flex-1"
            onClick={() => onPlace(length, "left")}
          >
            <span aria-hidden>◀ </span>
            <span className="sr-only">
              Place the {length} plank on the left. Press {row + 1} then left arrow.{" "}
            </span>
            {length}
          </PopButton>
          <PopButton
            tone="white"
            size="md"
            className="flex-1"
            onClick={() => onPlace(length, "right")}
          >
            {length}
            <span aria-hidden> ▶</span>
            <span className="sr-only">Place the {length} plank on the right.</span>
          </PopButton>
        </div>
      ))}

      <p className="text-center font-sans text-[10px] font-bold text-white/45">
        The {long} scores more but leaves it less steady.
      </p>
    </section>
  );
}

function BracePanel({
  tilt,
  onBrace,
  onSkip,
}: {
  tilt: number;
  onBrace: () => void;
  onSkip: () => void;
}) {
  return (
    <section aria-label="Brace offered" className="flex flex-col gap-2.5">
      <PopCard className="p-3 text-center shadow-pop">
        <p className="font-display text-[15px] text-ink">Steady the scaffold?</p>
        <p className="mt-1 font-sans text-[11px] font-bold text-mud">
          A brace pulls the lean two steps back toward centre — but you skip this plank.
          {tilt === 0 ? " You're dead level, so it would do nothing." : ""}
        </p>
      </PopCard>
      <div className="flex gap-2.5">
        <PopButton tone="white" size="md" className="flex-1" onClick={onBrace}>
          USE BRACE
        </PopButton>
        <PopButton tone="red" size="md" className="flex-[1.3]" onClick={onSkip}>
          KEEP STACKING ▸
        </PopButton>
      </div>
    </section>
  );
}
