import { CircleCheck, CircleX, Clock, LogOut, MapPin, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { logoutAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { shopDetails } from "@/lib/legal";
import { rich } from "@/lib/i18n/rich";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT()).orders.mine.title} · Agarwal Stores` };
}

const STEPS = ["placed", "packed", "out_for_delivery", "delivered"];

/** One round of sparks, evenly spread (globals.css .burst). */
const Sparks = ({ count }: { count: number }) => (
  <span className="burst">
    {Array.from({ length: count }, (_, n) => (
      <i key={n} style={{ "--a": `${(360 / count) * n}deg` } as React.CSSProperties} />
    ))}
  </span>
);

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ placed?: string }> }) {
  const user = await requireUser("/orders");
  const { placed } = await searchParams;
  await connectDB();
  // the handover code is only ever shown to the customer it belongs to
  const orders = await Order.find({ user: user.id }).select("+handoverCode").sort({ createdAt: -1 }).lean();
  // only for an order of theirs: a typed-in number shows nothing
  const placedOrder = typeof placed === "string" ? orders.find((o) => o.number === Number(placed)) : undefined;
  const [t, lang, shop] = await Promise.all([getT(), getLang(), shopDetails()]);
  const m = t.orders.mine;

  return (
    <>
      <div className="head">
        <h1>{m.title}</h1>
        <form action={logoutAction}>
          <button className="btn quiet">
            <LogOut size={16} aria-hidden="true" /> {t.common.header.logOut}
          </button>
        </form>
      </div>
      {placedOrder && (
        <div className="success" role="status">
          <span className="firework" aria-hidden="true">
            <CircleCheck size={22} />
            <Sparks count={12} />
            <Sparks count={8} />
          </span>
          <p>
            {rich(fill(m.booked, { n: placedOrder.number, phone: placedOrder.phone }), { b: (s) => <strong>{s}</strong> })}
          </p>
        </div>
      )}
      {/* an open order can change at the shop's end while this page is open */}
      {orders.some((o) => STEPS.slice(0, 3).includes(o.status)) && <AutoRefresh />}
      {orders.length ? (
        <ul className="orders">
          {orders.map((o) => {
            const step = STEPS.indexOf(o.status);
            const cancelledAt = o.status === "cancelled" ? ([...(o.history ?? [])].reverse().find((h) => h.text === "Marked Cancelled")?.at ?? o.updatedAt) : null;
            return (
              <li key={String(o._id)} className={cancelledAt ? "panel order cancelled" : "panel order"}>
                <div className="order-head">
                  <div>
                    <h2>{fill(m.order, { n: o.number })}</h2>
                    <p className="muted">
                      {fill(m.bookedOn, { date: day(o.createdAt, lang) })}
                      {step >= 0 && step < 3 && ` · ${fill(m.arrivesBy, { date: day(o.deliverBy, lang) })}`}
                    </p>
                  </div>
                  <strong className="order-amount">{inr(o.total)}</strong>
                </div>

                {o.status === "out_for_delivery" && o.handoverCode && (
                  <div className="handover" role="status">
                    <span>{m.handover}</span>
                    <strong className="otp-code" aria-label={fill(m.handoverLabel, { code: o.handoverCode.split("").join(" ") })}>
                      {o.handoverCode}
                    </strong>
                  </div>
                )}

                {cancelledAt ? (
                  <div className="cancel-note" role="note">
                    <CircleX size={22} aria-hidden="true" />
                    <p>
                      <strong>{fill(m.cancelledOn, { date: day(cancelledAt, lang) })}</strong>
                      {m.cancelledText}
                      {shop.phone && (
                        <a href={`tel:+91${shop.phone}`} className="link">
                          {fill(m.callShop, { phone: `+91 ${shop.phone}` })}
                        </a>
                      )}
                    </p>
                  </div>
                ) : (
                  <ol className="track" aria-label={m.progress}>
                    {STEPS.map((s, n) => (
                      <li key={s} className={n <= step ? "done" : ""} aria-current={n === step ? "step" : undefined}>
                        {t.common.status[s]}
                      </li>
                    ))}
                  </ol>
                )}
                {/* a booking isn't an order yet: the shop calls to accept it, and only then delivers */}
                {o.status === "placed" && (
                  <p className="waiting-note" role="note">
                    <Clock size={20} aria-hidden="true" />
                    {m.waiting}
                  </p>
                )}

                <ul className="items">
                  {o.items.map((i, n) => (
                    <li key={n}>
                      <span>
                        {i.qty} × {i.name} <small>{i.unit}</small>
                      </span>
                      <span className="num">{inr(i.price! * i.qty!)}</span>
                    </li>
                  ))}
                  {o.coupon?.discount ? (
                    <li className="saved">
                      <span>{fill(m.coupon, { code: o.coupon.code ?? "", amount: inr(o.coupon.discount) })}</span>
                      <span className="num">−{inr(o.coupon.discount)}</span>
                    </li>
                  ) : null}
                </ul>
                <p className="order-foot">
                  <MapPin size={16} aria-hidden="true" />
                  <span>
                    {o.address.line}
                    {o.address.landmark && `, ${fill(m.near, { place: o.address.landmark })}`} – {o.address.pincode} · +91&nbsp;{o.phone}
                  </span>
                </p>
                {/* the bill comes on paper with the delivery (staff print it), so there's no link to it here */}
                {o.status !== "delivered" && o.status !== "cancelled" && (
                  <p className="muted">
                    {m.pay}
                    {shop.upiId && ` ${fill(m.upiTo, { upi: shop.upiId })}`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty panel">
          <Package size={36} strokeWidth={1.5} aria-hidden="true" />
          <h2>{m.empty}</h2>
          <p className="muted">{m.emptyText}</p>
          <Link href="/" className="btn primary">
            {m.browse}
          </Link>
        </div>
      )}
    </>
  );
}
