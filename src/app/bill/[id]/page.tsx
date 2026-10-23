import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { inWords } from "@/lib/format";
import { fill, locale, type Lang } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { billTitle, GST_RATE, gstSplit, HSN, shopDetails, stateOf } from "@/lib/legal";
import { BILLABLE, issueBill } from "@/lib/orders";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT()).orders.bill.titles.Bill} · Agarwal Stores` };
}

const date = (d: Date, lang: Lang) => new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
/** Money on a bill: always with paise, so the columns line up. */
const paise = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const money = (rupees: number) => paise(rupees * 100);

/**
 * The bill for an accepted order (CGST rule 46 for a Tax Invoice, rule 49 for a Bill of Supply), for staff to
 * print and hand over with the delivery. It prints on one A4 page without the site around it.
 */
export default async function Bill({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // staff only: customers get it on paper with the delivery, not online
  await requireStaff("orders", `/bill/${id}`);
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  // from when the shop accepts the order; one cancelled after its bill was made still shows it, marked
  if (!(await Order.exists({ _id: id, $or: [{ status: { $in: BILLABLE } }, { "bill.number": { $exists: true } }] }))) notFound();
  // its number is taken the first time it's opened (or at delivery, if nobody printed it before)
  await issueBill(id);
  const order = await Order.findById(id).lean();
  if (!order?.bill?.number) notFound();
  const { bill } = order;
  const shop = bill.shop ?? {};
  const title = billTitle(shop);
  // the rate the bill was made at, so a later change in GST never rewrites it
  const rate = bill.rate ?? GST_RATE;
  const tax = gstSplit(order.total, rate);
  // how it looks follows Settings now; what it says (seller, number, rate, HSN) stays as it was made
  const [t, lang, look] = await Promise.all([getT(), getLang(), shopDetails()]);
  const b = t.orders.bill;
  const phone = shop.phone ?? look.phone;
  const hsn = bill.hsn ?? HSN;
  // a bill the law needs to name its buyer (₹50,000 or more) always shows the address
  const address = look.billAddress || bill.named;
  const discount = order.coupon?.discount ?? 0;
  // printed before the door it says what to pay; after, what was paid
  const state = order.status === "delivered" ? "paid" : order.status === "cancelled" ? "cancelled" : "due";
  const payment =
    state === "paid"
      ? fill(order.cash?.method === "upi" ? b.paidUpi : b.paidCash, { amount: money(order.cash?.collected ?? order.total) })
      : state === "cancelled"
        ? b.cancelled
        : fill(b.toPay, { amount: money(order.total) });

  return (
    <div className="invoice-page">
      <div className="invoice-tools no-print">
        <PrintButton />
      </div>
      <article className={`invoice ${state}`}>
        <header className="invoice-head">
          <div className="invoice-from">
            <div className="invoice-shop">
              {look.billLogo && <img src="/icon.svg" alt="" width={48} height={48} />}
              <div>
                <strong>{shop.legalName}</strong>
                {look.billTagline && <span>{look.billTagline}</span>}
              </div>
            </div>
            <address>
              {shop.address}
              {shop.gstin && (
                <>
                  <br />
                  GSTIN <b>{shop.gstin}</b>
                </>
              )}
              {(phone || shop.email) && (
                <>
                  <br />
                  {[phone && fill(b.phone, { phone }), shop.email].filter(Boolean).join(" · ")}
                </>
              )}
            </address>
          </div>
          <div className="invoice-title">
            <h1>{b.titles[title] ?? title}</h1>
            {title === "Tax Invoice" && <span>{b.original}</span>}
          </div>
        </header>

        <dl className="invoice-meta">
          <div>
            <dt>{b.billNo}</dt>
            <dd>{bill.number}</dd>
          </div>
          <div>
            <dt>{b.date}</dt>
            <dd>{date(bill.at!, lang)}</dd>
          </div>
          <div>
            <dt>{b.orderNo}</dt>
            <dd>#{order.number}</dd>
          </div>
          {/* delivered near the shop, so the buyer's State is the shop's (CGST rule 46(e)) */}
          {shop.gstin && (
            <div>
              <dt>{b.placeOfSupply}</dt>
              <dd>{stateOf(shop.gstin)}</dd>
            </div>
          )}
        </dl>

        <section className="invoice-parties">
          <div>
            <h2>{b.billedTo}</h2>
            <p>
              <strong>{order.name}</strong>
              {address && (
                <>
                  <br />
                  {order.address.line}
                  {order.address.landmark && <>, {fill(b.near, { place: order.address.landmark })}</>} – {order.address.pincode}
                </>
              )}
              <br />
              +91 {order.phone}
            </p>
          </div>
          <div className="invoice-pay">
            <h2>{b.payment}</h2>
            <p>{payment}</p>
          </div>
        </section>

        <div className="invoice-items">
          <table>
            <thead>
              <tr>
                <th className="sr">#</th>
                <th>{b.item}</th>
                {look.billHsnColumn && <th>HSN</th>}
                <th className="num">{b.qty}</th>
                <th className="num">{b.rate}</th>
                <th className="num">{b.amount}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i, n) => (
                <tr key={n}>
                  <td className="sr">{n + 1}</td>
                  <td>
                    {i.name}
                    {i.unit && <small>{i.unit}</small>}
                  </td>
                  {look.billHsnColumn && <td>{hsn}</td>}
                  <td className="num">{i.qty}</td>
                  <td className="num">{money(i.price!)}</td>
                  <td className="num">{money(i.price! * i.qty!)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="invoice-sums">
          <div className="invoice-words">
            <h2>{b.inWords}</h2>
            <p>{inWords(order.total)}</p>
            {title === "Tax Invoice" && <p className="invoice-small">{b.reverseCharge}</p>}
            {title === "Bill of Supply" && <p className="invoice-small">{b.composition}</p>}
          </div>
          <dl className="invoice-totals">
            {/* a coupon is a discount given when it's sold, so it comes off before GST is worked out */}
            {discount > 0 && (
              <>
                <div>
                  <dt>{b.itemsTotal}</dt>
                  <dd>{money(order.total + discount)}</dd>
                </div>
                <div>
                  <dt>{fill(b.less, { code: order.coupon?.code ?? "", percent: order.coupon?.percent ?? "" })}</dt>
                  <dd>−{money(discount)}</dd>
                </div>
              </>
            )}
            {title === "Tax Invoice" && (
              <>
                <div>
                  <dt>{b.taxable}</dt>
                  <dd>{paise(tax.taxable)}</dd>
                </div>
                <div>
                  <dt>CGST {rate / 2}%</dt>
                  <dd>{paise(tax.cgst)}</dd>
                </div>
                <div>
                  <dt>SGST {rate / 2}%</dt>
                  <dd>{paise(tax.sgst)}</dd>
                </div>
              </>
            )}
            <div className="grand">
              <dt>{title === "Tax Invoice" ? b.totalGst : b.total}</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
        </section>

        <footer className="invoice-foot">
          <div>
            <p className="invoice-small">{b.declaration}</p>
            {look.billNote && <p className="invoice-note">{look.billNote}</p>}
            <p className="invoice-small">{b.computer}</p>
          </div>
          <div className="invoice-sign">
            <span>{fill(b.for, { shop: shop.legalName ?? "" })}</span>
            <span className="invoice-sign-line">{look.billSignatory || b.signatory}</span>
          </div>
        </footer>
        {state === "cancelled" && (
          <div className="invoice-stamp" aria-hidden="true">
            {b.cancelledStamp}
          </div>
        )}
      </article>
    </div>
  );
}
