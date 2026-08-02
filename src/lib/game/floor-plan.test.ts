/**
 * Floor Plan rules — docs/game-modes/05-floor-plan.md §11.
 *
 * The generator tiles the room before it hands out the blocks, so every room
 * is completable by construction. These tests hold it to that, and pin down
 * the gap question, which is the beat the whole mode is built around.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  COINS_COMPLETE,
  COINS_GAP_QUESTION,
  COINS_PERFECT_FIT,
  MAX_SIDE,
  MIN_PIECE_AREA,
  area,
  blockAt,
  difficultyFor,
  findGap,
  gapChoices,
  gapNeedsAnswer,
  generateRoom,
  generateRoomWithSolution,
  initialState,
  lift,
  place,
  replayFloorPlan,
  rotate,
  sameBlock,
  squaresLeft,
  type Difficulty,
  type FloorMove,
  type Room,
} from "./floor-plan";

const TABLES = [2, 3, 4, 5, 6, 8, 9];
const DIVISION = [2, 5];
const DIFFICULTIES: Difficulty[] = ["easy", "standard", "hard"];

function roomFor(seed: string, difficulty: Difficulty = "standard") {
  const built = generateRoomWithSolution({ seed, tables: TABLES, difficulty });
  assert.ok(built, `no room generated for ${seed}`);
  return built;
}

/** The pallet index holding a block matching this solution piece. */
function findPalletIndex(room: Room, used: boolean[], want: { w: number; h: number }): number {
  return room.pallet.findIndex((b, i) => !used[i] && sameBlock(b, want));
}

/**
 * Turn a solution into the move list that lays it — including the gap
 * question, since one block is deliberately missing from the pallet and the
 * room cannot be finished without answering for it.
 */
function movesFor(built: ReturnType<typeof roomFor>): FloorMove[] {
  const { room, solution, withheld } = built;
  const used = new Array(room.pallet.length).fill(false);
  const moves: FloorMove[] = [];

  for (const piece of solution) {
    if (withheld && piece === withheld) continue;
    const index = findPalletIndex(room, used, piece);
    assert.ok(index >= 0, `no pallet block for ${piece.w}x${piece.h}`);
    used[index] = true;
    const stored = room.pallet[index];
    moves.push({
      kind: "place",
      palletIndex: index,
      // Half the blocks are stored rotated, so half the moves need the button.
      rotated: !(stored.w === piece.w && stored.h === piece.h),
      row: piece.row,
      col: piece.col,
      elapsedMs: 5000,
    });
  }

  if (withheld) {
    // Answer for the missing block, then lay the one it wins.
    moves.push({ kind: "gap", answer: withheld.h, elapsedMs: 9000 });
    moves.push({
      kind: "place",
      palletIndex: room.pallet.length,
      rotated: false,
      row: withheld.row,
      col: withheld.col,
      elapsedMs: 4000,
    });
  }

  return moves;
}

/* -------------------------------------------------------------- geometry */

test("rotating a block keeps its area and swaps its sides", () => {
  assert.deepEqual(rotate({ w: 4, h: 6 }), { w: 6, h: 4 });
  assert.equal(area(rotate({ w: 4, h: 6 })), area({ w: 4, h: 6 }));
});

test("a block equals its own rotation", () => {
  assert.equal(sameBlock({ w: 4, h: 6 }, { w: 6, h: 4 }), true);
  assert.equal(sameBlock({ w: 4, h: 6 }, { w: 4, h: 5 }), false);
});

/* ------------------------------------------------------------- generation */

test("every room can be finished from its pallet plus the gap question", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let i = 0; i < 40; i++) {
      const built = roomFor(`tile-${difficulty}-${i}`, difficulty);
      const outcome = replayFloorPlan({
        seed: built.room.seed,
        tables: TABLES,
        difficulty,
        divisionUnlocked: DIVISION,
        moves: movesFor(built),
      })!;
      assert.equal(outcome.completed, true, `${difficulty} ${i}: room not covered`);
      assert.equal(outcome.illegalPlacements, 0, `${difficulty} ${i}: a move was rejected`);
    }
  }
});

