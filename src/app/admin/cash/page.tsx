import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { receiveCashAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { inr, when } from "@/lib/format";

export const metadata: Metadata = { title: "Cash · Admin" };

export default async function Cash() {
  await requireStaff("cash", "/admin/cash");
  await connectDB();
  const [waiting, counted] = await Promise.all([
    Order.find({ "cash.collected": { $exists: true }, "cash.receivedAt": { $exists: false } }).sort({ "cash.collectedAt": 1 }).lean(),
    Order.find({ "cash.receivedAt": { $exists: true } }).sort({ "cash.receivedAt": -1 }).limit(100).lean(),
  ]);
  const short = counted.filter((o) => o.cash!.received !== o.cash!.collected);
  // UPI went straight to the shop's account: nobody carries it, it only needs checking
  const upi = (o: (typeof waiting)[number]) => o.cash!.method === "upi";
  const sum = (list: typeof waiting) => list.reduce((n, o) => n + o.cash!.collected!, 0);
  // who is carrying how much cash
  const byPerson = new Map<string, number>();
  for (const o of waiting.filter((o) => !upi(o))) byPerson.set(o.cash!.collectedBy ?? "?", (byPerson.get(o.cash!.collectedBy ?? "?") ?? 0) + o.cash!.collected!);

  return (
    <>
      <h1>Cash</h1>
      <p className="muted">Count in the cash the delivery team brings back, and check each UPI payment reached the shop’s account.</p>
      <div className="stats">
        <div className={waiting.some((o) => !upi(o)) ? "alert" : ""}>
          <strong>{inr(sum(waiting.filter((o) => !upi(o))))}</strong>
          <span>cash with the delivery team</span>
        </div>
        <div className={waiting.some(upi) ? "alert" : ""}>
          <strong>{inr(sum(waiting.filter(upi)))}</strong>
          <span>UPI to check in the account</span>
        </div>
        <div>
          <strong>{inr(counted.filter((o) => !upi(o)).reduce((n, o) => n + o.cash!.received!, 0))}</strong>
          <span>cash counted at shop (last 100)</span>
        </div>
        <div className={short.length ? "alert" : ""}>
          <strong>{short.length}</strong>
          <span>handovers with a difference</span>
        </div>
      </div>

      {byPerson.size > 0 && (
        <ul className="chips" aria-label="Cash each person holds">
          {[...byPerson].map(([person, total]) => (
            <li key={person} className="chip-static">
              {person}: <strong>{inr(total)}</strong>
            </li>
          ))}
        </ul>
      )}

      <h2>To Count or Check</h2>
      {waiting.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Collected by</th>
              <th className="num">Amount</th>
              <th>Count it</th>
            </tr>
          </thead>
          <tbody>
            {waiting.map((o) => (
              <tr key={String(o._id)}>
                <td data-label="Order">
                  <Link href={`/admin/orders/${o._id}`}>#{o.number}</Link>
                  <small>{o.name}</small>
                </td>
                <td data-label="Collected by">
                  {o.cash!.collectedBy}
                  <small>
                    {upi(o) ? "UPI · " : ""}
                    {when(o.cash!.collectedAt!)}
                  </small>
                </td>
                <td data-label="Amount" className="num">
                  <strong>{inr(o.cash!.collected!)}</strong>
                </td>
                <td data-label="Count it">
                  <ActionForm action={receiveCashAction} submit={upi(o) ? "Seen in Account" : "Received"} className="inline-form">
                    <input type="hidden" name="id" value={String(o._id)} />
                    <input name="received" inputMode="numeric" pattern="\d+" required defaultValue={o.cash!.collected!} aria-label={`Rupees received for order ${o.number}`} autoComplete="off" />
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty panel">Nothing waiting. All cash is counted and every UPI payment checked.</p>
      )}

      {counted.length > 0 && (
        <>
          <h2>Counted</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th className="num">Collected</th>
                <th className="num">Received</th>
                <th>Counted by</th>
              </tr>
            </thead>
            <tbody>
              {counted.map((o) => {
                const diff = o.cash!.collected! - o.cash!.received!;
                return (
                  <tr key={String(o._id)}>
                    <td data-label="Order">
                      <Link href={`/admin/orders/${o._id}`}>#{o.number}</Link>
                    </td>
                    <td data-label="Collected" className="num">
                      {inr(o.cash!.collected!)}
                      <small>{o.cash!.collectedBy}</small>
                    </td>
                    <td data-label="Received" className={diff ? "num late" : "num"}>
                      {inr(o.cash!.received!)}
                      {diff !== 0 && <small>{diff > 0 ? `${inr(diff)} short` : `${inr(-diff)} extra`}</small>}
                    </td>
                    <td data-label="Counted by">
                      {o.cash!.receivedBy}
                      <small>{when(o.cash!.receivedAt!)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
