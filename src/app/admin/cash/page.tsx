import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { receiveCashAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { connectDB, Order } from "@/lib/db";
import { inr, when } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.common.adminTabs.cash} · ${t.common.adminTabs.label}` };
}

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
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const s = t.staff.cash;
  const c = t.staff.cols;

  return (
    <>
      <h1>{t.common.adminTabs.cash}</h1>
      <p className="muted">{s.intro}</p>
      <div className="stats">
        <div className={waiting.some((o) => !upi(o)) ? "alert" : ""}>
          <strong>{inr(sum(waiting.filter((o) => !upi(o))))}</strong>
          <span>{s.withTeam}</span>
        </div>
        <div className={waiting.some(upi) ? "alert" : ""}>
          <strong>{inr(sum(waiting.filter(upi)))}</strong>
          <span>{s.upiCheck}</span>
        </div>
        <div>
          <strong>{inr(counted.filter((o) => !upi(o)).reduce((n, o) => n + o.cash!.received!, 0))}</strong>
          <span>{s.countedTotal}</span>
        </div>
        <div className={short.length ? "alert" : ""}>
          <strong>{short.length}</strong>
          <span>{s.diff}</span>
        </div>
      </div>

      {byPerson.size > 0 && (
        <ul className="chips" aria-label={s.perPerson}>
          {[...byPerson].map(([person, total]) => (
            <li key={person} className="chip-static">
              {person}: <strong>{inr(total)}</strong>
            </li>
          ))}
        </ul>
      )}

      <h2>{s.toCount}</h2>
      {waiting.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>{c.order}</th>
              <th>{s.collectedBy}</th>
              <th className="num">{c.amount}</th>
              <th>{s.countIt}</th>
            </tr>
          </thead>
          <tbody>
            {waiting.map((o) => (
              <tr key={String(o._id)}>
                <td data-label={c.order}>
                  <Link href={`/admin/orders/${o._id}`}>#{o.number}</Link>
                  <small>{o.name}</small>
                </td>
                <td data-label={s.collectedBy}>
                  {o.cash!.collectedBy}
                  <small>
                    {upi(o) ? "UPI · " : ""}
                    {when(o.cash!.collectedAt!, lang)}
                  </small>
                </td>
                <td data-label={c.amount} className="num">
                  <strong>{inr(o.cash!.collected!)}</strong>
                </td>
                <td data-label={s.countIt}>
                  <ActionForm action={receiveCashAction} submit={upi(o) ? s.seen : s.receive} className="inline-form">
                    <input type="hidden" name="id" value={String(o._id)} />
                    <input name="received" inputMode="numeric" pattern="\d+" required defaultValue={o.cash!.collected!} aria-label={fill(s.receivedFor, { n: o.number })} autoComplete="off" />
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty panel">{s.empty}</p>
      )}

      {counted.length > 0 && (
        <>
          <h2>{s.counted}</h2>
          <table className="table">
            <thead>
              <tr>
                <th>{c.order}</th>
                <th className="num">{s.collected}</th>
                <th className="num">{s.received}</th>
                <th>{s.countedBy}</th>
              </tr>
            </thead>
            <tbody>
              {counted.map((o) => {
                const diff = o.cash!.collected! - o.cash!.received!;
                return (
                  <tr key={String(o._id)}>
                    <td data-label={c.order}>
                      <Link href={`/admin/orders/${o._id}`}>#{o.number}</Link>
                    </td>
                    <td data-label={s.collected} className="num">
                      {inr(o.cash!.collected!)}
                      <small>{o.cash!.collectedBy}</small>
                    </td>
                    <td data-label={s.received} className={diff ? "num late" : "num"}>
                      {inr(o.cash!.received!)}
                      {diff !== 0 && <small>{diff > 0 ? fill(s.short, { amount: inr(diff) }) : fill(s.extra, { amount: inr(-diff) })}</small>}
                    </td>
                    <td data-label={s.countedBy}>
                      {o.cash!.receivedBy}
                      <small>{when(o.cash!.receivedAt!, lang)}</small>
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
