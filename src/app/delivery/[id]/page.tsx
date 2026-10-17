import { ChevronRight, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { completeDeliveryAction, deliveryFailedAction, startDeliveryAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr, STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Delivery" };

export default async function DeliveryStop({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff("delivery", `/delivery/${id}`);
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const o = await Order.findOne({ _id: id, assignedTo: user.id }).lean();
  if (!o) notFound();

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/delivery">My Deliveries</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">#{o.number}</span>
      </nav>
      <h1>
        {o.name} <span className={`pill ${o.status}`}>{STATUS_LABEL[o.status]}</span>
      </h1>
      <div className="order-layout">
        <section className="panel stack">
          <p>
            {o.address.line}
            {o.address.landmark && <small>Near {o.address.landmark}</small>}
            <small>
              <strong>{o.address.pincode}</strong> · deliver by {day(o.deliverBy)}
            </small>
          </p>
          <p className="contact">
            <a className="btn" href={`tel:+91${o.phone}`}>
              <Phone size={18} aria-hidden="true" /> Call {o.phone}
            </a>
            <a className="btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address.line} ${o.address.pincode}`)}`} target="_blank" rel="noreferrer">
              <MapPin size={18} aria-hidden="true" /> Open Map
            </a>
          </p>
          {/* so the customer's "is everything there?" is answered before the code */}
          <h2>In the Parcel</h2>
          <ul className="items">
            {o.items.map((i, n) => (
              <li key={n}>
                <span>
                  {i.qty} × {i.name} <small>{i.unit}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="collect">Collect {inr(o.total)} (cash or UPI)</p>
        </section>

        <section className="panel stack">
          {(o.status === "placed" || o.status === "packed") && (
            <>
              <h2>Ready to Go?</h2>
              <p className="muted">Starting sends the customer their handover code.</p>
              <ActionForm action={startDeliveryAction} submit="Start Delivery" primary>
                <input type="hidden" name="id" value={id} />
              </ActionForm>
            </>
          )}
          {o.status === "out_for_delivery" && (
            <>
              <h2>Hand It Over</h2>
              <ActionForm action={completeDeliveryAction} submit="Verify Code & Mark Delivered" primary>
                <input type="hidden" name="id" value={id} />
                <label>
                  Customer’s handover code
                  <input name="code" className="otp" inputMode="numeric" autoComplete="off" spellCheck={false} pattern="\d{6}" maxLength={6} required />
                </label>
                <p className="note">The customer sees this code on their My Orders page (and gets it by WhatsApp/SMS).</p>
                <label>
                  Rupees paid
                  <input name="collected" inputMode="numeric" pattern="\d+" required defaultValue={o.total} autoComplete="off" />
                </label>
                <fieldset className="paid-by">
                  <legend>Paid by</legend>
                  <label className="f-check">
                    <input type="radio" name="method" value="cash" defaultChecked /> Cash
                  </label>
                  <label className="f-check">
                    <input type="radio" name="method" value="upi" /> UPI to the shop
                  </label>
                </fieldset>
                <label className="f-check">
                  <input type="checkbox" required /> I handed over the full order
                </label>
              </ActionForm>
              <h2>Couldn’t Deliver?</h2>
              <ActionForm action={deliveryFailedAction} submit="Record Missed Delivery">
                <input type="hidden" name="id" value={id} />
                <label>
                  What happened
                  <textarea name="reason" rows={2} minLength={5} maxLength={300} required placeholder="Nobody home, phone switched off…" />
                </label>
              </ActionForm>
            </>
          )}
          {o.status === "delivered" && <p className="success">{o.cash?.method === "upi" ? "Delivered and paid by UPI." : `Delivered. Hand ${inr(o.cash?.collected ?? o.total)} in at the shop.`}</p>}
          {o.status === "cancelled" && <p className="error">The shop cancelled this order. Bring it back.</p>}
        </section>
      </div>
    </>
  );
}
