/**
 * Entitlement and the free tier — docs/native/README.md §1.6, §1.10.
 *
 * Run with:  node --import ./test/register.mjs --test "src/**\/*.test.ts"
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  atFreeTierCeiling,
  canUnlockZone,
  freeTables,
  isEntitled,
  playableTables,
  tablesLockedByPlan,
  type Entitlement,
} from "./entitlement";
import { DEFAULT_UNLOCK_ORDER, FREE_ZONE_COUNT } from "./zones";

const PAID: Entitlement = { tier: "full", status: "active", expiresAt: null };
const FREE: Entitlement = null;

/** A student part-way through the curriculum. */
const EIGHT_ZONES = DEFAULT_UNLOCK_ORDER.slice(0, 8).sort((a, b) => a - b);

/* ------------------------------------------------------------- entitlement */

test("no entitlement row at all is the free tier", () => {
  assert.equal(isEntitled(FREE), false);
});

test("an active paid entitlement is entitled", () => {
  assert.equal(isEntitled(PAID), true);
});

test("grace keeps a child playing while a parent fixes their card", () => {
  // A failed renewal is between the parent and their bank. Locking a kid out
  // of the ×7 zone mid-session is not how to raise it.
  assert.equal(isEntitled({ tier: "full", status: "grace", expiresAt: null }), true);
});

test("expired status and past expiry both drop to free", () => {
  assert.equal(isEntitled({ tier: "full", status: "expired", expiresAt: null }), false);
  assert.equal(
    isEntitled({ tier: "full", status: "active", expiresAt: "2020-01-01T00:00:00.000Z" }),
    false,
  );
});

test("expiry is evaluated against the clock it is given", () => {
  const entitlement: Entitlement = {
    tier: "full",
    status: "active",
    expiresAt: "2030-06-01T00:00:00.000Z",
  };
  assert.equal(isEntitled(entitlement, new Date("2030-05-31T00:00:00.000Z")), true);
  assert.equal(isEntitled(entitlement, new Date("2030-06-02T00:00:00.000Z")), false);
});

/* --------------------------------------------------------------- free set */

test("the free tier is the first three zones of the curriculum", () => {
  assert.deepEqual(freeTables(), [1, 2, 10]);
  assert.equal(freeTables().length, FREE_ZONE_COUNT);
});

test("the free set is derived from the unlock order, not written down twice", () => {
  const custom = [7, 3, 9, 4, 2];
  assert.deepEqual(freeTables(custom), custom.slice(0, FREE_ZONE_COUNT));
});

/* --------------------------------------------------------- playable tables */

test("a paid family plays everything it has unlocked", () => {
  assert.deepEqual(playableTables(EIGHT_ZONES, PAID), EIGHT_ZONES);
});

test("a free family plays only the free set, whatever it has unlocked", () => {
  assert.deepEqual(playableTables(EIGHT_ZONES, FREE), [1, 2, 10]);
});

test("lapsing caps play without destroying progress", () => {
  // The eight unlocked zones are still there — the child keeps three of them
  // and gets all eight back the moment the subscription resumes.
  const lapsed: Entitlement = { tier: "full", status: "expired", expiresAt: null };
  assert.deepEqual(playableTables(EIGHT_ZONES, lapsed), [1, 2, 10]);
  assert.deepEqual(playableTables(EIGHT_ZONES, PAID), EIGHT_ZONES);
});

test("the cap follows curriculum order, not whatever sorts lowest", () => {
  // ×3 and ×4 sort below ×10 but come later in the curriculum. A lapsed family
  // must not end up with an arbitrary trio the child never learned as a group.
  const playable = playableTables(EIGHT_ZONES, FREE);
  assert.ok(!playable.includes(3));
  assert.ok(!playable.includes(4));
  assert.ok(playable.includes(10));
});

test("a free family part-way through the free tier plays what it has", () => {
  assert.deepEqual(playableTables([1, 2], FREE), [1, 2]);
  assert.deepEqual(playableTables([1], FREE), [1]);
});

test("locked-by-plan is the parent's view of the same split", () => {
  assert.deepEqual(tablesLockedByPlan(EIGHT_ZONES, FREE), [3, 4, 5, 6, 8]);
  assert.deepEqual(tablesLockedByPlan(EIGHT_ZONES, PAID), []);
});

test("playable and locked-by-plan partition the unlocked set exactly", () => {
  for (const entitlement of [PAID, FREE]) {
    const playable = playableTables(EIGHT_ZONES, entitlement);
    const locked = tablesLockedByPlan(EIGHT_ZONES, entitlement);
    assert.equal(playable.length + locked.length, EIGHT_ZONES.length);
    assert.deepEqual([...playable, ...locked].sort((a, b) => a - b), EIGHT_ZONES);
  }
});

/* ------------------------------------------------------------- unlock gate */

test("a free family can open zones up to the free ceiling and no further", () => {
  assert.equal(canUnlockZone([1], FREE), true);
  assert.equal(canUnlockZone([1, 2], FREE), true);
  assert.equal(canUnlockZone([1, 2, 10], FREE), false);
});

test("a paid family can always open the next zone", () => {
  assert.equal(canUnlockZone(EIGHT_ZONES, PAID), true);
});

test("the ceiling flag fires exactly when the free tier runs out", () => {
  assert.equal(atFreeTierCeiling([1, 2], FREE), false);
  assert.equal(atFreeTierCeiling([1, 2, 10], FREE), true);
  // A paid family never hits it, however far along they are.
  assert.equal(atFreeTierCeiling(EIGHT_ZONES, PAID), false);
});

test("the ceiling and the unlock gate agree", () => {
  // Two ways of asking the same question; they must never disagree, or the
  // app offers a next zone it will then refuse to open.
  for (let n = 1; n <= DEFAULT_UNLOCK_ORDER.length; n++) {
    const unlocked = DEFAULT_UNLOCK_ORDER.slice(0, n);
    assert.equal(
      atFreeTierCeiling(unlocked, FREE),
      !canUnlockZone(unlocked, FREE),
      `disagreed at ${n} zones`,
    );
  }
});
