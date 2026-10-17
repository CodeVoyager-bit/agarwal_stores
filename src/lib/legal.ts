import { cache } from "react";
import { connectDB, Shop } from "./db";

/**
 * The shop's legal details, filled in by an owner on /admin/shop. The Consumer Protection
 * (E-Commerce) Rules, 2020 want the legal name, address, grievance officer and contact shown, and the
 * licence is what makes the sale lawful. A blank one is left off the pages.
 */
export const SHOP_FIELDS = [
  { key: "legalName", label: "Shop’s legal name", hint: "As on the GST certificate and the licence.", max: 120 },
  { key: "address", label: "Full address", hint: "Shop address with pincode.", max: 300 },
  { key: "gstin", label: "GSTIN", hint: "15 characters, e.g. 27ABCDE1234F1Z5. Leave blank if not registered.", max: 15 },
  {
    key: "gstScheme",
    label: "GST scheme",
    hint: "Decides the bill: a Tax Invoice with CGST and SGST, or a Bill of Supply. Only used when there's a GSTIN.",
    max: 20,
    options: [
      ["regular", "Regular: Tax Invoice"],
      ["composition", "Composition: Bill of Supply"],
    ],
  },
  { key: "licence", label: "Fireworks licence", hint: "Number and validity, e.g. LE-5 No. 12/2026, valid till 31 Dec 2026.", max: 200 },
  { key: "grievanceOfficer", label: "Grievance officer", hint: "Name of the person who handles complaints.", max: 120 },
  { key: "email", label: "Contact email", hint: "For complaints and privacy requests.", max: 120 },
  { key: "courts", label: "Courts for disputes", hint: "Your district, e.g. Raigad, Maharashtra.", max: 120 },
] as const;
export type ShopDetails = Record<(typeof SHOP_FIELDS)[number]["key"], string>;

/** What the pages show until an owner first saves Shop Details. */
const DEFAULTS: ShopDetails = {
  legalName: "Agarwal Stores",
  address: "Nagothane, Raigad, Maharashtra",
  gstin: "",
  gstScheme: "regular",
  licence: "",
  grievanceOfficer: "",
  email: "",
  courts: "Raigad, Maharashtra",
};

/** The saved details, once per request. */
export const shopDetails = cache(async (): Promise<ShopDetails> => {
  await connectDB();
  const saved = await Shop.findById("shop").lean();
  return saved ? (Object.fromEntries(SHOP_FIELDS.map(({ key }) => [key, saved[key] ?? DEFAULTS[key]])) as ShopDetails) : DEFAULTS;
});

/** What's wrong with details typed into the form, or null; the message is safe to show. */
export function checkShop(d: ShopDetails) {
  if (!d.legalName || !d.address) return "Enter the shop’s legal name and full address.";
  if (d.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(d.gstin)) return "That GSTIN doesn’t look right: 15 characters, like 27ABCDE1234F1Z5.";
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return "That email doesn’t look right.";
  if (!["regular", "composition"].includes(d.gstScheme)) return "Pick the GST scheme.";
  return null;
}

/** Fireworks: HSN 3604, GST 18% since 22 Sep 2025 (CBIC notification 9/2025-CT(Rate), Schedule II, S. No. 80). */
export const HSN = "3604";
export const GST_RATE = 18;

/** What a bill is called: a Tax Invoice (regular GST), a Bill of Supply (composition) or a plain Bill (not registered). */
export const billTitle = (shop: { gstin?: string | null; gstScheme?: string | null }) =>
  !shop.gstin ? "Bill" : shop.gstScheme === "composition" ? "Bill of Supply" : "Tax Invoice";

/** A GST-inclusive total in whole rupees split into taxable value, CGST and SGST, in paise so nothing is lost to rounding. */
export function gstSplit(total: number) {
  const paise = total * 100;
  const taxable = Math.round((paise * 100) / (100 + GST_RATE));
  const cgst = Math.round((paise - taxable) / 2);
  return { taxable, cgst, sgst: paise - taxable - cgst };
}

/**
 * Bump to the day's date whenever /terms or /privacy changes in meaning (not for Shop Details).
 * Each booking keeps the version it was made under; earlier wording stays in git history.
 */
export const TERMS_VERSION = "2026-10-17";
export const TERMS_UPDATED = "17 October 2026";
