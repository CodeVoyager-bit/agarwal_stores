import type { Metadata } from "next";
import { PrintButton } from "@/components/print-button";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { shopDetails } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).staff.sheet.title };
}

/**
 * Every packed order (and any already on its way), a printed page for each delivery person to take
 * along: the customer ticks how they paid and signs for it. Orders not given to anyone come last.
 */
export default async function DeliverySheet() {
  await requireStaff("orders", "/admin/sheet");
  await connectDB();
  const orders = await Order.find({ status: { $in: ["packed", "out_for_delivery"] } })
    .sort({ deliverBy: 1, number: 1 })
    .lean();
  const [t, lang, shop] = await Promise.all([getT(), getLang(), shopDetails()]);
  const s = t.staff.sheet;
  const c = t.staff.cols;

  const pages = new Map<string, typeof orders>();
  for (const o of orders) {
    const rider = o.assignedName ?? "";
    pages.set(rider, [...(pages.get(rider) ?? []), o]);
  }
  const riders = [...pages.keys()].sort((a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b)));

  return (
    <>
      <div className="sheet-actions">
        <PrintButton />
      </div>
      {!orders.length && <p className="slip">{s.none}</p>}
      {riders.map((rider) => {
        const list = pages.get(rider)!;
        return (
          <article className="slip sheet" key={rider}>
            <header>
              <div className="slip-brand">
                <img src="/icon.svg" alt="" width={44} height={44} />
                <div>
                  <strong className="slip-shop">{t.common.meta.title}</strong>
                  {shop.phone && <small>{fill(t.staff.slip.phone, { phone: shop.phone })}</small>}
                </div>
              </div>
              <div className="slip-number">
                <strong>{s.title}</strong>
                <strong className="sheet-rider">{rider ? fill(s.for, { name: rider }) : s.nobody}</strong>
                <small>{fill(s.date, { day: day(new Date(), lang) })}</small>
              </div>
            </header>
            <table>
              <thead>
                <tr>
                  <th>{c.order}</th>
                  <th>{c.customer}</th>
                  <th>{c.address}</th>
                  <th className="num">{t.staff.slip.collect}</th>
                  <th>{s.paidBy}</th>
                  <th>{s.sign}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={String(o._id)}>
                    <td>
                      <strong>#{o.number}</strong>
                      <br />
                      <small>{fill(t.staff.slip.pieces, { n: o.items.reduce((n, i) => n + i.qty!, 0) })}</small>
                    </td>
                    <td>
                      {o.name}
                      <br />
                      <span className="nowrap">+91 {o.phone}</span>
                    </td>
                    <td>
                      {o.address.line}
                      {o.address.landmark && fill(t.staff.slip.near, { place: o.address.landmark })} – {o.address.pincode}
                    </td>
                    <td className="num">
                      <strong>{inr(o.total)}</strong>
                    </td>
                    <td className="ticks">
                      ☐ {s.cash}
                      <br />☐ {s.online}
                    </td>
                    <td className="sign" />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3}>{list.length === 1 ? t.staff.orders.one : fill(t.staff.orders.many, { n: list.length })}</th>
                  <th className="num">{inr(list.reduce((n, o) => n + o.total, 0))}</th>
                  <th colSpan={2} />
                </tr>
              </tfoot>
            </table>
            <footer>
              <span>{s.handedIn}</span>
              <span>{s.checkedBy}</span>
            </footer>
          </article>
        );
      })}
    </>
  );
}
