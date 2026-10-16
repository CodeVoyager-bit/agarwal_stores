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
  // who is carrying how much
  const byPerson = new Map<string, number>();
  for (const o of waiting) byPerson.set(o.cash!.collectedBy ?? "?", (byPerson.get(o.cash!.collectedBy ?? "?") ?? 0) + o.cash!.collected!);

  return (
    <>
      <h1>Cash</h1>
      <p className="muted">Cash the delivery team collected, and what reached the shop’s counter.</p>
      <div className="stats">
        <div className={waiting.length ? "alert" : ""}>
          <strong>{inr(waiting.reduce((n, o) => n + o.cash!.collected!, 0))}</strong>
          <span>with the delivery team</span>
        </div>
        <div>
          <strong>{inr(counted.reduce((n, o) => n + o.cash!.received!, 0))}</strong>
          <span>counted at shop (last 100)</span>
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

      <h2>To Hand In</h2>
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
                  <small>{when(o.cash!.collectedAt!)}</small>
                </td>
                <td data-label="Amount" className="num">
                  <strong>{inr(o.cash!.collected!)}</strong>
                </td>
                <td data-label="Count it">
                  <ActionForm action={receiveCashAction} submit="Received" className="inline-form">
                    <input type="hidden" name="id" value={String(o._id)} />
                    <input name="received" inputMode="numeric" pattern="\d+" required defaultValue={o.cash!.collected!} aria-label={`Rupees received for order ${o.number}`} autoComplete="off" />
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty panel">No cash waiting. Everything collected has been counted.</p>
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
