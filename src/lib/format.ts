export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const day = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);

/** The most of one product in one order. */
export const MAX_QTY = 500;

/**
 * What staff can change an order's status to by hand. Out for Delivery only comes from the delivery
 * person's Start Delivery (it sends the handover code). Delivered by hand is for a counter pickup or
 * the shop delivering itself, and puts the full amount on the Cash page to count in. Delivered and
 * Cancelled are final.
 */
export const BY_HAND: Record<string, string[]> = {
  placed: ["packed", "delivered", "cancelled"],
  packed: ["placed", "delivered", "cancelled"],
  out_for_delivery: ["packed", "delivered", "cancelled"],
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
export const when = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);

/** What a typed or pasted mobile number means: digits only, any +91 or leading 0 removed, at most ten
 *  (from Agarwal Online). Room is left for a +91 or 0 still being typed in front, one key at a time. */
export function tenDigitMobile(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return digits.slice(0, digits.startsWith("91") ? 12 : digits.startsWith("0") ? 11 : 10);
}
