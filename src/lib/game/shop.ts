/**
 * Cosmetics Shop — spec §5.
 *
 * Coins only. There is no real-money path anywhere in the student-facing app:
 * no prices in dollars, no purchase prompts, no ads, no currency top-ups.
 * Every item is purely cosmetic and has zero effect on difficulty or rewards.
 */

export type ShopCategory = "hats" | "vests" | "belts" | "utes" | "accessories";

export const SHOP_CATEGORIES: Record<ShopCategory, { name: string; blurb: string }> = {
  hats: { name: "Hard hats", blurb: "Colours and patterns" },
  vests: { name: "Hi-vis", blurb: "Vests, jackets and team logos" },
  belts: { name: "Tool belts", blurb: "Belts and tool skins" },
  utes: { name: "Utes", blurb: "Vehicle skins" },
  accessories: { name: "Accessories", blurb: "Sunnies, gloves and boots" },
};

export type ShopItem = {
  key: string;
  name: string;
  category: ShopCategory;
  /** Price in coins. Never in real currency. */
  coins: number;
  /** Swatch colours used to render the item preview. */
  swatch: [string, string];
  /** Trade Rank rung required, if any — earned, never bought. */
  requiresRank?: number;
};

export const SHOP_ITEMS: readonly ShopItem[] = [
  // Hard hats
  { key: "hat-classic-white", name: "Classic White", category: "hats", coins: 0, swatch: ["#ffffff", "#e6e2d8"] },
  { key: "hat-safety-yellow", name: "Safety Yellow", category: "hats", coins: 120, swatch: ["#ffd400", "#e0a021"] },
  { key: "hat-fire-red", name: "Fire Red", category: "hats", coins: 180, swatch: ["#e5322d", "#c22620"] },
  { key: "hat-deep-teal", name: "Deep Teal", category: "hats", coins: 180, swatch: ["#17b5a4", "#0f7c70"] },
  { key: "hat-racing-stripe", name: "Racing Stripe", category: "hats", coins: 320, swatch: ["#3f7fd1", "#ffd400"] },
  { key: "hat-camo", name: "Bush Camo", category: "hats", coins: 380, swatch: ["#6f7a4a", "#3f4a2a"] },
  { key: "hat-chrome", name: "Chrome Finish", category: "hats", coins: 900, swatch: ["#cfd6dc", "#8b959d"] },
  { key: "hat-legend", name: "Legend Gold", category: "hats", coins: 1500, swatch: ["#edb521", "#a8721a"], requiresRank: 9 },

  // Hi-vis
  { key: "vest-standard", name: "Standard Hi-Vis", category: "vests", coins: 0, swatch: ["#ffd400", "#c9c4ba"] },
  { key: "vest-orange", name: "Traffic Orange", category: "vests", coins: 140, swatch: ["#e0842b", "#b8641a"] },
  { key: "vest-night", name: "Night Shift", category: "vests", coins: 260, swatch: ["#2b2f36", "#8fd8cd"] },
  { key: "vest-stripe", name: "Double Stripe", category: "vests", coins: 300, swatch: ["#ffd400", "#3f7fd1"] },
  { key: "vest-crew", name: "Crew Colours", category: "vests", coins: 420, swatch: ["#17b5a4", "#ffd400"] },
  { key: "vest-jacket", name: "Wet-Weather Jacket", category: "vests", coins: 620, swatch: ["#3f7fd1", "#111111"] },
  { key: "vest-foreman", name: "Foreman's Jacket", category: "vests", coins: 1100, swatch: ["#e5322d", "#111111"], requiresRank: 7 },

  // Tool belts
  { key: "belt-canvas", name: "Canvas Belt", category: "belts", coins: 0, swatch: ["#c8a06a", "#8a6a3f"] },
  { key: "belt-leather", name: "Oiled Leather", category: "belts", coins: 200, swatch: ["#7a4a24", "#4d2f18"] },
  { key: "belt-red-handles", name: "Red-Handled Set", category: "belts", coins: 340, swatch: ["#e5322d", "#111111"] },
  { key: "belt-titanium", name: "Titanium Set", category: "belts", coins: 780, swatch: ["#9aa4ad", "#5c646b"] },
  { key: "belt-glow", name: "Glow Grips", category: "belts", coins: 950, swatch: ["#8fd8cd", "#17b5a4"] },
  { key: "belt-master", name: "Master's Kit", category: "belts", coins: 1800, swatch: ["#edb521", "#111111"], requiresRank: 9 },

  // Utes — unlocked later in progression
  { key: "ute-white", name: "Site White", category: "utes", coins: 500, swatch: ["#ffffff", "#c9c4ba"], requiresRank: 4 },
  { key: "ute-yellow", name: "Hi-Vis Yellow", category: "utes", coins: 700, swatch: ["#ffd400", "#e0a021"], requiresRank: 4 },
  { key: "ute-teal", name: "Teal Tradie", category: "utes", coins: 900, swatch: ["#17b5a4", "#0f7c70"], requiresRank: 5 },
  { key: "ute-flames", name: "Flame Job", category: "utes", coins: 1400, swatch: ["#e5322d", "#ffd400"], requiresRank: 6 },
  { key: "ute-vintage", name: "Restored Classic", category: "utes", coins: 2200, swatch: ["#3f7fd1", "#efe1c4"], requiresRank: 8 },

  // Accessories
  { key: "acc-sunnies", name: "Site Sunnies", category: "accessories", coins: 90, swatch: ["#111111", "#3f7fd1"] },
  { key: "acc-gloves", name: "Grip Gloves", category: "accessories", coins: 110, swatch: ["#e5322d", "#111111"] },
  { key: "acc-boots", name: "Steel Caps", category: "accessories", coins: 160, swatch: ["#7a4a24", "#c8a06a"] },
  { key: "acc-earmuffs", name: "Ear Muffs", category: "accessories", coins: 140, swatch: ["#17b5a4", "#111111"] },
  { key: "acc-headtorch", name: "Head Torch", category: "accessories", coins: 240, swatch: ["#ffd400", "#2b2f36"] },
  { key: "acc-knee-pads", name: "Knee Pads", category: "accessories", coins: 130, swatch: ["#2b2f36", "#8fd8cd"] },
  { key: "acc-thermos", name: "Smoko Thermos", category: "accessories", coins: 300, swatch: ["#e0842b", "#efe1c4"] },
];

export function itemsByCategory(category: ShopCategory): ShopItem[] {
  return SHOP_ITEMS.filter((i) => i.category === category);
}

export function findItem(key: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.key === key);
}

export type PurchaseCheck =
  | { ok: true }
  | { ok: false; reason: "owned" | "coins" | "rank"; message: string };

export function canPurchase(
  item: ShopItem,
  state: { coins: number; rank: number; owned: string[] },
): PurchaseCheck {
  if (state.owned.includes(item.key)) {
    return { ok: false, reason: "owned", message: "Already in your locker" };
  }
  if (item.requiresRank && state.rank < item.requiresRank) {
    return {
      ok: false,
      reason: "rank",
      message: `Unlocks at Trade Rank ${item.requiresRank}`,
    };
  }
  if (state.coins < item.coins) {
    return {
      ok: false,
      reason: "coins",
      message: `${(item.coins - state.coins).toLocaleString()} more coins needed`,
    };
  }
  return { ok: true };
}
