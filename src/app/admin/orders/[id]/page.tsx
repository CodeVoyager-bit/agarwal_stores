import { ChevronRight, MapPin, MessageCircle, Phone, Printer, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { StatusForm } from "@/components/status-form";
import { assignAction, noteAction, receiveCashAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order, User } from "@/lib/db";
import { day, inr, STATUS_LABEL, when } from "@/lib/format";
import { can } from "@/lib/roles";

export const metadata: Metadata = { title: "Order · Admin" };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff("orders", `/admin/orders/${id}`);
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const [order, team] = await Promise.all([Order.findById(id).lean(), User.find({ role: "delivery" }).sort({ name: 1 }).lean()]);
  if (!order) notFound();
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.address.line} ${order.address.pincode}`)}`;
  const assignable = order.status === "placed" || order.status === "packed";
  // orders placed before history was kept start with just their placing
  const history = order.history?.length ? order.history : [{ at: order.createdAt, by: order.name, text: "Booked" }];

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/admin">Orders</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">#{order.number}</span>
      </nav>
      <div className="head">
        <h1>
          Order #{order.number} <span className={`pill ${order.status}`}>{STATUS_LABEL[order.status]}</span>
        </h1>
        {/* once it's delivered the packing slip is done with, and the bill is what's printed */}
        {order.status === "delivered" ? (
          <Link href={`/bill/${id}`} className="btn" target="_blank">
            <ReceiptText size={18} aria-hidden="true" /> View Bill
          </Link>
        ) : (
          <Link href={`/admin/orders/${id}/slip`} className="btn" target="_blank">
            <Printer size={18} aria-hidden="true" /> Print Slip
          </Link>
        )}
      </div>
      <p className="muted">
        Booked {when(order.createdAt)} · Deliver by {day(order.deliverBy)}
        {order.status === "placed" && " · Call the customer to confirm before packing"}
      </p>

      <div className="order-layout">
        <div className="stack">
          <section className="panel" aria-labelledby="items">
            <h2 id="items">Items</h2>
            <table className="lines-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Price</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i, n) => (
                  <tr key={n}>
                    <td>
                      {i.name} <small>{i.unit}</small>
                    </td>
                    <td className="num">{i.qty}</td>
                    <td className="num">{inr(i.price!)}</td>
                    <td className="num">{inr(i.price! * i.qty!)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3}>Total, pay on delivery</th>
                  <th className="num">{inr(order.total)}</th>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="panel" aria-labelledby="history">
            <h2 id="history">History</h2>
            <ol className="timeline">
              {[...history].reverse().map((h, n) => (
                <li key={n}>
                  <strong>{h.text}</strong>
                  <small>
                    {when(h.at)} · {h.by}
                  </small>
                </li>
              ))}
            </ol>
            <ActionForm action={noteAction} submit="Add Note">
              <input type="hidden" name="id" value={id} />
              <label>
                Note for the team
                <textarea name="note" rows={2} maxLength={500} required placeholder="Customer asked to deliver after 5 pm…" />
              </label>
            </ActionForm>
          </section>
        </div>

        <div className="stack">
          <section className="panel" aria-labelledby="customer">
            <h2 id="customer">{order.name}</h2>
            <p className="contact">
              <a href={`tel:+91${order.phone}`} className="chip-link">
                <Phone size={14} aria-hidden="true" /> {order.phone}
              </a>
              <a href={`https://wa.me/91${order.phone}`} target="_blank" rel="noreferrer" className="chip-link">
                <MessageCircle size={14} aria-hidden="true" /> WhatsApp
              </a>
              <a href={map} target="_blank" rel="noreferrer" className="chip-link">
                <MapPin size={14} aria-hidden="true" /> Map
              </a>
            </p>
            <p>
              {order.address.line}
              {order.address.landmark && <small>Near {order.address.landmark}</small>}
              <small>
                <strong>{order.address.pincode}</strong>
              </small>
            </p>
          </section>

          <section className="panel" aria-labelledby="status">
            <h2 id="status">Status</h2>
            <StatusForm id={id} status={order.status} />
          </section>

          <section className="panel" aria-labelledby="delivery">
            <h2 id="delivery">Delivery</h2>
            <p className="muted">{order.assignedName ? `With ${order.assignedName}` : "Not given to anyone yet."}</p>
            {assignable &&
              (team.length ? (
                <ActionForm action={assignAction} submit={order.assignedName ? "Change" : "Give for Delivery"}>
                  <input type="hidden" name="id" value={id} />
                  <label>
                    Delivery person
                    <select key={String(order.assignedTo ?? "")} name="staff" defaultValue={order.assignedTo ? String(order.assignedTo) : ""}>
                      <option value="">Nobody</option>
                      {team.map((t) => (
                        <option key={String(t._id)} value={String(t._id)}>
                          {t.name || t.phone}
                        </option>
                      ))}
                    </select>
                  </label>
                </ActionForm>
              ) : (
                <p className="note">
                  No delivery team yet. {can(user.role, "staff") ? <Link href="/admin/staff">Add someone on the Staff page.</Link> : "Ask the owner to add them."}
                </p>
              ))}
            {order.cash?.collected != null && (
              <p>
                Collected {inr(order.cash.collected)} by {order.cash.collectedBy}.{" "}
                {order.cash.receivedAt ? `Counted at shop: ${inr(order.cash.received!)}.` : "Not handed in yet."}
              </p>
            )}
            {order.cash?.collected != null && !order.cash.receivedAt && can(user.role, "cash") && (
              <ActionForm action={receiveCashAction} submit="Cash Received">
                <input type="hidden" name="id" value={id} />
                <label>
                  Rupees counted
                  <input name="received" inputMode="numeric" pattern="\d+" required defaultValue={order.cash.collected} autoComplete="off" />
                </label>
              </ActionForm>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
