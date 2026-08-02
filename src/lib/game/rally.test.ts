/**
 * Ute Rally rules — docs/game-modes/02-ute-rally.md §12.
 *
 * The central tuning claim is the crossover: the dirt shortcut has to be the
 * better play for a child who is close to fluent and the worse one for a child
 * who isn't. That claim is simulated here, and it should fail loudly if the
 * speed values ever drift.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  COINS_PER_CORRECT,
  DIRT_SPEED,
  LEGS,
  PLACEMENT_COINS,
  QUESTIONS_PER_LEG,
  SEALED_SPEED,
  botDistance,
  botTakesShortcut,
  buildField,
  lengthsFor,
  buildLeg,
  legTables,
  replayRally,
  routeForLeg,
  speedFor,
  type RallyAnswer,
  type Route,
} from "./rally";
import { makeRng } from "./questions";

const TABLES = [2, 10, 5, 3, 4, 8, 6];
const DIVISION = [2, 10, 5];

/** Answer a whole rally at a given accuracy, taking the same road each leg. */
function driveRally(seed: string, route: Route, accuracy: number): {
  routes: Route[];
  answers: RallyAnswer[];
} {
  const routes: Route[] = Array.from({ length: LEGS }, () => route);
  const answers: RallyAnswer[] = [];

  for (let leg = 0; leg < LEGS; leg++) {
    const actual = routeForLeg(leg, route);
    const questions = buildLeg({
      seed,
      leg,
      route: actual,
      tables: TABLES,
      divisionUnlocked: DIVISION,
    });
    questions.forEach((q, i) => {
      answers.push({
        a: q.a,
        b: q.b,
        operation: q.operation,
        // Deterministic pattern rather than a coin flip, so the simulation is
        // reproducible: get the first `accuracy` share of each leg right.
        correct: i < Math.round(accuracy * QUESTIONS_PER_LEG),
        elapsedMs: 2600,
      });
    });
  }

  return { routes, answers };
}

/* ------------------------------------------------------------------- legs */

test("the first leg is always sealed, whatever was chosen", () => {
  assert.equal(routeForLeg(0, "dirt"), "sealed");
  assert.equal(routeForLeg(1, "dirt"), "dirt");
  assert.equal(routeForLeg(1, "sealed"), "sealed");
});

test("the dirt runs on one shaky table for the whole leg", () => {
  const dirt = legTables(TABLES, "dirt", 1);
  assert.equal(dirt.length, 1);
  // ...and it comes from the back of the curriculum order.
  assert.ok(TABLES.slice(-3).includes(dirt[0]));
});

test("the sealed road draws on the tables unlocked earliest", () => {
  const sealed = legTables(TABLES, "sealed", 1);
  assert.ok(sealed.length >= 2);
  assert.ok(sealed.every((t) => TABLES.indexOf(t) < TABLES.length / 2 + 1));
});

test("a student with two tables still gets both roads", () => {
  assert.deepEqual(legTables([2, 5], "sealed", 0), [2, 5]);
  assert.deepEqual(legTables([2, 5], "dirt", 0), [2, 5]);
});

test("sealed legs are multiple choice, dirt legs are typed", () => {
  const sealed = buildLeg({ seed: "s", leg: 1, route: "sealed", tables: TABLES, divisionUnlocked: DIVISION });
  const dirt = buildLeg({ seed: "s", leg: 1, route: "dirt", tables: TABLES, divisionUnlocked: DIVISION });

  assert.equal(sealed.length, QUESTIONS_PER_LEG);
  assert.ok(sealed.every((q) => q.choices && q.choices.length === 4));
  assert.ok(dirt.every((q) => q.choices === undefined));
});

test("sealed legs never ask division", () => {
  for (let leg = 0; leg < LEGS; leg++) {
    const sealed = buildLeg({ seed: "d", leg, route: "sealed", tables: TABLES, divisionUnlocked: DIVISION });
    assert.ok(sealed.every((q) => q.operation === "multiply"));
  }
});

test("a leg is deterministic from its seed and road", () => {
  const once = buildLeg({ seed: "x", leg: 2, route: "dirt", tables: TABLES, divisionUnlocked: DIVISION });
  const twice = buildLeg({ seed: "x", leg: 2, route: "dirt", tables: TABLES, divisionUnlocked: DIVISION });
  assert.deepEqual(once.map((q) => q.prompt), twice.map((q) => q.prompt));
});

