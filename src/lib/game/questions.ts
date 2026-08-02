/**
 * Question generation — spec §4 (job types) and §6 (modes).
 *
 * Two rules run through everything here:
 *  1. Multiplication-first: division for a table only unlocks after a full
 *     multiplication round on that table (spec §4).
 *  2. Whole-number division only — no remainders, no fractions (spec §6).
 */

import { normalisedCoinWeight, normalisedTableWeight, parseFactKey } from "./difficulty";
import { tradeName } from "./zones";

export type Operation = "multiply" | "divide";

export type Question = {
  id: string;
  operation: Operation;
  /** For multiply: a × b. For divide: (a*b) ÷ a, answer is b. */
  a: number;
  b: number;
  prompt: string;
  /** Spoken form for read-aloud (spec §13). */
  spoken: string;
  answer: number;
  /** Multiple-choice options, when the format calls for them. */
  choices?: number[];
  /** Set for Site Delivery word problems. */
  story?: string;
  /** The fact cell this question exercises, for mastery tracking. */
  factKey: string;
};

export type JobFormat = "choice" | "type" | "word" | "match" | "sequence";

export type JobType = "quick" | "delivery" | "measure" | "build" | "muster";

export const JOB_TYPES: Record<
  JobType,
  { name: string; format: JobFormat; blurb: string; questions: number }
> = {
  quick: {
    name: "Quick Job",
    format: "choice",
    blurb: "Fast, straightforward drill.",
    questions: 10,
  },
  delivery: {
    name: "Site Delivery",
    format: "word",
    blurb: "Word problems about hauling materials round the site.",
    questions: 8,
  },
  measure: {
    name: "Measure Up",
    format: "match",
    blurb: "Pair each job with its total.",
    questions: 6,
  },
  build: {
    name: "Build Order",
    format: "sequence",
    blurb: "A run of steps building toward one bigger total.",
    questions: 3,
  },
  muster: {
    name: "Mixed Muster",
    format: "choice",
    blurb: "Everything you've unlocked, mixed together.",
    questions: 12,
  },
};

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; chip: string; coinMultiplier: number }
> = {
  easy: {
    label: "EASY",
    chip: "border-teal bg-teal-tint text-teal-deep",
    coinMultiplier: 1,
  },
  medium: {
    label: "MEDIUM",
    chip: "border-amber bg-yellow-tint text-amber-deep",
    coinMultiplier: 1.5,
  },
  hard: {
    label: "HARD",
    chip: "border-red bg-red/10 text-red-deep",
    coinMultiplier: 2,
  },
};

/* ------------------------------------------------------------------ random */