test("the pallet is one block short, and it is the gap question's answer", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let i = 0; i < 30; i++) {
      const { room, solution, withheld } = roomFor(`withheld-${difficulty}-${i}`, difficulty);
      assert.ok(withheld, `${difficulty} ${i}: nothing withheld`);

      // Laying everything the pallet does hold must leave exactly that hole.
      let state = initialState(room);
      const used = new Array(room.pallet.length).fill(false);
      for (const piece of solution) {
        if (piece === withheld) continue;
        const index = findPalletIndex(room, used, piece);
        assert.ok(index >= 0);
        used[index] = true;
        const stored = room.pallet[index];
        const block = stored.w === piece.w && stored.h === piece.h ? stored : rotate(stored);
        const result = place(room, state, index, block, piece.row, piece.col);
        assert.ok(result.ok);
        state = result.state;
      }

      assert.equal(squaresLeft(state), area(withheld));
      const gap = findGap(room, state);
      assert.ok(gap);
      assert.equal(gap.w, withheld.w);
      assert.equal(gap.h, withheld.h);
      assert.equal(
        gapNeedsAnswer(room, state, gap),
        true,
        `${difficulty} ${i}: a spare block covers the gap, so the question never fires`,
      );
    }
  }
});

test("the solution covers the room exactly, with no overlap", () => {
  for (let i = 0; i < 40; i++) {
    const { room, solution } = roomFor(`cover-${i}`);
    assert.equal(
      solution.reduce((sum, p) => sum + area(p), 0),
      room.w * room.h,
    );
  }
});

test("no block has a side outside the times-table grid", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let i = 0; i < 30; i++) {
      const { room } = roomFor(`sides-${difficulty}-${i}`, difficulty);
      for (const block of room.pallet) {
        assert.ok(block.w >= 1 && block.w <= MAX_SIDE, `w=${block.w}`);
        assert.ok(block.h >= 1 && block.h <= MAX_SIDE, `h=${block.h}`);
      }
    }
  }
});

test("both room dimensions come from tables the student has unlocked", () => {
  for (let i = 0; i < 40; i++) {
    const { room } = roomFor(`dims-${i}`);
    assert.ok(TABLES.includes(room.w), `width ${room.w} not unlocked`);
    assert.ok(TABLES.includes(room.h), `height ${room.h} not unlocked`);
  }
});

test("the pallet carries decoys as well as the solution", () => {
  for (let i = 0; i < 30; i++) {
    const { room, solution } = roomFor(`decoy-${i}`);
    assert.ok(room.pallet.length > solution.length, "no decoys on the pallet");
  }
});

test("roughly half the blocks are stored rotated, so the button gets found", () => {
  let rotated = 0;
  let total = 0;
  for (let i = 0; i < 40; i++) {
    const built = roomFor(`rot-${i}`);
    for (const move of movesFor(built)) {
      if (move.kind !== "place") continue;
      total++;
      if (move.rotated) rotated++;
    }
  }
  const share = rotated / total;
  assert.ok(share > 0.25 && share < 0.75, `only ${(share * 100).toFixed(0)}% needed rotating`);
});

test("every piece is a workable size", () => {
  for (let i = 0; i < 30; i++) {
    const { solution } = roomFor(`size-${i}`);
    for (const piece of solution) {
      assert.ok(area(piece) >= MIN_PIECE_AREA, `piece of ${area(piece)} is too small`);
    }
  }
});

test("the same seed produces the same room", () => {
  assert.deepEqual(generateRoom({ seed: "same", tables: TABLES, difficulty: "standard" }), generateRoom({ seed: "same", tables: TABLES, difficulty: "standard" }));
});

test("a student with two tables still gets a room", () => {
  const room = generateRoom({ seed: "tiny", tables: [2, 5], difficulty: "easy" });
  assert.ok(room);
  assert.ok([2, 5].includes(room.w) && [2, 5].includes(room.h));
});

test("difficulty follows curriculum progress", () => {
  assert.equal(difficultyFor(2), "easy");
  assert.equal(difficultyFor(5), "standard");
  assert.equal(difficultyFor(11), "hard");
});

/* ------------------------------------------------------------- placement */

test("a block cannot hang off the edge of the room", () => {
  const { room } = roomFor("edge");
  const state = initialState(room);
  const result = place(room, state, 0, { w: room.w, h: room.h }, 1, 1);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "outside");
});

test("a block cannot overlap one already down", () => {
  const built = roomFor("overlap");
  const { room, solution } = built;
  const first = solution[0];
  const index = findPalletIndex(room, new Array(room.pallet.length).fill(false), first);
  const stored = room.pallet[index];
  const block = stored.w === first.w && stored.h === first.h ? stored : rotate(stored);

  const placed = place(room, initialState(room), index, block, first.row, first.col);
  assert.ok(placed.ok);

  const again = place(room, placed.state, index, block, first.row, first.col);
  assert.equal(again.ok, false);
  if (!again.ok) assert.equal(again.reason, "used");
});

