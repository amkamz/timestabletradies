/**
 * Cable Run rules — docs/game-modes/01-cable-run.md §12.
 *
 * The generator builds the solution before the board, so solvability is meant
 * to be structural. These tests hold it to that with a breadth-first solver
 * that exists only here — the app never needs one at runtime.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  HAND_SIZE,
  MAX_FACTOR,
  MAX_VALUE,
  applyConnector,
  applyMove,
  canPlayCableRun,
  connectorLabel,
  factFor,
  generateBoard,
  initialState,
  isAdjacent,
  isSolved,
  isStuck,
  replayCableRun,
  valueAt,
  type Board,
  type CableMove,
  type Cell,
  type Difficulty,
  type RunState,
} from "./cable-run";

const TABLES = [2, 3, 4, 5, 6, 8, 10];
const DIVISION = [2, 5, 10];

function boardFor(seed: string, difficulty: Difficulty = "standard"): Board {
  const board = generateBoard({ seed, tables: TABLES, divisionUnlocked: DIVISION, difficulty });
  assert.ok(board, `no board generated for ${seed}`);
  return board;
}

/* ------------------------------------------------------------- the solver */

type Solution = { moves: Array<{ hand: number; cell: Cell }>; length: number };

/**
 * Breadth-first search over (position, hand, cable) for the shortest route to
 * the switchboard. Test-only: the generator guarantees a solution exists, and
 * this is what holds that guarantee honest.
 */
function solve(board: Board): Solution | null {
  const startState = initialState(board);
  const key = (s: RunState) => `${s.at.row},${s.at.col}|${s.hand.join(",")}|${s.cableLeft}`;

  const queue: Array<{ state: RunState; moves: Array<{ hand: number; cell: Cell }> }> = [
    { state: startState, moves: [] },
  ];
  const seen = new Set<string>([key(startState)]);

  while (queue.length > 0) {
    const { state, moves } = queue.shift()!;
    if (isSolved(board, state)) return { moves, length: moves.length };
    if (state.cableLeft <= 0) continue;

    for (let slot = 0; slot < state.hand.length; slot++) {
      for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
          const cell = { row, col };
          if (!isAdjacent(state.at, cell)) continue;
          const result = applyMove(board, state, slot, cell);
          if (!result.ok) continue;
          const next = key(result.state);
          if (seen.has(next)) continue;
          seen.add(next);
          queue.push({ state: result.state, moves: [...moves, { hand: slot, cell }] });
        }
      }
    }
  }

  return null;
}

/* --------------------------------------------------------------- geometry */

test("connectors only apply where the grid can record the fact", () => {
  // Multiplying needs an operand of 12 or less...
  assert.equal(applyConnector(6, { op: "multiply", n: 7 }), 42);
  assert.equal(applyConnector(42, { op: "multiply", n: 2 }), null);
  // ...and a product inside the grid.
  assert.equal(applyConnector(12, { op: "multiply", n: 12 }), MAX_VALUE);
  assert.equal(applyConnector(12, { op: "multiply", n: 13 }), null);
  // Dividing has to be exact and land back inside the factor range.
  assert.equal(applyConnector(42, { op: "divide", n: 6 }), 7);
  assert.equal(applyConnector(42, { op: "divide", n: 5 }), null);
  assert.equal(applyConnector(144, { op: "divide", n: 2 }), null); // 72 is not a factor
});

test("a move records the connector as the table and the operand as the factor", () => {
  assert.deepEqual(factFor(6, { op: "multiply", n: 7 }), { a: 7, b: 6, operation: "multiply" });
  assert.deepEqual(factFor(42, { op: "divide", n: 6 }), { a: 6, b: 7, operation: "divide" });
});

test("connector labels read the way the cards are drawn", () => {
  assert.equal(connectorLabel({ op: "multiply", n: 7 }), "×7");
  assert.equal(connectorLabel({ op: "divide", n: 6 }), "÷6");
});

/* ------------------------------------------------------------- generation */