/* ------------------------------------------------------------------ field */

test("the field always contains someone genuinely slower", () => {
  for (let i = 0; i < 40; i++) {
    const field = buildField(`field-${i}`);
    assert.equal(field.length, 3);
    assert.ok(
      field.some((racer) => racer.paceMs >= 4200),
      `field ${i} has nobody a struggling child can beat`,
    );
  }
});

test("every opponent is labelled as practice crew", () => {
  assert.ok(buildField("labels").every((racer) => racer.simulated));
});

test("confident racers gamble more often than timid ones", () => {
  const rng = makeRng("gamble");
  const bold = { id: "b", name: "b", simulated: true, paceMs: 2400, accuracy: 0.96 };
  const timid = { id: "t", name: "t", simulated: true, paceMs: 4800, accuracy: 0.66 };

  let boldRuns = 0;
  let timidRuns = 0;
  for (let i = 0; i < 400; i++) {
    if (botTakesShortcut(rng, bold)) boldRuns++;
    if (botTakesShortcut(rng, timid)) timidRuns++;
  }
  assert.ok(boldRuns > timidRuns * 2, `bold ${boldRuns} vs timid ${timidRuns}`);
});

test("bot distance is deterministic and inside the possible range", () => {
  for (let i = 0; i < 30; i++) {
    const field = buildField(`bots-${i}`);
    for (const racer of field) {
      const distance = botDistance(`bots-${i}`, racer);
      assert.equal(distance, botDistance(`bots-${i}`, racer));
      assert.ok(distance >= 0);
      assert.ok(distance <= LEGS * QUESTIONS_PER_LEG * DIRT_SPEED);
    }
  }
});

/* -------------------------------------------------------- the crossover */

test("the dirt shortcut is the better play only once you're close to fluent", () => {
  // The mode's central tuning claim, and the reason the fork is a decision at
  // all. Simulated across accuracy bands: below the crossover the sealed road
  // genuinely banks more, above it the gamble does. If SEALED_SPEED,
  // DIRT_SPEED or the all-or-nothing rule drifts, this fails.
  const expected = (accuracy: number, route: Route) => {
    const rng = makeRng(`ev:${route}:${accuracy}`);
    const trials = 4000;
    let total = 0;
    for (let t = 0; t < trials; t++) {
      let correct = 0;
      for (let q = 0; q < QUESTIONS_PER_LEG; q++) if (rng() < accuracy) correct++;
      total += lengthsFor(route, correct, QUESTIONS_PER_LEG);
    }
    return total / trials;
  };

  const bands = [0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9, 1];
  const results = bands.map((accuracy) => ({
    accuracy,
    sealed: expected(accuracy, "sealed"),
    dirt: expected(accuracy, "dirt"),
  }));

  const crossover = results.find((r) => r.dirt > r.sealed);
  assert.ok(crossover, "the dirt never becomes worth taking");
  assert.ok(
    crossover.accuracy >= 0.6 && crossover.accuracy <= 0.8,
    `crossover landed at ${crossover.accuracy}, outside the intended 60–80% band`,
  );

  // Below it, taking the dirt is a genuine mistake...
  const low = results[0];
  assert.ok(low.dirt < low.sealed, `at ${low.accuracy} the dirt already pays`);

  // ...and at the top it is clearly the right call.
  const top = results[results.length - 1];
  assert.ok(top.dirt > top.sealed * 2, `at ${top.accuracy} the dirt doesn't pay off enough`);

  // Expected distance only ever improves with accuracy, on both roads.
  for (let i = 1; i < results.length; i++) {
    assert.ok(results[i].dirt >= results[i - 1].dirt * 0.98, "dirt went backwards");
    assert.ok(results[i].sealed >= results[i - 1].sealed * 0.98, "sealed went backwards");
  }
});

/* ----------------------------------------------------------------- payout */

test("a perfect sealed run scores one length per correct answer", () => {
  const seed = "sealed-perfect";
  const drive = driveRally(seed, "sealed", 1);
  const outcome = replayRally({ seed, tables: TABLES, divisionUnlocked: DIVISION, ...drive });

  assert.equal(outcome.correct, LEGS * QUESTIONS_PER_LEG);
  assert.equal(outcome.distance, LEGS * QUESTIONS_PER_LEG * SEALED_SPEED);
  assert.equal(outcome.unverifiedLegs, 0);
});

