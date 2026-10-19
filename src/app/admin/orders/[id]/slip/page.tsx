import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { shopDetails } from "@/lib/legal";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).staff.slip.title };
}

/** One A5/A4 page to pack from and hand over with the parcel. */
export default async function Slip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff("orders", `/admin/orders/${id}/slip`);
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const order = await Order.findById(id).lean();
  if (!order) notFound();
  const pieces = order.items.reduce((n, i) => n + i.qty!, 0);
  const [t, lang, shop] = await Promise.all([getT(), getLang(), shopDetails()]);
  const s = t.staff.slip;
  const c = t.staff.cols;

  return (
    <article className="slip">
      <PrintButton />
      <header>
        <div className="slip-brand">
          <img src="/icon.svg" alt="" width={44} height={44} />
          <div>
            <strong className="slip-shop">{t.common.meta.title}</strong>
            {shop.phone && <small>{fill(s.phone, { phone: shop.phone })}</small>}
          </div>
        </div>
        <div className="slip-number">
          <strong>{fill(t.staff.order.heading, { n: order.number })}</strong>
          <small>
            {fill(s.dates, { day: day(order.createdAt, lang), by: day(order.deliverBy, lang) })}
          </small>
        </div>
      </header>
      <section>
        <h2>{s.deliverTo}</h2>
        <p>
          <strong>{order.name}</strong> · +91 {order.phone}
          <br />
          {order.address.line}
          {order.address.landmark && fill(s.near, { place: order.address.landmark })} – {order.address.pincode}
        </p>
      </section>
      <table>
        <thead>
          <tr>
            <th>{s.packed}</th>
            <th>{c.item}</th>
            <th className="num">{c.qty}</th>
            <th className="num">{c.price}</th>
            <th className="num">{c.amount}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i, n) => (
            <tr key={n}>
              <td className="tick" aria-label={s.tick}>
                ☐
              </td>
              <td>
                {i.name} <small>{i.unit}</small>
              </td>
              <td className="num">{i.qty}</td>
              <td className="num">{inr(i.price!)}</td>
              <td className="num">{inr(i.price! * i.qty!)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={2}>{fill(s.pieces, { n: pieces })}</th>
            <th colSpan={2} className="num">
              {s.collect}
            </th>
            <th className="num">{inr(order.total)}</th>
          </tr>
        </tfoot>
      </table>
      <p className="slip-note">
        {shop.slipNote || s.note}
        {shop.upiId && ` ${fill(t.orders.mine.upiTo, { upi: shop.upiId })}`}
      </p>
      <footer>
        <span>{s.packedBy}</span>
        <span>{s.receivedBy}</span>
      </footer>
    </article>
  );
}
