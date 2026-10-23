import { cache } from "react";
import { connectDB, Shop } from "./db";

/**
 * Everything an owner can change on Admin > Settings (/admin/shop), with what the site does until they
 * do: today's behaviour, so nothing moves on its own. Stored in one document, _id "shop" (lib/db.ts).
 */
const DEFAULTS = {
  // Shop details. The Consumer Protection (E-Commerce) Rules, 2020 want the legal name, address,
  // grievance officer (with their role) and contact shown; the licence is what makes the sale lawful.
  // A blank one is left off the pages.
  legalName: "Agarwal Stores",
  address: "Nagothane, Raigad, Maharashtra",
  phone: process.env.SHOP_PHONE ?? "",
  email: "",
  hours: "",
  gstin: "",
  gstScheme: "regular",
  licence: "",
  grievanceOfficer: "",
  courts: "Raigad, Maharashtra",
  // The bill (app/bill/[id]): what is printed, and the GST it's made at
  billPrefix: "",
  billTagline: "",
  billNote: "",
  billSignatory: "",
  billLogo: true,
  billHsnColumn: true,
  billAddress: true,
  hsn: "3604",
  gstRate: 18,
  // Bookings and delivery
  bookingsOpen: true,
  closedMessage: "",
  // 0 to 2 reads “within 2 days” (lib/i18n deliveryDays)
  deliveryFrom: 0,
  deliveryTo: 2,
  pincodes: "",
  minOrder: 0,
  maxWaiting: 5,
  upiId: "",
  // Shop front, stock and the packing slip
  announcement: "",
  showDiscount: true,
  showLeftBelow: 10,
  lowStock: 5,
  slipNote: "",
};
export type Settings = typeof DEFAULTS;
export const SETTING_DEFAULTS: Readonly<Settings> = DEFAULTS;
export type ShopDetails = Settings;

export const SETTING_GROUPS = ["shop", "bill", "booking", "front"] as const;
type Kind = "text" | "long" | "number" | "check" | "select";
type Field = { key: keyof Settings; group: (typeof SETTING_GROUPS)[number]; kind: Kind; max?: number; min?: number; options?: readonly string[] };

/** The Settings page, in order; labels and hints are in the catalog words (lib/i18n/sections/catalog.ts). */
export const SETTINGS: readonly Field[] = [
  { key: "legalName", group: "shop", kind: "text", max: 120 },
  { key: "address", group: "shop", kind: "long", max: 300 },
  // room for +91 and spaces, which readSettings takes off
  { key: "phone", group: "shop", kind: "text", max: 20 },
  { key: "email", group: "shop", kind: "text", max: 120 },
  { key: "hours", group: "shop", kind: "text", max: 80 },
  { key: "gstin", group: "shop", kind: "text", max: 15 },
  { key: "gstScheme", group: "shop", kind: "select", options: ["regular", "composition"] },
  { key: "licence", group: "shop", kind: "text", max: 200 },
  { key: "grievanceOfficer", group: "shop", kind: "text", max: 120 },
  { key: "courts", group: "shop", kind: "text", max: 120 },
  { key: "billPrefix", group: "bill", kind: "text", max: 6 },
  { key: "billTagline", group: "bill", kind: "text", max: 80 },
  { key: "billNote", group: "bill", kind: "long", max: 300 },
  { key: "billSignatory", group: "bill", kind: "text", max: 40 },
  { key: "billLogo", group: "bill", kind: "check" },
  { key: "billHsnColumn", group: "bill", kind: "check" },
  { key: "billAddress", group: "bill", kind: "check" },
  { key: "hsn", group: "bill", kind: "text", max: 8 },
  // the GST slabs since 22 Sep 2025
  { key: "gstRate", group: "bill", kind: "select", options: ["0", "5", "18", "40"] },
  { key: "bookingsOpen", group: "booking", kind: "check" },
  { key: "closedMessage", group: "booking", kind: "text", max: 160 },
  { key: "deliveryFrom", group: "booking", kind: "number", min: 0, max: 30 },
  { key: "deliveryTo", group: "booking", kind: "number", min: 1, max: 30 },
  { key: "pincodes", group: "booking", kind: "long", max: 2000 },
  { key: "minOrder", group: "booking", kind: "number", min: 0, max: 100000 },
  { key: "maxWaiting", group: "booking", kind: "number", min: 1, max: 50 },
  { key: "upiId", group: "booking", kind: "text", max: 60 },
  { key: "announcement", group: "front", kind: "text", max: 200 },
  { key: "showDiscount", group: "front", kind: "check" },
  { key: "showLeftBelow", group: "front", kind: "number", min: 0, max: 1000 },
  { key: "lowStock", group: "front", kind: "number", min: 0, max: 1000 },
  { key: "slipNote", group: "front", kind: "text", max: 200 },
];