test("every generated board is solvable within its cable budget", () => {
  const difficulties: Difficulty[] = ["easy", "standard", "hard"];
  for (const difficulty of difficulties) {
    for (let i = 0; i < 60; i++) {
      const board = boardFor(`solvable-${difficulty}-${i}`, difficulty);
      const solution = solve(board);
      assert.ok(solution, `${difficulty} board ${i} has no solution`);
      assert.ok(
        solution.length <= board.cable,
        `${difficulty} board ${i} needs ${solution.length} moves for ${board.cable} cable`,
      );
    }
  }
});

test("the shortest route is never longer than the advertised par", () => {
  for (let i = 0; i < 40; i++) {
    const board = boardFor(`par-${i}`);
    const solution = solve(board)!;
    assert.ok(
      solution.length <= board.parLength,
      `board ${i}: shortest ${solution.length} beats par ${board.parLength}`,
    );
  }
});

test("no junction is outside the grid the mastery table can express", () => {
  for (let i = 0; i < 60; i++) {
    const board = boardFor(`values-${i}`, i % 2 === 0 ? "hard" : "easy");
    for (const value of board.values) {
      assert.ok(value >= 1 && value <= MAX_VALUE, `junction value ${value} out of range`);
    }
  }
});

test("start and goal sit on opposite edges", () => {
  for (let i = 0; i < 30; i++) {
    const board = boardFor(`edges-${i}`);
    assert.equal(board.start.row, board.rows - 1);
    assert.equal(board.goal.row, 0);
  }
});

test("the correct card leads to exactly one junction the player hasn't cabled", () => {
  // Ambiguity would make the puzzle guessy rather than hard. The junction they
  // came from is exempt — the laid cable makes stepping back visibly wasteful
  // rather than a hidden wrong answer.
  for (let i = 0; i < 40; i++) {
    const board = boardFor(`ambiguity-${i}`);
    const solution = solve(board)!;

    let state = initialState(board);
    const cabled = new Set<string>([`${state.at.row},${state.at.col}`]);

    for (const move of solution.moves) {
      const expected = applyConnector(state.value, board.deck[state.hand[move.hand]]);
      const matches: Cell[] = [];
      for (const cell of [
        { row: state.at.row - 1, col: state.at.col },
        { row: state.at.row + 1, col: state.at.col },
        { row: state.at.row, col: state.at.col - 1 },
        { row: state.at.row, col: state.at.col + 1 },
      ]) {
        if (cell.row < 0 || cell.row >= board.rows) continue;
        if (cell.col < 0 || cell.col >= board.cols) continue;
        if (cabled.has(`${cell.row},${cell.col}`)) continue;
        if (valueAt(board, cell) === expected) matches.push(cell);
      }
      assert.equal(
        matches.length,
        1,
        `board ${i}: ${matches.length} uncabled junctions match ${expected}`,
      );

      const stepped = applyMove(board, state, move.hand, move.cell);
      assert.ok(stepped.ok);
      state = stepped.state;
      cabled.add(`${state.at.row},${state.at.col}`);
    }
  }
});

test("the deck always keeps the next needed card inside the hand", () => {
  for (let i = 0; i < 40; i++) {
    const board = boardFor(`deck-${i}`);
    const solution = solve(board)!;
    // Solving at all proves it, since a move can only use a card in hand —
    // but assert the hand size explicitly so a regression is legible.
    assert.ok(solution.moves.every((m) => m.hand >= 0 && m.hand < HAND_SIZE));
  }
});

test("boards generate across every difficulty and seed shape", () => {
  const difficulties: Difficulty[] = ["easy", "standard", "hard"];
  for (const difficulty of difficulties) {
    for (let i = 0; i < 40; i++) {
      assert.ok(
        generateBoard({
          seed: `gen-${difficulty}-${i}`,
          tables: TABLES,
          divisionUnlocked: DIVISION,
          difficulty,
        }),
        `${difficulty} seed ${i} produced no board`,
      );
    }
  }
});

