// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/zones.ts
// Regenerate with: npm run edge:sync
/**
 * Trade Zones — spec §10.
 *
 * Every times table is themed as a trade. Unlock order follows a
 * curriculum-friendly sequence rather than strict numerical order, and is
 * configurable per deployment (the array below is the default).
 */

export type TradeZone = {
  /** The times table this zone drills. */
  table: number;
  /** Trade name shown to the player. */
  trade: string;
  /** Accent colour token used for the zone chip and job screens. */
  accent: "teal" | "red" | "yellow" | "blue" | "orange" | "slate";
  /** One-line flavour used on the job board and briefing screens. */
  blurb: string;
};

export const TRADE_ZONES: readonly TradeZone[] = [
  // The tutorial zone. ×1 is the identity, so the maths load is zero while a
  // new player learns the keypad, the submit gesture and the results screen —
  // and Labouring is honestly where an apprentice starts on a real site.
  //
  // It is a first-class table everywhere else: it counts toward zone
  // thresholds, earns coins and fills the mastery grid. What it does *not* do
  // is feed the puzzle modes, which all filter to `t >= 2` — a ×1 connector is
  // a no-op move and a 1-wide room is not a room.
  { table: 1, trade: "Labouring", accent: "yellow", blurb: "Fetching, carrying and learning the ropes." },
  { table: 2, trade: "Landscaping", accent: "teal", blurb: "Garden beds, turf and paths." },
  { table: 3, trade: "Carpentry", accent: "orange", blurb: "Framing, decking and trim." },
  { table: 4, trade: "Bricklaying", accent: "red", blurb: "Courses, pallets and mortar." },
  { table: 5, trade: "Plumbing", accent: "blue", blurb: "Pipe runs, taps and fittings." },
  { table: 6, trade: "Painting", accent: "yellow", blurb: "Coats, rollers and cut-ins." },
  { table: 7, trade: "Roofing", accent: "orange", blurb: "Sheets, battens and ridge caps." },
  { table: 8, trade: "Electrical", accent: "teal", blurb: "Circuits, points and cabling." },
  { table: 9, trade: "Tiling", accent: "blue", blurb: "Grids, grout and splashbacks." },
  { table: 10, trade: "Concreting", accent: "slate", blurb: "Slabs, loads and screeds." },
  { table: 11, trade: "Cabinetmaking", accent: "orange", blurb: "Carcasses, doors and drawers." },
  { table: 12, trade: "Site Management", accent: "red", blurb: "Capstone — mixes every trade." },
] as const;

/**
 * Default unlock order (spec §10): 1, 2, 10, 5, 3, 4, 8, 6, 9, 7, 11, 12.
 * Configurable — a deployment or teacher can override this.
 *
 * ×1 leads as the tutorial zone. The first three are also the free tier, which
 * lands the paywall on the fourth unlock (×5, Plumbing) — a curriculum
 * boundary rather than an arbitrary one.
 */
export const DEFAULT_UNLOCK_ORDER: readonly number[] = [1, 2, 10, 5, 3, 4, 8, 6, 9, 7, 11, 12];

/**
 * Zones included at no charge. Everything past these needs a subscription,
 * which is enforced server-side — never in the student app, which has no
 * concept of money at all.
 */
export const FREE_ZONE_COUNT = 3;

/**
 * The lowest table the puzzle modes will build content from.
 *
 * ×1 is a real table for every other purpose — it counts toward unlock
 * thresholds, it earns coins, it fills the mastery grid. But a ×1 or ÷1
 * connector is a no-op move, a 1-wide room is not a room, and a tool belt
 * containing 1 gives nothing to decompose, so the generators skip it.
 */
export const MIN_PUZZLE_TABLE = 2;

/**
 * The unlocked tables a puzzle generator can actually use.
 *
 * One definition, because the availability check and the generator have to
 * agree: a child with `{1, 2}` who passes "two tables unlocked" and then hits
 * a generator that can only see `{2}` gets a degenerate board.
 */
export function puzzleTables(tables: readonly number[], max = Infinity): number[] {
  return tables.filter((t) => t >= MIN_PUZZLE_TABLE && t <= max);
}

/** Tables 13+ are generated on demand once the 12×12 grid is fully Blue. */
export function zoneForTable(table: number): TradeZone {
  const known = TRADE_ZONES.find((z) => z.table === table);
  if (known) return known;
  // 13+ zones unlock one at a time and reuse the capstone styling.
  return {
    table,
    trade: `Trade Zone ${table}`,
    accent: "slate",
    blurb: `Advanced zone — the ×${table} table.`,
  };
}

export function tradeName(table: number): string {
  return zoneForTable(table).trade;
}

/** Zone accent → the tailwind background class used for immersive screens. */
export const ACCENT_BG: Record<TradeZone["accent"], string> = {
  teal: "bg-teal",
  red: "bg-red",
  yellow: "bg-yellow",
  blue: "bg-blue",
  orange: "bg-orange",
  slate: "bg-slate",
};
