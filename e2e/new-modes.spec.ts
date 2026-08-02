import { test, expect, solve } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * E2E coverage for Cable Run, The Tool-Off, Floor Plan and Ute Rally.
 * See docs/game-modes/.
 *
 * These cover the things unit tests can't reach: that each mode is reachable
 * from the training shed, that its board renders and responds, and that the
 * accessibility affordances the specs promise are actually in the DOM.
 * The arithmetic itself is covered far more thoroughly by `npm test`.
 *
 * Requires migration 0002_new_modes.sql to have been applied.
 */

/** Reads the coin balance out of the HUD's screen-reader text. */
async function hudCoins(page: Page): Promise<number> {
  const text = await page.getByText(/^[\d,]+ coins$/).first().innerText();
  return Number(text.replace(/[^\d]/g, ""));
}

test.describe("the training shed", () => {
  test("offers all five new modes", async ({ page }) => {
    await page.goto("/play/modes");
    for (const name of [
      "Scaffold Stack",
      "Cable Run",
      "The Tool-Off",
      "Floor Plan",
      "Ute Rally",
    ]) {
      await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    }
  });

  test("no new mode leaks a price into the kids' app", async ({ page }) => {
    // Money is structurally absent from /play — same invariant the existing
    // suite asserts, re-checked across the new screens.
    for (const href of [
      "/play/modes/scaffold",
      "/play/modes/cable-run",
      "/play/modes/tool-off",
      "/play/modes/floor-plan",
      "/play/modes/rally",
    ]) {
      await page.goto(href);
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.locator("body")).not.toContainText(/\$\d/);
      await expect(page.locator("body")).not.toContainText(/subscription|billing|upgrade/i);
    }
  });
});

test.describe("Cable Run", () => {
  test("either routes a circuit or explains why it's locked", async ({ page }) => {
    await page.goto("/play/modes/cable-run");

    // A brand-new student has no division unlocked, so the mode is gated —
    // and the gate has to say so rather than 404 or render an empty board.
    const locked = page.getByText(/Cable Run needs division/);
    if (await locked.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /FIND A JOB/ })).toBeVisible();
      return;
    }

    await expect(page.getByRole("group", { name: "Junction grid" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Connectors" })).toBeVisible();

    // Cable is reported as a value, not just a bar.
    await expect(page.getByRole("progressbar", { name: /lengths of cable left/ })).toBeVisible();

    // Selecting a connector and a junction that can't be right explains itself.
    await page.getByRole("region", { name: "Connectors" }).getByRole("button").first().click();
    const junctions = page.getByRole("group", { name: "Junction grid" }).getByRole("button");
    await junctions.first().click();
    await expect(page.locator("#main")).toContainText(/isn't next to you|doesn't work|and that junction is/);
  });

  test("junctions describe themselves for a screen reader", async ({ page }) => {
    await page.goto("/play/modes/cable-run");
    if (await page.getByText(/Cable Run needs division/).isVisible().catch(() => false)) return;

    // Position, value, and reachability — never colour alone.
    await expect(
      page.getByRole("button", { name: /Row \d+, column \d+, junction \d+/ }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /you are here/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /switchboard/ })).toBeVisible();
  });
});

test.describe("The Tool-Off", () => {
  test("picks a rival, then builds the target from the belt", async ({ page }) => {
    await page.goto("/play/modes/tool-off");

    // Kade is available from rank 1, so he's always on the roster.
    await page.getByRole("button", { name: /Apprentice Kade/ }).click();

    await expect(page.getByRole("region", { name: "Tool belt" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /You: \d+ of \d+ health/ })).toBeVisible();

    // Health is numeric as well as a bar — the child needs it to plan.
    await expect(page.locator("#main")).toContainText(/\d+\/\d+/);

    // Two tools make a product, and the swing button unlocks.
    const swing = page.getByRole("button", { name: "SWING ▸" });
    await expect(swing).toBeDisabled();

    const tools = page.getByRole("region", { name: "Tool belt" }).getByRole("button");
    await tools.nth(0).click();
    await tools.nth(1).click();
    await expect(page.locator("#main")).toContainText(/✓ EXACT|≈ CLOSE|✕ MISS/);
    await expect(swing).toBeEnabled();

    // Nothing fires until the swing: changing your mind is allowed.
    await tools.nth(0).click();
    await expect(swing).toBeDisabled();
  });
});

