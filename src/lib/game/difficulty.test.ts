/**
 * Per-fact difficulty and reward weighting — docs/native/README.md §1.9.
 *
 * Run with:  node --import ./test/register.mjs --test "src/**\/*.test.ts"
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  BLUE_NOT_DUE_MULTIPLIER,
  DIFFICULTY_SPREAD,
  MEAN_COIN_WEIGHT,
  TRIVIAL_DIFFICULTY,
  coinWeight,
  factDifficulty,
  normalisedCoinWeight,
  normalisedTableWeight,
  parseFactKey,
  rewardMultiplier,
  tableDifficulty,
} from "./difficulty";
import type { MasteryStage } from "./mastery";

/** Floating-point comparison, since every weight is a product of decimals. */
function close(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

/* -------------------------------------------------------------- difficulty */

test("difficulty is commutative — 7×8 and 8×7 are one fact", () => {
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      close(factDifficulty(a, b), factDifficulty(b, a));
    }
  }
});

test("the whole ×1 row is exactly zero — the identity is not recall", () => {
  for (let b = 1; b <= 12; b++) {
    assert.equal(factDifficulty(1, b), 0);
    assert.equal(factDifficulty(b, 1), 0);
  }
});

test("7×8 is the hardest fact in the 12×12 grid", () => {
  let hardest = { a: 0, b: 0, d: -1 };
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      const d = factDifficulty(a, b);
      if (d > hardest.d) hardest = { a, b, d };
    }
  }
  assert.deepEqual([hardest.a, hardest.b], [7, 8]);
});

test("the rule-based tables sit at the bottom of the scale", () => {
  // ×1, ×10, ×2, ×5 and ×11 are procedures, not recalled facts. Each should
  // come in below a genuinely hard fact by a wide margin.
  const hard = factDifficulty(7, 8);
  for (const easy of [1, 10, 2, 5]) {
    assert.ok(
      factDifficulty(easy, 6) < hard / 2,
      `×${easy} should be far easier than 7×8`,
    );
  }
});

test("squares are discounted — 7×7 scores below 7×8", () => {
  assert.ok(factDifficulty(7, 7) < factDifficulty(7, 8));
  // But still harder than the easy tables.
  assert.ok(factDifficulty(7, 7) > factDifficulty(7, 2));
});

test("tables past 12 are treated as at least as hard as the hardest operand", () => {
  assert.ok(factDifficulty(13, 7) >= factDifficulty(7, 8));
});

test("table difficulty averages the row and orders the curriculum sensibly", () => {
  assert.equal(tableDifficulty(1), 0);
  assert.ok(tableDifficulty(10) < tableDifficulty(2));
  assert.ok(tableDifficulty(2) < tableDifficulty(5));
  assert.ok(tableDifficulty(5) < tableDifficulty(7));
});

/* ------------------------------------------------------------ coin weight */

test("coin weight floors at 1× and tops out at the full spread", () => {
  assert.equal(coinWeight(1, 9), 1);
  close(coinWeight(7, 8), 1 + DIFFICULTY_SPREAD * 0.9);
  assert.ok(coinWeight(7, 8) > 8);
});

test("a hard fact pays several times what an easy one does", () => {
  // The whole point of the change: 7×8 and 2×1 must not pay the same.
  assert.ok(coinWeight(7, 8) > coinWeight(2, 1) * 5);
});

/* ---------------------------------------------------------- mastery decay */

const FRESH = { stage: "none" as MasteryStage, due: true };

test("reward decays monotonically as a fact climbs the ladder", () => {
  const stages: MasteryStage[] = ["none", "bronze", "silver", "gold", "blue"];
  const paid = stages.map((stage) => rewardMultiplier(7, 8, { stage, due: true }));

  for (let i = 1; i < paid.length; i++) {
    assert.ok(paid[i] <= paid[i - 1], `${stages[i]} should not pay more than ${stages[i - 1]}`);
  }
  assert.ok(paid[paid.length - 1] < paid[0], "Blue must pay less than an unseen fact");
});