test("lifting a block puts its squares back", () => {
  const built = roomFor("lift");
  const { room, solution } = built;
  const before = initialState(room);
  const first = solution[0];
  const index = findPalletIndex(room, new Array(room.pallet.length).fill(false), first);
  const stored = room.pallet[index];
  const block = stored.w === first.w && stored.h === first.h ? stored : rotate(stored);

  const placed = place(room, before, index, block, first.row, first.col);
  assert.ok(placed.ok);
  assert.equal(squaresLeft(placed.state), room.w * room.h - area(first));

  const lifted = lift(placed.state, room);
  assert.equal(squaresLeft(lifted), room.w * room.h);
  assert.equal(lifted.used[index], false);
});

test("lifting an empty room is a no-op", () => {
  const { room } = roomFor("lift-empty");
  const state = initialState(room);
  assert.deepEqual(lift(state, room), state);
});

/* ------------------------------------------------------------------- gap */

test("a ragged hole is not reported as a gap", () => {
  const { room } = roomFor("ragged");
  const state = initialState(room);
  // Cover one interior square by hand, leaving a non-rectangular remainder.
  const cover = [...state.cover];
  cover[Math.floor(cover.length / 2)] = 0;
  assert.equal(findGap(room, { ...state, cover }), null);
});

test("the gap question never fires on an untouched room", () => {
  const { room } = roomFor("gap-empty");
  const state = initialState(room);
  const gap = findGap(room, state);

  // The whole floor is technically one rectangle, so `findGap` reports it —
  // but asking for its missing side before a block is down would be nonsense.
  assert.ok(gap);
  assert.equal(gapNeedsAnswer(room, state, gap), false);
});

test("a completed room has no gap at all", () => {
  const built = roomFor("gap-done");
  const outcome = replayFloorPlan({
    seed: built.room.seed,
    tables: TABLES,
    difficulty: "standard",
    divisionUnlocked: DIVISION,
    moves: movesFor(built),
  })!;
  assert.equal(outcome.completed, true);
  assert.equal(outcome.squaresLeft, 0);
});

test("gap choices always include the right answer and are all plausible", () => {
  for (let h = 1; h <= 12; h++) {
    const choices = gapChoices({ row: 0, col: 0, w: 7, h }, "seed");
    assert.ok(choices.includes(h), `missing the answer ${h}`);
    assert.equal(choices.length, 3);
    assert.ok(choices.every((c) => c >= 1 && c <= MAX_SIDE));
    assert.equal(new Set(choices).size, 3);
  }
});

/* ----------------------------------------------------------------- replay */

test("a completed room pays completion, perfect fit and the gap question", () => {
  const built = roomFor("pay");
  const outcome = replayFloorPlan({
    seed: built.room.seed,
    tables: TABLES,
    difficulty: "standard",
    divisionUnlocked: DIVISION,
    moves: movesFor(built),
  })!;

  assert.equal(outcome.completed, true);
  assert.equal(outcome.illegalPlacements, 0);
  assert.equal(outcome.gapsAnswered, 1);
  assert.equal(outcome.coins, COINS_COMPLETE + COINS_PERFECT_FIT + COINS_GAP_QUESTION);
  assert.equal(outcome.materials, 6);
});

test("an unfinished room pays nothing but still records the placements", () => {
  const built = roomFor("partial");
  const moves = movesFor(built).slice(0, 2);
  const outcome = replayFloorPlan({
    seed: built.room.seed,
    tables: TABLES,
    difficulty: "standard",
    divisionUnlocked: DIVISION,
    moves,
  })!;

  assert.equal(outcome.completed, false);
  assert.equal(outcome.coins, 0);
  assert.equal(outcome.answers.length, 2);
  assert.ok(outcome.answers.every((a) => a.correct));
});

test("an illegal placement is recorded as a wrong attempt and costs the bonus", () => {
  const built = roomFor("illegal");
  const moves: FloorMove[] = [
    // Far outside the room.
    { kind: "place", palletIndex: 0, rotated: false, row: 90, col: 90, elapsedMs: 2000 },
    ...movesFor(built),
  ];
  const outcome = replayFloorPlan({
    seed: built.room.seed,
    tables: TABLES,
    difficulty: "standard",
    divisionUnlocked: DIVISION,
    moves,
  })!;

  assert.equal(outcome.completed, true);
  assert.equal(outcome.illegalPlacements, 1);
  assert.ok(outcome.answers.some((a) => !a.correct));
  assert.equal(outcome.coins, COINS_COMPLETE + COINS_GAP_QUESTION);
});

