import { Clock, IndianRupee, MessageCircle, Package, Phone, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { StatusForm } from "@/components/status-form";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order, Product, type OrderStatus } from "@/lib/db";
import { day, inr, STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Orders · Admin" };

const OPEN: OrderStatus[] = ["placed", "packed", "out_for_delivery"];
const TABS = { open: "To Deliver", ...STATUS_LABEL, all: "All" } as Record<string, string>;
const pieces = (items: { qty?: number | null }[]) => {
  const n = items.reduce((sum, i) => sum + (i.qty ?? 0), 0);
  return n === 1 ? "1 pc" : `${n} pcs`;
};
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; customer?: string }> }) {
  await requireStaff("orders", "/admin");
  const params = await searchParams;
  const status = params.status && params.status in TABS ? params.status : "open";
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
    Product.countDocuments({ active: true, stock: { $lte: 5 } }),
  ]);
  const count = (s: string) => (s === "open" ? (OPEN as string[]) : s === "all" ? Object.keys(STATUS_LABEL) : [s]).reduce((n, k) => n + (byStatus.find((b) => b._id === k)?.count ?? 0), 0);
  const sales = byStatus.filter((b) => b._id !== "cancelled").reduce((n, b) => n + b.value, 0);

  return (
    <>
      <h1>Orders</h1>
      <div className="stats">
        <div>
          <Package size={20} aria-hidden="true" />
          <strong>{count("open")}</strong>
          <span>to deliver</span>
        </div>
        <div className={overdue ? "alert" : ""}>
          <Clock size={20} aria-hidden="true" />
          <strong>{overdue}</strong>
          <span>past delivery date</span>
        </div>
        <div>
          <IndianRupee size={20} aria-hidden="true" />
          <strong>{inr(sales)}</strong>
          <span>booked, not cancelled</span>
        </div>
        <Link href="/admin/products?low=1" className={lowStock ? "alert" : ""}>
          <TriangleAlert size={20} aria-hidden="true" />
          <strong>{lowStock}</strong>
          <span>low on stock →</span>
        </Link>
      </div>

      <nav className="chips" aria-label="Order status">
        {Object.entries(TABS).map(([key, label]) => (
          <Link key={key} href={`/admin?status=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={key === status ? "page" : undefined}>
            {label} <small>{count(key)}</small>
          </Link>
        ))}
      </nav>
      <form className="filter" role="search">
        <input type="hidden" name="status" value={status} />
        <input type="search" name="q" defaultValue={q} placeholder="Name, phone, pincode or order #…" aria-label="Search orders" autoComplete="off" />
        <button className="btn">Search</button>
      </form>
      <p className="muted">
        {orders.length} {orders.length === 1 ? "order" : "orders"}
      </p>

      {orders.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Items</th>
              <th>Total</th>
              <th>Deliver by</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const late = OPEN.includes(o.status) && o.deliverBy < now;
              return (
                <tr key={String(o._id)}>
                  <td data-label="Order">
                    <Link href={`/admin/orders/${o._id}`} className="order-link">
                      #{o.number}
                    </Link>
                    <small>{day(o.createdAt)}</small>
                  </td>
                  <td data-label="Customer">
                    {o.name}
                    <span className="contact">
                      <a href={`tel:+91${o.phone}`} className="chip-link">
                        <Phone size={14} aria-hidden="true" /> {o.phone}
                      </a>
                      <a href={`https://wa.me/91${o.phone}`} target="_blank" rel="noreferrer" className="chip-link">
                        <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                      </a>
                    </span>
                  </td>
                  <td data-label="Address">
                    {o.address.line}
                    {o.address.landmark && <small>Near {o.address.landmark}</small>}
                    <small>
                      <strong>{o.address.pincode}</strong>
                    </small>
                  </td>
                  <td data-label="Items">
                    <details>
                      <summary>
                        {pieces(o.items)}, {o.items.length} {o.items.length === 1 ? "product" : "products"}
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
                  <td data-label="Total" className="num">
                    <strong>{inr(o.total)}</strong>
                  </td>
                  <td data-label="Deliver by" className={late ? "late" : ""}>
                    {day(o.deliverBy)}
                    {late && <small>Late</small>}
                  </td>
                  <td data-label="Status">
                    <StatusForm id={String(o._id)} status={o.status} />
                    {o.assignedName && <small>With {o.assignedName}</small>}
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
