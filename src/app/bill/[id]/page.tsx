import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requireUser } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { inr } from "@/lib/format";
import { fill, locale, type Lang } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { billTitle, GST_RATE, gstSplit, HSN, stateOf } from "@/lib/legal";
import { issueBill } from "@/lib/orders";
import { can } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT()).orders.bill.titles.Bill} · Agarwal Stores` };
}

const date = (d: Date, lang: Lang) => new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The bill for a delivered order (CGST rule 46 for a Tax Invoice, rule 49 for a Bill of Supply), for its
 * customer and for staff. It prints on one page without the site around it, like the packing slip.
 */
export default async function Bill({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/bill/${id}`);
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  // a customer sees only their own bills; staff who run orders see any
  const mine = can(user.role, "orders") ? {} : { user: user.id };
  if (!(await Order.exists({ _id: id, status: "delivered", ...mine }))) notFound();
  // a delivery from before bills were made gets its number the first time it's opened
  await issueBill(id);
  const order = await Order.findById(id).lean();
  if (!order?.bill?.number) notFound();
  const { bill } = order;
  const shop = bill.shop ?? {};
  const title = billTitle(shop);
  // the rate the bill was made at, so a later change in GST never rewrites it
  const rate = bill.rate ?? GST_RATE;
  const tax = gstSplit(order.total, rate);
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const b = t.orders.bill;

  return (
    <article className="slip bill">
      <PrintButton />
      <header>
        <div className="bill-from">
          <strong className="slip-shop">{shop.legalName}</strong>
          <span>{shop.address}</span>
          {shop.gstin && <span>GSTIN {shop.gstin}</span>}
          {process.env.SHOP_PHONE && <span>{fill(b.phone, { phone: process.env.SHOP_PHONE })}</span>}
        </div>
        <div className="slip-number">
          <strong>{b.titles[title] ?? title}</strong>
          <span>{fill(b.number, { n: bill.number ?? "" })}</span>
          <span>{date(bill.at!, lang)}</span>
        </div>
      </header>
      <section>
        <h2>{b.billedTo}</h2>
        <p>
          <strong>{order.name}</strong>
          <br />
          {order.address.line}
          {order.address.landmark && <>, {fill(b.near, { place: order.address.landmark })}</>} – {order.address.pincode}
          {/* delivered near the shop, so the buyer's State is the shop's (CGST rule 46(e)) */}
          {shop.gstin && (
            <>
              <br />
              {fill(b.state, { state: stateOf(shop.gstin) })}
            </>
          )}
        </p>
        <p className="slip-note">{fill(b.order, { n: order.number })}</p>
      </section>
      <table>
        <thead>
          <tr>
            <th>{b.item}</th>
            <th>HSN</th>
            <th className="num">{b.qty}</th>
            <th className="num">{b.rate}</th>
            <th className="num">{b.amount}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i, n) => (
            <tr key={n}>
              <td>
                {i.name} <small>{i.unit}</small>
              </td>
              <td>{HSN}</td>
              <td className="num">{i.qty}</td>
              <td className="num">{inr(i.price!)}</td>
              <td className="num">{inr(i.price! * i.qty!)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {title === "Tax Invoice" && (
            <>
              <tr>
                <td colSpan={4}>{b.taxable}</td>
                <td className="num">{rupees(tax.taxable)}</td>
              </tr>
              <tr>
                <td colSpan={4}>CGST {rate / 2}%</td>
                <td className="num">{rupees(tax.cgst)}</td>
              </tr>
              <tr>
                <td colSpan={4}>SGST {rate / 2}%</td>
                <td className="num">{rupees(tax.sgst)}</td>
              </tr>
            </>
          )}
          <tr>
            <th colSpan={4}>{title === "Tax Invoice" ? b.totalGst : b.total}</th>
            <th className="num">{inr(order.total)}</th>
          </tr>
        </tfoot>
      </table>
      <p>{fill(order.cash?.method === "upi" ? b.paidUpi : b.paidCash, { amount: inr(order.cash?.collected ?? order.total) })}</p>
      {title === "Tax Invoice" && <p className="slip-note">{b.reverseCharge}</p>}
      {title === "Bill of Supply" && <p className="slip-note">{b.composition}</p>}
      <footer>
        <span className="slip-note">{b.computer}</span>
        <span>
          {fill(b.for, { shop: shop.legalName ?? "" })}
          <br />
          {b.signatory}
        </span>
      </footer>
    </article>
  );
}
