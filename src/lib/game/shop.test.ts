/**
 * The cosmetics shop — coins and the city-level gate.
 *
 * Run with:  node --import ./test/register.mjs --test "src/**\/*.test.ts"
 */

import test from "node:test";
import assert from "node:assert/strict";

import { SHOP_ITEMS, canPurchase, findItem } from "./shop";

const OWNED: string[] = [];

test("no item is priced in anything but coins", () => {
  // The student app has no concept of money — docs/native/README.md §0.6.
  for (const item of SHOP_ITEMS) {
    assert.equal(typeof item.coins, "number", `${item.key} has no coin price`);
    assert.ok(!("price" in item), `${item.key} looks like it has a real price`);
    assert.ok(!("usd" in item), `${item.key} looks like it has a real price`);
  }
});

test("a level-gated item refuses below its level and says so in levels", () => {
  const item = findItem("ute-vintage");
  assert.ok(item);
  assert.ok(item.requiresLevel, "this test needs a gated item");

  const tooEarly = canPurchase(item, {
    coins: 99999,
    level: item.requiresLevel - 1,
    owned: OWNED,
  });
  assert.equal(tooEarly.ok, false);
  if (tooEarly.ok) return;

  assert.equal(tooEarly.reason, "level");
  assert.match(tooEarly.message, /level/i);
  // Rank could fall, so an item could vanish from under a child. The message
  // must not promise a rank that no longer exists.
  assert.doesNotMatch(tooEarly.message, /rank/i);
  // And never a price, a plan or a store.
  assert.doesNotMatch(tooEarly.message, /\$|pay|buy|subscri|premium/i);
});

test("the level gate opens and stays open", () => {
  const item = findItem("ute-vintage");
  assert.ok(item?.requiresLevel);

  for (let level = item.requiresLevel; level < item.requiresLevel + 20; level++) {
    const check = canPurchase(item, { coins: 99999, level, owned: OWNED });
    assert.equal(check.ok, true, `level ${level} should be able to buy it`);
  }
});

test("coins are checked after the level, so the reason is the useful one", () => {
  // A child who cannot afford it *and* is too low should be told the thing they
  // can act on soonest — the level is the harder wall.
  const item = findItem("ute-vintage");
  assert.ok(item?.requiresLevel);

  const check = canPurchase(item, { coins: 0, level: 1, owned: OWNED });
  assert.equal(check.ok, false);
  if (check.ok) return;
  assert.equal(check.reason, "level");
});

test("an ungated item only needs the coins", () => {
  const item = findItem("hat-safety-yellow");
  assert.ok(item);
  assert.equal(item.requiresLevel, undefined);

  assert.equal(canPurchase(item, { coins: item.coins, level: 1, owned: OWNED }).ok, true);
  assert.equal(canPurchase(item, { coins: item.coins - 1, level: 1, owned: OWNED }).ok, false);
});

test("owning something beats every other reason", () => {
  const item = findItem("ute-vintage");
  assert.ok(item);
  const check = canPurchase(item, { coins: 0, level: 1, owned: [item.key] });
  assert.equal(check.ok, false);
  if (check.ok) return;
  assert.equal(check.reason, "owned");
});

test("every category in the catalogue has items in it", () => {
  // Android shipped four categories against the web's five, which left seven
  // accessories unreachable on one client and unequippable on both.
  const categories = new Set(SHOP_ITEMS.map((i) => i.category));
  for (const category of ["hats", "vests", "belts", "utes", "accessories"] as const) {
    assert.ok(categories.has(category), `${category} has no items`);
  }
});

test("item keys are unique", () => {
  // A duplicate key means an item renders twice and both copies flip to owned
  // together.
  const keys = SHOP_ITEMS.map((i) => i.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate shop key");
});
