import { audit, connectDB, Product } from "./db";
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
  active: ["on sale", "active", "live", "available", "show"],
  image: ["photo", "image", "picture", "photo link", "image url", "photo url"],
} as const;
type Column = keyof typeof COLUMNS;

export type PlanRow = {
  line: number;
  name: string;
  outcome: "create" | "update" | "same" | "heading" | "error";
  message?: string;
  fields?: { name: string; category: string; unit: string; mrp: number; price: number; stock: number; active: boolean; image?: string };
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
/** "₹1,200", "1200.00", "Rs. 1200" → 1200; NaN when it isn't an amount. */
const amount = (text: string) => (text.trim() ? Number(text.replace(/rs\.?|₹|,|\s/gi, "")) : NaN);
const yes = (text: string) => !/^(no|n|false|0|off|hide|hidden)$/i.test(text.trim());

/** Which position each known column has in the header row. */
function positions(header: string[]) {
  const names = header.map((h) => key(h).replace(/[_.()]/g, " ").replace(/\s+/g, " ").trim());
  const found: Partial<Record<Column, number>> = {};
  for (const [column, aliases] of Object.entries(COLUMNS) as [Column, readonly string[]][]) {
    const index = names.findIndex((n) => (aliases as readonly string[]).includes(n));
    if (index >= 0) found[column] = index;
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
  const existing = new Map((await Product.find({}).lean()).map((p) => [key(p.name), p]));
  const seen = new Set<string>();
  let section = "";
  const cell = (cells: string[], column: Column) => (columns[column] === undefined ? "" : clean(String(cells[columns[column]!] ?? "")));

  const rows = body.map((cells, index): PlanRow => {
    const line = headerAt + index + 2;
    const name = cell(cells, "name");
    const [mrpText, priceText, stockText] = [cell(cells, "mrp"), cell(cells, "price"), cell(cells, "stock")];
    if (!name) return { line, name: "", outcome: "same", message: "Empty row." };
    if (!mrpText && !priceText && !stockText && !cell(cells, "category")) {
      section = titleCase(name);
      return { line, name, outcome: "heading", message: `Rows below go in “${section}”.` };
    }
    if (name.length > 120) return { line, name, outcome: "error", message: "The name is longer than 120 letters." };
    if (seen.has(key(name))) return { line, name, outcome: "error", message: "This name is already on an earlier row." };
    seen.add(key(name));

    const old = existing.get(key(name));
    const price = priceText ? amount(priceText) : old?.price ?? amount(mrpText);
    const mrp = mrpText ? amount(mrpText) : old?.mrp ?? price;
    const stock = stockText ? amount(stockText) : old?.stock ?? 0;
    for (const [label, value] of [["Price", price], ["MRP", mrp], ["Stock", stock]] as const)
      if (!Number.isInteger(value) || value < 0) return { line, name, outcome: "error", message: `${label} must be whole rupees or a whole number, 0 or more.` };
    if (price > mrp) return { line, name, outcome: "error", message: "Price is more than the MRP." };
    const category = cell(cells, "category") ? titleCase(cell(cells, "category")) : old?.category || section;
    if (!category) return { line, name, outcome: "error", message: "No category: add a Category column, or a heading row like “Sparklers” above it." };
    const image = cell(cells, "image");
    if (image && !/^https:\/\//.test(image)) return { line, name, outcome: "error", message: "The photo must be a link starting with https://" };

    const fields = {
      name: old?.name ?? name,
      category,
      unit: cell(cells, "unit") || old?.unit || "1 box",
      mrp,
      price,
      stock,
      active: cell(cells, "active") ? yes(cell(cells, "active")) : (old?.active ?? true),
      ...(image ? { image } : {}),
    };
    if (!old) return { line, name, outcome: "create", fields };
    const changed = (["category", "unit", "mrp", "price", "stock", "active", "image"] as const).filter(
      (f) => fields[f as keyof typeof fields] !== undefined && fields[f as keyof typeof fields] !== old[f],
    );
    return changed.length
      ? { line, name, outcome: "update", message: `Changes ${changed.join(", ")}.`, fields, id: String(old._id) }
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
      await Product.updateOne({ _id: row.id }, row.fields!, { runValidators: true });
      updated++;
    }
  }
  if (created || updated) await audit(by, "stock.import", "Catalog", `${created} added, ${updated} changed`);
  return { created, updated };
}
