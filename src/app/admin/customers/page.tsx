import { MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { ownerPhones, requireStaff } from "@/lib/auth";
import { connectDB, Order, User } from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/email";
import { day, inr } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { OPEN } from "@/lib/orders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.common.adminTabs.customers} · ${t.common.adminTabs.label}` };
}

type Bought = { _id: unknown; name: string; phone: string; pincode: string; line: string; orders: number; open: number; spent: number; last: Date };
type Customer = Omit<Bought, "last"> & { email: string; joined: Date; login?: Date; last?: Date };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("customers", "/admin/customers");
  const { q: raw } = await searchParams;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 60).toLowerCase();
  await connectDB();
  // every customer account (owners and staff are on the Staff page), its last login and its orders
  const owners = ownerPhones();
  const [users, logins, bought] = await Promise.all([
    User.find({ role: { $in: ["customer", null] }, ...(owners.length && { phone: { $nin: owners } }) }, "name phone email addresses createdAt").lean(),
    // a login is a session; expired ones are cleared after 60 days, so older visits show as none
    mongoose.connection.collection("authSessions").aggregate<{ _id: unknown; at: Date }>([{ $group: { _id: "$userId", at: { $max: "$createdAt" } } }]).toArray(),
    // name and address from each one's latest order
    Order.aggregate<Bought>([
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
    ]),
  ]);
  const loginOf = new Map(logins.map((l) => [String(l._id), l.at]));
  const boughtBy = new Map(bought.map((b) => [String(b._id), b]));
  const all: Customer[] = users
    .map((u) => {
      const b = boughtBy.get(String(u._id));
      const home = u.addresses?.[0];
      return {
        _id: u._id,
        name: u.name && u.name !== "Customer" ? u.name : (b?.name ?? ""),
        phone: u.phone || b?.phone || "",
        email: isPlaceholderEmail(u.email) ? "" : (u.email ?? ""),
        pincode: b?.pincode ?? home?.pincode ?? "",
        line: b?.line ?? home?.line ?? "",
        orders: b?.orders ?? 0,
        open: b?.open ?? 0,
        spent: b?.spent ?? 0,
        last: b?.last,
        joined: u.createdAt,
        login: loginOf.get(String(u._id)),
      };
    })
    // the most recently seen first
    .sort((a, b) => (b.login ?? b.joined).getTime() - (a.login ?? a.joined).getTime());
  const weekAgo = Date.now() - 7 * 86_400_000;
  const customers = q ? all.filter((c) => [c.name, c.phone, c.email, c.pincode, c.line].some((v) => v?.toLowerCase().includes(q))) : all;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const s = t.staff.customers;
  const col = t.staff.cols;

  return (
    <>
      <h1>{t.common.adminTabs.customers}</h1>
      <div className="stats">
        <div>
          <strong>{all.length}</strong>
          <span>{s.accounts}</span>
        </div>
        <div>
          <strong>{all.filter((c) => c.login && c.login.getTime() > weekAgo).length}</strong>
          <span>{s.active}</span>
        </div>
        <div>
          <strong>{all.filter((c) => c.orders > 0).length}</strong>
          <span>{s.have}</span>
        </div>
        <div>
          <strong>{all.filter((c) => c.orders > 1).length}</strong>
          <span>{s.repeat}</span>
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
              <th>{s.joined}</th>
              <th>{s.lastLogin}</th>
              <th className="num">{s.orders}</th>
              <th className="num">{s.spent}</th>
              <th>{s.last}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={String(c._id)}>
                <td data-label={col.customer}>
                  <strong>{c.name || "—"}</strong>
                  {c.email && <small>{c.email}</small>}
                  {/^\d{10}$/.test(c.phone) && (
                    <span className="contact">
                      <a href={`tel:+91${c.phone}`} className="chip-link">
                        <Phone size={14} aria-hidden="true" /> {c.phone}
                      </a>
                      <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noreferrer" className="chip-link">
                        <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                      </a>
                    </span>
                  )}
                </td>
                <td data-label={col.address}>
                  {c.line}
                  <small>
                    <strong>{c.pincode}</strong>
                  </small>
                </td>
                <td data-label={s.joined}>{day(c.joined, lang)}</td>
                <td data-label={s.lastLogin}>{c.login ? day(c.login, lang) : "—"}</td>
                <td data-label={s.orders} className="num">
                  {c.orders ? <Link href={`/admin?status=all&customer=${String(c._id)}`}>{c.orders}</Link> : 0}
                  {c.open > 0 && <small>{fill(s.toDeliver, { n: c.open })}</small>}
                </td>
                <td data-label={s.spent} className="num">
                  <strong>{inr(c.spent)}</strong>
                </td>
                <td data-label={s.last}>{c.last ? day(c.last, lang) : s.noOrders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
