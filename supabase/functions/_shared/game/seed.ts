// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/seed.ts
// Regenerate with: npm run edge:sync
/**
 * Seeds for one-off question sets.
 *
 * Every run should get a fresh set, so this is deliberately non-deterministic
 * per request. It lives here rather than inline in the Server Components so
 * the "new set each time" policy sits in one place.
 */
export function newRunSeed(...parts: string[]): string {
  return [...parts, Date.now().toString(36), crypto.randomUUID().slice(0, 8)].join(":");
}

/**
 * Seed for content that should stay stable for a whole day — the job board
 * shows the same four jobs each time a kid opens it.
 */
export function dailySeed(...parts: string[]): string {
  return [...parts, new Date().toISOString().slice(0, 10)].join(":");
}

/**
 * A fresh grown-up gate question (spec §2). Deliberately sits outside the
 * range the app itself teaches, so a strong young player can't walk through
 * it, and re-rolls per request so it can't be memorised from a screenshot.
 */
export function newGateChallenge(): { a: number; b: number } {
  return {
    a: 13 + Math.floor(Math.random() * 6), // 13–18
    b: 12 + Math.floor(Math.random() * 6), // 12–17
  };
}
