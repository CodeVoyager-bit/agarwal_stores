// Needs local MongoDB running. Run: npm test
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import mongoose from "mongoose";

// Always a throwaway local database (it is dropped), never the one in .env; and never a real SMS.
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/agarwal_fatake_import_test";
process.env.MOCK_OTP = "true";
const { connectDB, Product } = await import("../src/lib/db");
const { applyImport, parseCsv, planImport, readSheet } = await import("../src/lib/stock-import");
const { xlsx } = await import("../src/lib/xlsx");

await connectDB();
await mongoose.connection.dropDatabase();
after(() => mongoose.disconnect());

const rows = [["Name", "Category", "Pack", "MRP", "Price", "Stock"], ["Anar, Big \"Gold\"", "Anar", "10 pcs", 450, 180, 12]];

test("Excel files read back, whether stored (our export) or compressed (as Excel saves them)", () => {
  const stored = xlsx([{ name: "Price list", rows }]);
  const expected = rows.map((r) => r.map(String));
  assert.deepEqual(readSheet(stored), expected);
  // re-zip with deflate, the way Excel writes .xlsx
  const dir = mkdtempSync(join(tmpdir(), "xlsx-"));
  writeFileSync(join(dir, "a.xlsx"), stored);
  execFileSync("unzip", ["-q", "a.xlsx", "-d", "parts"], { cwd: dir });
  execFileSync("zip", ["-q", "-r", "-9", "../b.xlsx", "."], { cwd: join(dir, "parts") });
  assert.deepEqual(readSheet(new Uint8Array(readFileSync(join(dir, "b.xlsx")))), expected);
});

test("CSV: quotes, commas and line breaks inside fields", () => {
  assert.deepEqual(parseCsv('﻿Name,Price\r\n"Anar, Big ""Gold""",180\r\n'), [["Name", "Price"], ['Anar, Big "Gold"', "180"]]);
});

test("a shop's price list: title rows, section headings, new and changed products, problems", async () => {
  await Product.create({ name: "Laxmi Bomb", category: "Bombs", unit: "10 pcs", mrp: 120, price: 48, stock: 5 });
  const table = [
    ["Agarwal Stores Price List 2026"],
    [],
    ["S.No", "Particulars", "Content", "Actual Rate", "Offer Rate", "Qty"],
    ["", "SPARKLERS"],
    ["1", "Electric Sparklers 10 cm", "10 pcs", "₹60", "24", "50"],
    ["2", "Colour Sparklers 15cm", "10 pcs", "100", "", "20"],
    ["", "BOMBS"],
    ["3", "laxmi bomb", "10 pcs", "120", "50", "40"],
    ["4", "Hydro Bomb", "", "abc", "100", ""],
    ["5", "Cheap Bomb", "", "10", "20", ""],
  ].map((r) => r.map(String));
  const { rows: plan, problem } = await planImport(table);
  assert.equal(problem, undefined);
  const by = (name: string) => plan.find((r) => r.name.toLowerCase() === name.toLowerCase())!;
  assert.equal(by("SPARKLERS").outcome, "heading");
  assert.equal(by("Electric Sparklers 10 cm").outcome, "create");
  assert.equal(by("Electric Sparklers 10 cm").fields!.category, "Sparklers");
  assert.equal(by("Electric Sparklers 10 cm").fields!.mrp, 60);
  assert.equal(by("Colour Sparklers 15cm").fields!.price, 100, "no offer price: sold at MRP");
  assert.equal(by("laxmi bomb").outcome, "update");
  assert.match(by("laxmi bomb").message!, /price 48 → 50, stock 5 → 40/);
  assert.equal(by("Hydro Bomb").outcome, "error");
  assert.match(by("Cheap Bomb").message!, /more than the MRP/);

  assert.deepEqual(await applyImport(plan, "test"), { created: 2, updated: 1 });
  const laxmi = await Product.findOne({ name: "Laxmi Bomb" }).lean();
  assert.equal(laxmi!.price, 50);
  assert.equal(laxmi!.stock, 40);
  assert.equal(await Product.countDocuments(), 3);
});

test("a sheet without a name and price column is refused before anything is read", async () => {
  assert.match((await planImport([["Item code", "Qty"], ["A1", "3"]])).problem!, /header row/);
});

test("a Description column is the write-up when there's a Name column, and the name when there isn't", async () => {
  const withName = [["Name", "Category", "Price", "Description"], ["Write-up Anar", "Anar", "90", "Golden fountain,\r\n  about 40 seconds"]];
  const a = (await planImport(withName)).rows[0];
  assert.equal(a.fields!.name, "Write-up Anar");
  assert.equal(a.fields!.description, "Golden fountain,\nabout 40 seconds");
  const nameOnly = [["S.No", "Description", "Type", "Rate"], ["1", "Write-up Rocket", "Rockets", "70"]];
  const b = (await planImport(nameOnly)).rows[0];
  assert.equal(b.fields!.name, "Write-up Rocket");
  assert.equal(b.fields!.description, undefined);
  await applyImport([a], "test");
  // an empty cell keeps the write-up already saved
  assert.equal((await planImport([["Name", "Category", "Price", "Description"], ["Write-up Anar", "Anar", "90", ""]])).rows[0].outcome, "same");
});

test("import: two products with one name are refused, a shop's own category spelling is kept, a lone ₹ is no price", async () => {
  await Product.create({ name: "Twin Sparkler", category: "Sparklers", mrp: 60, price: 24, stock: 5 });
  await Product.create({ name: "twin sparkler", category: "Sparklers", mrp: 300, price: 120, stock: 5 });
  await Product.create({ name: "Glow Ball", category: "LED Crackers", mrp: 100, price: 50, stock: 5 });
  const { rows } = await planImport([
    ["Name", "Category", "MRP", "Price"],
    ["Twin Sparkler", "Sparklers", "60", "24"],
    ["Glow Ball", "led crackers", "100", "45"],
    ["Brand New", "2-in-1 Specials", "90", "=62.999999999999993"],
    ["Placeholder", "Anar", "₹", "₹"],
  ]);
  assert.match(rows[0].message!, /Two products already have this name/);
  assert.equal(rows[1].fields!.category, "LED Crackers");
  assert.match(rows[1].message!, /price 50 → 45/);
  assert.equal(rows[2].outcome, "error", "a formula's text isn't an amount");
  assert.equal(rows[3].outcome, "error");
  const formula = await planImport([["Name", "Category", "MRP", "Price"], ["Formula Made", "2-in-1 Specials", "90", "62.999999999999993"]]);
  assert.equal(formula.rows[0].fields!.price, 63, "Excel's stored formula result is the 63 it shows");
  assert.equal(formula.rows[0].fields!.category, "2-in-1 Specials", "a new mixed-case category is kept as typed");
});
