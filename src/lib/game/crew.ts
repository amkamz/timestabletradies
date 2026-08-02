/**
 * Multiplayer helpers — spec §6.2.
 *
 * Partners are limited to linked crew (student profiles under parent-linked
 * accounts). When nobody is online, races fall back to simulated crew, tuned
 * across a skill range and always labelled as practice opponents.
 */

import { makeRng } from "./questions";

export type Racer = {
  id: string;
  name: string;
  /** True for simulated opponents — always surfaced in the UI. */
  simulated: boolean;
  /** Mean answer time in ms; drives the pace of the simulated racers. */
  paceMs: number;
  /** 0–1 chance of getting any given question right. */
  accuracy: number;
};

const BOT_NAMES = [
  "Chippie Steady Rafter",
  "Brickie Nifty Trowell",
  "Sparky Brisk Boltz",
  "Tiler Tidy Grouting",
  "Roofer Plucky Flashing",
  "Painter Sunny Topcoat",
  "Plumber Deft Gasket",
  "Fencer Keen Stringer",
] as const;

/**
 * Build a set of practice opponents across a fair skill range, so a race is
 * winnable but not a walkover.
 */
export function simulatedCrew(seed: string, count: number): Racer[] {
  const rng = makeRng(seed);
  const picked = new Set<string>();

  return Array.from({ length: count }, (_, i) => {
    let name = BOT_NAMES[Math.floor(rng() * BOT_NAMES.length)];
    while (picked.has(name)) {
      name = BOT_NAMES[(BOT_NAMES.indexOf(name) + 1) % BOT_NAMES.length];
    }
    picked.add(name);

    return {
      id: `bot-${i}`,
      name,
      simulated: true,
      // 2.2s–5.0s per question, spread across the field.
      paceMs: Math.round(2200 + rng() * 2800),
      accuracy: 0.72 + rng() * 0.26,
    };
  });
}

/** How many questions a simulated racer has finished after `elapsedMs`. */
export function simulatedProgress(racer: Racer, elapsedMs: number, total: number): number {
  return Math.min(total, Math.floor(elapsedMs / racer.paceMs));
}

/**
 * Preset reactions. There is no free-text chat between players anywhere in
 * the app (spec §6.2) — this is the entire vocabulary.
 */
export const REACTIONS = [
  { key: "goodrace", label: "Good race!", glyph: "🤝" },
  { key: "nice", label: "Nice one", glyph: "👏" },
  { key: "fast", label: "You're quick!", glyph: "⚡" },
  { key: "again", label: "Go again?", glyph: "🔁" },
] as const;
