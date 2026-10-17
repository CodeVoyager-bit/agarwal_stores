import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requireUser } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { inr } from "@/lib/format";
import { billTitle, GST_RATE, gstSplit, HSN } from "@/lib/legal";
import { issueBill } from "@/lib/orders";
import { can } from "@/lib/roles";

export const metadata: Metadata = { title: "Bill · Agarwal Stores" };

const date = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
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
  const tax = gstSplit(order.total);

  return (
    <article className="slip bill">
      <PrintButton />
      <header>
        <div className="bill-from">
          <strong className="slip-shop">{shop.legalName}</strong>
          <span>{shop.address}</span>
          {shop.gstin && <span>GSTIN {shop.gstin}</span>}
          {process.env.SHOP_PHONE && <span>Phone +91 {process.env.SHOP_PHONE}</span>}
        </div>
        <div className="slip-number">
          <strong>{title}</strong>
          <span>No. {bill.number}</span>
          <span>{date(bill.at!)}</span>
        </div>
      </header>
      <section>
        <h2>Billed to</h2>
        <p>
          <strong>{order.name}</strong>
          <br />
          {order.address.line}
          {order.address.landmark && <>, near {order.address.landmark}</>} – {order.address.pincode}
        </p>
        <p className="slip-note">Order #{order.number}</p>
      </section>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>HSN</th>
            <th className="num">Qty</th>
            <th className="num">Rate</th>
            <th className="num">Amount</th>
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
                <td colSpan={4}>Taxable value</td>
                <td className="num">{rupees(tax.taxable)}</td>
              </tr>
              <tr>
                <td colSpan={4}>CGST {GST_RATE / 2}%</td>
                <td className="num">{rupees(tax.cgst)}</td>
              </tr>
              <tr>
                <td colSpan={4}>SGST {GST_RATE / 2}%</td>
                <td className="num">{rupees(tax.sgst)}</td>
              </tr>
            </>
          )}
          <tr>
            <th colSpan={4}>Total{title === "Tax Invoice" && " (including GST)"}</th>
            <th className="num">{inr(order.total)}</th>
          </tr>
        </tfoot>
      </table>
      <p>
        Paid {inr(order.cash?.collected ?? order.total)} {order.cash?.method === "upi" ? "by UPI" : "in cash"} on delivery.
      </p>
      {title === "Tax Invoice" && <p className="slip-note">Tax payable on reverse charge: No.</p>}
      {title === "Bill of Supply" && <p className="slip-note">Composition taxable person, not eligible to collect tax on supplies.</p>}
      <footer>
        <span className="slip-note">A computer-made bill.</span>
        <span>
          For {shop.legalName}
          <br />
          Authorised signatory
        </span>
      </footer>
    </article>
  );
}
