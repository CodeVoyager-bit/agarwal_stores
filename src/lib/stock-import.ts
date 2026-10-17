import { audit, CATEGORIES, connectDB, Product } from "./db";
import { tidyLines } from "./format";
import { readXlsx } from "./xlsx";

/** The most rows one sheet may hold, and the largest file read. */
export const MAX_ROWS = 1000;
export const MAX_BYTES = 2 * 1024 * 1024;

/** The columns a price list uses, and the other names shops give them. */
const COLUMNS = {
  name: ["name", "item", "items", "product", "item name", "product name", "particulars", "description"],
  category: ["category", "type", "group", "section"],
  unit: ["pack", "unit", "packing", "content", "contents", "per box", "pcs"],
  mrp: ["mrp", "actual price", "list price", "actual rate"],
  price: ["price", "our price", "offer price", "offer rate", "selling price", "net price", "sale price", "discount price", "rate", "net rate"],
  stock: ["stock", "qty", "quantity", "in stock", "on hand", "count"],
  addStock: ["add stock", "received", "new stock", "add qty"],
  active: ["on sale", "active", "live", "available", "show"],
  image: ["photo", "image", "picture", "photo link", "image url", "photo url"],
  maker: ["maker", "manufacturer", "manufactured by", "mfd by", "made by", "company", "brand"],
  // last on purpose: many lists call the product's name "Description", and the name takes it first
  description: ["details", "product details", "about", "notes", "description"],
} as const;
type Column = keyof typeof COLUMNS;

export type PlanRow = {
  line: number;
  name: string;
  outcome: "create" | "update" | "same" | "heading" | "error";
  message?: string;
  fields?: { name: string; category: string; unit: string; mrp: number; price: number; stock?: number; addStock?: number; active: boolean; image?: string; description?: string; maker?: string };
  id?: string;
};

/**
 * A small CSV reader (from Agarwal Online's lib/inventory/csv.ts): commas, quoted fields with ""
 * for a quote and line breaks inside, Windows or Unix line endings, the byte-order mark Excel adds.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** An .xlsx (it starts like every zip, "PK") or a .csv, as rows of text. */
