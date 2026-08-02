// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/tool-off.ts
// Regenerate with: npm run edge:sync
/**
 * The Tool-Off — docs/game-modes/03-the-tool-off.md
 *
 * A turn-based duel whose combat maths runs backwards: you're shown a target
 * and pick two numbers off your tool belt to make it. "What makes 48?" rather
 * than "what is 6 × 8" — the direction division actually needs, and the one
 * the rest of the app never asks.
 *
 * Pure and seeded. The whole duel replays from `(seed, rival, moves[])`, which
 * is what lets the server pay it out without trusting the client's arithmetic.
 */

import { applyDailyCap } from "./economy.ts";
import { makeRng } from "./questions.ts";
import { puzzleTables } from "./zones.ts";

/* ------------------------------------------------------------------ rivals */

export type RivalKey = "kade" | "marlow" | "vance" | "dawes";

export type Rival = {
  key: RivalKey;
  name: string;
  blurb: string;
  /** Trade Rank rung this rival becomes available at. */
  unlocksAtRank: number;
  hp: number;
  /** The player's health in this fight — tuned per rival, not global. */
  playerHp: number;
  /** Damage the rival deals every turn. */
  hit: number;
  /** Raise a shield every N turns. 0 for never. */
  shieldEvery: number;
  /** Double the hit every N turns. 0 for never. */
  doubleEvery: number;
  /** Tier above Kade, for the win bonus. */
  tier: number;
};

/**
 * Four archetypes, each a different pattern to solve rather than a bigger
 * health bar. Every fight is winnable by a player who hits exactly and losable
 * by one who doesn't — see the schedule test in `tool-off.test.ts`.
 */
export const RIVALS: Record<RivalKey, Rival> = {
  kade: {
    key: "kade",
    name: "Apprentice Kade",
    blurb: "First on the tools. Hits steady, never surprises you.",
    unlocksAtRank: 1,
    hp: 120,
    playerHp: 200,
    hit: 12,
    shieldEvery: 0,
    doubleEvery: 0,
    tier: 0,
  },
  marlow: {
    key: "marlow",
    name: "Chippie Marlow",
    blurb: "Puts a shield up every third turn. Read it before you swing.",
    unlocksAtRank: 3,
    hp: 160,
    playerHp: 200,
    hit: 15,
    shieldEvery: 3,
    doubleEvery: 0,
    tier: 1,
  },
  vance: {
    key: "vance",
    name: "Sparky Vance",
    blurb: "Starts light, then doubles up. Punishes anyone who stalls.",
    unlocksAtRank: 5,
    hp: 200,
    playerHp: 200,
    hit: 10,
    shieldEvery: 0,
    doubleEvery: 4,
    tier: 2,
  },
  dawes: {
    key: "dawes",
    name: "Foreman Dawes",
    blurb: "Shields every other turn, always on the table you like least.",
    unlocksAtRank: 7,
    hp: 220,
    playerHp: 240,
    hit: 18,
    shieldEvery: 2,
    doubleEvery: 0,
    tier: 3,
  },
};

export const RIVAL_ORDER: readonly RivalKey[] = ["kade", "marlow", "vance", "dawes"];

export function rivalsFor(rank: number): Rival[] {
  return RIVAL_ORDER.map((key) => RIVALS[key]).filter((r) => rank >= r.unlocksAtRank);
}

/* ------------------------------------------------------------------- belt */

export const BELT_SIZE = 6;
export const MAX_TOOL = 12;

/**
 * Build the tool belt.
 *
 * Deterministic from the seed and the student's unlocked tables alone, because
 * the server has to rebuild the identical belt to replay the duel. Curriculum
 * position stands in for "weakest": tables unlock in teaching order, so the
 * most recent ones are the least practised.
 */
export function buildBelt(seed: string, unlocked: number[]): number[] {
  const rng = makeRng(`${seed}:belt`);
  const tables = puzzleTables(unlocked, MAX_TOOL);
  if (tables.length === 0) return [2, 3, 4, 5, 6, 10];

  // Earliest unlocked are the solid ones; latest are the shaky ones.
  const strong = tables.slice(0, Math.max(1, Math.ceil(tables.length / 2)));
  const weak = tables.slice(-Math.max(1, Math.floor(tables.length / 2)));

  const belt: number[] = [];
  const take = (pool: number[], count: number) => {
    for (let i = 0; i < count; i++) belt.push(pool[Math.floor(rng() * pool.length)]);
  };

  take(weak, 2);
  take(strong, 2);
  take(tables, BELT_SIZE - belt.length);

  // A belt of six identical tools would make every target trivial.
  const spread = [...new Set(belt)];
  while (spread.length < Math.min(4, tables.length)) {
    const candidate = tables[Math.floor(rng() * tables.length)];
    if (!spread.includes(candidate)) spread.push(candidate);
  }
  while (spread.length < BELT_SIZE) spread.push(tables[Math.floor(rng() * tables.length)]);

  return spread.slice(0, BELT_SIZE).sort((a, b) => a - b);
}

