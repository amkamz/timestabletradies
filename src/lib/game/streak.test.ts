/**
 * Streak tiers and points — docs/native/vision.md.
 *
 * Run with:  node --import ./test/register.mjs --test "src/**\/*.test.ts"
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DAYS_PER_TIER,
  EMPTY_STREAK,
  MAX_TIER,
  blockProgress,
  canAffordWithStreak,
  daysBetween,
  recordPlay,
  spendStreakPoints,
  type StreakState,
} from "./streak";

/** Play `days` consecutive days from 2026-01-01, returning the final state. */
function playConsecutive(days: number, from: StreakState = EMPTY_STREAK): StreakState {
  let state = from;
  const start = Date.UTC(2026, 0, 1);
  for (let i = 0; i < days; i++) {
    const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    state = recordPlay(state, date).state;
  }
  return state;
}

test("dates subtract across month and year boundaries", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-02"), 1);
  assert.equal(daysBetween("2026-01-31", "2026-02-01"), 1);
  assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
  assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1, "2026 is not a leap year");
  assert.equal(daysBetween("2026-01-02", "2026-01-01"), -1);
});

test("the first play starts a block without awarding anything", () => {
  const { state, pointsAwarded } = recordPlay(EMPTY_STREAK, "2026-01-01");
  assert.equal(state.daysIntoBlock, 1);
  assert.equal(state.tier, 0);
  assert.equal(pointsAwarded, 0);
});

test("playing twice in one day counts once", () => {
  // This is called from finishRun, which fires per run — a child doing four
  // jobs before breakfast has still played one day.
  const first = recordPlay(EMPTY_STREAK, "2026-01-01").state;
  const second = recordPlay(first, "2026-01-01");
  assert.deepEqual(second.state, first, "nothing moved");
  assert.equal(second.pointsAwarded, 0);
});

test("a clock that went backwards cannot mint points", () => {
  const state = playConsecutive(5);
  const back = recordPlay(state, "2025-06-01");
  assert.deepEqual(back.state, state, "a wrong device date changes nothing");
});

test("ten consecutive days is tier 1 and one point", () => {
  const state = playConsecutive(DAYS_PER_TIER);
  assert.equal(state.tier, 1);
  assert.equal(state.points, 1);
  assert.equal(state.daysIntoBlock, 0, "the block reset");
});

test("the payout is the new tier, so blocks pay 1, 2, 3 …", () => {
  assert.equal(playConsecutive(10).points, 1);
  assert.equal(playConsecutive(20).points, 3, "1 + 2");
  assert.equal(playConsecutive(30).points, 6, "1 + 2 + 3");
  assert.equal(playConsecutive(50).points, 15, "1 + 2 + 3 + 4 + 5");
});

test("tier caps at ten and blocks keep paying at that rate", () => {
  const at100 = playConsecutive(100);
  assert.equal(at100.tier, MAX_TIER);
  assert.equal(at100.points, 55, "the sum of 1 through 10");

  const at150 = playConsecutive(150);
  assert.equal(at150.tier, MAX_TIER, "cannot exceed the ceiling");
  assert.equal(at150.points, 105, "five more blocks at ten apiece");
});

test("the special items are reachable, and are months of work", () => {
  // 50–100 points is the intended weight for streak-only items. Ten blocks
  // (100 days) is 55 points; fifteen blocks (150 days) is 105.
  assert.ok(playConsecutive(90).points < 50, "not reachable inside three months");
  assert.ok(playConsecutive(100).points >= 50, "a 50-point item is a bit over three months");
  assert.ok(playConsecutive(140).points < 100, "and 100 points is not five months either");
  assert.ok(playConsecutive(150).points >= 100, "a 100-point item is about five months");
});

test("missing one day costs one tier, not the streak", () => {
  const before = playConsecutive(50);
  assert.equal(before.tier, 5);

  // Last played 2026-02-19; next play skips the 20th.
  const after = recordPlay(before, "2026-02-21");
  assert.equal(after.state.tier, 4, "nine goes to eight, not to nothing");
  assert.equal(after.tiersLost, 1);
  assert.equal(after.state.daysIntoBlock, 1, "a new block starts");
});

test("missing several days costs one tier each", () => {
  // 50 consecutive days from 2026-01-01 ends on 2026-02-19. Returning on the
  // 23rd means the 20th, 21st and 22nd were missed — three days, three tiers.
  const before = playConsecutive(50);
  assert.equal(before.lastPlayedOn, "2026-02-19");

  const after = recordPlay(before, "2026-02-23");
  assert.equal(after.tiersLost, 3, "three days missed");
  assert.equal(after.state.tier, 2, "five down to two");
});

test("a long absence bottoms out at zero rather than going negative", () => {
  const before = playConsecutive(20);
  const after = recordPlay(before, "2027-01-01");
  assert.equal(after.state.tier, 0);
  assert.ok(after.tiersLost >= 0, "never reports a negative loss");
});

test("points already earned are never clawed back", () => {
  const before = playConsecutive(50);
  const after = recordPlay(before, "2027-01-01").state;
  assert.equal(after.points, before.points, "a missed day costs rate, never balance");
});

test("spending checks the balance and leaves the tier alone", () => {
  const state = playConsecutive(100);
  assert.equal(canAffordWithStreak(state, 50), true);
  assert.equal(canAffordWithStreak(state, 500), false);

  const spent = spendStreakPoints(state, 50);
  assert.ok(spent);
  assert.equal(spent.points, state.points - 50);
  assert.equal(spent.tier, state.tier, "buying something does not break the streak");

  assert.equal(spendStreakPoints(state, 500), null, "cannot overdraw");
});

test("the meter reads zero to a hundred across a block", () => {
  assert.equal(blockProgress(EMPTY_STREAK), 0);
  assert.equal(blockProgress(playConsecutive(5)), 50);
  assert.equal(blockProgress(playConsecutive(10)), 0, "a completed block starts the next");
});
