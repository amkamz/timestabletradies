/**
 * Ute Rally — docs/game-modes/02-ute-rally.md
 *
 * A race with forks. Between legs the road splits: the sealed road draws on
 * the tables you're solid at and moves you one length per correct answer; the
 * dirt shortcut draws on a table you're shaky at and moves you three.
 *
 * The fork is the whole mode. A footrace goes dead for whoever is fourth; a
 * fork keeps it live to the last leg, and it makes the child appraise their
 * own fluency, which is the thing that makes practice self-directing later.
 */

import { simulatedCrew, type Racer } from "./crew";
import { applyDailyCap } from "./economy";
import { generateQuestionSet, makeRng, type Question } from "./questions";
import { puzzleTables } from "./zones";

export type Route = "sealed" | "dirt";

export const LEGS = 6;
export const QUESTIONS_PER_LEG = 4;
export const SEALED_SPEED = 1;
export const DIRT_SPEED = 3;

export function speedFor(route: Route): number {
  return route === "dirt" ? DIRT_SPEED : SEALED_SPEED;
}

/**
 * The shortcut's catch: the dirt only banks if the whole leg is clean.
 *
 * Without this the dirt is strictly better at every accuracy — three lengths
 * per correct answer beats one no matter how often you're wrong, so the "fork"
 * would be a fork in name only. All-or-nothing puts the crossover at roughly
 * 70% accuracy: below that the sealed road genuinely pays more, above it the
 * gamble genuinely pays off, and the child has a real judgement to make about
 * their own fluency.
 */
export function lengthsFor(route: Route, correct: number, asked: number): number {
  if (route === "sealed") return correct * SEALED_SPEED;
  return correct === asked ? correct * DIRT_SPEED : 0;
}

/** The first leg is always sealed: the race starts before the first decision. */
export function routeForLeg(leg: number, chosen: Route): Route {
  return leg === 0 ? "sealed" : chosen;
}

/* ------------------------------------------------------------------ legs */

/**
 * Which tables a route draws on.
 *
 * Curriculum position stands in for confidence — tables unlock in teaching
 * order, so the earliest are the most practised and the latest the least.
 * Deterministic from the unlock list alone, which is what lets the server
 * rebuild a leg and check which road was actually taken.
 */
export function legTables(tables: number[], route: Route, leg: number): number[] {
  // ×1 is a real table everywhere else, but a race run on it is free distance:
  // the answer is the question. Same filter the other four modes apply.
  const sorted = puzzleTables(tables);
  if (sorted.length <= 2) return sorted;

  if (route === "sealed") {
    return sorted.slice(0, Math.max(2, Math.ceil(sorted.length / 2)));
  }

  // The dirt runs on one shaky table for the whole leg: you can't outrun a
  // fact you don't know by moving on to an easier one.
  const weakest = sorted.slice(-Math.max(1, Math.floor(sorted.length / 3)));
  return [weakest[leg % weakest.length]];
}

export function buildLeg(opts: {
  seed: string;
  leg: number;
  route: Route;
  tables: number[];
  divisionUnlocked: number[];
}): Question[] {
  const tables = legTables(opts.tables, opts.route, opts.leg);

  return generateQuestionSet({
    seed: `${opts.seed}:leg${opts.leg}:${opts.route}`,
    tables,
    divisionUnlocked: opts.route === "dirt" ? opts.divisionUnlocked : [],
    operation: opts.route === "dirt" ? "both" : "multiply",
    count: QUESTIONS_PER_LEG,
    // The dirt is typed entry: harder, and faster for a fluent child.
    withChoices: opts.route === "sealed",
  });
}

/* --------------------------------------------------------------- the field */

/**
 * Build the field. Composition, not rubber-banding: the seed always includes
 * one genuinely slower racer, so a struggling child always has someone
 * plausibly behind them. Faking a comeback is a lie children spot.
 */
export function buildField(seed: string, count = 3): Racer[] {
  const crew = simulatedCrew(seed, count);
  const slowest = crew.reduce((a, b) => (a.paceMs > b.paceMs ? a : b));
  if (slowest.paceMs < 4200) slowest.paceMs = 4200 + Math.round(slowest.accuracy * 400);
  return crew;
}

