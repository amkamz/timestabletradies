/**
 * City level and XP — docs/native/vision.md.
 *
 * Run with:  node --import ./test/register.mjs --test "src/**\/*.test.ts"
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  FIRST_LEVEL_XP,
  levelFromXp,
  levelLabel,
  levelsGained,
  xpForLevel,
  xpForRun,
  xpToCompleteLevel,
  xpToReachLevel,
} from "./city-level";

test("a new city is level 1 with an empty bar", () => {
  const progress = levelFromXp(0);
  assert.equal(progress.level, 1);
  assert.equal(progress.intoLevel, 0);
  assert.equal(progress.percent, 0);
  assert.equal(progress.remaining, FIRST_LEVEL_XP);
});

test("the first level is the cheapest, so day one can reach level 2", () => {
  // The tutorial boss is meant to land a full level inside the first fifteen
  // minutes. A first level priced like the tenth makes that impossible.
  assert.ok(xpForLevel(1) < xpForLevel(2));
  assert.ok(xpForLevel(1) < xpForLevel(5));
});

test("levels get longer, never shorter", () => {
  for (let level = 1; level < 30; level++) {
    assert.ok(
      xpForLevel(level + 1) >= xpForLevel(level),
      `level ${level + 1} is cheaper than level ${level}`,
    );
  }
});

test("the level boundary is exact at both ends", () => {
  const needed = xpForLevel(1);
  assert.equal(levelFromXp(needed - 1).level, 1, "one short is still level 1");
  assert.equal(levelFromXp(needed).level, 2, "exactly enough levels up");
  assert.equal(levelFromXp(needed).intoLevel, 0, "and the new bar starts empty");
});

test("xpToReachLevel agrees with walking the levels", () => {
  for (let level = 1; level <= 20; level++) {
    const progress = levelFromXp(xpToReachLevel(level));
    assert.equal(progress.level, level, `total XP for level ${level} lands on it`);
    assert.equal(progress.intoLevel, 0, `and lands exactly on the boundary`);
  }
});

test("the bar never reads over a hundred or under zero", () => {
  for (let xp = 0; xp < 5000; xp += 7) {
    const progress = levelFromXp(xp);
    assert.ok(progress.percent >= 0 && progress.percent <= 100, `${xp} XP gave ${progress.percent}%`);
    assert.ok(progress.intoLevel < progress.levelNeeds, `${xp} XP overflowed its level`);
  }
});

test("negative or fractional XP is treated as none", () => {
  assert.equal(levelFromXp(-500).level, 1);
  assert.equal(levelFromXp(-500).intoLevel, 0);
  assert.equal(levelFromXp(10.9).intoLevel, 10, "fractions floor rather than accumulate");
});

test("a boss awards exactly the rest of the level, whatever the bar reads", () => {
  // "Beating a boss advances a full level" has to mean the bar completes — a
  // fixed lump would rob a child sitting three XP short of levelling.
  for (const xp of [0, 1, 59, 60, 100, 331, 1200]) {
    const award = xpToCompleteLevel(xp);
    const after = levelFromXp(xp + award);
    assert.equal(after.level, levelFromXp(xp).level + 1, `${xp} XP + boss should level exactly once`);
    assert.equal(after.intoLevel, 0, `${xp} XP + boss should land on the boundary`);
  }
});

test("levelsGained reports nothing when nothing changed", () => {
  assert.equal(levelsGained(100, 100), 0);
  assert.equal(levelsGained(100, 101), 0, "an XP trickle is not a level");
  assert.equal(levelsGained(0, FIRST_LEVEL_XP), 1);
});

test("levelsGained counts a multi-level jump", () => {
  const threeLevels = xpToReachLevel(4);
  assert.equal(levelsGained(0, threeLevels), 3);
});

test("levels never go backwards, even on a bad read", () => {
  // City level is the fix for Trade Rank being able to fall. If this can ever
  // report a negative, something downstream will show a child losing a level.
  assert.equal(levelsGained(1000, 0), 0);
});

/* ------------------------------------------------------------- earning XP */

test("daily jobs pay the full rate and everything else pays less", () => {
  // A game should never be worth more than the work. This is the lever that
  // keeps the daily board worth opening.
  const correct = 10;
  const job = xpForRun("job", correct);
  for (const mode of ["garage", "toolbox", "cablerun", "rally", "yard"]) {
    assert.ok(xpForRun(mode, correct) < job, `${mode} should pay less than a job`);
  }
});

test("only correct answers earn XP", () => {
  assert.equal(xpForRun("job", 0), 0);
  assert.equal(xpForRun("job", -5), 0, "a nonsense count cannot mint XP");
  assert.ok(xpForRun("job", 10) > xpForRun("job", 5));
});

test("a first day of daily jobs reaches level 2 and starts on level 3", () => {
  // Four daily jobs of ten questions, answered well. The tutorial boss then
  // completes the level, and the child has seen a level-up inside one sitting.
  const dayOne = 4 * xpForRun("job", 9);
  const before = levelFromXp(dayOne);
  assert.ok(before.level >= 2, `day one reached level ${before.level}`);

  const afterBoss = levelFromXp(dayOne + xpToCompleteLevel(dayOne));
  assert.equal(afterBoss.level, before.level + 1, "the boss lands a full level");
});

test("the badge is a number, not a title", () => {
  // Ten rank titles told a child nothing about which was further along.
  assert.equal(levelLabel(0), "Level 1");
  assert.equal(levelLabel(xpToReachLevel(7)), "Level 7");
});