test("the same seed always produces the same board", () => {
  const a = boardFor("stable-seed");
  const b = boardFor("stable-seed");
  assert.deepEqual(a, b);
});

/* ----------------------------------------------------------------- gating */

test("the mode is gated on division being unlocked", () => {
  // Without division the route can only escalate, and the second hop would
  // need a factor above 12 — a step the mastery grid can't record.
  assert.equal(canPlayCableRun({ tables: [2, 5, 10], divisionUnlocked: [] }), false);
  assert.equal(canPlayCableRun({ tables: [2], divisionUnlocked: [2] }), false);
  assert.equal(canPlayCableRun({ tables: [2, 5], divisionUnlocked: [2] }), true);

  assert.equal(
    generateBoard({ seed: "none", tables: [2, 5], divisionUnlocked: [], difficulty: "easy" }),
    null,
  );
});

test("a minimal unlock set still produces a board", () => {
  const board = generateBoard({
    seed: "minimal",
    tables: [2, 5],
    divisionUnlocked: [2],
    difficulty: "easy",
  });
  assert.ok(board);
  assert.ok(solve(board));
});

/* ------------------------------------------------------------------ moves */

test("an illegal move costs no cable", () => {
  const board = boardFor("illegal");
  const state = initialState(board);

  // A non-adjacent target, and a neighbour with the wrong value.
  const far = applyMove(board, state, 0, { row: 0, col: 0 });
  if (!far.ok) assert.ok(["not-adjacent", "wrong-value"].includes(far.reason));
  assert.equal(state.cableLeft, board.cable, "state must not be mutated by a failed move");
});

test("a legal move spends exactly one length of cable", () => {
  const board = boardFor("legal");
  const solution = solve(board)!;
  const first = solution.moves[0];
  const result = applyMove(board, initialState(board), first.hand, first.cell);
  assert.ok(result.ok);
  assert.equal(result.state.cableLeft, board.cable - 1);
  assert.equal(result.state.path.length, 2);
});

test("a solved board is recognised, and a fresh one is not", () => {
  const board = boardFor("solved");
  assert.equal(isSolved(board, initialState(board)), false);

  let state = initialState(board);
  for (const move of solve(board)!.moves) {
    const result = applyMove(board, state, move.hand, move.cell);
    assert.ok(result.ok);
    state = result.state;
  }
  assert.equal(isSolved(board, state), true);
});

test("a fresh board is never already stuck", () => {
  for (let i = 0; i < 40; i++) {
    const board = boardFor(`stuck-${i}`);
    assert.equal(isStuck(board, initialState(board)), false);
  }
});

test("no cable left counts as stuck", () => {
  const board = boardFor("nocable");
  assert.equal(isStuck(board, { ...initialState(board), cableLeft: 0 }), true);
});

/* ----------------------------------------------------------------- replay */

function movesFor(board: Board): CableMove[] {
  return solve(board)!.moves.map((m) => ({
    kind: "move" as const,
    hand: m.hand,
    row: m.cell.row,
    col: m.cell.col,
    elapsedMs: 4000,
  }));
}

test("a solved replay pays completion, par and clean-run bonuses", () => {
  const opts = {
    seed: "replay-solved",
    tables: TABLES,
    divisionUnlocked: DIVISION,
    difficulty: "standard" as const,
  };
  const board = generateBoard(opts)!;
  const outcome = replayCableRun({ ...opts, moves: movesFor(board) })!;

  assert.equal(outcome.solved, true);
  assert.equal(outcome.illegalMoves, 0);
  assert.equal(outcome.movesUsed, outcome.parLength);
  // 80 complete + 30 at par + 20 clean.
  assert.equal(outcome.coins, 130);
  assert.equal(outcome.materials, 6);
  assert.equal(outcome.answers.length, outcome.movesUsed);
  assert.ok(outcome.answers.every((a) => a.correct));
});

