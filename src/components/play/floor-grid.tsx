"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PopButton, PopCard, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { useA11y } from "@/components/a11y/a11y-provider";
import { ResultsScreen } from "./results";
import { finishRun, type RunResult } from "@/lib/actions/play";
import {
  area,
  blockAt,
  findGap,
  gapChoices,
  gapNeedsAnswer,
  initialState,
  isComplete,
  lift,
  place,
  rotate,
  squaresLeft,
  type Block,
  type FloorMove,
  type FloorState,
  type Room,
} from "@/lib/game/floor-plan";

/**
 * Floor Plan — docs/game-modes/05-floor-plan.md
 *
 * Tap a block, tap a square, and it drops with its top-left corner there.
 * Tap-to-place, never drag (WCAG 2.2 SC 2.5.7), consistent with Measure Up.
 * The rules live in `lib/game/floor-plan`; the server replays the moves.
 */
export function FloorGrid({
  studentId,
  room,
  divisionUnlocked,
}: {
  studentId: string;
  room: Room;
  divisionUnlocked: number[];
}) {
  const router = useRouter();
  const { speak, settings } = useA11y();

  const [state, setState] = useState<FloorState>(() => initialState(room));
  const [moves, setMoves] = useState<FloorMove[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [rotated, setRotated] = useState(false);
  const [ghost, setGhost] = useState<{ row: number; col: number } | null>(null);
  const [note, setNote] = useState("Pick a block, then tap where its top-left corner goes.");
  const [result, setResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const left = squaresLeft(state);
  const gap = useMemo(() => findGap(room, state), [room, state]);
  const needsGapAnswer = gap !== null && left > 0 && gapNeedsAnswer(room, state, gap);

  const activeBlock: Block | null =
    selected === null ? null : rotated ? rotate(blockAt(room, state, selected)) : blockAt(room, state, selected);

  /* -------------------------------------------------------------- finishing */

  const submit = useCallback(
    async (finalMoves: FloorMove[]) => {
      setFinished(true);
      setSaving(true);
      try {
        const res = await finishRun({
          studentId,
          mode: "floorplan",
          table: null,
          operation: divisionUnlocked.length > 0 ? "both" : "multiply",
          floor: { seed: room.seed, difficulty: room.difficulty, moves: finalMoves },
          answers: [],
        });
        setResult(res);
      } finally {
        setSaving(false);
      }
    },
    [divisionUnlocked.length, room.difficulty, room.seed, studentId],
  );

  /* --------------------------------------------------------------- placing */

  const tryPlace = useCallback(
    (row: number, col: number) => {
      if (selected === null || !activeBlock || finished) {
        setNote("Pick a block from the pallet first.");
        return;
      }

      const elapsedMs = Date.now() - startedAt.current;
      const move: FloorMove = {
        kind: "place",
        palletIndex: selected,
        rotated,
        row,
        col,
        elapsedMs,
      };
      const outcome = place(room, state, selected, activeBlock, row, col);
      const nextMoves = [...moves, move];
      setMoves(nextMoves);
      startedAt.current = Date.now();

      if (!outcome.ok) {
        const message =
          outcome.reason === "outside"
            ? `That's ${activeBlock.w} wide and ${activeBlock.h} high — it hangs off the edge from there.`
            : "Something's already on those squares.";
        setNote(message);
        speak(message);
        return;
      }

      setState(outcome.state);
      setSelected(null);
      setRotated(false);
      setGhost(null);

      if (isComplete(outcome.state)) {
        const message = "Floor's done — not a gap in it.";
        setNote(message);
        speak(message);
        void submit(nextMoves);
        return;
      }

      const message = `${activeBlock.w} by ${activeBlock.h} down. ${squaresLeft(outcome.state)} squares left.`;
      setNote(message);
      speak(message);
    },
    [activeBlock, finished, moves, room, rotated, selected, speak, state, submit],
  );

  const answerGap = useCallback(
    (answer: number) => {
      if (!gap) return;
      const elapsedMs = Date.now() - startedAt.current;
      const move: FloorMove = { kind: "gap", answer, elapsedMs };
      const nextMoves = [...moves, move];
      setMoves(nextMoves);
      startedAt.current = Date.now();

      if (answer !== gap.h) {
        const message = `Not quite — ${gap.w} times ${answer} is ${gap.w * answer}, and the gap is ${area(gap)} squares.`;
        setNote(message);
        speak(message);
        return;
      }

      // A correct answer wins the matching block, appended to the pallet.
      setState((current) => ({
        ...current,
        extra: [...current.extra, { w: gap.w, h: gap.h }],
        used: [...current.used, false],
      }));
      const message = `That's it — ${gap.w} by ${gap.h}. The block's on the pallet.`;
      setNote(message);
      speak(message);
    },
    [gap, moves, speak],
  );

  const liftLast = useCallback(() => {
    if (state.placements.length === 0) return;
    setMoves((m) => [...m, { kind: "lift" }]);
    setState((current) => lift(current, room));
    setNote("Lifted the last block.");
  }, [room, state.placements.length]);

  /* -------------------------------------------------------------- keyboard */

  useEffect(() => {
    if (finished) return;
    function onKey(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key === "r") setRotated((r) => !r);
      else if (key === "l") liftLast();
      else if (event.key === "Escape") {
        setSelected(null);
        setRotated(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, liftLast]);

  /* ---------------------------------------------------------------- render */

  if (finished) {
    return (
      <ResultsScreen
        headline={result?.solved ? "FLOOR'S DONE!" : "PACKED UP"}
        label={`Floor Plan · ${room.w} × ${room.h}`}
        result={result}
        saving={saving || !result}
        homeHref="/play/modes"
        onAgain={() => router.refresh()}
      />
    );
  }

  const available = Array.from(
    { length: room.pallet.length + state.extra.length },
    (_, i) => i,
  ).filter((i) => !state.used[i]);

  return (
    <Screen tone="ink">
      <ScreenBody className="gap-2.5 px-4 pt-4 pb-4">
        <header className="flex items-center justify-between">
          <a
            href="/play/modes"
            aria-label="Leave Floor Plan"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </a>
          <p className="font-display text-[13px] text-white">
            ROOM {room.w} × {room.h} = {room.w * room.h}
          </p>
          <p className="font-sans text-[11px] font-black text-yellow" aria-live="polite">
            {left}
            <span className="sr-only"> squares left</span>
            <span aria-hidden> left</span>
          </p>
        </header>

        <Grid
          room={room}
          state={state}
          ghost={ghost}
          block={activeBlock}
          onPick={tryPlace}
          onHover={setGhost}
          reducedMotion={settings.reduced_motion}
        />

        <p aria-live="polite" className="min-h-[32px] text-center font-sans text-[11.5px] font-bold text-white/80">
          {note}
        </p>

        {needsGapAnswer && gap ? (
          <GapQuestion
            gap={gap}
            seed={room.seed}
            divisionUnlocked={divisionUnlocked.includes(gap.w)}
            onAnswer={answerGap}
          />
        ) : (
          <>
            <section aria-label="Pallet" className="flex gap-2 overflow-x-auto pb-1">
              {available.map((index) => {
                const block = blockAt(room, state, index);
                const shown = selected === index && rotated ? rotate(block) : block;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSelected(index);
                      setRotated(false);
                    }}
                    aria-pressed={selected === index}
                    aria-label={`${shown.w} by ${shown.h} block, ${area(shown)} squares`}
                    className={cx(
                      "pop-press shrink-0 rounded-xl border-[3px] border-ink px-3 py-2 text-center shadow-pop",
                      selected === index ? "bg-teal text-white" : "bg-white text-ink",
                    )}
                  >
                    <span className="block font-display text-[15px]">
                      {shown.w}×{shown.h}
                    </span>
                    <span className="block font-sans text-[9.5px] font-black opacity-70">
                      = {area(shown)}
                    </span>
                  </button>
                );
              })}
            </section>

            <div className="flex gap-2.5">
              <PopButton
                tone="white"
                size="sm"
                className="flex-1"
                disabled={selected === null}
                onClick={() => setRotated((r) => !r)}
              >
                ⟲ ROTATE
              </PopButton>
              <PopButton
                tone="white"
                size="sm"
                className="flex-1"
                disabled={state.placements.length === 0}
                onClick={liftLast}
              >
                ↶ LIFT
              </PopButton>
              <PopButton
                tone="red"
                size="sm"
                className="flex-1"
                onClick={() => void submit(moves)}
              >
                PACK UP
              </PopButton>
            </div>

            {activeBlock ? (
              <p className="text-center font-sans text-[10.5px] font-bold text-white/60">
                {activeBlock.w} × {activeBlock.h} = {area(activeBlock)} — same either way round
              </p>
            ) : null}
          </>
        )}
      </ScreenBody>
    </Screen>
  );
}

/* ----------------------------------------------------------------- pieces */

function Grid({
  room,
  state,
  ghost,
  block,
  onPick,
  onHover,
  reducedMotion,
}: {
  room: Room;
  state: FloorState;
  ghost: { row: number; col: number } | null;
  block: Block | null;
  onPick: (row: number, col: number) => void;
  onHover: (cell: { row: number; col: number } | null) => void;
  reducedMotion: boolean;
}) {
  const inGhost = (row: number, col: number) => {
    if (!ghost || !block) return false;
    return (
      row >= ghost.row && row < ghost.row + block.h && col >= ghost.col && col < ghost.col + block.w
    );
  };

  return (
    <div
      className="mx-auto grid w-full gap-[3px] rounded-xl border-[3px] border-ink bg-black/25 p-1.5"
      style={{ gridTemplateColumns: `repeat(${room.w}, minmax(0, 1fr))` }}
      role="group"
      aria-label={`Room floor, ${room.w} by ${room.h}`}
      onMouseLeave={() => onHover(null)}
    >
      {Array.from({ length: room.w * room.h }, (_, i) => {
        const row = Math.floor(i / room.w);
        const col = i % room.w;
        const covered = state.cover[i] !== -1;
        const preview = inGhost(row, col);
        const fits =
          ghost && block
            ? ghost.row + block.h <= room.h && ghost.col + block.w <= room.w
            : true;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onPick(row, col)}
            onMouseEnter={() => onHover({ row, col })}
            onFocus={() => onHover({ row, col })}
            aria-label={`Row ${row + 1}, column ${col + 1}, ${covered ? "covered" : "bare"}`}
            className={cx(
              "aspect-square rounded-[3px] border-2 border-ink/70 text-[8px] font-black",
              !reducedMotion && "transition-colors",
              covered
                ? "bg-orange text-ink"
                : preview
                  ? fits
                    ? "bg-teal text-white"
                    : "bg-red/70 text-white"
                  : "bg-white/25 text-white/50",
            )}
          >
            {/* Pattern as well as fill: covered squares carry a glyph so the
                floor reads without relying on colour. */}
            <span aria-hidden>{covered ? "▨" : preview ? "▧" : "·"}</span>
          </button>
        );
      })}
    </div>
  );
}

function GapQuestion({
  gap,
  seed,
  divisionUnlocked,
  onAnswer,
}: {
  gap: { w: number; h: number };
  seed: string;
  divisionUnlocked: boolean;
  onAnswer: (answer: number) => void;
}) {
  const choices = gapChoices({ row: 0, col: 0, ...gap }, seed);

  return (
    <PopCard className="p-3.5 text-center shadow-pop">
      <p className="font-display text-[15px] text-ink">
        One gap left: {gap.w} wide, ? high
      </p>
      <p className="mt-1 font-sans text-[12px] font-bold text-mud">
        {divisionUnlocked
          ? `It's ${gap.w * gap.h} squares. ${gap.w * gap.h} ÷ ${gap.w} = ?`
          : `It's ${gap.w * gap.h} squares. ${gap.w} times what makes ${gap.w * gap.h}?`}
      </p>

      <div className="mt-3 flex justify-center gap-2.5">
        {choices.map((choice) => (
          <PopButton key={choice} tone="white" size="md" onClick={() => onAnswer(choice)}>
            {choice}
          </PopButton>
        ))}
      </div>
    </PopCard>
  );
}
