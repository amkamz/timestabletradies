/**
 * Cable Run — docs/game-modes/01-cable-run.md
 *
 * A grid-routing puzzle. The player stands on a junction holding a value, and
 * a connector card (`×7`, `÷6`) decides which adjacent junction they may step
 * to. Untimed, undoable, and bounded by a roll of cable rather than a clock.
 *
 * Pure and seeded: a board is reproducible from its seed, and a whole session
 * replays from `(seed, difficulty, moves[])`. That replay is what lets the
 * server pay the run out without trusting anything the client says about it.
 */

import { applyDailyCap } from "./economy";
import { makeRng } from "./questions";
import { puzzleTables } from "./zones";

/* ------------------------------------------------------------------ types */

export type Cell = { row: number; col: number };
export type Connector = { op: "multiply" | "divide"; n: number };

export type Board = {
  seed: string;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  /** Row-major, `rows * cols` long. */
  values: number[];
  start: Cell;
  goal: Cell;
  deck: Connector[];
  /** Move budget. */
  cable: number;
  /** Length of the generated solution — the efficiency target. */
  parLength: number;
};

export type Difficulty = "easy" | "standard" | "hard";

const SHAPES: Record<
  Difficulty,
  { rows: number; cols: number; pathLength: number; slack: number; materials: number }
> = {
  easy: { rows: 4, cols: 4, pathLength: 6, slack: 3, materials: 4 },
  standard: { rows: 5, cols: 5, pathLength: 8, slack: 2, materials: 6 },
  hard: { rows: 5, cols: 6, pathLength: 10, slack: 2, materials: 8 },
};

/**
 * No junction may exceed 12 × 12, and no move may involve a factor above 12 —
 * `fact_mastery` stores facts as (a ≤ 99, b ≤ 12), so a step the grid can't
 * express as a times-table fact is a step this mode isn't allowed to make.
 */
export const MAX_VALUE = 144;
export const MAX_FACTOR = 12;

/** The size of the hand drawn off the deck. */
export const HAND_SIZE = 3;

/* -------------------------------------------------------------- geometry */

export function indexOf(board: { cols: number }, cell: Cell): number {
  return cell.row * board.cols + cell.col;
}