test("a mastered fact pays for the due check-in, not for repetition", () => {
  const due = rewardMultiplier(7, 8, { stage: "blue", due: true });
  const notDue = rewardMultiplier(7, 8, { stage: "blue", due: false });

  assert.ok(due > notDue, "the spaced-repetition check-in has to stay worth doing");
  assert.ok(notDue > 0, "grinding pays little, but a hard fact never pays nothing");
  close(notDue, normalisedCoinWeight(7, 8) * BLUE_NOT_DUE_MULTIPLIER);
});

/* ------------------------------------------------------------ normalising */

test("difficulty redistributes reward without inflating it", () => {
  // The grid has to average 1×, or every price in the shop and the daily coin
  // cap silently retune themselves the day this lands.
  let sum = 0;
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) sum += normalisedCoinWeight(a, b);
  }
  close(sum / 144, 1, 1e-12);
});

test("table weights normalise against the same mean as fact weights", () => {
  // coinWeight is affine in difficulty, so the mean of the row means is the
  // grid mean. If that stops holding, job offers drift against run payouts.
  let sum = 0;
  for (let t = 1; t <= 12; t++) sum += normalisedTableWeight(t);
  close(sum / 12, 1, 1e-12);
});

test("normalising preserves the spread between easy and hard", () => {
  const ratio = normalisedCoinWeight(7, 8) / normalisedCoinWeight(1, 5);
  close(ratio, coinWeight(7, 8) / coinWeight(1, 5));
  assert.ok(ratio > 8, "7×8 should still pay many times what 1×5 does");
});

test("an average fact pays about the old flat rate", () => {
  // 5×4 sits near the middle of the grid, so it should land close to 1×.
  const mid = normalisedCoinWeight(5, 4);
  assert.ok(mid > 0.5 && mid < 1.5, `expected a mid fact near 1×, got ${mid}`);
  assert.ok(MEAN_COIN_WEIGHT > 1, "the raw mean must exceed the floor weight");
});

test("mastered trivial facts pay nothing at all — the ×1 rule", () => {
  for (let b = 1; b <= 12; b++) {
    assert.equal(
      rewardMultiplier(1, b, { stage: "blue", due: true }),
      0,
      `1×${b} should pay nothing once mastered, even when due`,
    );
    assert.equal(rewardMultiplier(1, b, { stage: "blue", due: false }), 0);
  }
});

test("×1 still pays while it is being learned", () => {
  // "No reward after mastery" is not "no reward" — the tutorial zone has to
  // pay something or there is no reason to complete it.
  assert.ok(rewardMultiplier(1, 7, FRESH) > 0);
  assert.ok(rewardMultiplier(1, 7, { stage: "silver", due: true }) > 0);
});

test("the trivial floor catches 10×10 but leaves ×2 and ×10 trickling", () => {
  // The free tier is ×1, ×2 and ×10. It should wind down, not flatline —
  // see the note on TRIVIAL_DIFFICULTY.
  assert.ok(factDifficulty(10, 10) < TRIVIAL_DIFFICULTY);
  assert.equal(rewardMultiplier(10, 10, { stage: "blue", due: true }), 0);

  assert.ok(rewardMultiplier(2, 10, { stage: "blue", due: true }) > 0);
  assert.ok(rewardMultiplier(2, 2, { stage: "blue", due: true }) > 0);
});

test("a mastered hard fact still out-earns a fresh trivial one", () => {
  // Otherwise the cheapest way to earn is always to find something easy.
  assert.ok(rewardMultiplier(7, 8, { stage: "blue", due: true }) > rewardMultiplier(1, 5, FRESH));
});

/* ----------------------------------------------------------- fact parsing */

test("fact keys round-trip from the answer log", () => {
  assert.deepEqual(parseFactKey("7x8"), { a: 7, b: 8 });
  assert.deepEqual(parseFactKey("12x1"), { a: 12, b: 1 });
});

test("a malformed fact key is rejected rather than scored as NaN", () => {
  assert.equal(parseFactKey(""), null);
  assert.equal(parseFactKey("7"), null);
  assert.equal(parseFactKey("7xY"), null);
  assert.equal(parseFactKey("0x3"), null);
});
