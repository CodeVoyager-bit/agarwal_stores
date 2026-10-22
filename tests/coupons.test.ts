import assert from "node:assert/strict";
import { test } from "node:test";
import { couponCode, couponDiscount, istLocal, istMoment } from "../src/lib/coupons";

const diwali = { percent: 10, minOrder: 1000, validUntil: istMoment("2026-10-30T23:59")!, active: true };
const at = (iso: string) => new Date(iso);

test("10% off an order of ₹1000 or more, rounded down", () => {
  assert.deepEqual(couponDiscount(diwali, 1000, at("2026-10-25T10:00:00+05:30")), { discount: 100 });
  assert.deepEqual(couponDiscount(diwali, 1239, at("2026-10-25T10:00:00+05:30")), { discount: 123 });
});

test("below the smallest order it says how much is needed", () => {
  assert.deepEqual(couponDiscount(diwali, 999, at("2026-10-25T10:00:00+05:30")), { error: "This coupon is for orders of ₹1000 or more." });
});

test("works until 11:59 pm India time on its last day, not a moment after", () => {
  assert.deepEqual(couponDiscount(diwali, 2000, at("2026-10-30T23:59:59+05:30")), { discount: 200 });
  assert.deepEqual(couponDiscount(diwali, 2000, at("2026-10-31T00:00:00+05:30")), { error: "That coupon has expired." });
});

test("a turned-off or unknown coupon isn't valid", () => {
  assert.deepEqual(couponDiscount({ ...diwali, active: false }, 2000), { error: "That coupon code isn't valid." });
  assert.deepEqual(couponDiscount(null, 2000), { error: "That coupon code isn't valid." });
});

test("codes are compared in capitals without spaces; India time goes in and comes back the same", () => {
  assert.equal(couponCode(" diwali 10 "), "DIWALI10");
  assert.equal(istMoment("2026-10-30T23:59")!.toISOString(), "2026-10-30T18:29:59.999Z");
  assert.equal(istLocal(istMoment("2026-10-30T23:59")!), "2026-10-30T23:59");
  assert.equal(istMoment("30/10/2026"), null);
});
