/** Coupons: money off a booking, made on Admin > Coupons and typed in at checkout. */

export const COUPON_CODE = /^[A-Z0-9]{3,20}$/;

/** What a customer typed, the way codes are kept: capitals, no spaces. */
export const couponCode = (typed: string) => typed.toUpperCase().replace(/\s+/g, "");

type Rules = { percent: number; minOrder: number; validUntil: Date | string; active: boolean };

/**
 * The money off `subtotal` (the items, whole rupees) with this coupon at `now`, or why it doesn't apply
 * (safe to show). Rounded down, so it's never more than the percent says.
 */
export function couponDiscount(c: Rules | null | undefined, subtotal: number, now = new Date()): { discount: number } | { error: string } {
  if (!c || !c.active) return { error: "That coupon code isn't valid." };
  if (now.getTime() > new Date(c.validUntil).getTime()) return { error: "That coupon has expired." };
  if (subtotal < c.minOrder) return { error: `This coupon is for orders of ₹${c.minOrder} or more.` };
  return { discount: Math.floor((subtotal * c.percent) / 100) };
}

/** A date and time typed on the Coupons page ("2026-10-30T23:59", India time) as the end of that minute. */
export const istMoment = (local: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) ? new Date(`${local}:59.999+05:30`) : null);

/** …and back, for the form's date and time box. */
export const istLocal = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16);