/** The saved settings over the defaults, once per request. */
export const shopDetails = cache(async (): Promise<Settings> => {
  await connectDB();
  const saved = (await Shop.findById("shop").lean()) as Record<string, unknown> | null;
  return Object.fromEntries(SETTINGS.map(({ key }) => [key, saved?.[key] ?? DEFAULTS[key]])) as Settings;
});

/**
 * A filled-in Settings form read as settings: text trimmed (spaces collapsed, line breaks kept in long
 * ones), numbers as numbers (NaN when not one, for checkShop to catch), boxes ticked or not.
 */
export function readSettings(get: (key: string) => FormDataEntryValue | null): Settings {
  const out: Record<string, unknown> = {};
  for (const { key, kind, max } of SETTINGS) {
    const raw = String(get(key) ?? "");
    if (kind === "check") out[key] = raw === "on";
    else if (kind === "number" || typeof DEFAULTS[key] === "number") out[key] = raw.trim() ? Number(raw) : NaN;
    else if (kind === "long") out[key] = raw.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim().slice(0, max);
    else out[key] = raw.replace(/\s+/g, " ").trim().slice(0, max);
  }
  const s = out as Settings;
  s.gstin = s.gstin.toUpperCase();
  s.billPrefix = s.billPrefix.toUpperCase();
  // a number typed with +91, spaces or a leading 0 is the same ten digits
  s.phone = s.phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  s.pincodes = s.pincodes.split(/[\s,]+/).filter(Boolean).join(", ");
  return s;
}

/** What's wrong with settings typed into the form, or null; the message is safe to show. */
export function checkShop(d: Settings) {
  if (!d.legalName || !d.address) return "Enter the shop’s legal name and full address.";
  if (d.phone && !/^[6-9]\d{9}$/.test(d.phone)) return "Enter the shop’s 10‑digit mobile number, or leave it blank.";
  if (d.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(d.gstin)) return "That GSTIN doesn’t look right: 15 characters, like 27ABCDE1234F1Z5.";
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return "That email doesn’t look right.";
  for (const { key, kind, min = 0, max = 0, options } of SETTINGS) {
    const value = d[key];
    if (kind === "select" && !options!.includes(String(value))) return "Pick one of the choices in each list.";
    if (kind === "number" && (!Number.isInteger(value) || (value as number) < min || (value as number) > max)) return "Each number must be a whole number within its range.";
  }
  // a GST bill number is at most 16 characters: the prefix, then 26-27/0001
  if (!/^[A-Z0-9/-]{0,6}$/.test(d.billPrefix)) return "The bill number prefix can have up to 6 letters, numbers, / or -.";
  if (!/^\d{4,8}$/.test(d.hsn)) return "The HSN code is 4 to 8 digits.";
  if (d.deliveryFrom > d.deliveryTo) return "The first delivery day can’t be after the last.";
  if (d.pincodes && !d.pincodes.split(", ").every((pin) => /^\d{6}$/.test(pin))) return "Pincodes are 6 digits each, separated by commas.";
  if (d.upiId && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(d.upiId)) return "That UPI ID doesn’t look right, e.g. agarwalstores@okaxis.";
  return null;
}

/** Whether the shop delivers to a pincode: any, until an owner lists the ones it serves. */
export const servesPincode = (s: Settings, pincode: string) => !s.pincodes || s.pincodes.split(", ").includes(pincode);

/**
 * Fireworks: HSN 3604, GST 18% since 22 Sep 2025 (CBIC notification 9/2025-CT(Rate), Schedule II, S. No. 80).
 * New bills use Settings' hsn and gstRate; these are for bills made before those were kept on the bill.
 */
export const HSN = "3604";
export const GST_RATE = 18;

/** GST State codes, the first two digits of a GSTIN. */
const STATES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi",
  "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh",
  "23": "Madhya Pradesh", "24": "Gujarat", "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh",
};
/** "Maharashtra (27)" from a GSTIN: the shop's own State, where it delivers. */
export const stateOf = (gstin: string) => `${STATES[gstin.slice(0, 2)] ?? "State"} (${gstin.slice(0, 2)})`;

/** What a bill is called: a Tax Invoice (regular GST), a Bill of Supply (composition) or a plain Bill (not registered). */
export const billTitle = (shop: { gstin?: string | null; gstScheme?: string | null }) =>
  !shop.gstin ? "Bill" : shop.gstScheme === "composition" ? "Bill of Supply" : "Tax Invoice";

/**
 * A GST-inclusive total in whole rupees split into taxable value, CGST and SGST, in paise. CGST and
 * SGST are the same rate, so they're the same amount; the taxable value takes any rounding paisa.
 */
export function gstSplit(total: number, rate = GST_RATE) {
  const paise = total * 100;
  const cgst = Math.round((paise - (paise * 100) / (100 + rate)) / 2);
  return { taxable: paise - 2 * cgst, cgst, sgst: cgst };
}

/**
 * Bump to the day's date whenever /terms or /privacy changes in meaning (not for Shop Details).
 * Each booking keeps the version it was made under; earlier wording stays in git history.
 */
export const TERMS_VERSION = "2026-10-24";
