"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ArtSlot, PopButton, PopCard, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { useA11y } from "@/components/a11y/a11y-provider";
import { ResultsScreen } from "./results";
import { finishRun, type RunResult } from "@/lib/actions/play";
import {
  MAX_TURNS,
  damageFor,
  resolveTurn,
  startDuel,
  swingKind,
  type DuelMove,
  type DuelState,
  type Rival,
} from "@/lib/game/tool-off";

/** Seconds a turn is given before it resolves as a miss. Generous on purpose. */
const TURN_SECONDS = 30;

/**
 * The Tool-Off — docs/game-modes/03-the-tool-off.md
 *
 * Pick two tools off the belt to make the target exactly. The whole duel is a
 * pure reducer in `lib/game/tool-off`; this owns selection, the turn clock and
 * the drawing, and sends the swings to the server to be replayed and scored.
 */
export function DuelBoard({
  studentId,
  seed,
  unlocked,
  rivals,
}: {
  studentId: string;
  seed: string;
  unlocked: number[];
  rivals: Rival[];
}) {
  const router = useRouter();
  const { speak, resolveTimer } = useA11y();

  const [state, setState] = useState<DuelState | null>(null);
  const [moves, setMoves] = useState<DuelMove[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  const startedAt = useRef(0);
  const limit = resolveTimer(TURN_SECONDS);

  const product =
    picked.length === 2 && state ? state.belt[picked[0]] * state.belt[picked[1]] : null;

  /* -------------------------------------------------------------- finishing */

  const submit = useCallback(
    async (rival: Rival, finalMoves: DuelMove[]) => {
      setFinished(true);
      setSaving(true);
      try {
        const res = await finishRun({
          studentId,
          mode: "tooloff",
          table: null,
          operation: "multiply",
          duel: { seed, rival: rival.key, moves: finalMoves },
          answers: [],
        });
        setResult(res);
      } finally {
        setSaving(false);
      }
    },
    [seed, studentId],
  );

  /* ------------------------------------------------------------------ turns */

  const takeTurn = useCallback(
    (move: DuelMove) => {
      if (!state || state.over) return;

      const next = resolveTurn(state, move, unlocked);
      const record = next.log[next.log.length - 1];
      const message =
        record.result === "timeout"
          ? "Out of time — the swing went wide."
          : record.result === "exact"
            ? record.shielded
              ? `Exact, but the shield took half. ${record.damage} damage.`
              : `Exact hit! ${record.damage} damage.`
            : record.result === "close"
              ? `Glancing blow — ${record.damage} damage.`
              : "Missed. That'll cost you.";

      setMoves((m) => [...m, move]);
      setState(next);
      setPicked([]);
      setNote(message);
      speak(message);
      startedAt.current = Date.now();

      if (next.over) {
        void submit(next.rival, [...moves, move]);
      }
    },
    [moves, speak, state, submit, unlocked],
  );

  const swing = useCallback(() => {
    if (!state || picked.length !== 2) return;
    takeTurn({
      kind: "swing",
      tools: [state.belt[picked[0]], state.belt[picked[1]]],
      elapsedMs: Date.now() - startedAt.current,
    });
  }, [picked, state, takeTurn]);

  const toggleTool = useCallback((slot: number) => {
    // Two picks, then you commit — nothing fires on the second tap, because
    // children change their minds and should be allowed to.
    setPicked((current) =>
      current.includes(slot)
        ? current.filter((s) => s !== slot)
        : current.length < 2
          ? [...current, slot]
          : [current[1], slot],
    );
  }, []);

  /* ----------------------------------------------------------------- clock */

  const takeTurnRef = useRef(takeTurn);
  useEffect(() => {
    takeTurnRef.current = takeTurn;
  });

  useEffect(() => {
    if (!state || state.over || limit === null) return;
    const deadline = Date.now() + limit * 1000;
    const id = window.setInterval(() => {
      if (Date.now() >= deadline) {
        window.clearInterval(id);
        takeTurnRef.current({ kind: "timeout" });
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [limit, state]);

  /* -------------------------------------------------------------- keyboard */

  useEffect(() => {
    if (!state || state.over || finished) return;

    function onKey(event: KeyboardEvent) {
      const n = Number(event.key);
      if (n >= 1 && n <= (state?.belt.length ?? 0)) {
        toggleTool(n - 1);
        return;
      }
      if (event.key === "Enter") swing();
      else if (event.key === "Escape" || event.key === "Backspace") setPicked([]);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, state, swing, toggleTool]);

  /* ---------------------------------------------------------------- render */

  if (finished) {
    return (
      <ResultsScreen
        headline={result?.solved ? "TOOLS DOWN!" : "BEATEN"}
        label={`The Tool-Off · ${state?.rival.name ?? ""}`}
        result={result}
        saving={saving || !result}
        homeHref="/play/modes"
        onAgain={() => router.refresh()}
      />
    );
  }

  if (!state) {
    return (
      <RivalPicker
        rivals={rivals}
        onPick={(rival) => {
          startedAt.current = Date.now();
          setState(startDuel({ seed, rival: rival.key, unlocked }));
          setNote(`${rival.name} steps up.`);
        }}
      />
    );
  }

  const kind = product === null ? null : swingKind(product, state.target);
  const preview =
    picked.length === 2
      ? damageFor({
          tools: [state.belt[picked[0]], state.belt[picked[1]]],
          target: state.target,
          shield: state.shield,
        })
      : null;

  return (
    <Screen tone="ink">
      <ScreenBody className="gap-2.5 px-4 pt-4 pb-4">
        <header className="flex items-center justify-between">
          <a
            href="/play/modes"
            aria-label="Leave the Tool-Off"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </a>
          <p className="font-display text-[13px] text-white">vs. {state.rival.name}</p>
          <p className="font-sans text-[11px] font-black text-white/60">
            turn {state.turn}/{MAX_TURNS}
          </p>
        </header>

        <HealthBar label={state.rival.name} hp={state.rivalHp} max={state.rival.hp} tone="bg-red" />

        {state.shield !== null ? (
          <p className="rounded-xl border-[3px] border-ink bg-yellow px-3 py-1.5 text-center font-sans text-[11.5px] font-black text-ink">
            <span aria-hidden>🛡 </span>
            Shield up — the hit only counts in full if you use a ×{state.shield}
          </p>
        ) : null}

        <div className="my-1 text-center">
          <p className="font-sans text-[10px] font-black tracking-wide text-white/60 uppercase">
            Build
          </p>
          <p className="font-display text-[44px] leading-none text-yellow">{state.target}</p>
        </div>

        <HealthBar label="You" hp={state.playerHp} max={state.rival.playerHp} tone="bg-teal" />

        <p aria-live="polite" className="min-h-[30px] text-center font-sans text-[11.5px] font-bold text-white/80">
          {note}
        </p>

        <section aria-label="Tool belt" className="grid grid-cols-3 gap-2">
          {state.belt.map((tool, slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => toggleTool(slot)}
              aria-pressed={picked.includes(slot)}
              aria-label={`Tool ${slot + 1}: ${tool}`}
              className={cx(
                "pop-press rounded-xl border-[3px] border-ink py-3 text-center font-display text-xl shadow-pop",
                picked.includes(slot) ? "bg-teal text-white" : "bg-white text-ink",
                state.shield === tool && "ring-[3px] ring-yellow ring-offset-1 ring-offset-ink",
              )}
            >
              {tool}
              {state.shield === tool ? <span className="sr-only"> (beats the shield)</span> : null}
            </button>
          ))}
        </section>

        <p className="text-center font-display text-[15px] text-white" aria-live="polite">
          {picked.length === 2 && product !== null ? (
            <>
              {state.belt[picked[0]]} × {state.belt[picked[1]]} = {product}{" "}
              <span
                className={cx(
                  "ml-1 rounded-[7px] border-2 border-ink px-1.5 py-0.5 font-sans text-[10px] font-black",
                  kind === "exact" ? "bg-teal text-white" : kind === "close" ? "bg-yellow text-ink" : "bg-red text-white",
                )}
              >
                {kind === "exact" ? "✓ EXACT" : kind === "close" ? "≈ CLOSE" : "✕ MISS"}
              </span>
              {preview?.shielded ? (
                <span className="ml-1 font-sans text-[10px] font-black text-yellow">
                  half through the shield
                </span>
              ) : null}
            </>
          ) : (
            <span className="font-sans text-[11.5px] font-bold text-white/50">
              Pick two tools off the belt
            </span>
          )}
        </p>

        <PopButton
          tone="red"
          size="lg"
          full
          className="mt-auto"
          disabled={picked.length !== 2}
          onClick={swing}
        >
          SWING ▸
        </PopButton>

        {limit === null ? (
          <p className="text-center font-sans text-[10px] font-black tracking-wide text-white/40 uppercase">
            No turn clock — take your time
          </p>
        ) : null}
      </ScreenBody>
    </Screen>
  );
}

/* ----------------------------------------------------------------- pieces */

function HealthBar({
  label,
  hp,
  max,
  tone,
}: {
  label: string;
  hp: number;
  max: number;
  tone: string;
}) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div>
      <div className="flex justify-between font-sans text-[10px] font-black text-white/70 uppercase">
        <span className="truncate">{label}</span>
        {/* The numbers stay visible: the child needs them to work out how
            many turns they have left. */}
        <span>
          {hp}/{max}
        </span>
      </div>
      <div
        className="mt-1 h-3.5 overflow-hidden rounded-full border-2 border-ink bg-black/30"
        role="progressbar"
        aria-valuenow={hp}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${hp} of ${max} health`}
      >
        <span className={cx("block h-full", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RivalPicker({
  rivals,
  onPick,
}: {
  rivals: Rival[];
  onPick: (rival: Rival) => void;
}) {
  return (
    <Screen tone="ink">
      <ScreenBody className="px-5 pt-7">
        <h1 className="font-display text-[28px] text-white [text-shadow:2px_2px_0_#111]">
          The Tool-Off
        </h1>
        <p className="mt-1 font-sans text-[13px] font-extrabold text-white/70">
          They call the number. You build it out of your belt.
        </p>

        <ArtSlot tone="light" label="RIVAL TRADIE ART" className="mt-4 h-[100px] w-full" />

        <ul className="mt-3.5 flex flex-col gap-2.5">
          {rivals.map((rival) => (
            <li key={rival.key}>
              <PopCard className="p-0 shadow-pop">
                <button
                  type="button"
                  onClick={() => onPick(rival)}
                  className="pop-press w-full px-3.5 py-3 text-left"
                >
                  <span className="block font-display text-[15px] text-ink">{rival.name}</span>
                  <span className="mt-0.5 block font-sans text-[11px] font-bold text-mud">
                    {rival.blurb}
                  </span>
                  <span className="mt-1 block font-sans text-[10px] font-black text-teal uppercase">
                    {rival.hp} health · hits for {rival.hit}
                  </span>
                </button>
              </PopCard>
            </li>
          ))}
        </ul>
      </ScreenBody>
    </Screen>
  );
}