test("a perfect dirt run scores triple, minus the compulsory first leg", () => {
  const seed = "dirt-perfect";
  const drive = driveRally(seed, "dirt", 1);
  const outcome = replayRally({ seed, tables: TABLES, divisionUnlocked: DIVISION, ...drive });

  const firstLeg = QUESTIONS_PER_LEG * SEALED_SPEED;
  const rest = (LEGS - 1) * QUESTIONS_PER_LEG * DIRT_SPEED;
  assert.equal(outcome.distance, firstLeg + rest);
});

test("dropping one question on the dirt wastes the whole leg", () => {
  // The catch that makes the fork a real decision rather than free distance.
  assert.equal(lengthsFor("dirt", QUESTIONS_PER_LEG, QUESTIONS_PER_LEG), 12);
  assert.equal(lengthsFor("dirt", QUESTIONS_PER_LEG - 1, QUESTIONS_PER_LEG), 0);
  // The sealed road always banks what you got right.
  assert.equal(lengthsFor("sealed", QUESTIONS_PER_LEG - 1, QUESTIONS_PER_LEG), 3);
});

test("claiming the dirt without driving it earns only the sealed rate", () => {
  const seed = "liar";
  // Answer the sealed road's questions, then claim every leg was dirt.
  const honest = driveRally(seed, "sealed", 1);
  const outcome = replayRally({
    seed,
    tables: TABLES,
    divisionUnlocked: DIVISION,
    routes: Array.from({ length: LEGS }, () => "dirt" as Route),
    answers: honest.answers,
  });

  assert.ok(outcome.unverifiedLegs > 0, "the false claim went unnoticed");
  assert.equal(outcome.distance, LEGS * QUESTIONS_PER_LEG * SEALED_SPEED);
});

test("last place still pays, because a wasted race stops kids entering", () => {
  const seed = "last";
  const drive = driveRally(seed, "sealed", 0);
  const outcome = replayRally({ seed, tables: TABLES, divisionUnlocked: DIVISION, ...drive });

  assert.equal(outcome.correct, 0);
  assert.equal(outcome.distance, 0);
  assert.equal(outcome.place, outcome.fieldSize);
  assert.ok(outcome.coins >= PLACEMENT_COINS[PLACEMENT_COINS.length - 1]);
});

test("coins pay per correct answer as well as per length", () => {
  const seed = "coins";
  const drive = driveRally(seed, "sealed", 1);
  const outcome = replayRally({ seed, tables: TABLES, divisionUnlocked: DIVISION, ...drive });

  const floor = outcome.correct * COINS_PER_CORRECT + outcome.distance * 1.5;
  assert.ok(outcome.coins >= floor);
});

test("placing is a rank inside the field, not an arbitrary number", () => {
  const seed = "place";
  const fast = replayRally({
    seed,
    tables: TABLES,
    divisionUnlocked: DIVISION,
    ...driveRally(seed, "dirt", 1),
  });
  const slow = replayRally({
    seed,
    tables: TABLES,
    divisionUnlocked: DIVISION,
    ...driveRally(seed, "sealed", 0.25),
  });

  assert.ok(fast.place >= 1 && fast.place <= fast.fieldSize);
  assert.ok(fast.place < slow.place, "driving well didn't place better");
});

test("an abandoned rally scores only the legs that were driven", () => {
  const seed = "abandon";
  const drive = driveRally(seed, "sealed", 1);
  const outcome = replayRally({
    seed,
    tables: TABLES,
    divisionUnlocked: DIVISION,
    routes: drive.routes,
    answers: drive.answers.slice(0, QUESTIONS_PER_LEG * 2),
  });

  assert.equal(outcome.distance, QUESTIONS_PER_LEG * 2 * SEALED_SPEED);
});

test("speeds are the published values", () => {
  assert.equal(speedFor("sealed"), 1);
  assert.equal(speedFor("dirt"), 3);
});

test("the daily cap tapers a farmed rally without stopping the practice", () => {
  const seed = "cap";
  const drive = driveRally(seed, "dirt", 1);
  const base = { seed, tables: TABLES, divisionUnlocked: DIVISION, ...drive };
  const fresh = replayRally(base);
  const farmed = replayRally({ ...base, coinsToday: 5000 });

  assert.ok(farmed.coins < fresh.coins);
  assert.ok(farmed.coins > 0);
  assert.equal(farmed.capped, true);
  assert.equal(farmed.distance, fresh.distance);
});
