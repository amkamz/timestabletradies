"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ArtSlot, PopButton, PopCard, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { useA11y } from "@/components/a11y/a11y-provider";
import { Keypad } from "./keypad";
import { ResultsScreen } from "./results";
import { finishRun, type RunResult } from "@/lib/actions/play";
import type { Racer } from "@/lib/game/crew";
import {
  LEGS,
  QUESTIONS_PER_LEG,
  buildLeg,
  lengthsFor,
  legTables,
  routeForLeg,
  speedFor,
  type Route,
} from "@/lib/game/rally";

/** Seconds to choose a road before the sealed one is taken by default. */
const FORK_SECONDS = 6;

type Phase = "briefing" | "fork" | "racing" | "done";

type Answered = {
  a: number;
  b: number;
  operation: "multiply" | "divide";
  correct: boolean;
  elapsedMs: number;
};

/**
 * Ute Rally — docs/game-modes/02-ute-rally.md
 *
 * Six legs of four questions, with a fork between each. The sealed road banks
 * one length per correct answer; the dirt banks three, but only if the whole
 * leg is clean. Distance and placing are recomputed server-side from the
 * answer log and the roads taken.
 */
export function RallyTrack({
  studentId,
  seed,
  tables,
  divisionUnlocked,
  field,
}: {
  studentId: string;
  seed: string;
  tables: number[];
  divisionUnlocked: number[];
  field: Racer[];
}) {
  const router = useRouter();
  const { speak, resolveTimer, settings } = useA11y();

  const [phase, setPhase] = useState<Phase>("briefing");
  const [leg, setLeg] = useState(0);
  const [step, setStep] = useState(0);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [distance, setDistance] = useState(0);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);

  const startedAt = useRef(0);
  const locked = useRef(false);

  const route = routes[leg] ?? "sealed";
  const questions = useMemo(
    () =>
      phase === "racing"
        ? buildLeg({ seed, leg, route, tables, divisionUnlocked })
        : [],
    [divisionUnlocked, leg, phase, route, seed, tables],
  );
  const question = questions[step];

  /* -------------------------------------------------------------- finishing */

  const submit = useCallback(
    async (finalAnswers: Answered[], finalRoutes: Route[]) => {
      setPhase("done");
      setSaving(true);
      try {
        const res = await finishRun({
          studentId,
          mode: "rally",
          table: null,
          operation: divisionUnlocked.length > 0 ? "both" : "multiply",
          rally: { seed, routes: finalRoutes },
          answers: finalAnswers,
        });
        setResult(res);
      } finally {
        setSaving(false);
      }
    },
    [divisionUnlocked.length, seed, studentId],
  );

  /* ----------------------------------------------------------------- racing */

  const startLeg = useCallback(
    (index: number, chosen: Route) => {
      const actual = routeForLeg(index, chosen);
      setRoutes((current) => {
        const next = [...current];
        next[index] = actual;
        return next;
      });
      setLeg(index);
      setStep(0);
      setTyped("");
      startedAt.current = Date.now();
      locked.current = false;
      setPhase("racing");
      setNote(
        actual === "dirt"
          ? `Dirt shortcut — all four or the leg banks nothing.`
          : "Sealed road — every one you get right moves you up.",
      );
    },
    [],
  );

  const answer = useCallback(
    (value: number | null) => {
      if (!question || locked.current) return;
      locked.current = true;

      const record: Answered = {
        a: question.a,
        b: question.b,
        operation: question.operation,
        correct: value === question.answer,
        elapsedMs: Date.now() - startedAt.current,
      };
      const nextAnswers = [...answers, record];
      setAnswers(nextAnswers);

      const nextStep = step + 1;
      if (nextStep < QUESTIONS_PER_LEG) {
        setStep(nextStep);
        setTyped("");
        startedAt.current = Date.now();
        locked.current = false;
        return;
      }

      // Leg over: bank it, and either fork again or finish.
      const legAnswers = nextAnswers.slice(leg * QUESTIONS_PER_LEG);
      const correct = legAnswers.filter((a) => a.correct).length;
      const banked = lengthsFor(route, correct, QUESTIONS_PER_LEG);
      setDistance((d) => d + banked);
      setNote(
        banked === 0 && route === "dirt"
          ? `Dropped one on the dirt — that leg banks nothing.`
          : `Banked ${banked} lengths.`,
      );

      if (leg + 1 >= LEGS) {
        void submit(nextAnswers, routes);
        return;
      }

      setLeg(leg + 1);
      setPhase("fork");
      locked.current = false;
    },
    [answers, leg, question, route, routes, step, submit],
  );

  /* ---------------------------------------------------------------- timers */

  const answerRef = useRef(answer);
  useEffect(() => {
    answerRef.current = answer;
  });

  // Read the question aloud when the setting is on.
  useEffect(() => {
    if (phase === "racing" && question) speak(question.spoken);
  }, [phase, question, speak]);

  /* -------------------------------------------------------------- keyboard */

  useEffect(() => {
    if (phase !== "racing" || !question) return;

    function onKey(event: KeyboardEvent) {
      if (question?.choices) {
        const n = Number(event.key);
        if (n >= 1 && n <= question.choices.length) answer(question.choices[n - 1]);
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
  }, [answer, phase, question]);

  /* ---------------------------------------------------------------- render */

  if (phase === "done") {
    return (
      <ResultsScreen
        headline="CHEQUERED FLAG"
        label={`Ute Rally · ${distance} lengths`}
        result={result}
        saving={saving || !result}
        homeHref="/play/modes"
        onAgain={() => router.refresh()}
      />
    );
  }

  if (phase === "briefing") {
    return (
      <Screen tone="ink">
        <ScreenBody className="px-5 pt-7">
          <h1 className="font-display text-[28px] text-white [text-shadow:2px_2px_0_#111]">
            Ute Rally
          </h1>
          <p className="mt-1 font-sans text-[13px] font-extrabold text-white/70">
            Six legs to site. Take the sealed road, or gamble on the dirt.
          </p>

          <ArtSlot tone="light" label="UTE / DIRT ROAD ART" className="mt-4 h-[110px] w-full" />

          <PopCard className="mt-3.5 p-3 shadow-pop">
            <p className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
              Today&apos;s field
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {field.map((racer) => (
                <li key={racer.id} className="font-sans text-[11.5px] font-bold text-mud">
                  {racer.name}
                  {racer.simulated ? (
                    <span className="ml-1 font-black text-teal">(practice crew)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </PopCard>

          <PopButton
            tone="red"
            size="lg"
            full
            className="mt-auto"
            onClick={() => startLeg(0, "sealed")}
          >
            ROLL OUT ▸
          </PopButton>
        </ScreenBody>
      </Screen>
    );
  }

  if (phase === "fork") {
    return (
      <ForkPanel
        leg={leg}
        tables={tables}
        seconds={resolveTimer(FORK_SECONDS)}
        reducedMotion={settings.reduced_motion}
        onChoose={(chosen) => startLeg(leg, chosen)}
      />
    );
  }

  if (!question) return null;

  return (
    <Screen tone="ink">
      <ScreenBody className="gap-3 px-4 pt-4 pb-4">
        <header className="flex items-center justify-between">
          <a
            href="/play/modes"
            aria-label="Leave the rally"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </a>
          <p className="font-display text-[13px] text-white">
            LEG {leg + 1}/{LEGS} · {step + 1}/{QUESTIONS_PER_LEG}
          </p>
          <p className="font-sans text-[11px] font-black text-yellow">
            {distance}
            <span className="sr-only"> lengths travelled</span>
            <span aria-hidden> len</span>
          </p>
        </header>

        <RoadStrip route={route} />

        <p aria-live="polite" className="min-h-[18px] text-center font-sans text-[11px] font-bold text-white/70">
          {note}
        </p>

        <p className="text-center font-display text-[38px] leading-none text-white">
          {question.prompt}
        </p>

        {question.choices ? (
          <div className="grid grid-cols-2 gap-2.5">
            {question.choices.map((choice, i) => (
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
      </ScreenBody>
    </Screen>
  );
}

/* ----------------------------------------------------------------- pieces */

/** Road surface is a texture and a label, never colour alone. */
function RoadStrip({ route }: { route: Route }) {
  return (
    <p
      className={cx(
        "rounded-xl border-[3px] border-ink px-3 py-1.5 text-center font-sans text-[11px] font-black",
        route === "dirt" ? "bg-orange text-ink" : "bg-white text-ink",
      )}
    >
      <span aria-hidden>{route === "dirt" ? "▨▨▨ " : "═══ "}</span>
      {route === "dirt" ? "DIRT SHORTCUT · 3 lengths each · all four or nothing" : "SEALED ROAD · 1 length each"}
    </p>
  );
}

function ForkPanel({
  leg,
  tables,
  seconds,
  reducedMotion,
  onChoose,
}: {
  leg: number;
  tables: number[];
  seconds: number | null;
  reducedMotion: boolean;
  onChoose: (route: Route) => void;
}) {
  const [left, setLeft] = useState(seconds);

  const onChooseRef = useRef(onChoose);
  useEffect(() => {
    onChooseRef.current = onChoose;
  });

  useEffect(() => {
    if (seconds === null) return;
    const deadline = Date.now() + seconds * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      if (remaining <= 0) {
        window.clearInterval(id);
        // Never blocks: the safe road is taken by default.
        onChooseRef.current("sealed");
      } else {
        setLeft(remaining);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [seconds]);

  const sealed = legTables(tables, "sealed", leg);
  const dirt = legTables(tables, "dirt", leg);

  return (
    <Screen tone="ink">
      <ScreenBody className="justify-center gap-4 px-5">
        <p className="text-center font-display text-[22px] text-yellow">FORK AHEAD</p>

        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Choose your road">
          <button
            type="button"
            onClick={() => onChoose("sealed")}
            className="pop-press rounded-2xl border-[3px] border-ink bg-white px-4 py-3 text-left shadow-pop"
          >
            <span className="block font-display text-[17px] text-ink">
              <span aria-hidden>═══ </span>SEALED ROAD
            </span>
            <span className="mt-0.5 block font-sans text-[11.5px] font-bold text-mud">
              {sealed.map((t) => `×${t}`).join(" · ")} — 1 length each, keep what you get right
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChoose("dirt")}
            className="pop-press rounded-2xl border-[3px] border-ink bg-orange px-4 py-3 text-left shadow-pop"
          >
            <span className="block font-display text-[17px] text-ink">
              <span aria-hidden>▨▨▨ </span>DIRT SHORTCUT
            </span>
            <span className="mt-0.5 block font-sans text-[11.5px] font-bold text-ink/75">
              {dirt.map((t) => `×${t}`).join(" · ")} — {speedFor("dirt")} lengths each, but drop one
              and the leg banks nothing
            </span>
          </button>
        </div>

        {seconds !== null ? (
          <p
            className={cx(
              "text-center font-display text-[15px] text-white",
              !reducedMotion && "transition-opacity",
            )}
            aria-live="polite"
          >
            {left}… sealed road if you don&apos;t pick
          </p>
        ) : (
          <p className="text-center font-sans text-[11px] font-bold text-white/50">
            Take your time — nothing moves until you choose.
          </p>
        )}
      </ScreenBody>
    </Screen>
  );
}
