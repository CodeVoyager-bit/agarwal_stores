import { Clock, IndianRupee, MessageCircle, Package, Phone, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { StatusForm } from "@/components/status-form";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order, Product, type OrderStatus } from "@/lib/db";
import { day, inr, STATUS_LABEL } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.common.adminTabs.orders} · ${t.common.adminTabs.label}` };
}

const OPEN: OrderStatus[] = ["placed", "packed", "out_for_delivery"];
const TABS = ["open", ...Object.keys(STATUS_LABEL), "all"];
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; customer?: string }> }) {
  await requireStaff("orders", "/admin");
  const params = await searchParams;
  const status = params.status && TABS.includes(params.status) ? params.status : "open";
  // ?q=a&q=b arrives as a list: only a single search is read
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60);

  const filter: Record<string, unknown> = status === "open" ? { status: { $in: OPEN } } : status === "all" ? {} : { status };
  // from the Customers page: everything one account ordered, whatever number each address had
  if (params.customer && isValidObjectId(params.customer)) filter.user = params.customer;
  if (q) {
    const rx = new RegExp(escape(q), "i");
    filter.$or = [{ name: rx }, { phone: rx }, { "address.pincode": rx }, { "address.line": rx }, ...(/^\d+$/.test(q) ? [{ number: Number(q) }] : [])];
  }

  await connectDB();
  const now = new Date();
  const [orders, byStatus, overdue, lowStock] = await Promise.all([
    // open orders: the one due soonest first
    Order.find(filter).sort(status === "open" ? { deliverBy: 1 } : { createdAt: -1 }).limit(500).lean(),
    Order.aggregate<{ _id: string; count: number; value: number }>([{ $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$total" } } }]),
    Order.countDocuments({ status: { $in: OPEN }, deliverBy: { $lt: now } }),
    Product.countDocuments({ active: true, price: { $gt: 0 }, stock: { $lte: 5 } }),
  ]);
  const count = (s: string) => (s === "open" ? (OPEN as string[]) : s === "all" ? Object.keys(STATUS_LABEL) : [s]).reduce((n, k) => n + (byStatus.find((b) => b._id === k)?.count ?? 0), 0);
  const sales = byStatus.filter((b) => b._id !== "cancelled").reduce((n, b) => n + b.value, 0);
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const s = t.staff.orders;
  const c = t.staff.cols;
  const tab = (key: string) => (key === "open" ? s.tabOpen : key === "all" ? s.tabAll : t.common.status[key]);
  const pieces = (items: { qty?: number | null }[]) => {
    const n = items.reduce((sum, i) => sum + (i.qty ?? 0), 0);
    return n === 1 ? s.pcOne : fill(s.pcMany, { n });
  };

  return (
    <>
      <h1>{t.common.adminTabs.orders}</h1>
      <div className="stats">
        <div>
          <Package size={20} aria-hidden="true" />
          <strong>{count("open")}</strong>
          <span>{s.toDeliver}</span>
        </div>
        <div className={overdue ? "alert" : ""}>
          <Clock size={20} aria-hidden="true" />
          <strong>{overdue}</strong>
          <span>{s.overdue}</span>
        </div>
        <div>
          <IndianRupee size={20} aria-hidden="true" />
          <strong>{inr(sales)}</strong>
          <span>{s.booked}</span>
        </div>
        <Link href="/admin/products?low=1" className={lowStock ? "alert" : ""}>
          <TriangleAlert size={20} aria-hidden="true" />
          <strong>{lowStock}</strong>
          <span>{s.lowStock}</span>
        </Link>
      </div>

      <nav className="chips" aria-label={t.staffUi.statusForm.label}>
        {TABS.map((key) => (
          <Link key={key} href={`/admin?status=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={key === status ? "page" : undefined}>
            {tab(key)} <small>{count(key)}</small>
          </Link>
        ))}
      </nav>
      <form className="filter" role="search">
        <input type="hidden" name="status" value={status} />
        <input type="search" name="q" defaultValue={q} placeholder={s.search} aria-label={s.searchLabel} autoComplete="off" />
        <button className="btn">{t.common.words.search}</button>
      </form>
      <p className="muted">
        {orders.length === 1 ? s.one : fill(s.many, { n: orders.length })}
      </p>

      {orders.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>{c.order}</th>
              <th>{c.customer}</th>
              <th>{c.address}</th>
              <th>{c.items}</th>
              <th>{c.total}</th>
              <th>{s.deliverBy}</th>
              <th>{c.status}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const late = OPEN.includes(o.status) && o.deliverBy < now;
              return (
                <tr key={String(o._id)}>
                  <td data-label={c.order}>
                    <Link href={`/admin/orders/${o._id}`} className="order-link">
                      #{o.number}
                    </Link>
                    <small>{day(o.createdAt, lang)}</small>
                  </td>
                  <td data-label={c.customer}>
                    {o.name}
                    <span className="contact">
                      <a href={/^\d{10}$/.test(o.phone) ? `tel:+91${o.phone}` : undefined} className="chip-link">
                        <Phone size={14} aria-hidden="true" /> {o.phone}
                      </a>
                      <a href={/^\d{10}$/.test(o.phone) ? `https://wa.me/91${o.phone}` : undefined} target="_blank" rel="noreferrer" className="chip-link">
                        <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                      </a>
                    </span>
                  </td>
                  <td data-label={c.address}>
                    {o.address.line}
                    {o.address.landmark && <small>{fill(t.staff.near, { place: o.address.landmark })}</small>}
                    <small>
                      <strong>{o.address.pincode}</strong>
                    </small>
                  </td>
                  <td data-label={c.items}>
                    <details>
                      <summary>
                        {pieces(o.items)}, {o.items.length === 1 ? s.productOne : fill(s.productMany, { n: o.items.length })}
                      </summary>
                      <ul>
                        {o.items.map((i, n) => (
                          <li key={n}>
                            {i.qty} × {i.name} <small>({i.unit})</small>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td data-label={c.total} className="num">
                    <strong>{inr(o.total)}</strong>
                  </td>
                  <td data-label={s.deliverBy} className={late ? "late" : ""}>
                    {day(o.deliverBy, lang)}
                    {late && <small>{s.late}</small>}
                  </td>
                  <td data-label={c.status}>
                    <StatusForm id={String(o._id)} status={o.status} />
                    {o.assignedName && <small>{fill(t.staff.with, { name: o.assignedName })}</small>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
