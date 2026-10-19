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
import { day, inr, when } from "@/lib/format";
import { fill, translateMessage } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { can } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.staff.order.title} · ${t.common.adminTabs.label}` };
}

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
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const s = t.staff.order;
  const c = t.staff.cols;

  return (
    <>
      <nav className="breadcrumb" aria-label={t.staff.breadcrumb}>
        <Link href="/admin">{t.common.adminTabs.orders}</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">#{order.number}</span>
      </nav>
      <div className="head">
        <h1>
          {fill(s.heading, { n: order.number })} <span className={`pill ${order.status}`}>{t.common.status[order.status]}</span>
        </h1>
        {/* once it's delivered the packing slip is done with, and the bill is what's printed */}
        {order.status === "delivered" ? (
          <Link href={`/bill/${id}`} className="btn" target="_blank">
            <ReceiptText size={18} aria-hidden="true" /> {s.viewBill}
          </Link>
        ) : (
          <Link href={`/admin/orders/${id}/slip`} className="btn" target="_blank">
            <Printer size={18} aria-hidden="true" /> {s.printSlip}
          </Link>
        )}
      </div>
      <p className="muted">
        {fill(s.booked, { when: when(order.createdAt, lang), day: day(order.deliverBy, lang) })}
        {order.status === "placed" && s.confirmFirst}
      </p>

      <div className="order-layout">
        <div className="stack">
          <section className="panel" aria-labelledby="items">
            <h2 id="items">{c.items}</h2>
            <table className="lines-table">
              <thead>
                <tr>
                  <th>{c.item}</th>
                  <th className="num">{c.qty}</th>
                  <th className="num">{c.price}</th>
                  <th className="num">{c.amount}</th>
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
                  <th colSpan={3}>{s.totalPay}</th>
                  <th className="num">{inr(order.total)}</th>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="panel" aria-labelledby="history">
            <h2 id="history">{s.history}</h2>
            <ol className="timeline">
              {[...history].reverse().map((h, n) => (
                <li key={n}>
                  <strong>{translateMessage(h.text ?? "", t.messages)}</strong>
                  <small>
                    {when(h.at, lang)} · {h.by}
                  </small>
                </li>
              ))}
            </ol>
            <ActionForm action={noteAction} submit={s.addNote}>
              <input type="hidden" name="id" value={id} />
              <label>
                {s.note}
                <textarea name="note" rows={2} maxLength={500} required placeholder={s.notePlaceholder} />
              </label>
            </ActionForm>
          </section>
        </div>

        <div className="stack">
          <section className="panel" aria-labelledby="customer">
            <h2 id="customer">{order.name}</h2>
            <p className="contact">
              <a href={/^\d{10}$/.test(order.phone) ? `tel:+91${order.phone}` : undefined} className="chip-link">
                <Phone size={14} aria-hidden="true" /> {order.phone}
              </a>
              <a href={/^\d{10}$/.test(order.phone) ? `https://wa.me/91${order.phone}` : undefined} target="_blank" rel="noreferrer" className="chip-link">
                <MessageCircle size={14} aria-hidden="true" /> WhatsApp
              </a>
              <a href={map} target="_blank" rel="noreferrer" className="chip-link">
                <MapPin size={14} aria-hidden="true" /> {t.common.words.map}
              </a>
            </p>
            <p>
              {order.address.line}
              {order.address.landmark && <small>{fill(t.staff.near, { place: order.address.landmark })}</small>}
              <small>
                <strong>{order.address.pincode}</strong>
              </small>
            </p>
          </section>

          <section className="panel" aria-labelledby="status">
            <h2 id="status">{c.status}</h2>
            <StatusForm id={id} status={order.status} />
          </section>

          <section className="panel" aria-labelledby="delivery">
            <h2 id="delivery">{s.delivery}</h2>
            <p className="muted">{order.assignedName ? fill(t.staff.with, { name: order.assignedName }) : s.notGiven}</p>
            {assignable &&
              (team.length ? (
                <ActionForm action={assignAction} submit={order.assignedName ? t.common.words.change : s.give}>
                  <input type="hidden" name="id" value={id} />
                  <label>
                    {s.person}
                    <select key={String(order.assignedTo ?? "")} name="staff" defaultValue={order.assignedTo ? String(order.assignedTo) : ""}>
                      <option value="">{s.nobody}</option>
                      {team.map((m) => (
                        <option key={String(m._id)} value={String(m._id)}>
                          {m.name || m.phone}
                        </option>
                      ))}
                    </select>
                  </label>
                </ActionForm>
              ) : (
                <p className="note">
                  {s.noTeam} {can(user.role, "staff") ? <Link href="/admin/staff">{s.addOnStaff}</Link> : s.askOwner}
                </p>
              ))}
            {order.cash?.collected != null && (
              <p>
                {fill(s.collected, { amount: inr(order.cash.collected), name: order.cash.collectedBy ?? "" })}{" "}
                {order.cash.receivedAt ? fill(s.counted, { amount: inr(order.cash.received!) }) : s.notHanded}
              </p>
            )}
            {order.cash?.collected != null && !order.cash.receivedAt && can(user.role, "cash") && (
              <ActionForm action={receiveCashAction} submit={s.cashReceived}>
                <input type="hidden" name="id" value={id} />
                <label>
                  {s.rupeesCounted}
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
