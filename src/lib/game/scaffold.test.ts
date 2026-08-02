/**
 * Scaffold Stack rules — docs/game-modes/04-scaffold-stack.md §11.
 *
 * Run with:  node --test "src/lib/game/**\/*.test.ts"
 * Node strips the types natively, so this needs no test framework.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  BRACE_EVERY,
  CAPPED_RATE,
  COINS_PER_PLANK,
  DAILY_COIN_CAP,
  MATERIALS_CAP,
  MILESTONE_COINS,
  MIN_PAID_HEIGHT,
  PERSONAL_BEST_COINS,
  RAMP_FLOOR_SECONDS,
  TOPPLE_AT,
  brace,
  braceOffered,
  buildQuestions,
  danger,
  emptyTower,
  hasToppled,
  place,
  questionTier,
  scaffoldReward,
  timerSecondsFor,
  weakestTables,
  wobble,
  type Side,
  type Tower,
} from "./scaffold";
import { practiceWeight, emptyFactStats, applyAttempt, stageForFact } from "./mastery";

/* ------------------------------------------------------------- tilt model */

test("placing from centre leans toward the side placed on", () => {
  assert.equal(place(emptyTower(), { length: 4, side: "left" }).tilt, -1);
  assert.equal(place(emptyTower(), { length: 4, side: "right" }).tilt, 1);
});

test("placing on the light side pulls the tower back toward centre", () => {
  const leaningRight: Tower = { height: 3, tilt: 3, planks: [] };
  assert.equal(place(leaningRight, { length: 4, side: "left" }).tilt, 2);
});

test("placing on the heavy side makes it worse", () => {
  const leaningRight: Tower = { height: 3, tilt: 3, planks: [] };
  assert.equal(place(leaningRight, { length: 4, side: "right" }).tilt, 4);
});

test("a top-heavy plank always leaves the lean one step further out", () => {
  // Correcting with a long plank still helps, but less than a short one.
  const leaningRight: Tower = { height: 3, tilt: 3, planks: [] };
  assert.equal(place(leaningRight, { length: 12, side: "left" }).tilt, 3);
  // And on the heavy side it costs two steps rather than one.
  assert.equal(place(leaningRight, { length: 12, side: "right" }).tilt, 5);
  // Landing exactly on centre, it tips the way it was placed.
  const leaningRightOne: Tower = { height: 1, tilt: 1, planks: [] };
  assert.equal(place(leaningRightOne, { length: 12, side: "left" }).tilt, -1);
});

test("height always increases by exactly one per plank", () => {
  let tower = emptyTower();
  for (let i = 0; i < 20; i++) {
    tower = place(tower, { length: 3, side: i % 2 === 0 ? "left" : "right" });
  }
  assert.equal(tower.height, 20);
  assert.equal(tower.planks.length, 20);
});

test("a wrong answer wobbles further the way the tower already leans", () => {
  assert.equal(wobble({ height: 1, tilt: 2, planks: [] }).tilt, 3);
  assert.equal(wobble({ height: 1, tilt: -2, planks: [] }).tilt, -3);
  // From dead centre it leans right, arbitrarily but deterministically.
  assert.equal(wobble(emptyTower()).tilt, 1);
});

test("a single early mistake cannot topple the tower", () => {
  assert.equal(hasToppled(wobble(emptyTower())), false);
});

test("a brace pulls two steps toward centre and never past it", () => {
  assert.equal(brace({ height: 1, tilt: 5, planks: [] }).tilt, 3);
  assert.equal(brace({ height: 1, tilt: -5, planks: [] }).tilt, -3);
  assert.equal(brace({ height: 1, tilt: 1, planks: [] }).tilt, 0);
  assert.equal(brace(emptyTower()).tilt, 0);
});

