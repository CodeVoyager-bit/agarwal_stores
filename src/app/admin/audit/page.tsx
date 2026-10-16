import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Audit, connectDB } from "@/lib/db";
import { when } from "@/lib/format";

export const metadata: Metadata = { title: "Audit Log · Admin" };

const KINDS: Record<string, string> = { "": "Everything", order: "Orders", delivery: "Deliveries", cash: "Cash", product: "Products", stock: "Imports", staff: "Staff" };
const LABEL: Record<string, string> = {
  "order.status": "Changed status",
  "order.assign": "Gave for delivery",
  "delivery.start": "Started delivery",
  "delivery.done": "Delivered",
  "delivery.failed": "Missed delivery",
  "cash.received": "Counted cash",
  "product.add": "Added product",
  "product.edit": "Edited product",
  "stock.import": "Imported price list",
  "staff.role": "Changed role",
};
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function AuditLog({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string }> }) {
  await requireStaff("audit", "/admin/audit");
  const params = await searchParams;
  const kind = params.kind && params.kind in KINDS ? params.kind : "";
  const q = (params.q ?? "").trim().slice(0, 60);
  await connectDB();
  const rx = q && new RegExp(escape(q), "i");
  const entries = await Audit.find({ ...(kind && { action: new RegExp(`^${kind}\\.`) }), ...(rx && { $or: [{ actor: rx }, { target: rx }, { detail: rx }] }) })
    .sort({ at: -1 })
    .limit(300)
    .lean();

  return (
    <>
      <h1>Audit Log</h1>
      <p className="muted">Who changed what, newest first. Nothing here can be edited.</p>
      <nav className="chips" aria-label="Kind">
        {Object.entries(KINDS).map(([k, label]) => (
          <Link key={k} href={`/admin/audit?kind=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={k === kind ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <form className="filter" role="search">
        <input type="hidden" name="kind" value={kind} />
        <input type="search" name="q" defaultValue={q} placeholder="Person, order #, product…" aria-label="Search the audit log" autoComplete="off" />
        <button className="btn">Search</button>
      </form>
      <p className="muted">{entries.length === 300 ? "Latest 300 entries" : `${entries.length} entries`}</p>
      {entries.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>What</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={String(e._id)}>
                <td data-label="When">{when(e.at)}</td>
                <td data-label="Who">{e.actor}</td>
                <td data-label="What">
                  <strong>{LABEL[e.action ?? ""] ?? e.action}</strong>
                  <small>
                    {e.target} <code>{e.action}</code>
                  </small>
                </td>
                <td data-label="Details">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
