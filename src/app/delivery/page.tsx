import { MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr, STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "My Deliveries" };

export default async function Deliveries() {
  const user = await requireStaff("delivery", "/delivery");
  await connectDB();
  const mine = { assignedTo: user.id };
  const [stops, done, today, carrying] = await Promise.all([
    Order.find({ ...mine, status: { $in: ["placed", "packed", "out_for_delivery"] } }).sort({ deliverBy: 1 }).lean(),
    Order.find({ ...mine, status: "delivered" }).sort({ "cash.collectedAt": -1 }).limit(20).lean(),
    Order.countDocuments({ ...mine, status: "delivered", "cash.collectedAt": { $gt: new Date(Date.now() - 86_400_000) } }),
    // cash only: UPI is already in the shop's account
    Order.find({ ...mine, "cash.collected": { $exists: true }, "cash.receivedAt": { $exists: false }, "cash.method": { $ne: "upi" } }).select("cash").lean(),
  ]);
  const cash = carrying.reduce((n, o) => n + (o.cash?.collected ?? 0), 0);

  return (
    <>
      <h1>Hello{user.name ? `, ${user.name}` : ""}</h1>
      <div className="stats">
        <div>
          <strong>{stops.length}</strong>
          <span>stops to make</span>
        </div>
        <div>
          <strong>{today}</strong>
          <span>delivered in 24 hours</span>
        </div>
        <div className={cash ? "alert" : ""}>
          <strong>{inr(cash)}</strong>
          <span>cash to hand in</span>
        </div>
      </div>

      <h2>Your Stops</h2>
      {stops.length ? (
        <ul className="stops">
          {stops.map((o) => (
            <li key={String(o._id)} className="panel stop">
              <Link href={`/delivery/${o._id}`} className="stop-main">
                <span>
                  <strong>{o.name}</strong>
                  <small>{o.address.line}</small>
                  <small>
                    {o.address.pincode} · #{o.number} · by {day(o.deliverBy)}
                  </small>
                </span>
                <span className={`pill ${o.status}`}>{STATUS_LABEL[o.status]}</span>
                <strong className="stop-collect">Collect {inr(o.total)} →</strong>
              </Link>
              <span className="contact">
                <a className="chip-link" href={`tel:+91${o.phone}`} aria-label={`Call ${o.name}`}>
                  <Phone size={14} aria-hidden="true" /> Call
                </a>
                <a
                  className="chip-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address.line} ${o.address.pincode}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Map to ${o.name}’s address`}
                >
                  <MapPin size={14} aria-hidden="true" /> Map
                </a>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty panel">
          <h2>You’re all caught up</h2>
          <p>Orders the shop gives you show up here.</p>
        </div>
      )}

      {done.length > 0 && (
        <>
          <h2>Recently Delivered</h2>
          <ul className="items panel">
            {done.map((o) => (
              <li key={String(o._id)}>
                <span>
                  #{o.number} · {o.name}
                </span>
                <span className="num">{inr(o.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
