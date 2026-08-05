/**
 * Mode unlocking and the ×1 tutorial zone — docs/native/README.md §1.7, §1.8.
 *
 * Run with:  node --import ./test/register.mjs --test "src/**\/*.test.ts"
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  MODE_REQUIREMENTS,
  PRACTICE_MODES,
  RETIRED_MODES,
  SECTION_LABELS,
  availablePracticeModes,
  isRetired,
  modeAvailability,
  modeLabel,
  practiceModesBySection,
  type UnlockState,
} from "./modes";
import {
  DEFAULT_UNLOCK_ORDER,
  FREE_ZONE_COUNT,
  TRADE_ZONES,
  puzzleTables,
  zoneForTable,
} from "./zones";
import { canPlayCableRun } from "./cable-run";
import { legTables } from "./rally";
import { practiceWeight, emptyFactStats, applyAttempt } from "./mastery";
import type { RunMode } from "@/lib/supabase/types";

/** The unlock state a student reaches after N zones of the default order. */
function afterZones(n: number, divisionUnlocked: number[] = []): UnlockState {
  return { tables: DEFAULT_UNLOCK_ORDER.slice(0, n).sort((a, b) => a - b), divisionUnlocked };
}

/* -------------------------------------------------------- the ×1 zone */

test("×1 is a real zone, not the generic advanced fallback", () => {
  const zone = zoneForTable(1);
  assert.equal(zone.table, 1);
  assert.equal(zone.trade, "Labouring");
  assert.ok(TRADE_ZONES.some((z) => z.table === 1));
});

test("×1 leads the curriculum and the free tier is the first three zones", () => {
  assert.equal(DEFAULT_UNLOCK_ORDER[0], 1);
  assert.deepEqual(DEFAULT_UNLOCK_ORDER.slice(0, FREE_ZONE_COUNT), [1, 2, 10]);
});

test("every zone in the unlock order has a trade to show for it", () => {
  // The zones screen maps the order onto TRADE_ZONES and would render a hole.
  for (const table of DEFAULT_UNLOCK_ORDER) {
    assert.ok(
      TRADE_ZONES.some((z) => z.table === table),
      `×${table} is in the unlock order but has no zone`,
    );
  }
});

test("the puzzle generators never see ×1", () => {
  assert.deepEqual(puzzleTables([1, 2, 10]), [2, 10]);
  assert.deepEqual(puzzleTables([1]), []);
  assert.deepEqual(puzzleTables([1, 2, 13], 12), [2]);
});

test("a race on the free tier runs on real tables, not the identity", () => {
  // legTables used to pass ×1 straight through, handing out free distance.
  for (const route of ["sealed", "dirt"] as const) {
    for (let leg = 0; leg < 6; leg++) {
      assert.ok(
        !legTables([1, 2, 10], route, leg).includes(1),
        `×1 leaked into the ${route} route on leg ${leg}`,
      );
    }
  }
});

test("Cable Run's availability check counts what its generator can use", () => {
  // {1, 2} is two unlocked tables but only one usable one — the check has to
  // agree with generateBoard or it hands out a degenerate board.
  assert.equal(canPlayCableRun({ tables: [1, 2], divisionUnlocked: [1, 2] }), false);
  assert.equal(canPlayCableRun({ tables: [1, 2, 10], divisionUnlocked: [2] }), true);
  // Division on ×1 alone is not division.
  assert.equal(canPlayCableRun({ tables: [1, 2, 10], divisionUnlocked: [1] }), false);
});

/* ------------------------------------------------------- mode unlocking */

test("every run mode declares a requirement", () => {
  for (const mode of Object.keys(MODE_REQUIREMENTS) as RunMode[]) {
    assert.ok(MODE_REQUIREMENTS[mode].zones >= 1, `${mode} needs a zone threshold`);
  }
  for (const mode of PRACTICE_MODES) {
    assert.ok(MODE_REQUIREMENTS[mode.key], `${mode.key} is offered but has no requirement`);
  }
});

test("the tutorial zone alone opens the core loop and nothing else", () => {
  const unlock = afterZones(1);
  assert.equal(modeAvailability("job", unlock).playable, true);
  assert.equal(modeAvailability("garage", unlock).playable, true);
  assert.equal(modeAvailability("yard", unlock).playable, false);
  assert.equal(modeAvailability("scaffold", unlock).playable, false);
});

test("the free tier reaches every offered mode at three zones or under", () => {
  const free = afterZones(FREE_ZONE_COUNT, [2]);
  const reachable: RunMode[] = ["job", "garage", "toolbox", "yard", "rally", "crewrace", "cablerun"];
  for (const mode of reachable) {
    assert.equal(modeAvailability(mode, free).playable, true, `${mode} should be free`);
  }
});

/* ------------------------------------------------------------- retirement */

test("a retired mode fails politely instead of throwing", () => {
  // `run-start` looks the mode up before anything else, and an unknown key
  // doesn't 404 — it throws inside the function and returns a 500. Retired
  // modes therefore keep their requirement entry and refuse by name.
  for (const mode of Object.keys(RETIRED_MODES) as RunMode[]) {
    assert.ok(MODE_REQUIREMENTS[mode], `${mode} lost its requirement entry`);
    const availability = modeAvailability(mode, afterZones(DEFAULT_UNLOCK_ORDER.length, [2, 3, 5]));
    assert.equal(availability.playable, false, `${mode} is retired and must not be playable`);
  }
});