export function readSheet(bytes: Uint8Array) {
  if (bytes.length > MAX_BYTES) throw new Error("That file is too big. Keep it under 2 MB.");
  return bytes[0] === 0x50 && bytes[1] === 0x4b ? readXlsx(bytes) : parseCsv(new TextDecoder().decode(bytes));
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();
const key = (name: string) => clean(name).toLowerCase();
const titleCase = (text: string) => clean(text).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
/**
 * "₹1,200", "1200.00", "Rs. 1200", "60/-" → the number; NaN when it isn't an amount (a lone "₹" too).
 * Rounded to paise: an Excel formula's 62.999999999999993 is the 63 it shows.
 */
const amount = (text: string) => {
  const digits = text.replace(/rs\.?|inr|₹|,|\s|\/-$/gi, "");
  return digits ? Math.round(Number(digits) * 100) / 100 : NaN;
};
const yes = (text: string) => !/^(no|n|false|0|off|hide|hidden)$/i.test(text.trim());

/**
 * Which position each known column has in the header row; a column is only ever used once. The best
 * name wins over position ("Name" over a "Description" left of it), and "Price (Rs.)" reads as Price.
 */
function positions(header: string[]) {
  const names = header.map((h) => key(h).replace(/[_.()]/g, " ").replace(/₹|\b(in )?(rs|inr|rupees)\b/g, " ").replace(/\s+/g, " ").trim());
  const found: Partial<Record<Column, number>> = {};
  const taken = new Set<number>();
  for (const [column, aliases] of Object.entries(COLUMNS) as [Column, readonly string[]][]) {
    for (const alias of aliases) {
      const index = names.findIndex((n, i) => !taken.has(i) && n === alias);
      if (index >= 0) {
        found[column] = index;
        taken.add(index);
        break;
      }
    }
  }
  return found;
}

/**
 * Reads a price list against today's catalog without changing anything: which rows add a product,
 * which change one (matched by name), which are section headings like "SPARKLERS" that set the
 * category for the rows under them, and which can't be used and why.
 */
export async function planImport(table: string[][]): Promise<{ rows: PlanRow[]; problem?: string }> {
  // price lists often carry a shop name or title above the real header
  const headerAt = table.slice(0, 15).findIndex((row) => {
    const found = positions(row);
    return found.name !== undefined && (found.price !== undefined || found.mrp !== undefined);
  });
  if (headerAt < 0) return { rows: [], problem: "Couldn't find the header row. It needs a “Name” column and a “Price” or “MRP” column." };
  const columns = positions(table[headerAt]);
  const body = table.slice(headerAt + 1);
  if (body.length > MAX_ROWS) return { rows: [], problem: `One file can hold up to ${MAX_ROWS} rows. Split it into smaller files.` };

  await connectDB();
  const all = await Product.find({}).lean();
  const existing = new Map(all.map((p) => [key(p.name), p]));
  // two products with one name can't be told apart by name, so rows for them are refused
  const twice = new Set(all.map((p) => key(p.name)).filter((k, i, list) => list.indexOf(k) !== i));
  // a category keeps the spelling the shop already uses ("LED Crackers"); a new one in capitals,
  // like a "SPARKLERS" heading, is title-cased, and any other is kept as typed
  const shelves = new Map([...CATEGORIES, ...all.map((p) => p.category)].map((c) => [c.toLowerCase(), c]));
  const shelf = (typed: string) => shelves.get(typed.toLowerCase()) ?? (typed === typed.toUpperCase() ? titleCase(typed) : typed);
  const seen = new Set<string>();
  let section = "";
  const cell = (cells: string[], column: Column) => (columns[column] === undefined ? "" : clean(String(cells[columns[column]!] ?? "")));

  const rows = body.map((cells, index): PlanRow => {
    const line = headerAt + index + 2;
    const name = cell(cells, "name");
    const [mrpText, priceText, stockText] = [cell(cells, "mrp"), cell(cells, "price"), cell(cells, "stock")];
    if (!name) return { line, name: "", outcome: "same", message: "Empty row." };
    // a heading has nothing but its name and isn't a product already ("SPARKLERS" above its rows)
    if ((Object.keys(columns) as Column[]).every((c) => c === "name" || !cell(cells, c)) && !existing.has(key(name))) {
      section = shelf(name);
      return { line, name, outcome: "heading", message: `Rows below go in “${section}”.` };
    }
    if (name.length > 120) return { line, name, outcome: "error", message: "The name is longer than 120 letters." };
    if (seen.has(key(name))) return { line, name, outcome: "error", message: "This name is already on an earlier row." };
    if (twice.has(key(name))) return { line, name, outcome: "error", message: "Two products already have this name. Rename one on the Inventory page first." };
    seen.add(key(name));

    const old = existing.get(key(name));
    const price = priceText ? amount(priceText) : old?.price ?? amount(mrpText);
    const mrp = mrpText ? amount(mrpText) : old?.mrp ?? price;
    // Stock replaces the number (a recount); Add stock adds to what is on the shelf by then. A blank
    // Stock leaves it alone, so orders taken since the sheet was written aren't undone
    const added = cell(cells, "addStock") ? amount(cell(cells, "addStock")) : 0;
    const stock = stockText ? amount(stockText) : old ? undefined : 0;
    for (const [label, value] of [["Price", price], ["MRP", mrp], ["Stock", stock ?? 0], ["Add stock", added]] as const)
      if (!Number.isInteger(value) || value < 0) return { line, name, outcome: "error", message: `${label} must be whole rupees or a whole number, 0 or more.` };
    if (price > mrp) return { line, name, outcome: "error", message: "Price is more than the MRP." };
    const category = cell(cells, "category") ? shelf(cell(cells, "category")) : old?.category || section;
    if (!category) return { line, name, outcome: "error", message: "No category: add a Category column, or a heading row like “Sparklers” above it." };
    const image = cell(cells, "image");
    if (image && !/^https:\/\//.test(image)) return { line, name, outcome: "error", message: "The photo must be a link starting with https://" };
    if (cell(cells, "unit").length > 40) return { line, name, outcome: "error", message: "The pack is longer than 40 letters." };
    // like the other columns, an empty cell keeps what the product has; line breaks inside a cell stay
    const description = columns.description === undefined ? "" : tidyLines(String(cells[columns.description] ?? ""));
    if (description.length > 1000) return { line, name, outcome: "error", message: "The description is longer than 1000 letters." };
    const maker = cell(cells, "maker");
    if (maker.length > 200) return { line, name, outcome: "error", message: "The maker is longer than 200 letters." };

    const stockFields: { stock?: number; addStock?: number } = stock !== undefined ? { stock: stock + added } : added ? { addStock: added } : {};
    const fields = {
      name: old?.name ?? name,
      category,
      unit: cell(cells, "unit") || old?.unit || "1 box",
      mrp,
      price,
      ...stockFields,
      active: cell(cells, "active") ? yes(cell(cells, "active")) : (old?.active ?? true),
      ...(image ? { image } : {}),
      ...(description ? { description } : {}),
      ...(maker ? { maker } : {}),
    };
    if (!old) return { line, name, outcome: "create", fields };
    const changed = (["category", "unit", "mrp", "price", "stock", "active", "image", "description", "maker"] as const).filter(
      (f) => fields[f as keyof typeof fields] !== undefined && fields[f as keyof typeof fields] !== old[f],
    );
    const what = [...changed.map((f) => (["stock", "mrp", "price"].includes(f) ? `${f} ${old[f as "stock"]} → ${fields[f as "stock"]}` : f)), ...(fields.addStock ? [`stock +${fields.addStock}`] : [])];
    return what.length
      ? { line, name, outcome: "update", message: `Changes ${what.join(", ")}.`, fields, id: String(old._id) }
      : { line, name, outcome: "same", message: "Already the same." };
  });
  return { rows };
}

/** Saves every usable row of a plan; returns how many were added and changed. */
export async function applyImport(rows: PlanRow[], by: string) {
  await connectDB();
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    if (row.outcome === "create") {
      await Product.create(row.fields!);
      created++;
    } else if (row.outcome === "update") {
      const { addStock, ...fields } = row.fields!;
      await Product.updateOne({ _id: row.id }, { ...fields, ...(addStock && { $inc: { stock: addStock } }) }, { runValidators: true });
      updated++;
    } else continue;
    // one line per product, like an edit by hand, so a bulk change can be checked afterwards
    await audit(by, "stock.import", row.fields!.name, row.outcome === "create" ? "added" : (row.message ?? "changed").replace(/^Changes |\.$/g, ""));
  }
  return { created, updated };
}
