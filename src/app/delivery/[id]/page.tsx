import { ChevronRight, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { completeDeliveryAction, deliveryFailedAction, startDeliveryAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { shopDetails } from "@/lib/legal";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).delivery.stop.title };
}

export default async function DeliveryStop({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff("delivery", `/delivery/${id}`);
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const o = await Order.findOne({ _id: id, assignedTo: user.id }).lean();
  if (!o) notFound();
  const [t, lang, shop] = await Promise.all([getT(), getLang(), shopDetails()]);
  const s = t.delivery.stop;
  // the address and number only while the stop is open: a rider doesn't keep past customers' details
  const open = o.status === "placed" || o.status === "packed" || o.status === "out_for_delivery";

  return (
    <>
      <nav className="breadcrumb" aria-label={s.breadcrumb}>
        <Link href="/delivery">{t.delivery.list.title}</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">#{o.number}</span>
      </nav>
      <h1>
        {o.name} <span className={`pill ${o.status}`}>{t.common.status[o.status]}</span>
      </h1>
      <div className="order-layout">
        <section className="panel stack">
          {open && (
            <>
              <p>
                {o.address.line}
                {o.address.landmark && <small>{fill(s.near, { place: o.address.landmark })}</small>}
                <small>
                  <strong>{o.address.pincode}</strong> · {fill(s.deliverBy, { day: day(o.deliverBy, lang) })}
                </small>
              </p>
              <p className="contact">
                <a className="btn" href={`tel:+91${o.phone}`}>
                  <Phone size={18} aria-hidden="true" /> {fill(s.callPhone, { phone: o.phone })}
                </a>
                <a className="btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address.line} ${o.address.pincode}`)}`} target="_blank" rel="noreferrer">
                  <MapPin size={18} aria-hidden="true" /> {s.openMap}
                </a>
              </p>
            </>
          )}
          {/* so the customer's "is everything there?" is answered before it's handed over */}
          <h2>{s.parcel}</h2>
          <ul className="items">
            {o.items.map((i, n) => (
              <li key={n}>
                <span>
                  {i.qty} × {i.name} <small>{i.unit}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="collect">{fill(s.collect, { amount: inr(o.total) })}</p>
        </section>

        <section className="panel stack">
          {(o.status === "placed" || o.status === "packed") && (
            <>
              <h2>{s.ready}</h2>
              <ActionForm action={startDeliveryAction} submit={s.start} primary>
                <input type="hidden" name="id" value={id} />
              </ActionForm>
            </>
          )}
          {o.status === "out_for_delivery" && (
            <>
              <h2>{s.handOver}</h2>
              <ActionForm action={completeDeliveryAction} submit={s.verify} primary>
                <input type="hidden" name="id" value={id} />
                <p className="note">{s.signNote}</p>
                <label>
                  {s.paid}
                  <input name="collected" inputMode="numeric" pattern="\d+" required defaultValue={o.total} autoComplete="off" />
                </label>
                <fieldset className="paid-by">
                  <legend>{s.paidBy}</legend>
                  <label className="f-check">
                    <input type="radio" name="method" value="cash" defaultChecked /> {s.cash}
                  </label>
                  <label className="f-check">
                    <input type="radio" name="method" value="upi" /> {s.upi}
                    {shop.upiId && ` (${shop.upiId})`}
                  </label>
                </fieldset>
                <label className="f-check">
                  <input type="checkbox" required /> {s.full}
                </label>
              </ActionForm>
              <h2>{s.missed}</h2>
              <ActionForm action={deliveryFailedAction} submit={s.recordMissed}>
                <input type="hidden" name="id" value={id} />
                <label>
                  {s.whatHappened}
                  <textarea name="reason" rows={2} minLength={5} maxLength={300} required placeholder={s.reasonPlaceholder} />
                </label>
              </ActionForm>
            </>
          )}
          {o.status === "delivered" && <p className="success">{o.cash?.method === "upi" ? s.deliveredUpi : fill(s.deliveredCash, { amount: inr(o.cash?.collected ?? o.total) })}</p>}
          {o.status === "cancelled" && <p className="error">{s.cancelled}</p>}
        </section>
      </div>
    </>
  );
}
