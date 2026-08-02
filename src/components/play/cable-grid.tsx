"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PopButton, PopCard, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { useA11y } from "@/components/a11y/a11y-provider";
import { ResultsScreen } from "./results";
import { finishRun, type RunResult } from "@/lib/actions/play";
import {
  applyConnector,
  applyMove,
  connectorLabel,
  initialState,
  isAdjacent,
  isSolved,
  isStuck,
  sameCell,
  valueAt,
  type Board,
  type CableMove,
  type Cell,
  type RunState,
} from "@/lib/game/cable-run";

/**
 * Cable Run — docs/game-modes/01-cable-run.md
 *
 * Untimed, undoable, and bounded by cable rather than a clock. The board's
 * rules live in `lib/game/cable-run`; this owns selection, the keyboard and
 * the drawing. Nothing here computes a reward — the moves are sent to the
 * server, which replays them against a board it generates itself.
 */
export function CableGrid({ studentId, board }: { studentId: string; board: Board }) {
  const router = useRouter();
  const { speak, settings } = useA11y();

  const [state, setState] = useState<RunState>(() => initialState(board));
  const [moves, setMoves] = useState<CableMove[]>([]);
  const [card, setCard] = useState<number | null>(null);
  const [pending, setPending] = useState<Cell | null>(null);
  const [note, setNote] = useState("Pick a connector, then a junction next to you.");
  const [focus, setFocus] = useState<Cell>(board.start);
  const [result, setResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  // Started from an effect, never during render: reading the clock while
  // rendering makes the value depend on when React happens to re-run.
  const startedAt = useRef(0);
  const cellRefs = useRef(new Map<string, HTMLButtonElement | null>());

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const solved = isSolved(board, state);
  const stuck = !solved && isStuck(board, state);
  const cabled = useMemo(
    () => new Set(state.path.map((c) => `${c.row},${c.col}`)),
    [state.path],
  );

  /* -------------------------------------------------------------- finishing */

  const submit = useCallback(
    async (finalMoves: CableMove[]) => {
      setFinished(true);
      setSaving(true);
      try {
        const res = await finishRun({
          studentId,
          mode: "cablerun",
          table: null,
          operation: "both",
          // The whole session, replayed and scored server-side.
          puzzle: { seed: board.seed, difficulty: board.difficulty, moves: finalMoves },
          answers: [],
        });
        setResult(res);
      } finally {
        setSaving(false);
      }
    },
    [board.difficulty, board.seed, studentId],
  );

  /* ----------------------------------------------------------------- moves */

  const commit = useCallback(
    (slot: number, target: Cell) => {
      if (finished) return;

      const elapsedMs = Date.now() - startedAt.current;
      const outcome = applyMove(board, state, slot, target);
      const move: CableMove = {
        kind: "move",
        hand: slot,
        row: target.row,
        col: target.col,
        elapsedMs,
      };
      const nextMoves = [...moves, move];
      setMoves(nextMoves);
      setCard(null);
      setPending(null);
      startedAt.current = Date.now();

      if (!outcome.ok) {
        // Illegal moves cost no cable. The wrong idea is still recorded —
        // they genuinely believed it for a moment.
        const connector = board.deck[state.hand[slot]];
        const message =
          outcome.reason === "not-adjacent"
            ? "That junction isn't next to you."
            : outcome.expected === null
              ? `${connectorLabel(connector)} doesn't work on ${state.value}.`
              : `${state.value} ${connectorLabel(connector)} is ${outcome.expected}, and that junction is ${valueAt(board, target)}.`;
        setNote(message);
        speak(message);
        return;
      }

      setState(outcome.state);
      setFocus(target);

      if (isSolved(board, outcome.state)) {
        const message = "Circuit on! The switchboard is live.";
        setNote(message);
        speak(message);
        void submit(nextMoves);
        return;
      }

      const message = `Connected to ${outcome.state.value}. ${outcome.state.cableLeft} lengths of cable left.`;
      setNote(message);
      speak(message);

      if (isStuck(board, outcome.state)) {
        setNote("Out of options — nothing in your hand reaches a junction from here.");
      }
    },
    [board, finished, moves, speak, state, submit],
  );

  const chooseCard = useCallback(
    (slot: number) => {
      if (state.hand[slot] < 0) return;
      setCard(slot);
      if (pending) commit(slot, pending);
    },
    [commit, pending, state.hand],
  );

  const chooseCell = useCallback(
    (target: Cell) => {
      if (card !== null) {
        commit(card, target);
        return;
      }
      // Junction first is allowed too — children do this in both orders.
      setPending(target);
      setNote(`Junction ${valueAt(board, target)} chosen. Now pick a connector.`);
    },
    [board, card, commit],
  );

  const undo = useCallback(() => {
    if (moves.length === 0 || finished) return;

    // Rewind by replaying: the board is small and the rules module is pure,
    // so there's no second code path to keep in step with the first.
    const kept: CableMove[] = [...moves, { kind: "undo" }];
    let rewound = initialState(board);
    const applied: Array<Extract<CableMove, { kind: "move" }>> = [];
    for (const move of kept) {
      if (move.kind === "undo") {
        applied.pop();
        rewound = initialState(board);
        for (const done of applied) {
          const outcome = applyMove(board, rewound, done.hand, { row: done.row, col: done.col });
          if (outcome.ok) rewound = outcome.state;
        }
        continue;
      }
      const outcome = applyMove(board, rewound, move.hand, { row: move.row, col: move.col });
      if (outcome.ok) {
        rewound = outcome.state;
        applied.push(move);
      }
    }

    setMoves(kept);
    setState(rewound);
    setFocus(rewound.at);
    setCard(null);
    setPending(null);
    setNote("Lifted the last length. Cable refunded.");
  }, [board, finished, moves]);

  /* -------------------------------------------------------------- keyboard */

  useEffect(() => {
    if (finished) return;

    function onKey(event: KeyboardEvent) {
      const key = event.key;
      if (key >= "1" && key <= String(state.hand.length)) {
        chooseCard(Number(key) - 1);
        return;
      }
      if (key.toLowerCase() === "u") {
        undo();
        return;
      }
      if (key === "Escape") {
        setCard(null);
        setPending(null);
        return;
      }

      const deltas: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const delta = deltas[key];
      if (!delta) return;
      event.preventDefault();

      const next = {
        row: Math.max(0, Math.min(board.rows - 1, focus.row + delta[0])),
        col: Math.max(0, Math.min(board.cols - 1, focus.col + delta[1])),
      };
      setFocus(next);
      cellRefs.current.get(`${next.row},${next.col}`)?.focus();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [board.cols, board.rows, chooseCard, finished, focus, state.hand.length, undo]);

  /* ---------------------------------------------------------------- render */

  if (finished) {
    return (
      <ResultsScreen
        headline={result?.solved === false ? "PACKED UP" : "CIRCUIT ON!"}
        label={`Cable Run · ${state.path.length - 1} lengths`}
        result={result}
        saving={saving || !result}
        homeHref="/play/modes"
        onAgain={() => router.refresh()}
      />
    );
  }

  const selected = card === null ? null : board.deck[state.hand[card]];
  const expected = selected ? applyConnector(state.value, selected) : null;

  return (
    <Screen tone="ink">
      <ScreenBody className="gap-2.5 px-4 pt-4 pb-4">
        <header className="flex items-center justify-between">
          <a
            href="/play/modes"
            aria-label="Leave Cable Run"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </a>
          <p className="font-display text-[13px] text-white">CABLE RUN</p>
          <p className="font-sans text-[11px] font-black text-white">
            <span aria-hidden>⚡ </span>
            {state.cableLeft}
            <span className="sr-only"> lengths of cable left</span>
          </p>
        </header>

        <Spool left={state.cableLeft} total={board.cable} />

        <p className="text-center font-display text-[15px] text-yellow">
          Holding {state.value}
          {selected ? ` · ${connectorLabel(selected)} → ${expected ?? "no good"}` : ""}
        </p>

        <Grid
          board={board}
          state={state}
          cabled={cabled}
          pending={pending}
          onPick={chooseCell}
          cellRefs={cellRefs}
          reducedMotion={settings.reduced_motion}
        />

        <p aria-live="polite" className="min-h-[32px] text-center font-sans text-[11.5px] font-bold text-white/80">
          {note}
        </p>

        {stuck ? (
          <StuckPanel
            outOfCable={state.cableLeft <= 0}
            onRestart={() => {
              setState(initialState(board));
              setMoves([]);
              setCard(null);
              setPending(null);
              setFocus(board.start);
              setNote("Fresh roll of cable. Same board.");
            }}
            onFinish={() => void submit(moves)}
          />
        ) : (
          <>
            <Hand
              board={board}
              hand={state.hand}
              selected={card}
              value={state.value}
              onPick={chooseCard}
            />
            <div className="flex gap-2.5">
              <PopButton
                tone="white"
                size="sm"
                className="flex-1"
                onClick={undo}
                disabled={moves.length === 0}
              >
                ↶ UNDO
              </PopButton>
              <PopButton tone="white" size="sm" className="flex-1" onClick={() => void submit(moves)}>
                PACK UP
              </PopButton>
            </div>
          </>
        )}
      </ScreenBody>
    </Screen>
  );
}

/* ----------------------------------------------------------------- pieces */

function Spool({ left, total }: { left: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-black/30"
      role="progressbar"
      aria-valuenow={left}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${left} of ${total} lengths of cable left`}
    >
      <span
        className={cx("block h-full", left <= 2 ? "bg-red" : "bg-yellow")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Grid({
  board,
  state,
  cabled,
  pending,
  onPick,
  cellRefs,
  reducedMotion,
}: {
  board: Board;
  state: RunState;
  cabled: Set<string>;
  pending: Cell | null;
  onPick: (cell: Cell) => void;
  cellRefs: React.RefObject<Map<string, HTMLButtonElement | null>>;
  reducedMotion: boolean;
}) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))` }}
      role="group"
      aria-label="Junction grid"
    >
      {Array.from({ length: board.rows * board.cols }, (_, i) => {
        const cell = { row: Math.floor(i / board.cols), col: i % board.cols };
        const value = valueAt(board, cell);
        const here = sameCell(cell, state.at);
        const isGoal = sameCell(cell, board.goal);
        const laid = cabled.has(`${cell.row},${cell.col}`);
        const adjacent = isAdjacent(state.at, cell);
        const staged = pending ? sameCell(cell, pending) : false;

        return (
          <button
            key={i}
            type="button"
            ref={(el) => {
              cellRefs.current.set(`${cell.row},${cell.col}`, el);
            }}
            onClick={() => onPick(cell)}
            aria-label={[
              `Row ${cell.row + 1}, column ${cell.col + 1}`,
              `junction ${value}`,
              isGoal ? "switchboard" : null,
              here ? "you are here" : laid ? "cabled" : adjacent ? "next to you" : null,
            ]
              .filter(Boolean)
              .join(", ")}
            aria-pressed={staged}
            className={cx(
              "relative flex aspect-square items-center justify-center rounded-xl border-[3px] border-ink font-display text-[15px] shadow-pop-sm",
              !reducedMotion && "transition-colors",
              here
                ? "bg-yellow text-ink"
                : staged
                  ? "bg-teal text-white"
                  : laid
                    ? "bg-white/85 text-ink"
                    : adjacent
                      ? "bg-white text-ink"
                      : "bg-white/45 text-ink/70",
            )}
          >
            {value}
            {/* Glyphs, not colour: the goal and the laid cable both read
                without seeing the fill. */}
            {isGoal ? (
              <span aria-hidden className="absolute top-0.5 right-1 text-[9px]">
                ⚡
              </span>
            ) : null}
            {laid && !here ? (
              <span aria-hidden className="absolute bottom-0.5 left-1 text-[9px]">
                ═
              </span>
            ) : null}
            {here ? (
              <span aria-hidden className="absolute bottom-0.5 left-1 text-[9px]">
                ▶
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Hand({
  board,
  hand,
  selected,
  value,
  onPick,
}: {
  board: Board;
  hand: number[];
  selected: number | null;
  value: number;
  onPick: (slot: number) => void;
}) {
  return (
    <section aria-label="Connectors" className="grid grid-cols-3 gap-2">
      {hand.map((cardIndex, slot) => {
        if (cardIndex < 0) {
          return (
            <span
              key={slot}
              className="rounded-xl border-[3px] border-dashed border-white/30 py-3 text-center font-sans text-[10px] font-black text-white/40"
            >
              EMPTY
            </span>
          );
        }
        const connector = board.deck[cardIndex];
        const result = applyConnector(value, connector);
        return (
          <button
            key={slot}
            type="button"
            onClick={() => onPick(slot)}
            aria-pressed={selected === slot}
            aria-label={`Connector ${slot + 1}: ${connectorLabel(connector)}${
              result === null ? ", does not apply here" : ""
            }`}
            className={cx(
              "pop-press rounded-xl border-[3px] border-ink py-3 text-center font-display text-lg shadow-pop",
              selected === slot ? "bg-teal text-white" : "bg-white text-ink",
              result === null && "opacity-60",
            )}
          >
            {connectorLabel(connector)}
          </button>
        );
      })}
    </section>
  );
}

function StuckPanel({
  outOfCable,
  onRestart,
  onFinish,
}: {
  outOfCable: boolean;
  onRestart: () => void;
  onFinish: () => void;
}) {
  return (
    <section aria-label="Out of options" className="flex flex-col gap-2.5">
      <PopCard className="p-3 text-center shadow-pop">
        <p className="font-display text-[15px] text-ink">
          {outOfCable ? "Out of cable" : "Nowhere left to go"}
        </p>
        <p className="mt-1.5 font-sans text-[11.5px] font-bold text-mud">
          Same board, fresh roll — you know where the dead ends are now.
        </p>
      </PopCard>
      <div className="flex gap-2.5">
        <PopButton tone="red" size="md" className="flex-[1.3]" onClick={onRestart}>
          TRY AGAIN
        </PopButton>
        <PopButton tone="white" size="md" className="flex-1" onClick={onFinish}>
          PACK UP
        </PopButton>
      </div>
    </section>
  );
}
