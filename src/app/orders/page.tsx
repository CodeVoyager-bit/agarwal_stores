import { CircleCheck, LogOut, MapPin, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { day, inr, STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "My Orders · Agarwal Stores" };

const STEPS = ["placed", "packed", "out_for_delivery", "delivered"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ placed?: string }> }) {
  const user = await requireUser("/orders");
  const { placed } = await searchParams;
  await connectDB();
  // the handover code is only ever shown to the customer it belongs to
  const orders = await Order.find({ user: user.id }).select("+handoverCode").sort({ createdAt: -1 }).lean();

  return (
    <>
      <div className="head">
        <h1>My Orders</h1>
        <form action={logoutAction}>
          <button className="btn quiet">
            <LogOut size={16} aria-hidden="true" /> Log Out
          </button>
        </form>
      </div>
      {typeof placed === "string" && /^\d+$/.test(placed) && (
        <div className="success" role="status">
          <CircleCheck size={22} aria-hidden="true" />
          <p>
            <strong>Order #{placed} is placed.</strong> We’ll call +91&nbsp;{user.phone} before we deliver.
          </p>
        </div>
      )}
      {orders.length ? (
        <ul className="orders">
          {orders.map((o) => {
            const step = STEPS.indexOf(o.status);
            return (
              <li key={String(o._id)} className="panel order">
                <div className="order-head">
                  <div>
                    <h2>Order #{o.number}</h2>
                    <p className="muted">
                      Placed {day(o.createdAt)}
                      {step >= 0 && step < 3 && ` · Arrives by ${day(o.deliverBy)}`}
                    </p>
                  </div>
                  <strong className="order-amount">{inr(o.total)}</strong>
                </div>

                {o.status === "out_for_delivery" && o.handoverCode && (
                  <div className="handover" role="status">
                    <span>Show this code to the delivery person when your crackers arrive</span>
                    <strong className="otp-code" aria-label={`Handover code ${o.handoverCode.split("").join(" ")}`}>
                      {o.handoverCode}
                    </strong>
                  </div>
                )}

                {o.status === "cancelled" ? (
                  <p className="pill cancelled">Cancelled</p>
                ) : (
                  <ol className="track" aria-label="Order progress">
                    {STEPS.map((s, n) => (
                      <li key={s} className={n <= step ? "done" : ""} aria-current={n === step ? "step" : undefined}>
                        {STATUS_LABEL[s]}
                      </li>
                    ))}
                  </ol>
                )}

                <ul className="items">
                  {o.items.map((i, n) => (
                    <li key={n}>
                      <span>
                        {i.qty} × {i.name} <small>{i.unit}</small>
                      </span>
                      <span className="num">{inr(i.price! * i.qty!)}</span>
                    </li>
                  ))}
                </ul>
                <p className="order-foot">
                  <MapPin size={16} aria-hidden="true" />
                  <span>
                    {o.address.line}
                    {o.address.landmark && `, near ${o.address.landmark}`} – {o.address.pincode}
                  </span>
                </p>
                <p className="muted">Pay cash or UPI when it arrives.</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty panel">
          <Package size={36} strokeWidth={1.5} aria-hidden="true" />
          <h2>No Orders Yet</h2>
          <p className="muted">Your Diwali order will show up here.</p>
          <Link href="/" className="btn primary">
            Browse Crackers
          </Link>
        </div>
      )}
    </>
  );
}