test("braces are offered every ten planks, never at height zero", () => {
  assert.equal(braceOffered(0), false);
  assert.equal(braceOffered(BRACE_EVERY), true);
  assert.equal(braceOffered(BRACE_EVERY * 3), true);
  assert.equal(braceOffered(BRACE_EVERY + 1), false);
});

test("the tower topples at the published threshold, both ways", () => {
  assert.equal(hasToppled({ height: 1, tilt: TOPPLE_AT - 1, planks: [] }), false);
  assert.equal(hasToppled({ height: 1, tilt: TOPPLE_AT, planks: [] }), true);
  assert.equal(hasToppled({ height: 1, tilt: -TOPPLE_AT, planks: [] }), true);
});

test("danger reads 0 at centre and 1 at the topple point", () => {
  assert.equal(danger(emptyTower()), 0);
  assert.equal(danger({ height: 1, tilt: TOPPLE_AT, planks: [] }), 1);
  assert.equal(danger({ height: 1, tilt: -TOPPLE_AT, planks: [] }), 1);
});

test("every reachable tilt can be driven to a topple in bounded moves", () => {
  // No state is a dead end where the run can neither continue nor end.
  for (let tilt = -TOPPLE_AT + 1; tilt <= TOPPLE_AT - 1; tilt++) {
    let tower: Tower = { height: 0, tilt, planks: [] };
    let moves = 0;
    while (!hasToppled(tower) && moves < TOPPLE_AT * 2 + 2) {
      tower = wobble(tower);
      moves++;
    }
    assert.ok(hasToppled(tower), `tilt ${tilt} never toppled`);
  }
});

/* ------------------------------------------------------- replay determinism */

test("a run replays identically from the same move list", () => {
  const moves: Array<{ length: number; side: Side; correct: boolean }> = [
    { length: 4, side: "left", correct: true },
    { length: 9, side: "right", correct: true },
    { length: 3, side: "left", correct: false },
    { length: 7, side: "left", correct: true },
    { length: 12, side: "right", correct: true },
  ];

  const run = () =>
    moves.reduce(
      (tower, m) => (m.correct ? place(tower, { length: m.length, side: m.side }) : wobble(tower)),
      emptyTower(),
    );

  assert.deepEqual(run(), run());
  assert.equal(run().height, 4); // one wrong answer earns no plank
});

/* ------------------------------------------------------------------- ramp */

test("the clock ramps down with height and stops at the floor", () => {
  assert.equal(timerSecondsFor(0), 8);
  assert.equal(timerSecondsFor(5), 7.75);
  assert.equal(timerSecondsFor(50), 5.5);
  assert.equal(timerSecondsFor(100), RAMP_FLOOR_SECONDS);
  assert.equal(timerSecondsFor(10_000), RAMP_FLOOR_SECONDS);
});

test("the ramp is monotonic — the clock never gets longer", () => {
  for (let h = 1; h < 300; h++) {
    assert.ok(timerSecondsFor(h) <= timerSecondsFor(h - 1));
  }
});

/* -------------------------------------------------------------- question mix */

test("difficulty escalates with height", () => {
  assert.deepEqual(questionTier(0), { source: "strong", format: "choice", division: false });
  assert.deepEqual(questionTier(15), { source: "weighted", format: "choice", division: false });
  assert.deepEqual(questionTier(30), { source: "weighted", format: "type", division: false });
  assert.deepEqual(questionTier(50), { source: "weak", format: "type", division: true });
});

