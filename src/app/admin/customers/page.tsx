import { MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { OPEN } from "@/lib/orders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.common.adminTabs.customers} · ${t.common.adminTabs.label}` };
}

type Customer = { _id: unknown; name: string; phone: string; pincode: string; line: string; orders: number; open: number; spent: number; last: Date };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("customers", "/admin/customers");
  const { q: raw } = await searchParams;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 60).toLowerCase();
  await connectDB();
  // everyone who has ordered, newest order first; name and address from their latest order
  const all = await Order.aggregate<Customer>([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$user",
        name: { $first: "$name" },
        phone: { $first: "$phone" },
        pincode: { $first: "$address.pincode" },
        line: { $first: "$address.line" },
        orders: { $sum: 1 },
        open: { $sum: { $cond: [{ $in: ["$status", OPEN] }, 1, 0] } },
        spent: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$total"] } },
        last: { $max: "$createdAt" },
      },
    },
    { $sort: { last: -1 } },
  ]);
  const customers = q ? all.filter((c) => [c.name, c.phone, c.pincode, c.line].some((v) => v?.toLowerCase().includes(q))) : all;
  const repeat = all.filter((c) => c.orders > 1).length;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const s = t.staff.customers;
  const col = t.staff.cols;

  return (
    <>
      <h1>{t.common.adminTabs.customers}</h1>
      <div className="stats">
        <div>
          <strong>{all.length}</strong>
          <span>{s.have}</span>
        </div>
        <div>
          <strong>{repeat}</strong>
          <span>{s.repeat}</span>
        </div>
        <div>
          <strong>{inr(all.reduce((n, c) => n + c.spent, 0))}</strong>
          <span>{t.staff.orders.booked}</span>
        </div>
        <div>
          <strong>{all.length ? inr(Math.round(all.reduce((n, c) => n + c.spent, 0) / all.length)) : "₹0"}</strong>
          <span>{s.average}</span>
        </div>
      </div>
      <form className="filter" role="search">
        <input type="search" name="q" defaultValue={q} placeholder={s.search} aria-label={s.searchLabel} autoComplete="off" />
        <button className="btn">{t.common.words.search}</button>
      </form>
      <p className="muted">{customers.length === 1 ? s.one : fill(s.many, { n: customers.length })}</p>
      {customers.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>{col.customer}</th>
              <th>{col.address}</th>
              <th className="num">{s.orders}</th>
              <th className="num">{s.spent}</th>
              <th>{s.last}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={String(c._id)}>
                <td data-label={col.customer}>
                  <strong>{c.name}</strong>
                  <span className="contact">
                    <a href={/^\d{10}$/.test(c.phone) ? `tel:+91${c.phone}` : undefined} className="chip-link">
                      <Phone size={14} aria-hidden="true" /> {c.phone}
                    </a>
                    <a href={/^\d{10}$/.test(c.phone) ? `https://wa.me/91${c.phone}` : undefined} target="_blank" rel="noreferrer" className="chip-link">
                      <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                    </a>
                  </span>
                </td>
                <td data-label={col.address}>
                  {c.line}
                  <small>
                    <strong>{c.pincode}</strong>
                  </small>
                </td>
                <td data-label={s.orders} className="num">
                  <Link href={`/admin?status=all&customer=${String(c._id)}`}>{c.orders}</Link>
                  {c.open > 0 && <small>{fill(s.toDeliver, { n: c.open })}</small>}
                </td>
                <td data-label={s.spent} className="num">
                  <strong>{inr(c.spent)}</strong>
                </td>
                <td data-label={s.last}>{day(c.last, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