/** The tool the shields pick on: the least-practised one on the belt. */
export function shieldFactor(belt: number[], unlocked: number[]): number {
  const position = (tool: number) => {
    const index = unlocked.indexOf(tool);
    return index === -1 ? 0 : index;
  };
  return [...belt].sort((a, b) => position(b) - position(a))[0];
}

/* ---------------------------------------------------------------- targets */

/** Every product two tools can make, and which pairs make it. */
export function beltProducts(belt: number[]): Map<number, Array<[number, number]>> {
  const out = new Map<number, Array<[number, number]>>();
  for (let i = 0; i < belt.length; i++) {
    for (let j = i; j < belt.length; j++) {
      const product = belt[i] * belt[j];
      if (!out.has(product)) out.set(product, []);
      out.get(product)!.push([i, j]);
    }
  }
  return out;
}

/**
 * The target for a turn.
 *
 * Opening turns have a single belt pair that works — find it. From turn 4 the
 * targets increasingly have two or three, one of which will satisfy the next
 * shield, so the child learns to look for the whole fact family rather than
 * the first pair that lands.
 */
export function nextTarget(
  seed: string,
  turn: number,
  belt: number[],
  shield: number | null,
): { target: number; solutions: Array<[number, number]> } {
  const rng = makeRng(`${seed}:target:${turn}`);
  const products = beltProducts(belt);

  const entries = [...products.entries()].filter(([, pairs]) => {
    if (shield === null) return true;
    // A shield must never make the target unsolvable.
    return pairs.some(([i, j]) => belt[i] === shield || belt[j] === shield);
  });

  const wantSingle = turn < 3;
  const preferred = entries.filter(([, pairs]) =>
    wantSingle ? pairs.length === 1 : pairs.length > 1,
  );
  const pool = preferred.length > 0 ? preferred : entries;

  const [target, solutions] = pool[Math.floor(rng() * pool.length)];
  return { target, solutions };
}

/* ---------------------------------------------------------------- combat */

export const EXACT_DAMAGE = 20;
export const CLOSE_DAMAGE = 6;
/** A miss lets the rival's next hit land harder. */
export const MISS_PENALTY = 5;
/** Within this fraction of the target counts as a glancing blow. */
export const CLOSE_TOLERANCE = 0.1;
export const MAX_TURNS = 20;

export type SwingKind = "exact" | "close" | "miss";

export function swingKind(product: number, target: number): SwingKind {
  if (product === target) return "exact";
  return Math.abs(product - target) <= target * CLOSE_TOLERANCE ? "close" : "miss";
}

/**
 * Damage for a swing. A shield halves an otherwise good hit that doesn't
 * include the factor it names — the remediation channel, dressed as a mechanic.
 */
export function damageFor(input: {
  tools: [number, number];
  target: number;
  shield: number | null;
}): { kind: SwingKind; damage: number; shielded: boolean } {
  const product = input.tools[0] * input.tools[1];
  const kind = swingKind(product, input.target);
  const base = kind === "exact" ? EXACT_DAMAGE : kind === "close" ? CLOSE_DAMAGE : 0;

  const shielded =
    input.shield !== null && base > 0 && !input.tools.includes(input.shield);

  return { kind, damage: shielded ? Math.floor(base / 2) : base, shielded };
}

/* ------------------------------------------------------------------ state */

export type DuelMove =
  | { kind: "swing"; tools: [number, number]; elapsedMs: number }
  | { kind: "timeout" };

export type TurnRecord = {
  turn: number;
  target: number;
  shield: number | null;
  tools: [number, number] | null;
  result: SwingKind | "timeout";
  shielded: boolean;
  damage: number;
  rivalDamage: number;
};

export type DuelState = {
  seed: string;
  rival: Rival;
  belt: number[];
  turn: number;
  playerHp: number;
  rivalHp: number;
  target: number;
  shield: number | null;
  /** Extra damage on the rival's next hit, earned by a miss. */
  pendingBonus: number;
  log: TurnRecord[];
  over: boolean;
  won: boolean;
};

function shieldForTurn(rival: Rival, turn: number, belt: number[], unlocked: number[]) {
  if (rival.shieldEvery === 0) return null;
  return turn % rival.shieldEvery === 0 ? shieldFactor(belt, unlocked) : null;
}

function rivalHitFor(rival: Rival, turn: number): number {
  if (rival.doubleEvery > 0 && turn % rival.doubleEvery === 0) return rival.hit * 2;
  return rival.hit;
}

export function startDuel(opts: {
  seed: string;
  rival: RivalKey;
  unlocked: number[];
}): DuelState {
  const rival = RIVALS[opts.rival];
  const belt = buildBelt(opts.seed, opts.unlocked);
  const shield = shieldForTurn(rival, 1, belt, opts.unlocked);

  return {
    seed: opts.seed,
    rival,
    belt,
    turn: 1,
    playerHp: rival.playerHp,
    rivalHp: rival.hp,
    ...nextTarget(opts.seed, 1, belt, shield),
    shield,
    pendingBonus: 0,
    log: [],
    over: false,
    won: false,
  };
}

