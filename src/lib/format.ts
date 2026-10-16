export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const day = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);

export const STATUS_LABEL: Record<string, string> = {
  placed: "Placed",
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