test("weakestTables ranks by summed practice weight, worst first", () => {
  const mastery = new Map<string, ReturnType<typeof emptyFactStats>>();
  for (let b = 1; b <= 12; b++) {
    // ×7 is attempted but shaky.
    mastery.set(`7x${b}`, applyAttempt(emptyFactStats(7, b), { correct: false, elapsedMs: 5000 }));
    // ×5 is attempted and reliable but slow — Silver.
    let middling = emptyFactStats(5, b);
    for (let i = 0; i < 5; i++) {
      middling = applyAttempt(middling, { correct: true, elapsedMs: 5200 });
    }
    mastery.set(`5x${b}`, middling);
    // ×2 is fast and accurate.
    let strong = emptyFactStats(2, b);
    for (let i = 0; i < 5; i++) {
      strong = applyAttempt(strong, { correct: true, elapsedMs: 900 });
    }
    mastery.set(`2x${b}`, strong);
  }
  const weightFor = (a: number, b: number) =>
    practiceWeight(mastery.get(`${a}x${b}`) ?? emptyFactStats(a, b));

  assert.deepEqual(weakestTables([2, 5, 7], weightFor, 3), [7, 5, 2]);
});

test("a table never attempted outranks one the student is merely shaky on", () => {
  // practiceWeight treats an untouched fact as the highest need there is, so
  // an unseen table has to sort above a struggling one — Scaffold Stack's deep
  // tiers should be pulling in the facts that have never been seen at all.
  const mastery = new Map<string, ReturnType<typeof emptyFactStats>>();
  for (let b = 1; b <= 12; b++) {
    mastery.set(`7x${b}`, applyAttempt(emptyFactStats(7, b), { correct: false, elapsedMs: 5000 }));
  }
  const weightFor = (a: number, b: number) =>
    practiceWeight(mastery.get(`${a}x${b}`) ?? emptyFactStats(a, b));

  assert.deepEqual(weakestTables([7, 11], weightFor, 2), [11, 7]);
});

test("early questions carry multiple choice, deep questions are typed", () => {
  const weightFor = () => 1;
  const opts = {
    seed: "test-seed",
    count: 5,
    tables: [2, 5, 7],
    divisionUnlocked: [2],
    weightFor,
  };

  const early = buildQuestions({ ...opts, height: 3 });
  assert.equal(early.length, 5);
  assert.ok(early.every((q) => q.choices && q.choices.length === 4));
  assert.ok(early.every((q) => q.operation === "multiply"));

  const deep = buildQuestions({ ...opts, height: 60 });
  assert.ok(deep.every((q) => q.choices === undefined));
});

test("division never appears for a table that has not unlocked it", () => {
  const questions = buildQuestions({
    seed: "no-division",
    height: 80,
    count: 40,
    tables: [2, 5, 7],
    divisionUnlocked: [],
    weightFor: () => 1,
  });
  assert.ok(questions.every((q) => q.operation === "multiply"));
});

test("the same seed and height produce the same questions", () => {
  const opts = {
    seed: "stable",
    height: 12,
    count: 6,
    tables: [3, 4],
    divisionUnlocked: [],
    weightFor: () => 1,
  };
  assert.deepEqual(
    buildQuestions(opts).map((q) => q.prompt),
    buildQuestions(opts).map((q) => q.prompt),
  );
});

/* ----------------------------------------------------------------- payout */

test("a run below the paid floor earns nothing", () => {
  const reward = scaffoldReward({ height: MIN_PAID_HEIGHT - 1, previousBest: 0, coinsToday: 0 });
  assert.equal(reward.coins, 0);
  assert.equal(reward.materials, 0);
  assert.equal(reward.newPersonalBest, false);
});

test("coins are planks plus milestones plus a personal best", () => {
  const reward = scaffoldReward({ height: 20, previousBest: 30, coinsToday: 0 });
  assert.equal(reward.coins, 20 * COINS_PER_PLANK + 2 * MILESTONE_COINS);
  assert.equal(reward.newPersonalBest, false);

  const best = scaffoldReward({ height: 20, previousBest: 10, coinsToday: 0 });
  assert.equal(best.coins, 20 * COINS_PER_PLANK + 2 * MILESTONE_COINS + PERSONAL_BEST_COINS);
  assert.equal(best.newPersonalBest, true);
});

