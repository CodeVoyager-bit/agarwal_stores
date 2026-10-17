// Run: npm test. No database needed.
// Hindi and Marathi must say everything English says: no blank text, and the same {slots} and <tags>,
// or a number, a name or a link would quietly go missing on the page.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DICTS } from "../src/lib/i18n/dict";
import { fill, translateMessage } from "../src/lib/i18n";

const slots = (text: string) => [...text.matchAll(/\{(\w+)\}|<(\w+)>/g)].map((m) => m[0]).sort();

function* strings(node: unknown, path: string): Generator<[string, string]> {
  if (typeof node === "string") yield [path, node];
  else if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) yield* strings(value, path ? `${path}.${key}` : key);
}

test("every English text has a Hindi and a Marathi one, with the same slots", () => {
  const english = new Map(strings({ ...DICTS.en, messages: {} }, ""));
  for (const lang of ["hi", "mr"] as const) {
    const other = new Map(strings({ ...DICTS[lang], messages: {} }, ""));
    for (const [path, text] of english) {
      const translated = other.get(path);
      assert.ok(translated?.trim(), `${lang}: ${path} is missing or blank`);
      assert.deepEqual(slots(translated!), slots(text), `${lang}: ${path} has different {slots} or <tags>`);
    }
  }
});

test("server messages: each translation keeps the English wording's slots", () => {
  for (const lang of ["hi", "mr"] as const)
    for (const [english, translated] of Object.entries(DICTS[lang].messages)) {
      assert.ok(translated.trim(), `${lang}: "${english}" is blank`);
      assert.deepEqual(slots(translated), slots(english), `${lang}: "${english}"`);
    }
});

test("messages are matched by wording, slots carried across, unknown ones left in English", () => {
  const table = DICTS.hi.messages;
  assert.equal(translateMessage("Enter a 6‑digit pincode.", table), table["Enter a 6‑digit pincode."]);
  assert.equal(translateMessage("Only 3 left of Golden Rain. Please lower the quantity.", table), fill(table["Only {a} left of {b}. Please lower the quantity."], { a: 3, b: "Golden Rain" }));
  assert.equal(translateMessage("Something nobody wrote down.", table), "Something nobody wrote down.");
  assert.equal(translateMessage(undefined, table), "");
});
