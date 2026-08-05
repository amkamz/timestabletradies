/**
 * The Tool-Off rules — docs/game-modes/03-the-tool-off.md §11.
 *
 * The load-bearing claims: every target is makeable from the belt, shields
 * never make one unmakeable, every rival is both winnable and losable, and the
 * fact recorded is the one the child asserted.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  BELT_SIZE,
  CLOSE_DAMAGE,
  COINS_EXACT,
  EXACT_DAMAGE,
  MAX_TOOL,
  MAX_TURNS,
  MISS_PENALTY,
  RIVALS,
  RIVAL_ORDER,
  beltProducts,
  buildBelt,
  damageFor,
  nextTarget,
  replayDuel,
  resolveTurn,
  rivalsFor,
  shieldFactor,
  startDuel,
  swingKind,
  type DuelMove,
  type DuelState,
  type RivalKey,
} from "./tool-off";

const UNLOCKED = [2, 10, 5, 3, 4, 8, 6];

/** Plays the pair that makes the target exactly, preferring a shield-safe one. */
function perfectMove(state: DuelState): DuelMove {
  const pairs = beltProducts(state.belt).get(state.target) ?? [];
  const safe =
    pairs.find(
      ([i, j]) =>
        state.shield === null ||
        state.belt[i] === state.shield ||
        state.belt[j] === state.shield,
    ) ?? pairs[0];
  return {
    kind: "swing",
    tools: [state.belt[safe[0]], state.belt[safe[1]]],
    elapsedMs: 4000,
  };
}

function playDuel(
  rival: RivalKey,
  strategy: (state: DuelState) => DuelMove,
  seed = "duel",
): { state: DuelState; moves: DuelMove[] } {
  let state = startDuel({ seed, rival, unlocked: UNLOCKED });
  const moves: DuelMove[] = [];
  while (!state.over && moves.length < MAX_TURNS + 2) {
    const move = strategy(state);
    moves.push(move);
    state = resolveTurn(state, move, UNLOCKED);
  }
  return { state, moves };
}

/* ------------------------------------------------------------------- belt */

test("the belt is six tools, all inside the factor range", () => {
  for (let i = 0; i < 40; i++) {
    const belt = buildBelt(`belt-${i}`, UNLOCKED);
    assert.equal(belt.length, BELT_SIZE);
    assert.ok(belt.every((t) => t >= 2 && t <= MAX_TOOL));
  }
});

test("the belt carries a spread of tools, not six of the same", () => {
  for (let i = 0; i < 40; i++) {
    const belt = buildBelt(`spread-${i}`, UNLOCKED);
    assert.ok(new Set(belt).size >= 4, `belt ${belt.join(",")} is too narrow`);
  }
});

test("the belt is deterministic from its seed", () => {
  assert.deepEqual(buildBelt("same", UNLOCKED), buildBelt("same", UNLOCKED));
});

test("a student with barely any tables still gets a belt", () => {
  const belt = buildBelt("tiny", [2, 10]);
  assert.equal(belt.length, BELT_SIZE);
  assert.ok(belt.every((t) => [2, 10].includes(t)));
});

test("shields pick the least-practised tool on the belt", () => {
  // UNLOCKED is in curriculum order, so later entries are the shakier ones.
  const belt = [2, 10, 6];
  assert.equal(shieldFactor(belt, UNLOCKED), 6);
});

/* ---------------------------------------------------------------- targets */

test("every target is makeable from the belt", () => {
  for (let i = 0; i < 60; i++) {
    const belt = buildBelt(`t-${i}`, UNLOCKED);
    for (let turn = 1; turn <= MAX_TURNS; turn++) {
      const { target, solutions } = nextTarget(`t-${i}`, turn, belt, null);
      assert.ok(solutions.length > 0, `turn ${turn}: no solution for ${target}`);
      for (const [a, b] of solutions) {
        assert.equal(belt[a] * belt[b], target);
      }
    }
  }
});

test("a shield never makes the target unmakeable", () => {
  for (let i = 0; i < 60; i++) {
    const belt = buildBelt(`s-${i}`, UNLOCKED);
    const shield = shieldFactor(belt, UNLOCKED);
    for (let turn = 1; turn <= MAX_TURNS; turn++) {
      const { target, solutions } = nextTarget(`s-${i}`, turn, belt, shield);
      const satisfiable = solutions.some(([a, b]) => belt[a] === shield || belt[b] === shield);
      assert.ok(satisfiable, `turn ${turn}: ${target} can't be hit through a ×${shield} shield`);
    }
  }
});

