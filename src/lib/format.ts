import { locale, type Lang } from "./i18n";

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const below100 = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
const words = (n: number): string => {
  const parts: string[] = [];
  for (const [size, name] of [[1e7, "Crore"], [1e5, "Lakh"], [1e3, "Thousand"], [100, "Hundred"]] as const)
    if (n >= size) {
      parts.push(`${size === 1e7 ? words(Math.floor(n / size)) : below100(Math.floor(n / size))} ${name}`);
      n %= size;
    }
  if (n) parts.push(below100(n));
  return parts.join(" ");
};

/** Whole rupees in words, the Indian way (lakh, crore), as bills print them: "Rupees One Thousand Ninety-Eight Only". */
export const inWords = (rupees: number) => `Rupees ${rupees > 0 ? words(Math.round(rupees)) : "Zero"} Only`;

/** A description as stored: line breaks kept, runs of spaces and the spaces around a break dropped. Form and import alike. */
export const tidyLines = (text: string) => text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();

export const day = (d: Date, lang: Lang = "en") =>
  new Intl.DateTimeFormat(locale(lang), { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);

/** The most of one product in one order. */
export const MAX_QTY = 500;

/** How many more photos a product can have besides its main one (Inventory, product page gallery). */
export const MAX_PHOTOS = 6;

/**
 * What staff can change an order's status to by hand. Delivered by hand is for a counter pickup or the
 * shop delivering itself, and puts the full amount on the Cash page to count in; it is final (the bill
 * is made). A cancelled order can be booked again while its stock is still there.
 */
export const BY_HAND: Record<string, string[]> = {
  placed: ["packed", "out_for_delivery", "delivered", "cancelled"],
  packed: ["placed", "out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["packed", "delivered", "cancelled"],
  cancelled: ["placed"],
};

export const STATUS_LABEL: Record<string, string> = {
  placed: "Booked",
  packed: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** What the catalog and cart need from a product, safe to send to the browser. */
export type ShopItem = { id: string; name: string; category: string; unit: string; mrp: number; price: number; stock: number; image: string };

/** "17 Oct, 4:05 pm", India time, for history lines and the audit log. */
export const when = (d: Date, lang: Lang = "en") =>
  new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);

/** What a typed or pasted mobile number means: digits only, any +91 or leading 0 removed, at most ten
 *  (from Agarwal Online). Room is left for a +91 or 0 still being typed in front, one key at a time. */
export function tenDigitMobile(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return digits.slice(0, digits.startsWith("91") ? 12 : digits.startsWith("0") ? 11 : 10);
}
