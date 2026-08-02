// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/floor-plan.ts
// Regenerate with: npm run edge:sync
/**
 * Floor Plan — docs/game-modes/05-floor-plan.md
 *
 * An area-model tiling puzzle. The room is a product, every tile block is a
 * rectangle whose area is a fact, and the last gap is a division question with
 * the answer sitting on the floor in front of you.
 *
 * Pure and seeded, and replayed server-side like the other puzzle modes.
 */

import { applyDailyCap } from "./economy.ts";
import { makeRng } from "./questions.ts";
import { puzzleTables } from "./zones.ts";

/* ------------------------------------------------------------------ types */

export type Block = { w: number; h: number };
export type Placement = Block & { row: number; col: number };
export type Difficulty = "easy" | "standard" | "hard";

export type Room = {
  seed: string;
  difficulty: Difficulty;
  w: number;
  h: number;
  /** Every block available, solution pieces and decoys shuffled together. */
  pallet: Block[];
};

const SHAPES: Record<
  Difficulty,
  { maxArea: number; pieces: [number, number]; decoys: number; materials: number }
> = {
  easy: { maxArea: 36, pieces: [4, 6], decoys: 2, materials: 4 },
  standard: { maxArea: 72, pieces: [6, 9], decoys: 3, materials: 6 },
  hard: { maxArea: 144, pieces: [9, 12], decoys: 4, materials: 8 },
};

/** No side longer than the times-table grid can express. */
export const MAX_SIDE = 12;
/** Pieces smaller than this are fiddly; larger than this are barely a puzzle. */
export const MIN_PIECE_AREA = 4;
export const MAX_PIECE_AREA = 30;

export const COINS_COMPLETE = 70;
export const COINS_PERFECT_FIT = 25;
export const COINS_GAP_QUESTION = 10;

/* -------------------------------------------------------------- geometry */

export function area(block: Block): number {
  return block.w * block.h;
}

export function rotate(block: Block): Block {
  return { w: block.h, h: block.w };
}