test("an abandoned replay pays nothing but still records what happened", () => {
  const opts = {
    seed: "replay-partial",
    tables: TABLES,
    divisionUnlocked: DIVISION,
    difficulty: "standard" as const,
  };
  const board = generateBoard(opts)!;
  const outcome = replayCableRun({ ...opts, moves: movesFor(board).slice(0, 3) })!;

  assert.equal(outcome.solved, false);
  assert.equal(outcome.coins, 0);
  assert.equal(outcome.materials, 0);
  assert.equal(outcome.answers.length, 3);
});

test("illegal moves are recorded as wrong answers and cost the clean bonus", () => {
  const opts = {
    seed: "replay-illegal",
    tables: TABLES,
    divisionUnlocked: DIVISION,
    difficulty: "standard" as const,
  };
  const board = generateBoard(opts)!;
  const good = movesFor(board);

  // Aim the first card at a junction that certainly isn't its answer.
  const wrongTarget = { row: board.start.row, col: board.start.col === 0 ? 1 : 0 };
  const moves: CableMove[] = [
    { kind: "move", hand: 0, row: wrongTarget.row, col: wrongTarget.col, elapsedMs: 3000 },
    ...good,
  ];

  const outcome = replayCableRun({ ...opts, moves })!;
  assert.equal(outcome.solved, true);
  assert.ok(outcome.illegalMoves >= 1);
  assert.ok(outcome.answers.some((a) => !a.correct));
  assert.equal(outcome.coins, 110); // no clean-run bonus
});

test("undo rewinds the route but never erases the answer log", () => {
  const opts = {
    seed: "replay-undo",
    tables: TABLES,
    divisionUnlocked: DIVISION,
    difficulty: "standard" as const,
  };
  const board = generateBoard(opts)!;
  const good = movesFor(board);
  const moves: CableMove[] = [good[0], { kind: "undo" }, ...good];

  const outcome = replayCableRun({ ...opts, moves })!;
  assert.equal(outcome.solved, true);
  assert.equal(outcome.movesUsed, outcome.parLength);
  // The undone move happened, so it is still in the log.
  assert.equal(outcome.answers.length, outcome.parLength + 1);
});

test("a replay of moves that don't fit the claimed board earns nothing", () => {
  // Claiming a hard board and replaying an easy board's moves must not pay.
  const easy = {
    seed: "mismatch",
    tables: TABLES,
    divisionUnlocked: DIVISION,
    difficulty: "easy" as const,
  };
  const board = generateBoard(easy)!;
  const outcome = replayCableRun({ ...easy, difficulty: "hard", moves: movesFor(board) })!;
  assert.equal(outcome.solved, false);
  assert.equal(outcome.coins, 0);
});

test("every recorded fact fits what fact_mastery can store", () => {
  // fact_mastery checks (a between 1 and 99, b between 1 and 12); a fact
  // outside that would fail the insert for the whole run.
  for (let i = 0; i < 30; i++) {
    const opts = {
      seed: `facts-${i}`,
      tables: TABLES,
      divisionUnlocked: DIVISION,
      difficulty: "hard" as const,
    };
    const board = generateBoard(opts)!;
    const outcome = replayCableRun({ ...opts, moves: movesFor(board) })!;

    for (const answer of outcome.answers) {
      assert.ok(answer.a >= 1 && answer.a <= 99, `a=${answer.a} out of range`);
      assert.ok(answer.b >= 1 && answer.b <= MAX_FACTOR, `b=${answer.b} out of range`);
    }
  }
});

test("division only ever uses a table the student has unlocked it for", () => {
  for (let i = 0; i < 30; i++) {
    const opts = {
      seed: `division-${i}`,
      tables: TABLES,
      divisionUnlocked: DIVISION,
      difficulty: "standard" as const,
    };
    const board = generateBoard(opts)!;
    for (const card of board.deck) {
      if (card.op === "divide") assert.ok(DIVISION.includes(card.n), `÷${card.n} not unlocked`);
    }
  }
});
