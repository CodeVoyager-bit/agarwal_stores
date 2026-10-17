import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Audit, connectDB } from "@/lib/db";
import { when } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.common.adminTabs.audit} · ${t.common.adminTabs.label}` };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function AuditLog({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string }> }) {
  await requireStaff("audit", "/admin/audit");
  const params = await searchParams;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const s = t.staff.audit;
  const KINDS = s.kinds;
  const kind = typeof params.kind === "string" && params.kind in KINDS ? params.kind : "";
  // ?q=a&q=b arrives as a list: only a single search is read
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60);
  await connectDB();
  const rx = q && new RegExp(escape(q), "i");
  const entries = await Audit.find({ ...(kind && { action: new RegExp(`^${kind}\\.`) }), ...(rx && { $or: [{ actor: rx }, { target: rx }, { detail: rx }] }) })
    .sort({ at: -1 })
    .limit(300)
    .lean();

  return (
    <>
      <h1>{t.common.adminTabs.audit}</h1>
      <p className="muted">{s.intro}</p>
      <nav className="chips" aria-label={s.kind}>
        {Object.entries(KINDS).map(([k, label]) => (
          <Link key={k} href={`/admin/audit?kind=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={k === kind ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <form className="filter" role="search">
        <input type="hidden" name="kind" value={kind} />
        <input type="search" name="q" defaultValue={q} placeholder={s.search} aria-label={s.searchLabel} autoComplete="off" />
        <button className="btn">{t.common.words.search}</button>
      </form>
      <p className="muted">{entries.length === 300 ? s.latest : fill(s.entries, { n: entries.length })}</p>
      {entries.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>{s.when}</th>
              <th>{s.who}</th>
              <th>{s.what}</th>
              <th>{s.details}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={String(e._id)}>
                <td data-label={s.when}>{when(e.at, lang)}</td>
                <td data-label={s.who}>{e.actor}</td>
                <td data-label={s.what}>
                  <strong>{s.actions[e.action ?? ""] ?? e.action}</strong>
                  <small>
                    {e.target} <code>{e.action}</code>
                  </small>
                </td>
                <td data-label={s.details}>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
