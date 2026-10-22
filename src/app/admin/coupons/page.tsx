import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { saveCouponAction, switchCouponAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { istLocal } from "@/lib/coupons";
import { connectDB, Coupon, Order } from "@/lib/db";
import { inr } from "@/lib/format";
import { fill, locale } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const tabs = (await getT()).common.adminTabs;
  return { title: `${tabs.coupons} · ${tabs.label}` };
}

/** Codes for money off at checkout (lib/coupons.ts): make or change one, switch it on or off, see what it's given. */
export default async function CouponsPage() {
  await requireStaff("coupons", "/admin/coupons");
  await connectDB();
  const [t, lang, coupons, usage] = await Promise.all([
    getT(),
    getLang(),
    Coupon.find().sort({ createdAt: -1 }).lean(),
    // bookings that used each code, cancelled ones left out
    Order.aggregate<{ _id: string; orders: number; off: number }>([
      { $match: { "coupon.code": { $exists: true }, status: { $ne: "cancelled" } } },
      { $group: { _id: "$coupon.code", orders: { $sum: 1 }, off: { $sum: "$coupon.discount" } } },
    ]),
  ]);
  const w = t.catalog.coupons;
  const used = new Map(usage.map((u) => [u._id, u]));
  const when = new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const now = Date.now();
  // a new coupon runs to the end of the day a week from now, unless changed
  const weekOut = istLocal(new Date(now + 7 * 86_400_000)).slice(0, 10) + "T23:59";

  return (
    <>
      <h1>{t.common.adminTabs.coupons}</h1>
      <p className="muted">{w.intro}</p>

      <section className="panel" aria-labelledby="new-coupon">
        <h2 id="new-coupon">{w.new}</h2>
        <ActionForm action={saveCouponAction} submit={w.save} primary className="coupon-form">
          <label>
            {w.code}
            <input name="code" required maxLength={20} pattern="[A-Za-z0-9]{3,20}" autoComplete="off" spellCheck={false} className="upper" />
            <small>{w.codeHint}</small>
          </label>
          <label>
            {w.percent}
            <input name="percent" type="number" inputMode="numeric" min={1} max={90} step={1} required defaultValue={10} />
          </label>
          <label>
            {w.minOrder}
            <input name="minOrder" type="number" inputMode="numeric" min={0} step={1} required defaultValue={0} />
            <small>{w.minOrderHint}</small>
          </label>
          <label>
            {w.validUntil}
            <input name="validUntil" type="datetime-local" required defaultValue={weekOut} />
          </label>
          <label className="f-check">
            <input type="checkbox" name="active" defaultChecked /> {w.active}
          </label>
        </ActionForm>
      </section>

      <h2>{w.list}</h2>
      {coupons.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>{w.cols.code}</th>
              <th>{w.cols.discount}</th>
              <th>{w.cols.minOrder}</th>
              <th>{w.cols.until}</th>
              <th>{w.cols.status}</th>
              <th>{w.cols.used}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const ended = c.validUntil.getTime() < now;
              const state = !c.active ? "off" : ended ? "ended" : "on";
              const u = used.get(c.code);
              return (
                <tr key={c.code}>
                  <td data-label={w.cols.code}>
                    <strong className="upper">{c.code}</strong>
                  </td>
                  <td data-label={w.cols.discount}>{fill(w.off, { percent: c.percent })}</td>
                  <td data-label={w.cols.minOrder}>{c.minOrder ? inr(c.minOrder) : w.any}</td>
                  <td data-label={w.cols.until}>{when.format(c.validUntil)}</td>
                  <td data-label={w.cols.status}>
                    <span className={`pill ${state === "on" ? "delivered" : "cancelled"}`}>{w.states[state]}</span>
                  </td>
                  <td data-label={w.cols.used}>{u ? fill(w.used, { n: u.orders, amount: inr(u.off) }) : "—"}</td>
                  <td>
                    <ActionForm action={switchCouponAction} submit={c.active ? w.turnOff : w.turnOn} small className="inline-form">
                      <input type="hidden" name="code" value={c.code} />
                      <input type="hidden" name="on" value={c.active ? "no" : "yes"} />
                    </ActionForm>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="muted">{w.none}</p>
      )}
    </>
  );
}
