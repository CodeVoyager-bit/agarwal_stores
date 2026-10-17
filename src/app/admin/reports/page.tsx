import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order, Product } from "@/lib/db";
import { inr } from "@/lib/format";
import { catName, fill, locale, type Lang } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/dict";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const tabs = (await getT()).common.adminTabs;
  return { title: `${tabs.sales} · ${tabs.label}` };
}

type Words = Dict["catalog"]["reports"];
const RANGES = ["7", "30", "all"] as const;
const istDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
const short = (key: string, lang: Lang) => new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
const orderCount = (n: number, w: Words) => fill(n === 1 ? w.orderOne : w.orderMany, { n });
/** A round axis top: 1, 2 or 5 times a power of ten, at or above the largest value. */
function niceTop(max: number) {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 5, 10].map((m) => m * step).find((v) => v >= max)!;
}

/** Daily sales as columns: one hue, gridlines at 0, half and top, the best day labelled, values on hover/focus. */
function DailyColumns({ days, w, lang }: { days: { key: string; sales: number; orders: number }[]; w: Words; lang: Lang }) {
  const top = niceTop(Math.max(...days.map((d) => d.sales)));
  const best = days.reduce((a, b) => (b.sales > a.sales ? b : a), days[0]);
  const every = Math.ceil(days.length / 8);
  return (
    <div className="columns" style={{ "--n": days.length } as React.CSSProperties}>
      <div className="grid-lines" aria-hidden="true">
        {[top, top / 2, 0].map((v) => (
          <span key={v}>
            <small>{inr(v)}</small>
          </span>
        ))}
      </div>
      <ol className="column-row">
        {days.map((d, i) => (
          <li key={d.key} tabIndex={0} aria-label={`${short(d.key, lang)}: ${inr(d.sales)}, ${orderCount(d.orders, w)}`}>
            <span className="column" style={{ height: `${(d.sales / top) * 100}%` }}>
              {d === best && d.sales > 0 && <b className="cap">{inr(d.sales)}</b>}
            </span>
            <span className="tip" role="tooltip">
              <strong>{inr(d.sales)}</strong>
              {short(d.key, lang)} · {orderCount(d.orders, w)}
            </span>
            <small className="x">{i % every === 0 || i === days.length - 1 ? short(d.key, lang) : ""}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Ranked horizontal bars: name, bar, value at its tip. */
function RankBars({ rows, unit }: { rows: { label: string; value: number; note?: string }[]; unit: (n: number) => string }) {
  const top = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="rank">
      {rows.map((r) => (
        <li key={r.label} tabIndex={0} aria-label={`${r.label}: ${unit(r.value)}${r.note ? `, ${r.note}` : ""}`}>
          <span className="rank-label">{r.label}</span>
          <span className="rank-track">
            <span className="rank-bar" style={{ width: `${(r.value / top) * 100}%` }} />
            <b>{unit(r.value)}</b>
          </span>
          {r.note && <small className="rank-note">{r.note}</small>}
        </li>
      ))}
    </ol>
  );
}

export default async function Reports({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireStaff("reports", "/admin/reports");
  const asked = (await searchParams).range;
  const range = RANGES.find((r) => r === asked) ?? "30";
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const w = t.catalog.reports;
  await connectDB();
  const first = await Order.findOne().sort({ createdAt: 1 }).select("createdAt").lean();
  // the whole season is capped at 90 days of columns
  const span = range === "all" ? Math.min(90, first ? Math.ceil((Date.now() - first.createdAt.getTime()) / 86_400_000) + 1 : 1) : Number(range);
  const since = new Date(`${istDay(new Date(Date.now() - (span - 1) * 86_400_000))}T00:00:00+05:30`);
  // ponytail: sums in memory; one Diwali season is a few thousand orders. Move to $group if it grows past that.
  const [orders, cancelled] = await Promise.all([
    Order.find({ status: { $ne: "cancelled" }, createdAt: { $gte: since } }).select("total items address.pincode createdAt").lean(),
    Order.countDocuments({ status: "cancelled", createdAt: { $gte: since } }),
  ]);
  const categoryOf = new Map(
    (await Product.find({ _id: { $in: orders.flatMap((o) => o.items.map((i) => i.product)) } }).select("category").lean()).map((p) => [String(p._id), p.category]),
  );

  const sales = orders.reduce((n, o) => n + o.total, 0);
  const pieces = orders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty!, 0), 0);
  const days = Array.from({ length: span }, (_, i) => ({ key: istDay(new Date(since.getTime() + i * 86_400_000 + 12 * 3_600_000)), sales: 0, orders: 0 }));
  const byDay = new Map(days.map((d) => [d.key, d]));
  const items = new Map<string, { qty: number; value: number }>();
  const categories = new Map<string, number>();
  const pincodes = new Map<string, { value: number; orders: number }>();
  for (const o of orders) {
    const d = byDay.get(istDay(o.createdAt));
    if (d) {
      d.sales += o.total;
      d.orders += 1;
    }
    const pin = pincodes.get(o.address.pincode) ?? { value: 0, orders: 0 };
    pincodes.set(o.address.pincode, { value: pin.value + o.total, orders: pin.orders + 1 });
    for (const i of o.items) {
      const line = i.price! * i.qty!;
      const item = items.get(i.name!) ?? { qty: 0, value: 0 };
      items.set(i.name!, { qty: item.qty + i.qty!, value: item.value + line });
      const category = categoryOf.get(String(i.product)) ?? w.other;
      categories.set(category, (categories.get(category) ?? 0) + line);
    }
  }
  const topItems = [...items].sort((a, b) => b[1].value - a[1].value).slice(0, 10);
  const topCategories = [...categories].sort((a, b) => b[1] - a[1]);
  const topPins = [...pincodes].sort((a, b) => b[1].value - a[1].value).slice(0, 8);

  return (
    <>
      <h1>{t.common.adminTabs.sales}</h1>
      <nav className="chips" aria-label={w.period}>
        {RANGES.map((key) => (
          <Link key={key} href={`/admin/reports?range=${key}`} aria-current={key === range ? "page" : undefined}>
            {w.ranges[key]}
          </Link>
        ))}
      </nav>
      <p className="muted">{w.note}</p>

      <div className="stats">
        <div>
          <strong className="figure">{inr(sales)}</strong>
          <span>{w.sales}</span>
        </div>
        <div>
          <strong className="figure">{orders.length}</strong>
          <span>
            {w.orders}
            {cancelled ? fill(w.cancelled, { n: cancelled }) : ""}
          </span>
        </div>
        <div>
          <strong className="figure">{orders.length ? inr(Math.round(sales / orders.length)) : "₹0"}</strong>
          <span>{w.average}</span>
        </div>
        <div>
          <strong className="figure">{pieces.toLocaleString("en-IN")}</strong>
          <span>{w.pieces}</span>
        </div>
      </div>

      <section className="panel chart-card" aria-labelledby="daily">
        <h2 id="daily">{w.byDay}</h2>
        <DailyColumns days={days} w={w} lang={lang} />
        <details>
          <summary>{w.asTable}</summary>
          <table className="lines-table">
            <thead>
              <tr>
                <th>{w.day}</th>
                <th className="num">{w.ordersCol}</th>
                <th className="num">{w.salesCol}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.key}>
                  <td>{short(d.key, lang)}</td>
                  <td className="num">{d.orders}</td>
                  <td className="num">{inr(d.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      {orders.length > 0 ? (
        <div className="report-grid">
          <section className="panel chart-card" aria-labelledby="items">
            <h2 id="items">{w.topItems}</h2>
            <RankBars rows={topItems.map(([label, v]) => ({ label, value: v.value, note: fill(w.sold, { n: v.qty }) }))} unit={inr} />
          </section>
          <section className="panel chart-card" aria-labelledby="cats">
            <h2 id="cats">{w.byCategory}</h2>
            <RankBars rows={topCategories.map(([label, value]) => ({ label: catName(t, label), value }))} unit={inr} />
          </section>
          <section className="panel chart-card" aria-labelledby="pins">
            <h2 id="pins">{w.byPincode}</h2>
            <RankBars rows={topPins.map(([label, v]) => ({ label, value: v.value, note: orderCount(v.orders, w) }))} unit={inr} />
          </section>
        </div>
      ) : (
        <p className="empty panel">{w.empty}</p>
      )}
    </>
  );
}