test("opening targets have one belt pair, later ones have more", () => {
  let singles = 0;
  let multiples = 0;
  for (let i = 0; i < 40; i++) {
    const belt = buildBelt(`amb-${i}`, UNLOCKED);
    if (nextTarget(`amb-${i}`, 1, belt, null).solutions.length === 1) singles++;
    if (nextTarget(`amb-${i}`, 9, belt, null).solutions.length > 1) multiples++;
  }
  assert.ok(singles > 30, `only ${singles}/40 opening targets were single-solution`);
  assert.ok(multiples > 30, `only ${multiples}/40 later targets had a family`);
});

/* ----------------------------------------------------------------- combat */

test("a swing is exact, close, or a miss", () => {
  assert.equal(swingKind(48, 48), "exact");
  assert.equal(swingKind(45, 48), "close"); // within 10%
  assert.equal(swingKind(36, 48), "miss");
});

test("shields halve a hit that ignores the factor they name", () => {
  const unshielded = damageFor({ tools: [6, 8], target: 48, shield: null });
  assert.deepEqual(unshielded, { kind: "exact", damage: EXACT_DAMAGE, shielded: false });

  const through = damageFor({ tools: [6, 8], target: 48, shield: 6 });
  assert.equal(through.damage, EXACT_DAMAGE, "using the shield factor pays full");

  const around = damageFor({ tools: [4, 12], target: 48, shield: 6 });
  assert.equal(around.damage, EXACT_DAMAGE / 2);
  assert.equal(around.shielded, true);
});

test("a miss deals nothing and a glancing blow deals a little", () => {
  assert.equal(damageFor({ tools: [6, 6], target: 48, shield: null }).damage, 0);
  assert.equal(damageFor({ tools: [5, 9], target: 48, shield: null }).damage, CLOSE_DAMAGE);
});

test("a miss lets the rival's next hit land harder, once", () => {
  const state = startDuel({ seed: "penalty", rival: "kade", unlocked: UNLOCKED });
  const missed = resolveTurn(state, { kind: "swing", tools: [2, 2], elapsedMs: 900 }, UNLOCKED);
  assert.equal(missed.pendingBonus, MISS_PENALTY);

  const after = resolveTurn(missed, perfectMove(missed), UNLOCKED);
  // The bonus applied to that turn's counterpunch, then cleared.
  assert.equal(after.log[1].rivalDamage, RIVALS.kade.hit + MISS_PENALTY);
  assert.equal(after.pendingBonus, 0);
});

test("the rival cannot counterpunch after it has gone down", () => {
  let state = startDuel({ seed: "ko", rival: "kade", unlocked: UNLOCKED });
  state = { ...state, rivalHp: EXACT_DAMAGE };
  const finished = resolveTurn(state, perfectMove(state), UNLOCKED);

  assert.equal(finished.rivalHp, 0);
  assert.equal(finished.over, true);
  assert.equal(finished.won, true);
  assert.equal(finished.log[0].rivalDamage, 0);
});

test("a duel always ends inside the turn limit", () => {
  for (const rival of RIVAL_ORDER) {
    // Stalling every turn: the clock still runs out.
    const { state } = playDuel(rival, () => ({ kind: "timeout" }));
    assert.equal(state.over, true);
    assert.ok(state.log.length <= MAX_TURNS);
  }
});

test("running out of turns is not a win — stalling can't be a strategy", () => {
  const { state } = playDuel("dawes", () => ({ kind: "timeout" }));
  assert.equal(state.won, false);
});

/* ------------------------------------------------------- fight difficulty */

test("every rival is winnable by a player who hits exactly", () => {
  for (const rival of RIVAL_ORDER) {
    const { state } = playDuel(rival, perfectMove);
    assert.equal(state.won, true, `${RIVALS[rival].name} is not winnable`);
    assert.ok(state.playerHp > 0);
  }
});

