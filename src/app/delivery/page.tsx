import { MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).delivery.list.title };
}

export default async function Deliveries() {
  const user = await requireStaff("delivery", "/delivery");
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const s = t.delivery.list;
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
      <h1>{user.name ? fill(s.helloName, { name: user.name }) : s.hello}</h1>
      <div className="stats">
        <div>
          <strong>{stops.length}</strong>
          <span>{s.stops}</span>
        </div>
        <div>
          <strong>{today}</strong>
          <span>{s.today}</span>
        </div>
        <div className={cash ? "alert" : ""}>
          <strong>{inr(cash)}</strong>
          <span>{s.cash}</span>
        </div>
      </div>

      <h2>{s.yourStops}</h2>
      {stops.length ? (
        <ul className="stops">
          {stops.map((o) => (
            <li key={String(o._id)} className="panel stop">
              <Link href={`/delivery/${o._id}`} className="stop-main">
                <span>
                  <strong>{o.name}</strong>
                  <small>{o.address.line}</small>
                  <small>
                    {o.address.pincode} · #{o.number} · {fill(s.by, { day: day(o.deliverBy, lang) })}
                  </small>
                </span>
                <span className={`pill ${o.status}`}>{t.common.status[o.status]}</span>
                <strong className="stop-collect">{fill(s.collect, { amount: inr(o.total) })}</strong>
              </Link>
              <span className="contact">
                <a className="chip-link" href={`tel:+91${o.phone}`} aria-label={fill(s.callName, { name: o.name })}>
                  <Phone size={14} aria-hidden="true" /> {t.common.words.call}
                </a>
                <a
                  className="chip-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address.line} ${o.address.pincode}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={fill(s.mapTo, { name: o.name })}
                >
                  <MapPin size={14} aria-hidden="true" /> {t.common.words.map}
                </a>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty panel">
          <h2>{s.emptyTitle}</h2>
          <p>{s.emptyText}</p>
        </div>
      )}

      {done.length > 0 && (
        <>
          <h2>{s.recent}</h2>
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
