import type { Metadata } from "next";
import Link from "next/link";
import { Rows } from "@/components/legal-rows";
import { fill, locale } from "@/lib/i18n";
import { rich } from "@/lib/i18n/rich";
import { getLang, getT } from "@/lib/i18n/server";
import { shopDetails, TERMS_VERSION } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.legal.privacy.meta.title, description: t.legal.privacy.meta.description };
}

const tags = {
  b: (s: string) => <strong>{s}</strong>,
  complaints: (s: string) => <Link href="/terms#contact">{s}</Link>,
  account: (s: string) => <Link href="/account">{s}</Link>,
  terms: (s: string) => <Link href="/terms">{s}</Link>,
};
const list = (items: string[]) => (
  <ul>
    {items.map((x) => (
      <li key={x}>{rich(x, tags)}</li>
    ))}
  </ul>
);

/*
 * Written to the Digital Personal Data Protection Act, 2023 and the IT Act, 2000. Every claim here
 * matches the code: change what's collected or who it goes to, change this page (and TERMS_VERSION).
 * The words are in lib/i18n/sections/legal.ts, in all three languages.
 */
export default async function PrivacyPage() {
  const [shop, lang, t] = await Promise.all([shopDetails(), getLang(), getT()]);
  const l = t.legal;
  const s = l.privacy;
  const date = new Intl.DateTimeFormat(locale(lang), { dateStyle: "long", timeZone: "UTC" }).format(new Date(TERMS_VERSION));
  return (
    <article className="legal">
      <h1>{s.title}</h1>
      {l.note && <p className="muted">{l.note}</p>}
      <p className="muted">{fill(l.updated, { date, version: TERMS_VERSION })}</p>

      <section id="who">
        <h2>{s.h.who}</h2>
        <p>{rich(fill(s.who, { name: shop.legalName, address: shop.address }), tags)}</p>
      </section>

      <section id="collect">
        <h2>{s.h.collect}</h2>
        <Rows rows={s.collect.rows} />
        <p>{s.collect.text}</p>
      </section>

      <section id="why">
        <h2>{s.h.why}</h2>
        {list(s.why.list)}
        <p>{s.why.text}</p>
      </section>

      <section id="consent">
        <h2>{s.h.consent}</h2>
        <p>{s.consent}</p>
      </section>

      <section id="sharing">
        <h2>{s.h.sharing}</h2>
        <Rows rows={s.sharing.rows} />
        <p>{s.sharing.text}</p>
      </section>

      <section id="google">
        <h2>{s.h.google}</h2>
        {list(s.google)}
      </section>

      <section id="device">
        <h2>{s.h.device}</h2>
        <p>{s.device}</p>
      </section>

      <section id="keep">
        <h2>{s.h.keep}</h2>
        {list(s.keep)}
      </section>

      <section id="rights">
        <h2>{s.h.rights}</h2>
        <p>{s.rights.intro}</p>
        {list(s.rights.list)}
        <p>{rich(s.rights.how, tags)}</p>
      </section>

      <section id="safety">
        <h2>{s.h.safety}</h2>
        <p>{s.safety}</p>
      </section>

      <section id="children">
        <h2>{s.h.children}</h2>
        <p>{s.children}</p>
      </section>

      <section id="changes">
        <h2>{s.h.changes}</h2>
        <p>{rich(s.changes, tags)}</p>
      </section>
    </article>
  );
}