test("every rival is losable by a player who mostly misses", () => {
  for (const rival of RIVAL_ORDER) {
    // Land one exact hit in four; everything else is a miss.
    let turn = 0;
    const { state } = playDuel(rival, (s) => {
      turn++;
      return turn % 4 === 0 ? perfectMove(s) : { kind: "swing", tools: [2, 2], elapsedMs: 800 };
    });
    assert.equal(state.won, false, `${RIVALS[rival].name} is a walkover`);
  }
});

test("the rival roster opens up with city level", () => {
  assert.deepEqual(
    rivalsFor(1).map((r) => r.key),
    ["kade"],
  );
  assert.deepEqual(
    rivalsFor(5).map((r) => r.key),
    ["kade", "marlow", "vance"],
  );
  assert.equal(rivalsFor(10).length, RIVAL_ORDER.length);
});

/* ----------------------------------------------------------------- replay */

test("a won duel pays hits, the win bonus and the tier bonus", () => {
  const { moves } = playDuel("marlow", perfectMove);
  const outcome = replayDuel({ seed: "duel", rival: "marlow", unlocked: UNLOCKED, moves });

  assert.equal(outcome.won, true);
  assert.ok(outcome.exactHits > 0);
  // Flawless, since every swing was exact.
  assert.ok(outcome.coins >= outcome.exactHits * COINS_EXACT + 50 + 25 + 40);
  assert.equal(outcome.materials, 7);
});

test("a lost duel still pays for the hits that landed", () => {
  let turn = 0;
  const { moves } = playDuel("dawes", (s) => {
    turn++;
    return turn % 4 === 0 ? perfectMove(s) : { kind: "swing", tools: [2, 2], elapsedMs: 800 };
  });
  const outcome = replayDuel({ seed: "duel", rival: "dawes", unlocked: UNLOCKED, moves });

  assert.equal(outcome.won, false);
  assert.ok(outcome.coins > 0, "a lost duel was still practice");
  assert.equal(outcome.materials, 2);
});

test("the fact recorded is the one the child asserted, not the target's", () => {
  const state = startDuel({ seed: "assert", rival: "kade", unlocked: UNLOCKED });
  const outcome = replayDuel({
    seed: "assert",
    rival: "kade",
    unlocked: UNLOCKED,
    moves: [{ kind: "swing", tools: [6, 7], elapsedMs: 3000 }],
  });

  assert.equal(outcome.answers.length, 1);
  assert.deepEqual(outcome.answers[0], {
    a: 6,
    b: 7,
    operation: "multiply",
    correct: state.target === 42,
    elapsedMs: 3000,
  });
});

test("a turn that timed out records no fact at all", () => {
  const outcome = replayDuel({
    seed: "timeout",
    rival: "kade",
    unlocked: UNLOCKED,
    moves: [{ kind: "timeout" }, { kind: "timeout" }],
  });
  assert.equal(outcome.answers.length, 0);
  assert.equal(outcome.turns, 2);
});

test("every recorded fact fits what fact_mastery can store", () => {
  const { moves } = playDuel("vance", perfectMove);
  const outcome = replayDuel({ seed: "duel", rival: "vance", unlocked: UNLOCKED, moves });
  for (const answer of outcome.answers) {
    assert.ok(answer.a >= 1 && answer.a <= 99);
    assert.ok(answer.b >= 1 && answer.b <= MAX_TOOL);
  }
});

test("moves past the end of a duel are ignored", () => {
  const { moves } = playDuel("kade", perfectMove);
  const padded = [...moves, ...moves];
  const once = replayDuel({ seed: "duel", rival: "kade", unlocked: UNLOCKED, moves });
  const twice = replayDuel({ seed: "duel", rival: "kade", unlocked: UNLOCKED, moves: padded });
  assert.equal(once.coins, twice.coins);
  assert.equal(once.turns, twice.turns);
});

test("the daily cap tapers a farmed duel without stopping the practice", () => {
  const { moves } = playDuel("kade", perfectMove);
  const fresh = replayDuel({ seed: "duel", rival: "kade", unlocked: UNLOCKED, moves });
  const farmed = replayDuel({
    seed: "duel",
    rival: "kade",
    unlocked: UNLOCKED,
    moves,
    coinsToday: 5000,
  });

  assert.ok(farmed.coins < fresh.coins);
  assert.ok(farmed.coins > 0);
  assert.equal(farmed.capped, true);
  assert.deepEqual(farmed.answers, fresh.answers, "mastery still records in full");
});
