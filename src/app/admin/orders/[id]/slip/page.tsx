import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr } from "@/lib/format";

export const metadata: Metadata = { title: "Packing Slip" };

/** One A5/A4 page to pack from and hand over with the parcel. */
export default async function Slip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff("orders", `/admin/orders/${id}/slip`);
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const order = await Order.findById(id).lean();
  if (!order) notFound();
  const pieces = order.items.reduce((n, i) => n + i.qty!, 0);

  return (
    <article className="slip">
      <PrintButton />
      <header>
        <div className="slip-brand">
          <img src="/icon.svg" alt="" width={44} height={44} />
          <div>
            <strong className="slip-shop">Agarwal Stores · Crackers</strong>
            {process.env.SHOP_PHONE && <small>Phone {process.env.SHOP_PHONE}</small>}
          </div>
        </div>
        <div className="slip-number">
          <strong>Order #{order.number}</strong>
          <small>
            {day(order.createdAt)} · deliver by {day(order.deliverBy)}
          </small>
        </div>
      </header>
      <section>
        <h2>Deliver to</h2>
        <p>
          <strong>{order.name}</strong> · +91 {order.phone}
          <br />
          {order.address.line}
          {order.address.landmark && <>, near {order.address.landmark}</>} – {order.address.pincode}
        </p>
      </section>
      <table>
        <thead>
          <tr>
            <th>Packed</th>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Price</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i, n) => (
            <tr key={n}>
              <td className="tick" aria-label="Packed check box">
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
            <th colSpan={2}>{pieces} pieces</th>
            <th colSpan={2} className="num">
              To collect
            </th>
            <th className="num">{inr(order.total)}</th>
          </tr>
        </tfoot>
      </table>
      <p className="slip-note">Pay cash or UPI on delivery. Keep crackers away from children, heat and flames.</p>
      <footer>
        <span>Packed by ____________</span>
        <span>Received by ____________</span>
      </footer>
    </article>
  );
}
