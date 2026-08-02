import { test, expect, solve } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * E2E coverage for Scaffold Stack — docs/game-modes/04-scaffold-stack.md
 *
 * The mode's load-bearing claims: a correct answer earns a plank the player
 * places, a wrong answer earns none, the run ends by toppling rather than by
 * running out of questions, and the height that reaches the results screen is
 * the one the server recomputed from the answer log.
 *
 * Requires migration 0002_new_modes.sql to have been applied.
 */

/** The lean, read off the meter's accessible text: "lean 2/6". */
async function lean(page: Page): Promise<number> {
  const text = await page.getByText(/lean(?:ing badly)? \d+\/\d+/).innerText();
  return Number(text.match(/(\d+)\/\d+/)![1]);
}

async function height(page: Page): Promise<number> {
  const text = await page.getByText(/^HEIGHT \d+$/).innerText();
  return Number(text.replace(/[^\d]/g, ""));
}

/** Answers whatever is on screen. Returns the answer it gave. */
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

  const typed = String(mode === "correct" ? answer : answer + 1);
  for (const digit of typed) await page.keyboard.press(digit);
  await page.keyboard.press("Enter");
}

/** Places the earned plank on a side, using the shorter (safe) factor. */
async function placePlank(page: Page, side: "left" | "right") {
  const panel = page.getByRole("region", { name: "Place your plank" });
  await expect(panel).toBeVisible({ timeout: 10_000 });
  const name = side === "left" ? /Place the \d+ plank on the left/ : /Place the \d+ plank on the right/;
  await panel.getByRole("button", { name }).first().click();
}

/** Dismisses the brace offer if it's showing. */
async function skipBraceIfOffered(page: Page) {
  const keep = page.getByRole("button", { name: "KEEP STACKING ▸" });
  if (await keep.isVisible().catch(() => false)) await keep.click();
}

test.describe("Scaffold Stack", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/play/modes/scaffold");
    await page.getByRole("button", { name: "START STACKING ▸" }).click();
  });

  test("the training shed offers the mode", async ({ page }) => {
    await page.goto("/play/modes");
    await expect(page.getByRole("link", { name: /Scaffold Stack/ })).toBeVisible();
  });

  test("a correct answer earns a plank and the placement sets the lean", async ({ page }) => {
    expect(await height(page)).toBe(0);
    expect(await lean(page)).toBe(0);

    await answerOne(page, "correct");
    await placePlank(page, "left");

    expect(await height(page)).toBe(1);
    // Placing left from centre leans the tower one step left.
    expect(await lean(page)).toBe(1);

    // Placing back the other way pulls it level again.
    await answerOne(page, "correct");
    await placePlank(page, "right");
    expect(await height(page)).toBe(2);
    expect(await lean(page)).toBe(0);
  });

  test("a wrong answer earns no plank but wobbles the tower", async ({ page }) => {
    await answerOne(page, "wrong");

    // No placement panel — there is no plank to place.
    await expect(page.getByRole("region", { name: "Place your plank" })).toBeHidden();
    expect(await height(page)).toBe(0);
    expect(await lean(page)).toBe(1);
  });

  test("stacking every plank on one side topples the tower and banks the run", async ({ page }) => {
    // Six planks on the same side reaches the topple threshold.
    for (let i = 0; i < 6; i++) {
      await skipBraceIfOffered(page);
      await answerOne(page, "correct");
      await placePlank(page, "right");
    }

    await expect(page.getByRole("heading", { name: "TIMBER!" })).toBeVisible({ timeout: 30_000 });
    // The height is the server's count of correct answers, not a client claim.
    await expect(page.getByText(/height 6/i).first()).toBeVisible();
    await expect(page.getByText(/New record — 6 planks/)).toBeVisible();
  });

  test("the mode is playable by keyboard alone", async ({ page }) => {
    const main = page.locator("#main");
    await expect(main).toContainText(/\d+\s*[×÷]\s*\d+/);

    // Early questions are multiple choice: number keys pick an option.
    const answer = solve(await main.innerText());
    const names = await main
      .getByRole("button", { name: /^Option \d+:/ })
      .evaluateAll((els) => els.map((el) => (el.textContent ?? "").replace(/Option \d+:\s*/, "").trim()));
    await page.keyboard.press(String(names.findIndex((n) => Number(n) === answer) + 1));

    // Arrow keys place the plank.
    await expect(page.getByRole("region", { name: "Place your plank" })).toBeVisible();
    await page.keyboard.press("ArrowLeft");

    expect(await height(page)).toBe(1);
    expect(await lean(page)).toBe(1);
  });

  test("the tower reports its state without relying on colour", async ({ page }) => {
    await answerOne(page, "correct");
    await placePlank(page, "left");

    // The lean is a number and a direction word, and the tower itself carries
    // a text description — neither depends on seeing the fill.
    await expect(page.getByRole("meter", { name: /Leaning left/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /scaffold 1 planks high/i })).toBeVisible();
  });
});
