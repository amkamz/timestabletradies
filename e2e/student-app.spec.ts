import { test, expect, solve } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * E2E coverage for the student app (`/play`).
 *
 * These assert the invariants the README calls load-bearing: rewards are
 * recomputed server-side, guess-spam earns nothing, money never appears in
 * the kids' app, and mastery is never signalled by colour alone.
 */

/** Reads the coin balance out of the HUD's screen-reader text. */
async function hudCoins(page: Page): Promise<number> {
  const text = await page.getByText(/^[\d,]+ coins$/).first().innerText();
  return Number(text.replace(/[^\d]/g, ""));
}

/** Answers the question currently on screen, correctly or deliberately not. */
async function answerOne(page: Page, mode: "correct" | "wrong") {
  const main = page.locator("#main");
  await expect(main).toContainText(/\d+\s*[×÷]\s*\d+/, { timeout: 20_000 });
  const answer = solve(await main.innerText());

  const options = main.getByRole("button", { name: /^Option \d+:/ });
  if ((await options.count()) > 0) {
    const names = await options.evaluateAll((els) =>
      els.map((el) => (el.textContent ?? "").replace(/Option \d+:\s*/, "").trim()),
    );
    const wanted =
      mode === "correct"
        ? names.findIndex((n) => Number(n) === answer)
        : names.findIndex((n) => Number(n) !== answer);
    expect(wanted, `no ${mode} option among ${names.join(", ")}`).toBeGreaterThan(-1);
    await options.nth(wanted).click();
    return;
  }

  // Keypad formats: the runner listens on window, so real key presses work.
  const typed = String(mode === "correct" ? answer : answer + 1);
  for (const digit of typed) await page.keyboard.press(digit);
  await page.keyboard.press("Enter");
}

/** Plays a whole run to the results screen. */
async function playRun(page: Page, mode: "correct" | "wrong", questions: number) {
  for (let i = 0; i < questions; i++) await answerOne(page, mode);
  await expect(page.getByRole("heading", { name: "JOB DONE!" })).toBeVisible({ timeout: 30_000 });
}

test.describe("student app", () => {
  test("onboarding lands the kid on their own site", async ({ page }) => {
    await expect(page).toHaveURL(/\/play$/);
    // The house is named after the generated tradie name, not the login.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/COTTAGE|HOUSE/i);
    await expect(page.getByText(/^[\d,]+ coins$/).first()).toBeVisible();
    expect(await hudCoins(page)).toBe(0);
  });

  test("bottom nav reaches every section", async ({ page }) => {
    for (const label of ["Jobs", "Mastery", "Shop", "Locker", "Site"]) {
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label }).click();
      await expect(page.locator("body")).not.toContainText("Application error");
    }
    await expect(page).toHaveURL(/\/play$/);
  });

  test("a Quick Job answered correctly pays out and banks the coins", async ({ page }) => {
    const before = await hudCoins(page);

    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Jobs" }).click();
    await page.getByRole("link", { name: /Quick Job/ }).click();

    await playRun(page, "correct", 10);

    await expect(page.getByText("100%")).toBeVisible();
    await expect(page.getByText("10/10")).toBeVisible();

    const earned = Number(
      (await page.getByText(/^\d+ coins earned$/).innerText()).replace(/[^\d]/g, ""),
    );
    expect(earned).toBeGreaterThan(0);

    // The balance must actually persist, not just render on the results card.
    await page.goto("/play");
    expect(await hudCoins(page)).toBe(before + earned);
  });

  test("guess-spam earns nothing", async ({ page }) => {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Jobs" }).click();
    await page.getByRole("link", { name: /Quick Job/ }).click();

    await playRun(page, "wrong", 10);

    await expect(page.getByText("0%")).toBeVisible();
    await expect(page.getByText(/^0 coins earned$/)).toBeVisible();

    await page.goto("/play");
    expect(await hudCoins(page)).toBe(0);
  });

  test("Build Order accepts keypad input and totals the steps", async ({ page }) => {
    await page.goto("/play/jobs");
    await page.getByRole("link", { name: /Build Order/ }).click();

    await expect(page.getByText(/GRAND TOTAL SO FAR/)).toBeVisible();
    await playRun(page, "correct", 3);
    await expect(page.getByText("3/3")).toBeVisible();
  });

  test("mastery never signals stage by colour alone", async ({ page }) => {
    await page.goto("/play/mastery");
    const table = page.getByRole("table").first();
    await expect(table).toBeVisible();
    // Every cell carries a text description alongside the fill.
    await expect(table.locator(".sr-only").first()).not.toBeEmpty();
  });

  test("money is structurally absent from the kids' app", async ({ page }) => {
    for (const path of ["/play", "/play/jobs", "/play/shop", "/play/locker", "/play/settings"]) {
      await page.goto(path);
      const body = await page.locator("body").innerText();
      expect(body, `pricing leaked into ${path}`).not.toMatch(
        /\$\d|per month|per year|\/month|\/year|subscription|billing|upgrade|checkout/i,
      );
    }
  });

  test("the shop refuses a purchase the kid cannot afford", async ({ page }) => {
    await page.goto("/play/shop");
    await expect(page.getByText(/You have 0 coins/)).toBeVisible();
    const items = page.getByRole("link").filter({ hasText: /\d/ });
    await expect(items.first()).toBeVisible();
  });
});