test("placements record as multiplication, the gap answer as division", () => {
  const built = roomFor("facts");
  const withheld = built.withheld!;
  const outcome = replayFloorPlan({
    seed: built.room.seed,
    tables: TABLES,
    difficulty: "standard",
    divisionUnlocked: [...DIVISION, withheld.w],
    moves: movesFor(built),
  })!;

  const divisions = outcome.answers.filter((a) => a.operation === "divide");
  assert.equal(divisions.length, 1, "exactly one division question per room");
  assert.equal(divisions[0].a, withheld.w);
  assert.equal(divisions[0].b, withheld.h);
  assert.equal(divisions[0].correct, true);

  // Everything else is a placement, which is a multiplication attempt.
  assert.equal(outcome.answers.length - 1, outcome.answers.filter((a) => a.operation === "multiply").length);
});

test("a gap question phrases as multiplication where division isn't unlocked", () => {
  const built = roomFor("nodivision");
  const outcome = replayFloorPlan({
    seed: built.room.seed,
    tables: TABLES,
    difficulty: "standard",
    divisionUnlocked: [],
    moves: movesFor(built),
  })!;
  assert.ok(outcome.answers.every((a) => a.operation === "multiply"));
  assert.equal(outcome.gapsAnswered, 1);
});

test("a wrong gap answer is recorded and wins no block", () => {
  const built = roomFor("gap-wrong");
  const withheld = built.withheld!;
  const moves = movesFor(built);
  // Replace the correct gap answer with a wrong one, and drop the block it
  // would have won.
  const spoiled = moves
    .map((m) => (m.kind === "gap" ? { ...m, answer: withheld.h === 1 ? 2 : 1 } : m))
    .filter((m) => !(m.kind === "place" && m.palletIndex === built.room.pallet.length));

  const outcome = replayFloorPlan({
    seed: built.room.seed,
    tables: TABLES,
    difficulty: "standard",
    divisionUnlocked: DIVISION,
    moves: spoiled,
  })!;

  assert.equal(outcome.gapsAnswered, 0);
  assert.equal(outcome.completed, false);
  assert.ok(outcome.answers.some((a) => !a.correct));
  assert.equal(outcome.coins, 0);
});

test("every recorded fact fits what fact_mastery can store", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let i = 0; i < 20; i++) {
      const built = roomFor(`store-${difficulty}-${i}`, difficulty);
      const outcome = replayFloorPlan({
        seed: built.room.seed,
        tables: TABLES,
        difficulty,
        divisionUnlocked: DIVISION,
        moves: movesFor(built),
      })!;

      for (const answer of outcome.answers) {
        assert.ok(answer.a >= 1 && answer.a <= 99, `a=${answer.a}`);
        assert.ok(answer.b >= 1 && answer.b <= MAX_SIDE, `b=${answer.b}`);
      }
    }
  }
});

test("lifting inside a replay restores the squares", () => {
  const built = roomFor("replay-lift");
  const moves = movesFor(built);
  const outcome = replayFloorPlan({
    seed: built.room.seed,
    tables: TABLES,
    difficulty: "standard",
    divisionUnlocked: DIVISION,
    moves: [moves[0], { kind: "lift" }, ...moves],
  })!;

  assert.equal(outcome.completed, true);
  // The lifted placement still happened, so it stays in the log.
  assert.equal(outcome.answers.length, moves.length + 1);
});

test("the daily cap tapers a replayed room without stopping the practice", () => {
  const built = roomFor("cap");
  const base = {
    seed: built.room.seed,
    tables: TABLES,
    difficulty: "standard" as const,
    divisionUnlocked: DIVISION,
    moves: movesFor(built),
  };
  const fresh = replayFloorPlan(base)!;
  const farmed = replayFloorPlan({ ...base, coinsToday: 5000 })!;

  assert.ok(farmed.coins < fresh.coins);
  assert.ok(farmed.coins > 0);
  assert.equal(farmed.capped, true);
  assert.deepEqual(farmed.answers, fresh.answers);
});

test("blockAt reaches blocks won from gap questions", () => {
  const { room } = roomFor("blockat");
  const state = { ...initialState(room), extra: [{ w: 3, h: 4 }] };
  assert.deepEqual(blockAt(room, state, room.pallet.length), { w: 3, h: 4 });
});
