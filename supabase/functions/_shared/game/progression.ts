// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/progression.ts
// Regenerate with: npm run edge:sync
/**
 * The House Project (spec §9) and the rare boss rewards on top of it.
 *
 * **Trade Rank used to live here and has been removed** — see
 * `city-level.ts`, which replaced it. Rank was recomputed from a single Yard
 * round and could go *down*, so nothing could safely be gated on it: a shop
 * item or a rival that vanishes after one bad speed test reads to a child as
 * punishment rather than as a bad round. City level only rises.
 *
 * `students.rank_rung` still exists in the schema as history. Nothing reads
 * it.
 */

/* --------------------------------------------------------- house project */

export type HouseStage = {
  key: string;
  name: string;
  /** Materials ("loads") needed to complete this stage. */
  loads: number;
  /** Unit noun used in the progress line, e.g. "loads of concrete poured". */
  unit: string;
};

export const HOUSE_STAGES: readonly HouseStage[] = [
  { key: "foundations", name: "Foundations", loads: 10, unit: "loads of concrete poured" },
  { key: "framing", name: "Framing", loads: 14, unit: "wall frames stood up" },
  { key: "roofing", name: "Roofing", loads: 16, unit: "sheets fixed down" },
  { key: "windows", name: "Windows & Doors", loads: 14, unit: "openings fitted" },
  { key: "interior", name: "Interior Fit-out", loads: 20, unit: "rooms fitted out" },
  { key: "paint", name: "Paint & Finishing", loads: 18, unit: "coats rolled on" },
  { key: "landscaping", name: "Landscaping & Driveway", loads: 16, unit: "loads of turf laid" },
  { key: "movein", name: "Move-in Day", loads: 0, unit: "" },
] as const;

export function stageAt(index: number): HouseStage {
  return HOUSE_STAGES[Math.max(0, Math.min(HOUSE_STAGES.length - 1, index))];
}

/**
 * Bank materials into the house, rolling over into later stages when a
 * stage completes. Returns the new position plus any stages completed, so
 * the UI can fire the celebration for each (spec §9).
 */
export function bankMaterials(
  current: { stageIndex: number; loads: number },
  materials: number,
): { stageIndex: number; loads: number; completed: HouseStage[] } {
  let { stageIndex, loads } = current;
  let remaining = materials;
  const completed: HouseStage[] = [];

  while (remaining > 0 && stageIndex < HOUSE_STAGES.length - 1) {
    const stage = HOUSE_STAGES[stageIndex];
    const needed = stage.loads - loads;
    if (remaining >= needed) {
      remaining -= needed;
      completed.push(stage);
      stageIndex += 1;
      loads = 0;
    } else {
      loads += remaining;
      remaining = 0;
    }
  }

  return { stageIndex, loads, completed };
}

export function stageProgress(stageIndex: number, loads: number): number {
  const stage = stageAt(stageIndex);
  if (stage.loads === 0) return 100;
  return Math.round((loads / stage.loads) * 100);
}

/* ----------------------------------------------------- rare boss rewards */

/**
 * Boss Battle wins unlock rare house items that normal jobs never drop
 * (spec §8) — the collectible layer on top of the standard stages.
 */
export const RARE_HOUSE_ITEMS = [
  { key: "letterbox", name: "Hand-forged letterbox", zone: 4, blurb: "One of a kind, bolted to the fence." },
  { key: "garden", name: "Feature garden bed", zone: 2, blurb: "Native planting along the front path." },
  { key: "roof", name: "Copper ridge capping", zone: 7, blurb: "Catches the light from the street." },
  { key: "door", name: "Stained-glass front door", zone: 3, blurb: "Cut and leaded by hand." },
  { key: "splashback", name: "Mosaic splashback", zone: 9, blurb: "Every tile placed one at a time." },
  { key: "driveway", name: "Exposed-aggregate driveway", zone: 10, blurb: "Polished to a shine." },
  { key: "lights", name: "Festoon lighting run", zone: 8, blurb: "Strung the length of the back deck." },
  { key: "cabinet", name: "Solid-timber kitchen island", zone: 11, blurb: "Dovetailed, no shortcuts." },
  { key: "pergola", name: "Pergola with a pitched roof", zone: 5, blurb: "Shade over the back door." },
  { key: "sign", name: "Site legend plaque", zone: 12, blurb: "Awarded for finishing the capstone." },
] as const;

export function rareItemForZone(table: number) {
  return RARE_HOUSE_ITEMS.find((i) => i.zone === table) ?? RARE_HOUSE_ITEMS[0];
}