/** Simulated racers gamble in proportion to their own accuracy. */
export function botTakesShortcut(rng: () => number, racer: Racer): boolean {
  return rng() < (racer.accuracy - 0.6) * 1.6;
}

/** How far a simulated racer gets, worked out the same way the player's is. */
export function botDistance(seed: string, racer: Racer): number {
  const rng = makeRng(`${seed}:bot:${racer.id}`);
  let distance = 0;

  for (let leg = 0; leg < LEGS; leg++) {
    const route = routeForLeg(leg, botTakesShortcut(rng, racer) ? "dirt" : "sealed");
    // The dirt is harder for them too, not just for the player.
    const accuracy = route === "dirt" ? racer.accuracy * 0.75 : racer.accuracy;
    const correct = Math.round(accuracy * QUESTIONS_PER_LEG);
    distance += lengthsFor(route, correct, QUESTIONS_PER_LEG);
  }

  return distance;
}

/* ----------------------------------------------------------------- payout */

export const COINS_PER_CORRECT = 6;
export const COINS_PER_LENGTH = 1.5;
export const PLACEMENT_COINS = [60, 40, 25, 15];

export type RallyAnswer = {
  a: number;
  b: number;
  operation: "multiply" | "divide";
  correct: boolean;
  elapsedMs: number;
};

export type RallyOutcome = {
  distance: number;
  place: number;
  fieldSize: number;
  correct: number;
  coins: number;
  uncappedCoins: number;
  capped: boolean;
  materials: number;
  /** Legs whose answers didn't match the road claimed for them. */
  unverifiedLegs: number;
};

/**
 * Score a rally.
 *
 * The routes are verified rather than believed: each leg's questions are
 * regenerated for both roads and matched against the facts the answers
 * actually cover, so claiming the dirt for triple distance means having
 * answered the dirt's questions.
 */
export function replayRally(opts: {
  seed: string;
  tables: number[];
  divisionUnlocked: number[];
  routes: Route[];
  answers: RallyAnswer[];
  coinsToday?: number;
}): RallyOutcome {
  const field = buildField(opts.seed);
  let distance = 0;
  let unverifiedLegs = 0;

  for (let leg = 0; leg < LEGS; leg++) {
    const answers = opts.answers.slice(
      leg * QUESTIONS_PER_LEG,
      (leg + 1) * QUESTIONS_PER_LEG,
    );
    if (answers.length === 0) continue;

    const claimed = routeForLeg(leg, opts.routes[leg] ?? "sealed");
    const verified = verifyLeg({ ...opts, leg, claimed, answers });
    if (!verified) unverifiedLegs++;

    // An unverified leg still counts for distance, at the sealed rate — the
    // child answered *something*, they just don't get the shortcut's multiplier
    // for a road there's no evidence they drove.
    const route = verified ? claimed : "sealed";
    distance += lengthsFor(route, answers.filter((a) => a.correct).length, answers.length);
  }

  const behind = field.filter((racer) => botDistance(opts.seed, racer) < distance).length;
  const place = field.length + 1 - behind;
  const correct = opts.answers.filter((a) => a.correct).length;

  const uncapped = Math.round(
    correct * COINS_PER_CORRECT +
      distance * COINS_PER_LENGTH +
      (PLACEMENT_COINS[place - 1] ?? PLACEMENT_COINS[PLACEMENT_COINS.length - 1]),
  );
  const earned = applyDailyCap(uncapped, opts.coinsToday ?? 0);

  return {
    distance,
    place,
    fieldSize: field.length + 1,
    correct,
    ...earned,
    materials: Math.min(10, 6 + Math.floor(distance / 12)),
    unverifiedLegs,
  };
}

/** Do these answers cover the facts that road's questions would have asked? */
function verifyLeg(opts: {
  seed: string;
  leg: number;
  claimed: Route;
  tables: number[];
  divisionUnlocked: number[];
  answers: RallyAnswer[];
}): boolean {
  const questions = buildLeg({
    seed: opts.seed,
    leg: opts.leg,
    route: opts.claimed,
    tables: opts.tables,
    divisionUnlocked: opts.divisionUnlocked,
  });

  return opts.answers.every((answer, i) => {
    const question = questions[i];
    return Boolean(question) && question.a === answer.a && question.b === answer.b;
  });
}