export function sameBlock(a: Block, b: Block): boolean {
  return (a.w === b.w && a.h === b.h) || (a.w === b.h && a.h === b.w);
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function shuffle<T>(rng: () => number, list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ------------------------------------------------------------- generation */

type Rect = { row: number; col: number; w: number; h: number };

/**
 * Guillotine-split the room into rectangles: cut straight across, recurse on
 * both halves. Every piece stays a rectangle, which is what keeps every piece
 * a multiplication fact — an L-shaped tile would be a nice-looking puzzle
 * piece and a worse teaching object.
 */
function guillotine(rng: () => number, rect: Rect, target: number, out: Rect[]): void {
  const canSplit =
    area(rect) >= MIN_PIECE_AREA * 2 && (rect.w > 1 || rect.h > 1);
  const mustSplit = area(rect) > MAX_PIECE_AREA || rect.w > MAX_SIDE || rect.h > MAX_SIDE;

  if (!canSplit || (!mustSplit && out.length + 1 >= target)) {
    out.push(rect);
    return;
  }

  // Split along the longer side where possible, so pieces stay chunky.
  const vertical = rect.w === 1 ? false : rect.h === 1 ? true : rng() < rect.w / (rect.w + rect.h);

  if (vertical) {
    const cuts = [];
    for (let c = 1; c < rect.w; c++) {
      if (c * rect.h >= MIN_PIECE_AREA && (rect.w - c) * rect.h >= MIN_PIECE_AREA) cuts.push(c);
    }
    if (cuts.length === 0) {
      out.push(rect);
      return;
    }
    const cut = pick(rng, cuts);
    guillotine(rng, { ...rect, w: cut }, target, out);
    guillotine(rng, { row: rect.row, col: rect.col + cut, w: rect.w - cut, h: rect.h }, target, out);
    return;
  }

  const cuts = [];
  for (let r = 1; r < rect.h; r++) {
    if (r * rect.w >= MIN_PIECE_AREA && (rect.h - r) * rect.w >= MIN_PIECE_AREA) cuts.push(r);
  }
  if (cuts.length === 0) {
    out.push(rect);
    return;
  }
  const cut = pick(rng, cuts);
  guillotine(rng, { ...rect, h: cut }, target, out);
  guillotine(rng, { row: rect.row + cut, col: rect.col, w: rect.w, h: rect.h - cut }, target, out);
}

export type GenerateOptions = {
  seed: string;
  tables: number[];
  difficulty: Difficulty;
};

/**
 * Generate a room together with the tiling it was built from (tests, scoring)
 * and the one piece deliberately missing from the pallet.
 *
 * That withheld piece is the whole point of the mode. If the pallet held
 * exactly the right blocks, the last gap would always have its tile and the
 * gap question — the division beat this mode exists to produce — would
 * essentially never fire. So one block is held back, and the only way to get
 * it is to work out its missing side.
 */
export function generateRoomWithSolution(
  opts: GenerateOptions,
): { room: Room; solution: Placement[]; withheld: Placement } | null {
  const rng = makeRng(opts.seed);
  const shape = SHAPES[opts.difficulty];
  const tables = puzzleTables(opts.tables, MAX_SIDE);
  if (tables.length === 0) return null;

  for (let attempt = 0; attempt < 60; attempt++) {
    const w = pick(rng, tables);
    const h = pick(rng, tables);
    if (w * h > shape.maxArea) continue;
    if (w * h < MIN_PIECE_AREA * shape.pieces[0]) continue;

    const target = shape.pieces[0] + Math.floor(rng() * (shape.pieces[1] - shape.pieces[0] + 1));
    const pieces: Rect[] = [];
    guillotine(rng, { row: 0, col: 0, w, h }, target, pieces);

    if (pieces.length < shape.pieces[0]) continue;
    if (pieces.some((p) => p.w > MAX_SIDE || p.h > MAX_SIDE)) continue;

    const solution: Placement[] = pieces.map((p) => ({ w: p.w, h: p.h, row: p.row, col: p.col }));

    // Hold back a piece whose shape appears exactly once — otherwise an
    // identical block is still on the pallet and the gap question never fires.
    const unique = solution.filter(
      (p) => solution.filter((q) => sameBlock(p, q)).length === 1 && area(p) <= MAX_PIECE_AREA,
    );
    // A tiling where every shape is duplicated has no block worth holding
    // back — a spare of the same size would cover the gap and the question
    // would never fire. Re-roll rather than ship a room without its beat.
    if (unique.length === 0) continue;
    const withheld = pick(rng, unique);

    // Scramble orientation so rotation is required on roughly half the blocks —
    // otherwise children never discover the button, and the commutativity
    // lesson the rotate is there to teach never lands.
    const blocks = solution
      .filter((p) => p !== withheld)
      .map((p) => (rng() < 0.5 ? { w: p.h, h: p.w } : { w: p.w, h: p.h }));

    const decoys = buildDecoys(rng, solution, shape.decoys, w, h, withheld);

    return {
      room: {
        seed: opts.seed,
        difficulty: opts.difficulty,
        w,
        h,
        pallet: shuffle(rng, [...blocks, ...decoys]),
      },
      solution,
      withheld,
    };
  }

  return null;
}

export function generateRoom(opts: GenerateOptions): Room | null {
  return generateRoomWithSolution(opts)?.room ?? null;
}

/**
 * Near-miss rectangles: the same area with the wrong dimensions, or an area
 * one off. They're the reason a child has to read the dimensions rather than
 * matching areas by eye.
 */
function buildDecoys(
  rng: () => number,
  solution: Placement[],
  count: number,
  roomW: number,
  roomH: number,
  /** Never hand back the block the gap question is supposed to be asking for. */
  withheld: Placement,
): Block[] {
  const decoys: Block[] = [];

  for (let i = 0; i < count * 8 && decoys.length < count; i++) {
    const base = pick(rng, solution);
    const wanted = rng() < 0.5 ? area(base) : area(base) + (rng() < 0.5 ? 1 : -1);

    const factors: Block[] = [];
    for (let w = 1; w <= MAX_SIDE; w++) {
      if (wanted % w !== 0) continue;
      const h = wanted / w;
      if (h >= 1 && h <= MAX_SIDE && w <= roomW && h <= roomH) factors.push({ w, h });
    }

    const candidate = factors.find(
      (f) =>
        !sameBlock(f, base) &&
        area(f) >= MIN_PIECE_AREA &&
        !(withheld && sameBlock(f, withheld)),
    );
    if (candidate && !decoys.some((d) => sameBlock(d, candidate))) decoys.push(candidate);
  }

  return decoys;
}

/* ------------------------------------------------------------------ state */

export type FloorState = {
  /** Row-major; -1 for bare, otherwise the pallet index covering the square. */
  cover: number[];
  used: boolean[];
  placements: Array<Placement & { palletIndex: number }>;
  /** Blocks won by answering a gap question, appended to the pallet. */
  extra: Block[];
};

export function initialState(room: Room): FloorState {
  return {
    cover: new Array(room.w * room.h).fill(-1),
    used: new Array(room.pallet.length).fill(false),
    placements: [],
    extra: [],
  };
}

export function blockAt(room: Room, state: FloorState, index: number): Block {
  return index < room.pallet.length
    ? room.pallet[index]
    : state.extra[index - room.pallet.length];
}

export function squaresLeft(state: FloorState): number {
  return state.cover.filter((c) => c === -1).length;
}

export type PlaceResult =
  | { ok: true; state: FloorState }
  | { ok: false; reason: "used" | "outside" | "overlap" };

/** Place a block with its top-left corner at (row, col). */
export function place(
  room: Room,
  state: FloorState,
  palletIndex: number,
  block: Block,
  row: number,
  col: number,
): PlaceResult {
  if (state.used[palletIndex]) return { ok: false, reason: "used" };
  if (row < 0 || col < 0 || row + block.h > room.h || col + block.w > room.w) {
    return { ok: false, reason: "outside" };
  }

  for (let r = row; r < row + block.h; r++) {
    for (let c = col; c < col + block.w; c++) {
      if (state.cover[r * room.w + c] !== -1) return { ok: false, reason: "overlap" };
    }
  }

  const cover = [...state.cover];
  for (let r = row; r < row + block.h; r++) {
    for (let c = col; c < col + block.w; c++) cover[r * room.w + c] = palletIndex;
  }

  const used = [...state.used];
  used[palletIndex] = true;

  return {
    ok: true,
    state: {
      ...state,
      cover,
      used,
      placements: [...state.placements, { ...block, row, col, palletIndex }],
    },
  };
}

/** Undo the most recent placement. Unlimited: this is a thinking mode. */
export function lift(state: FloorState, room: Room): FloorState {
  const last = state.placements[state.placements.length - 1];
  if (!last) return state;

  const cover = [...state.cover];
  for (let r = last.row; r < last.row + last.h; r++) {
    for (let c = last.col; c < last.col + last.w; c++) cover[r * room.w + c] = -1;
  }

  const used = [...state.used];
  used[last.palletIndex] = false;

  return { ...state, cover, used, placements: state.placements.slice(0, -1) };
}

export function isComplete(state: FloorState): boolean {
  return squaresLeft(state) === 0;
}

/* -------------------------------------------------------------------- gap */

export type Gap = { row: number; col: number; w: number; h: number };

/**
 * The single remaining rectangular gap, if that's what's left.
 *
 * This is the mode's teaching beat: when one rectangle is bare and nothing on
 * the pallet fits it, the game asks for the missing side rather than stalling.
 */
export function findGap(room: Room, state: FloorState): Gap | null {
  const bare: number[] = [];
  state.cover.forEach((c, i) => {
    if (c === -1) bare.push(i);
  });
  if (bare.length === 0) return null;

  const rows = bare.map((i) => Math.floor(i / room.w));
  const cols = bare.map((i) => i % room.w);
  const top = Math.min(...rows);
  const bottom = Math.max(...rows);
  const left = Math.min(...cols);
  const right = Math.max(...cols);

  // The bounding box is only the gap if it is exactly the bare squares.
  const boxArea = (bottom - top + 1) * (right - left + 1);
  if (boxArea !== bare.length) return null;

  return { row: top, col: left, w: right - left + 1, h: bottom - top + 1 };
}

/**
 * True when nothing left on the pallet can cover the gap.
 *
 * Guarded so the question can't fire on an untouched room: the whole floor is
 * technically one rectangle, and asking for its missing side before a single
 * block is down would be nonsense.
 */
export function gapNeedsAnswer(room: Room, state: FloorState, gap: Gap): boolean {
  if (state.placements.length === 0) return false;
  if (area({ w: gap.w, h: gap.h }) > MAX_PIECE_AREA) return false;

  for (let i = 0; i < room.pallet.length + state.extra.length; i++) {
    if (state.used[i]) continue;
    const block = blockAt(room, state, i);
    if (sameBlock(block, { w: gap.w, h: gap.h })) return false;
  }
  return true;
}

/** Plausible wrong answers for the gap question, alongside the right one. */
export function gapChoices(gap: Gap, seed: string): number[] {
  const rng = makeRng(`${seed}:gap:${gap.w}x${gap.h}`);
  const options = new Set<number>([gap.h]);
  let step = 1;
  while (options.size < 3) {
    if (gap.h + step <= MAX_SIDE) options.add(gap.h + step);
    if (gap.h - step >= 1) options.add(gap.h - step);
    step++;
  }
  return shuffle(rng, [...options]).slice(0, 3).sort((a, b) => a - b);
}

/* ----------------------------------------------------------------- replay */

export type FloorMove =
  | { kind: "place"; palletIndex: number; rotated: boolean; row: number; col: number; elapsedMs: number }
  | { kind: "lift" }
  | { kind: "gap"; answer: number; elapsedMs: number };

export type FloorAnswer = {
  a: number;
  b: number;
  operation: "multiply" | "divide";
  correct: boolean;
  elapsedMs: number;
};

export type FloorOutcome = {
  completed: boolean;
  squaresLeft: number;
  illegalPlacements: number;
  gapsAnswered: number;
  coins: number;
  uncappedCoins: number;
  capped: boolean;
  materials: number;
  answers: FloorAnswer[];
};

/**
 * Replay a session against a freshly generated room.
 *
 * Placements record as multiplication attempts, but with `countsForSpeed`
 * false at the mastery layer they can lift a fact off Bronze without ever
 * certifying fluency — placing a block correctly is weaker evidence than
 * recalling the fact, and the grid shouldn't pretend otherwise. Gap questions
 * are the real answers this mode is built to produce.
 */
export function replayFloorPlan(
  opts: GenerateOptions & {
    divisionUnlocked: number[];
    moves: FloorMove[];
    coinsToday?: number;
  },
): FloorOutcome | null {
  const room = generateRoom(opts);
  if (!room) return null;

  let state = initialState(room);
  const answers: FloorAnswer[] = [];
  let illegalPlacements = 0;
  let gapsAnswered = 0;

  for (const move of opts.moves) {
    if (move.kind === "lift") {
      state = lift(state, room);
      continue;
    }

    if (move.kind === "gap") {
      const gap = findGap(room, state);
      if (!gap || !gapNeedsAnswer(room, state, gap)) continue;

      const correct = move.answer === gap.h;
      answers.push({
        a: gap.w,
        b: gap.h,
        // Phrased as division only where the student has earned it; otherwise
        // it's "7 times what makes 21?", which is the same reasoning.
        operation: opts.divisionUnlocked.includes(gap.w) ? "divide" : "multiply",
        correct,
        elapsedMs: move.elapsedMs,
      });

      if (correct) {
        gapsAnswered++;
        state = { ...state, extra: [...state.extra, { w: gap.w, h: gap.h }] };
        state = { ...state, used: [...state.used, false] };
      }
      continue;
    }

    const index = move.palletIndex;
    if (index < 0 || index >= room.pallet.length + state.extra.length) continue;

    const stored = blockAt(room, state, index);
    const block = move.rotated ? rotate(stored) : stored;
    const result = place(room, state, index, block, move.row, move.col);

    answers.push({
      a: block.w,
      b: block.h,
      operation: "multiply",
      correct: result.ok,
      elapsedMs: move.elapsedMs,
    });

    if (result.ok) state = result.state;
    else illegalPlacements++;
  }

  const completed = isComplete(state);
  const uncapped = completed
    ? COINS_COMPLETE +
      (illegalPlacements === 0 ? COINS_PERFECT_FIT : 0) +
      gapsAnswered * COINS_GAP_QUESTION
    : 0;

  const earned = applyDailyCap(uncapped, opts.coinsToday ?? 0);

  return {
    completed,
    squaresLeft: squaresLeft(state),
    illegalPlacements,
    gapsAnswered,
    ...earned,
    materials: completed ? SHAPES[opts.difficulty].materials : 0,
    answers,
  };
}

/** Room size is chosen from how far through the curriculum the student is. */
export function difficultyFor(unlockedTables: number): Difficulty {
  if (unlockedTables < 4) return "easy";
  if (unlockedTables < 8) return "standard";
  return "hard";
}
