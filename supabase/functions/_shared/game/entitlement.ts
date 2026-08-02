// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/entitlement.ts
// Regenerate with: npm run edge:sync
/**
 * Who may play what — docs/native/README.md §1.6, §1.10.
 *
 * The free tier is the first three zones of the curriculum: ×1 (the tutorial
 * zone), ×2 and ×10. Everything past them needs a subscription.
 *
 * Two things this module is careful about:
 *
 *  1. **Lapsing must not destroy progress.** A family that unlocked eight
 *     zones and then stopped paying keeps all eight in the database and plays
 *     the first three. Resubscribing restores everything, because nothing was
 *     ever deleted.
 *
 *  2. **The cap is by curriculum order, not by what happens to be unlocked.**
 *     Otherwise a lapsed family would keep whichever three tables sorted
 *     lowest, which for a child mid-way through would be an arbitrary set they
 *     never learned as a group.
 *
 * Nothing here knows what anything costs. Prices live in `billing.ts`, which
 * the student app never imports.
 */

import { DEFAULT_UNLOCK_ORDER, FREE_ZONE_COUNT } from "./zones.ts";

export type EntitlementTier = "free" | "full";
export type EntitlementStatus = "active" | "grace" | "expired";

/**
 * A family's entitlement row, or null when there has never been one — which is
 * the free tier, and is what a new signup looks like.
 */
export type Entitlement = {
  tier: EntitlementTier;
  status: EntitlementStatus;
  /** Null when it does not expire on its own. */
  expiresAt: string | null;
} | null;

/**
 * Whether a family currently holds the paid tier.
 *
 * `grace` counts as entitled on purpose: a card that failed renewal is a
 * problem between the parent and their bank, and locking a child out of the
 * ×7 zone mid-session is not how to raise it.
 */
export function isEntitled(entitlement: Entitlement, now = new Date()): boolean {
  if (!entitlement) return false;
  if (entitlement.tier !== "full") return false;
  if (entitlement.status === "expired") return false;
  if (entitlement.expiresAt && new Date(entitlement.expiresAt) <= now) return false;
  return true;
}

/**
 * The tables the free tier covers, in curriculum order.
 *
 * Derived rather than written down, so changing `DEFAULT_UNLOCK_ORDER` or
 * `FREE_ZONE_COUNT` can't leave the two disagreeing.
 */
export function freeTables(order: readonly number[] = DEFAULT_UNLOCK_ORDER): number[] {
  return [...order].slice(0, FREE_ZONE_COUNT);
}

/**
 * The tables a student may actually play: everything they have unlocked,
 * capped to the free set when the family isn't entitled.
 *
 * Every read path funnels through this. A table the family can't play must
 * never reach question generation, a job board, or a mode's table pool.
 */
export function playableTables(
  unlockedTables: readonly number[],
  entitlement: Entitlement,
  now = new Date(),
): number[] {
  if (isEntitled(entitlement, now)) return [...unlockedTables];

  const free = new Set(freeTables());
  return unlockedTables.filter((t) => free.has(t));
}

/**
 * Tables the student has earned but the plan is holding back.
 *
 * Parent-facing only. The student app shows a locked *zone*, never a count of
 * what a subscription would return.
 */
export function tablesLockedByPlan(
  unlockedTables: readonly number[],
  entitlement: Entitlement,
  now = new Date(),
): number[] {
  if (isEntitled(entitlement, now)) return [];

  const free = new Set(freeTables());
  return unlockedTables.filter((t) => !free.has(t));
}

/**
 * Whether the next zone in the curriculum can be opened.
 *
 * The free tier stops at `FREE_ZONE_COUNT` zones. This is checked server-side
 * before the row is written, so a client that calls the unlock path directly
 * gets nothing.
 */
export function canUnlockZone(
  unlockedTables: readonly number[],
  entitlement: Entitlement,
  now = new Date(),
): boolean {
  if (isEntitled(entitlement, now)) return true;
  return unlockedTables.length < FREE_ZONE_COUNT;
}

/**
 * Whether the student has reached the end of what the free tier offers.
 *
 * This is the cue for "you've mastered everything in these trades — ask a
 * grown-up to open more", which is the only honest way to end a free tier.
 * Going quiet without saying anything reads to a child as the game breaking.
 */
export function atFreeTierCeiling(
  unlockedTables: readonly number[],
  entitlement: Entitlement,
  now = new Date(),
): boolean {
  if (isEntitled(entitlement, now)) return false;
  return playableTables(unlockedTables, entitlement, now).length >= FREE_ZONE_COUNT;
}
