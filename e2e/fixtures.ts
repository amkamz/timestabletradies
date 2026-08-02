import { test as base, expect, type Page } from "@playwright/test";

/**
 * Onboards a throwaway family through the real UI and hands the test a page
 * sitting inside the student app.
 *
 * There is no seeding shortcut on purpose: the parent holds the only auth
 * session and the active student is an httpOnly cookie set by `selectStudent`,
 * so walking A2→A7 is the only way to reach `/play` the way a kid does.
 */

export type Onboarded = {
  email: string;
  password: string;
  parentName: string;
  studentName: string;
};

/** Reads "7 × 3" or "56 ÷ 8" out of a chunk of text and returns the answer. */
export function solve(text: string): number {
  const match = text.match(/(\d+)\s*([×÷])\s*(\d+)/);
  if (!match) throw new Error(`No question found in: ${text.slice(0, 200)}`);
  const [, left, op, right] = match;
  return op === "×" ? Number(left) * Number(right) : Number(left) / Number(right);
}

/** Clears the grown-up gate, which re-rolls its challenge on every visit. */
export async function passGate(page: Page, next: string) {
  await page.goto(`/gate?next=${encodeURIComponent(next)}`);
  const challenge = await page.locator("form").innerText();
  await page.getByLabel(/what is \d+ times \d+/i).fill(String(solve(challenge)));
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await page.waitForURL(`**${next}**`);
}

export async function onboard(page: Page): Promise<Onboarded> {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const account: Onboarded = {
    // `.test` is reserved by RFC 2606, so these addresses can never reach a
    // real inbox. `example.com` is rejected outright by Supabase's validator.
    email: `tradie-${stamp}@tradie-e2e.test`,
    password: "site-boots-2026",
    parentName: "Test Parent",
    studentName: `Kid ${stamp.slice(-4)}`,
  };

  await passGate(page, "/onboarding/parent");

  await page.getByLabel("Your name").fill(account.parentName);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await page.waitForURL("**/onboarding/students", { timeout: 30_000 });

  await page.getByRole("button", { name: /add another kid/i }).click();
  await page.getByLabel("Name", { exact: true }).fill(account.studentName);
  await page.getByRole("button", { name: "ADD", exact: true }).click();

  await page.getByRole("link", { name: /next: pick looks/i }).click();
  await page.waitForURL("**/onboarding/look**");
  await page.getByRole("button", { name: /looks good/i }).click();

  await page.waitForURL("**/onboarding/name**");
  await page.getByRole("button", { name: /that's me/i }).click();

  await page.waitForURL("**/onboarding/meet**");
  await page.getByRole("button", { name: /start my first job/i }).click();
  await page.waitForURL("**/play");

  return account;
}

/**
 * Every test starts on a brand-new family, so none can see another's coins.
 * `auto` because the onboarding is a precondition, not something the tests
 * read — they only need `page` to already be inside `/play`.
 */
export const test = base.extend<{ account: Onboarded }>({
  account: [
    async ({ page }, use) => {
      await use(await onboard(page));
    },
    { auto: true },
  ],
});

export { expect };