/**
 * One turn: the player swings, then the rival hits back on its fixed
 * schedule. No dice anywhere — the child can always work out how many turns
 * they have left, which is what makes the mode strategic rather than anxious.
 */
export function resolveTurn(state: DuelState, move: DuelMove, unlocked: number[]): DuelState {
  if (state.over) return state;

  const tools: [number, number] | null = move.kind === "swing" ? move.tools : null;
  const swing =
    tools === null
      ? { kind: "miss" as const, damage: 0, shielded: false }
      : damageFor({ tools, target: state.target, shield: state.shield });

  const rivalHp = Math.max(0, state.rivalHp - swing.damage);

  // The rival's counterpunch only lands if it's still standing.
  const rivalDamage =
    rivalHp > 0 ? rivalHitFor(state.rival, state.turn) + state.pendingBonus : 0;
  const playerHp = Math.max(0, state.playerHp - rivalDamage);

  const record: TurnRecord = {
    turn: state.turn,
    target: state.target,
    shield: state.shield,
    tools,
    result: move.kind === "timeout" ? "timeout" : swing.kind,
    shielded: swing.shielded,
    damage: swing.damage,
    rivalDamage,
  };

  const log = [...state.log, record];
  const nextTurnNumber = state.turn + 1;
  const outOfTurns = nextTurnNumber > MAX_TURNS;
  const over = rivalHp <= 0 || playerHp <= 0 || outOfTurns;

  if (over) {
    return {
      ...state,
      rivalHp,
      playerHp,
      log,
      over: true,
      // A draw goes to the player; being pedantic about it isn't worth it.
      // Running out of turns does not, or stalling would be a strategy.
      won: rivalHp <= 0,
    };
  }

  const shield = shieldForTurn(state.rival, nextTurnNumber, state.belt, unlocked);

  return {
    ...state,
    turn: nextTurnNumber,
    rivalHp,
    playerHp,
    ...nextTarget(state.seed, nextTurnNumber, state.belt, shield),
    shield,
    pendingBonus: swing.kind === "miss" ? MISS_PENALTY : 0,
    log,
  };
}

/* ----------------------------------------------------------------- payout */

export const COINS_EXACT = 10;
export const COINS_CLOSE = 3;
export const COINS_SHIELD_SATISFIED = 5;
export const COINS_WIN = 50;
export const COINS_PER_TIER = 25;
export const COINS_FLAWLESS = 40;

export type DuelAnswer = {
  a: number;
  b: number;
  operation: "multiply";
  correct: boolean;
  elapsedMs: number;
};

export type DuelOutcome = {
  won: boolean;
  turns: number;
  exactHits: number;
  coins: number;
  uncappedCoins: number;
  capped: boolean;
  materials: number;
  answers: DuelAnswer[];
};

/**
 * Replay a duel and score it.
 *
 * The client sends the seed, the rival and the swings it made; everything
 * else — damage, the win, the mastery log — comes out of this.
 */
export function replayDuel(opts: {
  seed: string;
  rival: RivalKey;
  unlocked: number[];
  moves: DuelMove[];
  coinsToday?: number;
}): DuelOutcome {
  let state = startDuel({ seed: opts.seed, rival: opts.rival, unlocked: opts.unlocked });
  const answers: DuelAnswer[] = [];

  for (const move of opts.moves) {
    if (state.over) break;
    const shield = state.shield;
    const target = state.target;

    if (move.kind === "swing") {
      const kind = swingKind(move.tools[0] * move.tools[1], target);
      // The fact recorded is what the child asserted, not what the target
      // wanted: swinging 6 × 7 at 48 says they think 6 × 7 is 48.
      answers.push({
        a: move.tools[0],
        b: move.tools[1],
        operation: "multiply",
        correct: kind === "exact",
        elapsedMs: move.elapsedMs,
      });
      void shield;
    }

    state = resolveTurn(state, move, opts.unlocked);
  }

  const exactHits = state.log.filter((t) => t.result === "exact").length;
  const closeHits = state.log.filter((t) => t.result === "close").length;
  const shieldsSatisfied = state.log.filter(
    (t) => t.shield !== null && t.result === "exact" && !t.shielded,
  ).length;
  const flawless = state.won && state.log.every((t) => t.result === "exact");

  const uncapped =
    exactHits * COINS_EXACT +
    closeHits * COINS_CLOSE +
    shieldsSatisfied * COINS_SHIELD_SATISFIED +
    (state.won ? COINS_WIN + state.rival.tier * COINS_PER_TIER : 0) +
    (flawless ? COINS_FLAWLESS : 0);

  const earned = applyDailyCap(uncapped, opts.coinsToday ?? 0);

  return {
    won: state.won,
    turns: state.log.length,
    exactHits,
    ...earned,
    // A duel you lost was still good practice; it should not pay nothing.
    materials: (state.won ? 5 : 2) + (flawless ? 2 : 0),
    answers,
  };
}