test.describe("Floor Plan", () => {
  test("places a block and counts the squares down", async ({ page }) => {
    await page.goto("/play/modes/floor-plan");

    await expect(page.getByRole("group", { name: /Room floor/ })).toBeVisible();
    const room = await page.getByText(/^ROOM \d+ × \d+ = \d+$/).innerText();
    const total = Number(room.split("=")[1].trim());
    expect(await squaresLeft(page)).toBe(total);

    // Pick the first pallet block and drop it in the top-left corner.
    await page.getByRole("region", { name: "Pallet" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Row 1, column 1, bare" }).click();

    expect(await squaresLeft(page)).toBeLessThan(total);
    await expect(page.getByRole("button", { name: /Row 1, column 1, covered/ })).toBeVisible();

    // Lifting puts them back.
    await page.getByRole("button", { name: "↶ LIFT" }).click();
    expect(await squaresLeft(page)).toBe(total);
  });

  test("rotating a block keeps its area — the commutativity beat", async ({ page }) => {
    await page.goto("/play/modes/floor-plan");

    const pallet = page.getByRole("region", { name: "Pallet" }).getByRole("button").first();
    const before = await pallet.getAttribute("aria-label");
    await pallet.click();
    await page.getByRole("button", { name: "⟲ ROTATE" }).click();

    const [w, h] = before!.match(/(\d+) by (\d+)/)!.slice(1).map(Number);
    await expect(page.locator("#main")).toContainText(
      new RegExp(`${h} × ${w} = ${w * h}|${w} × ${h} = ${w * h}`),
    );
    await expect(page.locator("#main")).toContainText("same either way round");
  });

  async function squaresLeft(page: Page): Promise<number> {
    const text = await page.getByText(/^\d+ left$/).innerText();
    return Number(text.replace(/[^\d]/g, ""));
  }
});

test.describe("Ute Rally", () => {
  test("labels its opponents as practice crew", async ({ page }) => {
    await page.goto("/play/modes/rally");
    // Simulated racers are never passed off as real children.
    await expect(page.getByText("(practice crew)").first()).toBeVisible();
  });

  test("runs the first leg sealed, then offers a fork", async ({ page }) => {
    await page.goto("/play/modes/rally");
    await page.getByRole("button", { name: /ROLL OUT/ }).click();

    await expect(page.locator("#main")).toContainText("SEALED ROAD");
    await expect(page.locator("#main")).toContainText(/LEG 1\/6/);

    // Answer the whole first leg.
    for (let i = 0; i < 4; i++) {
      const main = page.locator("#main");
      await expect(main).toContainText(/\d+\s*[×÷]\s*\d+/);
      const answer = solve(await main.innerText());
      const options = main.getByRole("button", { name: /^Option \d+:/ });
      const names = await options.evaluateAll((els) =>
        els.map((el) => (el.textContent ?? "").replace(/Option \d+:\s*/, "").trim()),
      );
      await options.nth(names.findIndex((n) => Number(n) === answer)).click();
    }

    // The fork spells out the gamble in both directions.
    await expect(page.getByText("FORK AHEAD")).toBeVisible();
    await expect(page.getByRole("button", { name: /SEALED ROAD/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /DIRT SHORTCUT/ })).toBeVisible();
    await expect(page.locator("#main")).toContainText("banks nothing");
  });

  test("a finished rally reports where it placed and pays even for last", async ({ page }) => {
    const before = await hudCoins(page);
    await page.goto("/play/modes/rally");
    await page.getByRole("button", { name: /ROLL OUT/ }).click();

    // Answer everything wrong, taking the default road at every fork.
    for (let leg = 0; leg < 6; leg++) {
      for (let i = 0; i < 4; i++) {
        const main = page.locator("#main");
        await expect(main).toContainText(/\d+\s*[×÷]\s*\d+/, { timeout: 20_000 });
        const answer = solve(await main.innerText());
        const options = main.getByRole("button", { name: /^Option \d+:/ });
        if ((await options.count()) > 0) {
          const names = await options.evaluateAll((els) =>
            els.map((el) => (el.textContent ?? "").replace(/Option \d+:\s*/, "").trim()),
          );
          await options.nth(names.findIndex((n) => Number(n) !== answer)).click();
        } else {
          for (const digit of String(answer + 1)) await page.keyboard.press(digit);
          await page.keyboard.press("Enter");
        }
      }
      if (leg < 5) {
        await page.getByRole("button", { name: /SEALED ROAD/ }).click();
      }
    }

    await expect(page.getByRole("heading", { name: "CHEQUERED FLAG" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/\d(st|nd|rd|th) of \d+ · \d+ lengths/)).toBeVisible();
    // Last place still pays — a wasted race stops kids entering.
    expect(await hudCoins(page)).toBeGreaterThan(before);
  });
});
