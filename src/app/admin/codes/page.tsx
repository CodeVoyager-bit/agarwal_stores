import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { CodeLog, connectDB, User } from "@/lib/db";
import { locale, translateMessage } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const tabs = (await getT()).common.adminTabs;
  return { title: `${tabs.codes} · ${tabs.label}` };
}

/** Who asked for a login code, why, and whether it went: the last 30 days (lib/db.ts CodeLog). */
export default async function OtpLog({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("customers", "/admin/codes");
  const { q: raw } = await searchParams;
  const q = (typeof raw === "string" ? raw : "").trim().toLowerCase().slice(0, 60);
  await connectDB();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  // midnight in India today, whatever time zone the server runs in
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30");
  const match = q ? { to: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {};
  const [entries, week, t, lang] = await Promise.all([
    CodeLog.find(match).sort({ at: -1 }).limit(300).lean(),
    CodeLog.find({ at: { $gte: weekAgo } }, "to at problem").lean(),
    getT(),
    getLang(),
  ]);
  // who has an account now: a sign-up code that became an account, or one that never did
  const tos = [...new Set(entries.map((e) => e.to))];
  const accounts = await User.find({ $or: [{ phone: { $in: tos } }, { email: { $in: tos } }] }, "name phone email").lean();
  const account = new Map(accounts.flatMap((a) => [a.phone, a.email].filter(Boolean).map((key) => [key!, a.name])));
  const w = t.staff.codes;
  const when = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  return (
    <>
      <h1>{t.common.adminTabs.codes}</h1>
      <p className="muted">{w.intro}</p>
      <div className="stats">
        <div>
          <strong>{week.filter((e) => !e.problem && e.at >= today).length}</strong>
          <span>{w.today}</span>
        </div>
        <div>
          <strong>{week.filter((e) => !e.problem).length}</strong>
          <span>{w.week}</span>
        </div>
        <div className={week.some((e) => e.problem) ? "alert" : undefined}>
          <strong>{week.filter((e) => e.problem).length}</strong>
          <span>{w.failed}</span>
        </div>
        <div>
          <strong>{new Set(week.map((e) => e.to)).size}</strong>
          <span>{w.people}</span>
        </div>
      </div>
      <form className="filter" role="search">
        <input type="search" name="q" defaultValue={q} placeholder={w.search} aria-label={w.searchLabel} autoComplete="off" />
        <button className="btn">{t.common.words.search}</button>
      </form>
      {entries.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>{w.cols.when}</th>
              <th>{w.cols.to}</th>
              <th>{w.cols.why}</th>
              <th>{w.cols.result}</th>
              <th>{w.cols.account}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={String(e._id)}>
                <td data-label={w.cols.when}>{when.format(e.at)}</td>
                <td data-label={w.cols.to}>
                  <strong>{e.by === "phone" ? `+91 ${e.to}` : e.to}</strong>
                </td>
                <td data-label={w.cols.why}>{w.purposes[e.purpose] ?? e.purpose}</td>
                <td data-label={w.cols.result}>
                  {e.problem ? <span className="late">{translateMessage(e.problem, t.messages)}</span> : <span className="pill delivered">{w.sent}</span>}
                </td>
                <td data-label={w.cols.account}>{account.has(e.to) ? account.get(e.to) || w.hasAccount : <span className="muted">{w.noAccount}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">{w.none}</p>
      )}
    </>
  );
}