test("retirement beats every threshold, however much a student has unlocked", () => {
  // Retired modes sit at low zone counts, so a check ordered the other way
  // round would quietly hand them back to anyone past three zones.
  const everything = afterZones(DEFAULT_UNLOCK_ORDER.length, [2, 3, 5, 10]);
  const availability = modeAvailability("inspection", everything);
  assert.equal(availability.playable, false);
  if (availability.playable) return;
  assert.match(availability.reason, /closed down/i);
});

test("nothing retired is still on offer", () => {
  for (const mode of PRACTICE_MODES) {
    assert.equal(isRetired(mode.key), false, `${mode.key} is retired but still in the shed`);
  }
});

test("every retired mode keeps its label so old runs still read", () => {
  // `runs.mode` is text with a check constraint, not an enum — the rows are
  // still there and the parent dashboard still lists them.
  for (const mode of Object.keys(RETIRED_MODES) as RunMode[]) {
    assert.notEqual(modeLabel(mode), mode, `${mode} would render as a raw database key`);
  }
});

/* ---------------------------------------------------------------- sections */

test("every offered mode sits in a section, and every section has modes", () => {
  const groups = practiceModesBySection();
  assert.ok(groups.length > 0);
  assert.equal(
    groups.reduce((n, g) => n + g.modes.length, 0),
    PRACTICE_MODES.length,
    "a mode fell out of its section",
  );
  for (const group of groups) {
    assert.ok(SECTION_LABELS[group.section], `${group.section} has no label`);
    assert.ok(group.modes.length > 0, `${group.section} is empty and should not render`);
  }
});

test("The Big Job is a run mode but never a card", () => {
  // 100 questions shared with a teacher is an assessment that arrives, not a
  // way to practise picked off a list.
  assert.ok(MODE_REQUIREMENTS.bigjob, "bigjob is still a run mode");
  assert.equal(isRetired("bigjob"), false, "it is not retired, just not offered");
  assert.ok(!PRACTICE_MODES.some((m) => m.key === "bigjob"), "bigjob is not in the shed");
});

test("the modes that need breadth stay shut on the free tier", () => {
  const free = afterZones(FREE_ZONE_COUNT, [2, 10]);
  for (const mode of ["tooloff", "floorplan", "bigjob"] as RunMode[]) {
    const availability = modeAvailability(mode, free);
    assert.equal(availability.playable, false, `${mode} degrades on three zones`);
  }
});

test("a locked mode explains itself in trades, never in money", () => {
  const availability = modeAvailability("floorplan", afterZones(3));
  assert.equal(availability.playable, false);
  if (availability.playable) return;

  assert.match(availability.reason, /trades/);
  // The student app has no concept of money — §1.10.
  assert.doesNotMatch(availability.reason, /\$|pay|buy|subscri|upgrade|premium|unlock more/i);
});

test("Cable Run reports the division requirement separately from zones", () => {
  const noDivision = modeAvailability("cablerun", afterZones(4));
  assert.equal(noDivision.playable, false);
  if (!noDivision.playable) assert.match(noDivision.reason, /division/i);

  const withDivision = modeAvailability("cablerun", afterZones(4, [2]));
  assert.equal(withDivision.playable, true);
});

test("unlocking a zone never takes a mode away", () => {
  // The reason to gate on zones rather than Trade Rank: this must hold for
  // every mode at every step of the curriculum.
  for (const mode of Object.keys(MODE_REQUIREMENTS) as RunMode[]) {
    let wasPlayable = false;
    for (let zones = 1; zones <= DEFAULT_UNLOCK_ORDER.length; zones++) {
      const playable = modeAvailability(mode, afterZones(zones, [2, 3, 5])).playable;
      if (wasPlayable) assert.ok(playable, `${mode} disappeared at ${zones} zones`);
      wasPlayable = playable;
    }
  }
});

test("the hub can render every practice mode with its lock state in one pass", () => {
  const cards = availablePracticeModes(afterZones(FREE_ZONE_COUNT, [2]));
  assert.equal(cards.length, PRACTICE_MODES.length);
  assert.ok(cards.some((c) => c.availability.playable));
  assert.ok(cards.some((c) => !c.availability.playable));
});

/* --------------------------------------------- practice ordering guardrail */

test("need outranks difficulty — an unseen fact beats a hard shaky one", () => {
  // Difficulty is a tiebreaker, not a driver. If the nudge ever grows past the
  // gap between adjacent stages this inverts, and adaptive practice starts
  // skipping the facts a child has never attempted.
  const unseenEasy = practiceWeight(emptyFactStats(2, 5));
  const shakyHard = practiceWeight(
    applyAttempt(emptyFactStats(7, 8), { correct: false, elapsedMs: 5000 }),
  );
  assert.ok(unseenEasy > shakyHard, "an untouched fact is the highest need there is");
});

test("difficulty still breaks ties inside a stage", () => {
  assert.ok(practiceWeight(emptyFactStats(7, 8)) > practiceWeight(emptyFactStats(2, 10)));
});