/** Small seeded PRNG so a job's question set is reproducible from its id. */
export function makeRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function next() {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function shuffle<T>(rng: () => number, list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* --------------------------------------------------------------- questions */

function buildChoices(rng: () => number, answer: number, a: number, b: number): number[] {
  // Distractors are near-misses a kid would plausibly land on: off-by-one
  // multiples, and a transposed factor — not random noise.
  const candidates = new Set<number>();
  candidates.add(a * (b + 1));
  candidates.add(a * (b - 1));
  candidates.add((a + 1) * b);
  candidates.add(a + b);
  candidates.delete(answer);

  const pool = [...candidates].filter((n) => n > 0);
  const distractors = shuffle(rng, pool).slice(0, 3);

  // Top up if the fact is small enough that we ran short of distractors.
  let bump = 1;
  while (distractors.length < 3) {
    const candidate = answer + bump;
    if (candidate > 0 && candidate !== answer && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
    bump = bump > 0 ? -bump : -bump + 1;
  }

  return shuffle(rng, [answer, ...distractors]);
}

export function multiplyQuestion(rng: () => number, a: number, b: number, withChoices: boolean): Question {
  const answer = a * b;
  return {
    id: `m-${a}-${b}-${Math.floor(rng() * 1e6)}`,
    operation: "multiply",
    a,
    b,
    prompt: `${a} × ${b}`,
    spoken: `What is ${a} times ${b}?`,
    answer,
    choices: withChoices ? buildChoices(rng, answer, a, b) : undefined,
    factKey: `${a}x${b}`,
  };
}

export function divideQuestion(rng: () => number, a: number, b: number, withChoices: boolean): Question {
  // Whole-number division only: (a × b) ÷ a = b, so it never has a remainder.
  const product = a * b;
  const answer = b;
  return {
    id: `d-${a}-${b}-${Math.floor(rng() * 1e6)}`,
    operation: "divide",
    a,
    b,
    prompt: `${product} ÷ ${a}`,
    spoken: `What is ${product} divided by ${a}?`,
    answer,
    choices: withChoices ? buildChoices(rng, answer, 1, b) : undefined,
    factKey: `${a}x${b}`,
  };
}

/* ------------------------------------------------------- word problems (B6) */

const DELIVERY_TEMPLATES = [
  { unit: "pallets", item: "bricks", verb: "loaded on the ute" },
  { unit: "crates", item: "tiles", verb: "stacked in the trailer" },
  { unit: "boxes", item: "power points", verb: "waiting in the van" },
  { unit: "rolls", item: "metres of cable", verb: "on the rack" },
  { unit: "tins", item: "litres of paint", verb: "in the paint store" },
  { unit: "bundles", item: "roof battens", verb: "craned onto the roof" },
  { unit: "bags", item: "kilos of mix", verb: "on the concrete pad" },
] as const;

export function deliveryQuestion(rng: () => number, a: number, b: number): Question {
  const t = pick(rng, DELIVERY_TEMPLATES);
  const answer = a * b;
  const story = `There are ${a} ${t.unit} ${t.verb}. Each one holds ${b} ${t.item}. How many ${t.item} all up?`;
  return {
    id: `w-${a}-${b}-${Math.floor(rng() * 1e6)}`,
    operation: "multiply",
    a,
    b,
    prompt: `${a} × ${b}`,
    spoken: story,
    answer,
    story,
    factKey: `${a}x${b}`,
  };
}

/* ------------------------------------------------------ build order (B8) */

const BUILD_STEPS = ["walls", "floor", "splashback", "ceiling", "skirting"] as const;

export function buildOrderSteps(
  rng: () => number,
  table: number,
  steps = 3,
): Array<Question & { stepLabel: string }> {
  const labels = shuffle(rng, [...BUILD_STEPS]).slice(0, steps);
  return labels.map((label, i) => {
    const b = 2 + Math.floor(rng() * 10);
    const q = multiplyQuestion(rng, table, b, false);
    return { ...q, stepLabel: `Step ${i + 1} · ${label}`, prompt: `${table} × ${b}` };
  });
}

/* ------------------------------------------------------ measure up (B7) */

export function matchPairs(rng: () => number, table: number, count = 4) {
  const bs = shuffle(
    rng,
    Array.from({ length: 12 }, (_, i) => i + 1),
  ).slice(0, count);
  return bs.map((b) => ({
    id: `p-${table}-${b}`,
    prompt: `${table} × ${b}`,
    answer: table * b,
    factKey: `${table}x${b}`,
  }));
}

/* -------------------------------------------------------------- job sets */

export type QuestionSetOptions = {
  seed: string;
  tables: number[];
  /** Tables where division has been unlocked (spec §4). */
  divisionUnlocked?: number[];
  operation?: Operation | "both";
  count: number;
  withChoices?: boolean;
  /** Adaptive weighting, highest-need facts first (The Garage). */
  weightFor?: (a: number, b: number) => number;
};

export function generateQuestionSet(opts: QuestionSetOptions): Question[] {
  const rng = makeRng(opts.seed);
  const {
    tables,
    count,
    withChoices = true,
    divisionUnlocked = [],
    operation = "multiply",
  } = opts;

  if (tables.length === 0) return [];

  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const table = weightedTable(rng, tables, opts.weightFor);
    const b = weightedFactor(rng, table, opts.weightFor);

    // Division is only ever offered for tables that have earned it.
    const divisionAllowed = divisionUnlocked.includes(table);
    let op: Operation = "multiply";
    if (operation === "divide" && divisionAllowed) op = "divide";
    else if (operation === "both" && divisionAllowed) op = rng() < 0.5 ? "divide" : "multiply";

    questions.push(
      op === "divide"
        ? divideQuestion(rng, table, b, withChoices)
        : multiplyQuestion(rng, table, b, withChoices),
    );
  }
  return questions;
}

function weightedTable(
  rng: () => number,
  tables: number[],
  weightFor?: (a: number, b: number) => number,
): number {
  if (!weightFor) return pick(rng, tables);
  const weights = tables.map((t) => {
    let sum = 0;
    for (let b = 1; b <= 12; b++) sum += weightFor(t, b);
    return sum;
  });
  return weightedChoice(rng, tables, weights);
}

function weightedFactor(
  rng: () => number,
  table: number,
  weightFor?: (a: number, b: number) => number,
): number {
  const factors = Array.from({ length: 12 }, (_, i) => i + 1);
  if (!weightFor) return pick(rng, factors);
  return weightedChoice(
    rng,
    factors,
    factors.map((b) => weightFor(table, b)),
  );
}

function weightedChoice<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return pick(rng, items);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/* ------------------------------------------------------------- job board */

export type JobOffer = {
  id: string;
  type: JobType;
  table: number;
  difficulty: Difficulty;
  coins: number;
  materials: number;
  questions: number;
  zoneLabel: string;
};

/** Build today's job board for a student (spec §3, §4). */
export function generateJobBoard(seed: string, unlockedTables: number[]): JobOffer[] {
  const rng = makeRng(seed);
  if (unlockedTables.length === 0) return [];

  const types: JobType[] = ["quick", "delivery", "measure", "build"];
  const offers = types.map((type) => {
    const table = pick(rng, unlockedTables);
    const meta = JOB_TYPES[type];
    const difficulty: Difficulty =
      type === "quick" ? "easy" : type === "build" ? "hard" : "medium";
    const mult = DIFFICULTY_META[difficulty].coinMultiplier;
    // A job on ×7 is worth more than the same job on ×10, and the board has to
    // say so up front — the offer is a promise the results screen keeps.
    const weight = normalisedTableWeight(table);
    return {
      id: `${type}-${table}-${seed}`,
      type,
      table,
      difficulty,
      coins: Math.round(meta.questions * 6 * mult * weight),
      materials: Math.max(1, Math.round(meta.questions * 0.4 * mult * weight)),
      questions: meta.questions,
      zoneLabel: `${tradeName(table)} zone`,
    } satisfies JobOffer;
  });

  return offers;
}

/* ---------------------------------------------------------------- scoring */

/**
 * Coins are accuracy-weighted, and guess-spam earns nothing (spec §5).
 * An answer under `GUESS_MS` that is wrong reads as a tap-through and is
 * excluded from the reward, though it still counts against accuracy.
 */
export const GUESS_MS = 400;

export type AnswerRecord = {
  factKey: string;
  operation: Operation;
  correct: boolean;
  elapsedMs: number;
};

export function scoreJob(
  answers: AnswerRecord[],
  offer: { coins: number; materials: number },
  /**
   * Per-fact reward weight. Defaults to difficulty alone; `finishRun` passes a
   * closure that also decays facts the child has already mastered.
   */
  rewardFor: (a: number, b: number) => number = normalisedCoinWeight,
): { coins: number; materials: number; accuracy: number; avgMs: number; correct: number } {
  if (answers.length === 0) {
    return { coins: 0, materials: 0, accuracy: 0, avgMs: 0, correct: 0 };
  }

  const counted = answers.filter((a) => !(a.elapsedMs < GUESS_MS && !a.correct));
  const correct = answers.filter((a) => a.correct).length;
  const accuracy = correct / answers.length;
  const avgMs = Math.round(answers.reduce((s, a) => s + a.elapsedMs, 0) / answers.length);

  // Reward scales with the share of *genuinely* correct answers, weighted by
  // how hard each fact was — so getting the 7×8 right is worth more of the
  // job's purse than getting the 10×2 right, and a run of easy hits can't
  // earn what a run of hard ones does.
  let earnedWeight = 0;
  let totalWeight = 0;
  for (const answer of answers) {
    const fact = parseFactKey(answer.factKey);
    const weight = fact ? rewardFor(fact.a, fact.b) : 1;
    totalWeight += weight;
    if (answer.correct) earnedWeight += weight;
  }

  // Every fact mastered and trivial: the job is worth nothing, by design.
  const earnedShare = counted.length === 0 || totalWeight === 0 ? 0 : earnedWeight / totalWeight;

  return {
    coins: Math.round(offer.coins * earnedShare),
    materials: Math.round(offer.materials * earnedShare),
    accuracy,
    avgMs,
    correct,
  };
}

/** The Garage's base rate per correct answer, before weighting (spec §6.1). */
export const GARAGE_COINS_PER_CORRECT = 10;

/**
 * The Garage pays per correct answer, weighted per fact.
 *
 * A flat rate would make the adaptive-practice mode the cheapest place in the
 * game to farm ×1 — which is precisely the mode that is supposed to be
 * steering children toward what they don't know.
 */
export function garageCoins(
  answers: AnswerRecord[],
  rewardFor: (a: number, b: number) => number = normalisedCoinWeight,
): number {
  let coins = 0;
  for (const answer of answers) {
    if (!answer.correct) continue;
    const fact = parseFactKey(answer.factKey);
    coins += GARAGE_COINS_PER_CORRECT * (fact ? rewardFor(fact.a, fact.b) : 1);
  }
  return Math.round(coins);
}