test("materials accrue per five planks and stop at the cap", () => {
  assert.equal(scaffoldReward({ height: 5, previousBest: 99, coinsToday: 0 }).materials, 1);
  assert.equal(scaffoldReward({ height: 22, previousBest: 99, coinsToday: 0 }).materials, 4);
  assert.equal(
    scaffoldReward({ height: 500, previousBest: 999, coinsToday: 0 }).materials,
    MATERIALS_CAP,
  );
});

test("the daily cap pays full up to the line and a quarter beyond it", () => {
  const under = scaffoldReward({ height: 10, previousBest: 99, coinsToday: 0 });
  assert.equal(under.capped, false);
  assert.equal(under.coins, under.uncappedCoins);

  // Straddling the cap: part at full rate, the remainder at the reduced one.
  const straddle = scaffoldReward({ height: 10, previousBest: 99, coinsToday: DAILY_COIN_CAP - 10 });
  const overflow = straddle.uncappedCoins - 10;
  assert.equal(straddle.capped, true);
  assert.equal(straddle.coins, Math.round(10 + overflow * CAPPED_RATE));

  // Well past it: everything at the reduced rate, but never zero.
  const over = scaffoldReward({ height: 10, previousBest: 99, coinsToday: DAILY_COIN_CAP * 2 });
  assert.equal(over.coins, Math.round(over.uncappedCoins * CAPPED_RATE));
  assert.ok(over.coins > 0);
});

test("a capped run still records its personal best", () => {
  const reward = scaffoldReward({ height: 40, previousBest: 10, coinsToday: DAILY_COIN_CAP });
  assert.equal(reward.newPersonalBest, true);
  assert.ok(reward.coins > 0);
});

/* ------------------------------------------- untimed attempts (contract §2.3) */

test("untimed attempts raise accuracy but never certify fluency", () => {
  let stats = emptyFactStats(6, 8);
  for (let i = 0; i < 12; i++) {
    stats = applyAttempt(stats, { correct: true, elapsedMs: 45_000, countsForSpeed: false });
  }

  assert.equal(stats.attempts, 12);
  assert.equal(stats.correct, 12);
  assert.equal(stats.speedAttempts, 0);
  // 45 seconds of thinking never entered the speed average...
  assert.equal(stats.avgMs, 0);
  // ...and with no timed sample the fact tops out at Silver.
  assert.equal(stageForFact(stats), "silver");
  assert.equal(stats.retentionHits, 0);
});

test("timed attempts still behave exactly as before", () => {
  let stats = emptyFactStats(6, 8);
  stats = applyAttempt(stats, { correct: true, elapsedMs: 1000 });
  stats = applyAttempt(stats, { correct: true, elapsedMs: 2000 });

  assert.equal(stats.speedAttempts, 2);
  assert.equal(stats.avgMs, 1500);
  assert.equal(stageForFact(stats), "gold");
});

test("an untimed attempt does not dilute an established speed average", () => {
  let stats = emptyFactStats(6, 8);
  stats = applyAttempt(stats, { correct: true, elapsedMs: 1000 });
  stats = applyAttempt(stats, { correct: true, elapsedMs: 1000 });
  const before = stats.avgMs;

  stats = applyAttempt(stats, { correct: true, elapsedMs: 60_000, countsForSpeed: false });
  assert.equal(stats.avgMs, before);

  // The next timed answer is weighted against the timed samples only, so one
  // puzzle session doesn't make the next real answer swing the mean wildly.
  stats = applyAttempt(stats, { correct: true, elapsedMs: 2000 });
  assert.equal(stats.avgMs, Math.round((1000 + 1000 + 2000) / 3));
});

test("a miss drops retention whether or not it was timed", () => {
  let stats = emptyFactStats(6, 8);
  stats = { ...stats, retentionHits: 2 };
  stats = applyAttempt(stats, { correct: false, elapsedMs: 30_000, countsForSpeed: false });
  assert.equal(stats.retentionHits, 0);
});