export function valueAt(board: Board, cell: Cell): number {
  return board.values[indexOf(board, cell)];
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function neighbours(cell: Cell, rows: number, cols: number): Cell[] {
  const out: Cell[] = [];
  if (cell.row > 0) out.push({ row: cell.row - 1, col: cell.col });
  if (cell.row < rows - 1) out.push({ row: cell.row + 1, col: cell.col });
  if (cell.col > 0) out.push({ row: cell.row, col: cell.col - 1 });
  if (cell.col < cols - 1) out.push({ row: cell.row, col: cell.col + 1 });
  return out;
}

function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/* ------------------------------------------------------------- connectors */

/**
 * The value a connector produces, or null when it doesn't apply.
 *
 * Multiplying needs an operand of 12 or less and a product the grid can hold;
 * dividing has to come out exact and land back at 12 or less. Both rules exist
 * so every move is a fact the mastery grid can actually record.
 */
export function applyConnector(value: number, connector: Connector): number | null {
  if (connector.op === "multiply") {
    if (value > MAX_FACTOR || connector.n > MAX_FACTOR) return null;
    const product = value * connector.n;
    return product <= MAX_VALUE ? product : null;
  }
  if (value % connector.n !== 0) return null;
  const quotient = value / connector.n;
  return quotient >= 1 && quotient <= MAX_FACTOR ? quotient : null;
}

/** The mastery fact a move exercises: the connector is the table. */
export function factFor(
  value: number,
  connector: Connector,
): { a: number; b: number; operation: "multiply" | "divide" } {
  const result = applyConnector(value, connector);
  return connector.op === "multiply"
    ? { a: connector.n, b: value, operation: "multiply" }
    : { a: connector.n, b: result ?? 1, operation: "divide" };
}

export function connectorLabel(connector: Connector): string {
  return `${connector.op === "multiply" ? "×" : "÷"}${connector.n}`;
}

/* ------------------------------------------------------------- generation */

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

/**
 * A self-avoiding walk of exactly `length` steps from start to goal.
 *
 * Grids here are at most 30 cells, so a depth-first search with a parity prune
 * is instant — and generating the solution before the board is what guarantees
 * every board is solvable without needing a solver at runtime.
 */
function findPath(
  rng: () => number,
  rows: number,
  cols: number,
  start: Cell,
  goal: Cell,
  length: number,
): Cell[] | null {
  const seen = new Set<number>();
  const path: Cell[] = [];

  function walk(cell: Cell): boolean {
    path.push(cell);
    seen.add(cell.row * cols + cell.col);

    if (path.length === length + 1) {
      if (sameCell(cell, goal)) return true;
    } else {
      // Prune: the remaining steps have to cover the distance left, and to
      // have the same parity as it — otherwise this branch can never land.
      const remaining = length + 1 - path.length;
      const distance = manhattan(cell, goal);
      if (distance <= remaining && (remaining - distance) % 2 === 0) {
        for (const next of shuffle(rng, neighbours(cell, rows, cols))) {
          if (!seen.has(next.row * cols + next.col) && walk(next)) return true;
        }
      }
    }

    path.pop();
    seen.delete(cell.row * cols + cell.col);
    return false;
  }

  return walk(start) ? [...path] : null;
}

/** Every connector that applies to a value, given what the student has unlocked. */
function optionsFrom(
  value: number,
  tables: number[],
  divisionUnlocked: number[],
): { multiplies: Connector[]; divides: Connector[] } {
  return {
    multiplies: tables
      .map((t) => ({ op: "multiply" as const, n: t }))
      .filter((c) => applyConnector(value, c) !== null),
    divides: divisionUnlocked
      .filter((t) => t > 1)
      .map((t) => ({ op: "divide" as const, n: t }))
      .filter((c) => applyConnector(value, c) !== null),
  };
}

/**
 * Walk the solution, choosing a connector for each step.
 *
 * Each choice looks one step ahead, because plenty of legal moves land on a
 * value with nowhere to go: `6 ×8` is fine arithmetic, but if division is only
 * unlocked for 2, 5 and 10 then 48 is a dead end — nothing divides it back
 * inside the factor range. Filtering those out up front is what keeps
 * generation from failing on long paths.
 */
function assignValues(
  rng: () => number,
  steps: number,
  tables: number[],
  divisionUnlocked: number[],
): { values: number[]; cards: Connector[] } | null {
  const values = [pick(rng, tables)];
  const cards: Connector[] = [];

  for (let i = 0; i < steps; i++) {
    const current = values[i];
    const { multiplies, divides } = optionsFrom(current, tables, divisionUnlocked);

    const survives = (card: Connector) => {
      if (i === steps - 1) return true;
      const next = applyConnector(current, card);
      if (next === null) return false;
      const onward = optionsFrom(next, tables, divisionUnlocked);
      return onward.multiplies.length + onward.divides.length > 0;
    };

    // Lean on division roughly every third step: it's what stops the route
    // being a runaway escalation, and it's the half of the fact family the
    // rest of the app only ever asks forwards.
    const liveMultiplies = multiplies.filter(survives);
    const liveDivides = divides.filter(survives);
    const preferDivide = liveDivides.length > 0 && (i % 3 === 2 || current > MAX_FACTOR);
    const pool = preferDivide
      ? liveDivides
      : liveMultiplies.length > 0
        ? liveMultiplies
        : liveDivides;
    if (pool.length === 0) return null;

    const card = pick(rng, pool);
    const next = applyConnector(current, card);
    if (next === null) return null;

    cards.push(card);
    values.push(next);
  }

  return { values, cards };
}

/**
 * From every point on the route, the correct card must lead to exactly one
 * junction the player hasn't already cabled.
 *
 * The junction they just came from is deliberately exempt. Routes oscillate —
 * `8 ×2 → 16 ÷2 → 8` is ordinary, and with a small unlocked set it's close to
 * unavoidable — so the previous junction often carries the same value as the
 * next one. That isn't a trap: the cable is drawn on the board, so stepping
 * back is a visibly wasteful choice rather than a hidden wrong answer. Any
 * *other* junction on the route matching would be genuinely ambiguous.
 */
function pathIsUnambiguous(
  size: { rows: number; cols: number },
  path: Cell[],
  assigned: { values: number[]; cards: Connector[] },
): boolean {
  const valueOf = new Map<number, number>();
  path.forEach((cell, i) => valueOf.set(cell.row * size.cols + cell.col, assigned.values[i]));

  for (let i = 0; i < assigned.cards.length; i++) {
    const target = assigned.values[i + 1];
    for (const n of neighbours(path[i], size.rows, size.cols)) {
      if (sameCell(n, path[i + 1])) continue;
      if (i > 0 && sameCell(n, path[i - 1])) continue;
      const index = n.row * size.cols + n.col;
      if (valueOf.has(index) && valueOf.get(index) === target) return false;
    }
  }
  return true;
}

/**
 * Interleave spare cards without ever pushing the next needed card out of the
 * hand. With a hand of `HAND_SIZE`, the k-th solution card has to sit within
 * the first `HAND_SIZE` unused cards, which caps interior spares at
 * `HAND_SIZE - 1`.
 */
function buildDeck(rng: () => number, solution: Connector[], spares: Connector[]): Connector[] {
  const interior = spares.slice(0, HAND_SIZE - 1);
  const rest = spares.slice(HAND_SIZE - 1);

  const deck: Connector[] = [];
  let inserted = 0;
  for (let i = 0; i < solution.length; i++) {
    // Position of this solution card among the unused cards is `i + inserted`.
    if (inserted < interior.length && i > 0 && i + inserted + 1 < HAND_SIZE + i && rng() < 0.5) {
      deck.push(interior[inserted]);
      inserted++;
    }
    deck.push(solution[i]);
  }
  deck.push(...interior.slice(inserted), ...rest);
  return deck;
}

function spareConnectors(
  rng: () => number,
  count: number,
  tables: number[],
  divisionUnlocked: number[],
): Connector[] {
  const pool: Connector[] = [
    ...tables.filter((t) => t <= MAX_FACTOR).map((t) => ({ op: "multiply" as const, n: t })),
    ...divisionUnlocked.filter((t) => t > 1).map((t) => ({ op: "divide" as const, n: t })),
  ];
  return Array.from({ length: count }, () => pick(rng, pool));
}

export type GenerateOptions = {
  seed: string;
  tables: number[];
  divisionUnlocked: number[];
  difficulty: Difficulty;
};

/**
 * Cable Run needs at least one table whose division has been unlocked.
 *
 * Without one the route can only escalate, and a second multiplication from a
 * product would need a factor above 12 — a step the mastery grid can't record.
 * The mode is gated on this rather than degrading into something dishonest.
 */
export function canPlayCableRun(unlock: { tables: number[]; divisionUnlocked: number[] }): boolean {
  // Counted the same way `generateBoard` filters, or the two disagree: a child
  // holding {1, 2} would pass "two tables" and then meet a generator that can
  // only see {2}.
  return (
    puzzleTables(unlock.tables, MAX_FACTOR).length >= 2 &&
    puzzleTables(unlock.divisionUnlocked, MAX_FACTOR).length >= 1
  );
}

export function generateBoard(opts: GenerateOptions): Board | null {
  const rng = makeRng(opts.seed);
  const shape = SHAPES[opts.difficulty];
  const { rows, cols } = shape;

  const tables = puzzleTables(opts.tables, MAX_FACTOR);
  const divisionUnlocked = puzzleTables(opts.divisionUnlocked, MAX_FACTOR);
  if (tables.length === 0 || divisionUnlocked.length === 0) return null;

  for (let attempt = 0; attempt < 200; attempt++) {
    const start: Cell = { row: rows - 1, col: Math.floor(rng() * cols) };
    const goal: Cell = { row: 0, col: Math.floor(rng() * cols) };

    const distance = manhattan(start, goal);
    if (distance < rows) continue;
    if (distance > shape.pathLength) continue;
    if ((shape.pathLength - distance) % 2 !== 0) continue;

    const path = findPath(rng, rows, cols, start, goal, shape.pathLength);
    if (!path) continue;

    // A found path is worth several goes at valuing it: with a small unlocked
    // set the value space is tiny, so two junctions on the route landing on
    // the same number is common — and that's a clash to re-roll, not a reason
    // to throw away a perfectly good path.
    let assigned: ReturnType<typeof assignValues> = null;
    for (let valueAttempt = 0; valueAttempt < 24 && !assigned; valueAttempt++) {
      const candidate = assignValues(rng, shape.pathLength, tables, divisionUnlocked);
      if (candidate && pathIsUnambiguous({ rows, cols }, path, candidate)) assigned = candidate;
    }
    if (!assigned) continue;

    const values = new Array<number>(rows * cols).fill(0);
    path.forEach((cell, i) => {
      values[cell.row * cols + cell.col] = assigned.values[i];
    });

    const onPath = new Set(path.map((c) => c.row * cols + c.col));
    if (!fillDecoys(rng, { rows, cols }, values, path, assigned, onPath, tables)) continue;

    const deck = buildDeck(
      rng,
      assigned.cards,
      spareConnectors(rng, 4, tables, divisionUnlocked),
    );

    plantTrap(rng, { rows, cols }, values, path, assigned, onPath, deck, opts.difficulty);

    return {
      seed: opts.seed,
      difficulty: opts.difficulty,
      rows,
      cols,
      values,
      start,
      goal,
      deck,
      cable: shape.pathLength + shape.slack,
      parLength: shape.pathLength,
    };
  }

  return null;
}

/**
 * Fill every non-path junction with a plausible near-miss.
 *
 * The one hard rule: from any point on the solution, the correct card must
 * lead to exactly one junction. A decoy that happens to carry the right answer
 * would make the puzzle ambiguous rather than hard.
 */
function fillDecoys(
  rng: () => number,
  size: { rows: number; cols: number },
  values: number[],
  path: Cell[],
  assigned: { values: number[]; cards: Connector[] },
  onPath: Set<number>,
  tables: number[],
): boolean {
  const forbidden = new Map<number, Set<number>>();
  path.forEach((cell, i) => {
    if (i >= assigned.cards.length) return;
    const target = assigned.values[i + 1];
    for (const n of neighbours(cell, size.rows, size.cols)) {
      const index = n.row * size.cols + n.col;
      if (onPath.has(index)) continue;
      if (!forbidden.has(index)) forbidden.set(index, new Set());
      forbidden.get(index)!.add(target);
    }
  });

  for (let index = 0; index < values.length; index++) {
    if (onPath.has(index)) continue;
    const banned = forbidden.get(index) ?? new Set<number>();

    let value = 0;
    for (let tries = 0; tries < 40 && value === 0; tries++) {
      const candidate =
        rng() < 0.4
          ? 1 + Math.floor(rng() * MAX_FACTOR)
          : pick(rng, tables) * (1 + Math.floor(rng() * MAX_FACTOR));
      if (candidate <= MAX_VALUE && !banned.has(candidate)) value = candidate;
    }
    if (value === 0) return false;
    values[index] = value;
  }

  return true;
}

/**
 * Plant one attractive dead end: a junction next to the start, reachable with
 * a card already in the opening hand, that leads nowhere. It's the reason the
 * cable budget matters — and it's suppressed on the easy tier, where running
 * out of cable would just be discouraging.
 */
function plantTrap(
  rng: () => number,
  size: { rows: number; cols: number },
  values: number[],
  path: Cell[],
  assigned: { values: number[]; cards: Connector[] },
  onPath: Set<number>,
  deck: Connector[],
  difficulty: Difficulty,
): void {
  if (difficulty === "easy") return;

  const startValue = assigned.values[0];
  const options = shuffle(
    rng,
    neighbours(path[0], size.rows, size.cols).filter(
      (n) => !onPath.has(n.row * size.cols + n.col),
    ),
  );
  if (options.length === 0) return;
  const cell = options[0];

  // The lure has to be wrong without being *ambiguously* wrong: it must not be
  // the answer any route junction next to it is looking for, or it stops being
  // a dead end and becomes a second correct-looking move.
  const banned = new Set<number>();
  path.forEach((step, i) => {
    if (i >= assigned.cards.length) return;
    if (isAdjacent(step, cell)) banned.add(assigned.values[i + 1]);
  });

  for (const card of deck.slice(1, HAND_SIZE)) {
    const lure = applyConnector(startValue, card);
    if (lure === null || banned.has(lure)) continue;
    values[cell.row * size.cols + cell.col] = lure;
    return;
  }
}

/* ------------------------------------------------------------------ state */

export type RunState = {
  at: Cell;
  value: number;
  cableLeft: number;
  /** Indices into `board.deck`; -1 once the deck is exhausted. */
  hand: number[];
  nextCard: number;
  path: Cell[];
};

export function initialState(board: Board): RunState {
  return {
    at: board.start,
    value: valueAt(board, board.start),
    cableLeft: board.cable,
    hand: Array.from({ length: HAND_SIZE }, (_, i) => (i < board.deck.length ? i : -1)),
    nextCard: Math.min(HAND_SIZE, board.deck.length),
    path: [board.start],
  };
}

export type MoveResult =
  | { ok: true; state: RunState; fact: ReturnType<typeof factFor> }
  | { ok: false; reason: "no-card" | "not-adjacent" | "wrong-value"; expected: number | null; fact: ReturnType<typeof factFor> | null };

/** Attempt a move. Illegal moves cost no cable — only the wrong idea is recorded. */
export function applyMove(board: Board, state: RunState, handSlot: number, target: Cell): MoveResult {
  const cardIndex = state.hand[handSlot];
  if (cardIndex === undefined || cardIndex < 0) {
    return { ok: false, reason: "no-card", expected: null, fact: null };
  }
  const card = board.deck[cardIndex];
  const expected = applyConnector(state.value, card);
  const fact = factFor(state.value, card);

  if (!isAdjacent(state.at, target)) {
    return { ok: false, reason: "not-adjacent", expected, fact };
  }
  if (expected === null || valueAt(board, target) !== expected) {
    return { ok: false, reason: "wrong-value", expected, fact };
  }

  const hand = [...state.hand];
  hand[handSlot] = state.nextCard < board.deck.length ? state.nextCard : -1;

  return {
    ok: true,
    fact,
    state: {
      at: target,
      value: expected,
      cableLeft: state.cableLeft - 1,
      hand,
      nextCard: Math.min(state.nextCard + 1, board.deck.length),
      path: [...state.path, target],
    },
  };
}

export function isSolved(board: Board, state: RunState): boolean {
  return sameCell(state.at, board.goal);
}

/**
 * True when no card in hand reaches any neighbour. Checked every turn, so a
 * dead end ends the board immediately rather than leaving the child to find
 * out by exhausting the cable.
 */
export function isStuck(board: Board, state: RunState): boolean {
  if (state.cableLeft <= 0) return true;
  for (const slot of state.hand) {
    if (slot < 0) continue;
    const expected = applyConnector(state.value, board.deck[slot]);
    if (expected === null) continue;
    for (const n of neighbours(state.at, board.rows, board.cols)) {
      if (valueAt(board, n) === expected) return false;
    }
  }
  return true;
}

/* ----------------------------------------------------------------- replay */

export type CableMove =
  | { kind: "move"; hand: number; row: number; col: number; elapsedMs: number }
  | { kind: "undo" };

export type CableAnswer = {
  a: number;
  b: number;
  operation: "multiply" | "divide";
  correct: boolean;
  elapsedMs: number;
};

export type CableOutcome = {
  solved: boolean;
  movesUsed: number;
  illegalMoves: number;
  parLength: number;
  coins: number;
  uncappedCoins: number;
  capped: boolean;
  materials: number;
  /** The mastery log, derived from the replay rather than taken on trust. */
  answers: CableAnswer[];
};

export const COINS_COMPLETE = 80;
export const COINS_AT_PAR = 30;
export const COINS_UNDER_BUDGET = 15;
export const COINS_CLEAN_RUN = 20;

/**
 * Replay a session against a freshly generated board.
 *
 * The client sends only the seed, the difficulty and the moves it made; both
 * the payout and the mastery log come out of this function. A tampered client
 * can claim a harder board, but then it has to actually solve that board.
 */
export function replayCableRun(
  opts: GenerateOptions & { moves: CableMove[]; coinsToday?: number },
): CableOutcome | null {
  const board = generateBoard(opts);
  if (!board) return null;

  const history: RunState[] = [initialState(board)];
  const answers: CableAnswer[] = [];
  let illegalMoves = 0;

  for (const move of opts.moves) {
    const state = history[history.length - 1];
    if (move.kind === "undo") {
      // Undone moves stay in the answer log — they happened.
      if (history.length > 1) history.pop();
      continue;
    }
    if (isSolved(board, state) || state.cableLeft <= 0) break;

    const result = applyMove(board, state, move.hand, { row: move.row, col: move.col });
    if (result.ok) {
      answers.push({ ...result.fact, correct: true, elapsedMs: move.elapsedMs });
      history.push(result.state);
    } else {
      if (result.fact) {
        answers.push({ ...result.fact, correct: false, elapsedMs: move.elapsedMs });
      }
      illegalMoves++;
    }
  }

  const final = history[history.length - 1];
  const solved = isSolved(board, final);
  const movesUsed = final.path.length - 1;

  let uncapped = 0;
  if (solved) {
    uncapped = COINS_COMPLETE;
    if (movesUsed <= board.parLength) uncapped += COINS_AT_PAR;
    else if (final.cableLeft >= 1) uncapped += COINS_UNDER_BUDGET;
    if (illegalMoves === 0) uncapped += COINS_CLEAN_RUN;
  }

  // A board can be restarted freely, which means a solved route could be
  // replayed for the payout again. The daily cap is what bounds that: the
  // practice still counts, the coins taper off.
  const earned = applyDailyCap(uncapped, opts.coinsToday ?? 0);

  return {
    solved,
    movesUsed,
    illegalMoves,
    parLength: board.parLength,
    ...earned,
    materials: solved ? SHAPES[board.difficulty].materials : 0,
    answers,
  };
}

/**
 * Board size comes from how far through the curriculum the student is, not
 * from a menu — the spec's per-student tier with win/loss promotion needs
 * storage this mode doesn't have yet, and unlock count is a decent proxy.
 */
export function difficultyFor(unlockedTables: number): Difficulty {
  if (unlockedTables < 4) return "easy";
  if (unlockedTables < 8) return "standard";
  return "hard";
}
