import assert from "node:assert/strict";
import { test } from "node:test";
import type { ShopItem } from "../src/lib/format";
import { goesWith } from "../src/lib/pairs";

const item = (id: string, category: string, price: number, stock = 10): ShopItem => ({ id, name: id, category, unit: "", mrp: price, price, stock, image: "" });
const items = [
  item("spark", "Sparklers", 20),
  item("chakri-cheap", "Chakri", 30),
  item("chakri-hit", "Chakri", 90),
  item("anar", "Anar", 50),
  item("anar-out", "Anar", 10, 0),
  item("kids", "Kids Special", 40),
  item("rocket", "Rockets", 60),
];

test("sparklers bring chakri, anar and kids' items, taking turns, best sellers first, never sold out", () => {
  const picks = goesWith(items, ["Sparklers"], new Set(["spark"]), ["chakri-hit"]).map((i) => i.id);
  assert.deepEqual(picks, ["chakri-hit", "anar", "kids", "chakri-cheap"]);
});

test("shelves already in the cart are left out, unless nothing else is left", () => {
  assert.deepEqual(goesWith(items, ["Chakri", "Anar"], new Set(["chakri-cheap"]), []).map((i) => i.id), ["spark"]);
  assert.deepEqual(goesWith(items, ["Rockets"], new Set(), []).map((i) => i.id), ["anar"]);
  assert.deepEqual(goesWith(items, ["Unknown shelf"], new Set(), []), []);
});
