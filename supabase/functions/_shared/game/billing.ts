// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/billing.ts
// Regenerate with: npm run edge:sync
/**
 * Pricing and family limits — spec §2.
 *
 * Everything here is parent-facing only. None of these values, and no billing
 * UI of any kind, may be rendered inside the student app.
 */

export const FAMILY_LIMITS = {
  /** Max student profiles per parent account. */
  maxStudents: 5,
  /** Max parent/guardian admins per family. */
  maxParents: 2,
  /** Grandparent accounts are uncapped (spec §2). */
  maxGrandparents: null as number | null,
} as const;

export type PlanKey = "annual" | "monthly";

export const PLANS: Record<
  PlanKey,
  {
    name: string;
    /** Price in cents, for the first student profile. */
    baseCents: number;
    /** Additional-child price in cents, per billing period. */
    extraChildCents: number;
    period: "year" | "month";
    blurb: string;
  }
> = {
  annual: {
    name: "Annual",
    baseCents: 5000,
    extraChildCents: 2500,
    period: "year",
    blurb: "$50/year for the first tradie, $25/year for each extra.",
  },
  monthly: {
    name: "Monthly",
    baseCents: 1000,
    // $25/year equivalent, billed monthly — no annual discount applied.
    extraChildCents: 208,
    period: "month",
    blurb: "$10/month, no lock-in. Extra tradies billed monthly.",
  },
};

export function formatAud(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function subscriptionTotalCents(plan: PlanKey, students: number): number {
  const p = PLANS[plan];
  const extras = Math.max(0, students - 1);
  return p.baseCents + extras * p.extraChildCents;
}

export function describeSubscription(plan: PlanKey, students: number): string {
  const p = PLANS[plan];
  const total = subscriptionTotalCents(plan, students);
  return `${formatAud(total)} per ${p.period} · ${students} tradie${students === 1 ? "" : "s"}`;
}

/* ---------------------------------------------------------------- roles */

export type AccountRole = "parent" | "student" | "grandparent" | "teacher";

/**
 * Grandparent scope is deliberately narrow (spec §2): stickers only.
 * No stats, no billing, no crew management, no free messaging.
 */
export const GRANDPARENT_CAPABILITIES = {
  sendSticker: true,
  viewStats: false,
  manageBilling: false,
  linkCrew: false,
  freeTextMessage: false,
} as const;

export const STICKERS = [
  { key: "thumbs", label: "Nice work!", glyph: "👍" },
  { key: "star", label: "Superstar", glyph: "⭐" },
  { key: "hammer", label: "Keep hammering", glyph: "🔨" },
  { key: "hardhat", label: "Proper tradie", glyph: "👷" },
  { key: "trophy", label: "Champion", glyph: "🏆" },
  { key: "heart", label: "Proud of you", glyph: "💛" },
  { key: "rocket", label: "Flying along", glyph: "🚀" },
  { key: "clap", label: "Well done", glyph: "👏" },
] as const;
