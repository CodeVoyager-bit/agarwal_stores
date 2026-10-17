import { MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr } from "@/lib/format";
import { OPEN } from "@/lib/orders";

export const metadata: Metadata = { title: "Customers · Admin" };

type Customer = { _id: unknown; name: string; phone: string; pincode: string; line: string; orders: number; open: number; spent: number; last: Date };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("customers", "/admin/customers");
  const q = ((await searchParams).q ?? "").trim().slice(0, 60).toLowerCase();
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

  return (
    <>
      <h1>Customers</h1>
      <div className="stats">
        <div>
          <strong>{all.length}</strong>
          <span>have ordered</span>
        </div>
        <div>
          <strong>{repeat}</strong>
          <span>ordered more than once</span>
        </div>
        <div>
          <strong>{inr(all.reduce((n, c) => n + c.spent, 0))}</strong>
          <span>booked, not cancelled</span>
        </div>
        <div>
          <strong>{all.length ? inr(Math.round(all.reduce((n, c) => n + c.spent, 0) / all.length)) : "₹0"}</strong>
          <span>average per customer</span>
        </div>
      </div>
      <form className="filter" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Name, phone, pincode or area…" aria-label="Search customers" autoComplete="off" />
        <button className="btn">Search</button>
      </form>
      <p className="muted">{customers.length === 1 ? "1 customer" : `${customers.length} customers`}</p>
      {customers.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Address</th>
              <th className="num">Orders</th>
              <th className="num">Spent</th>
              <th>Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={String(c._id)}>
                <td data-label="Customer">
                  <strong>{c.name}</strong>
                  <span className="contact">
                    <a href={`tel:+91${c.phone}`} className="chip-link">
                      <Phone size={14} aria-hidden="true" /> {c.phone}
                    </a>
                    <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noreferrer" className="chip-link">
                      <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                    </a>
                  </span>
                </td>
                <td data-label="Address">
                  {c.line}
                  <small>
                    <strong>{c.pincode}</strong>
                  </small>
                </td>
                <td data-label="Orders" className="num">
                  <Link href={`/admin?status=all&customer=${String(c._id)}`}>{c.orders}</Link>
                  {c.open > 0 && <small>{c.open} to deliver</small>}
                </td>
                <td data-label="Spent" className="num">
                  <strong>{inr(c.spent)}</strong>
                </td>
                <td data-label="Last order">{day(c.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
