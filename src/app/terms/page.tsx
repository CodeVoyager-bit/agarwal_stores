import type { Metadata } from "next";
import Link from "next/link";
import { Rows } from "@/components/legal-rows";
import { fill, locale } from "@/lib/i18n";
import { rich } from "@/lib/i18n/rich";
import { getLang, getT } from "@/lib/i18n/server";
import { shopDetails, TERMS_VERSION } from "@/lib/legal";
import { DELIVERY_DAYS } from "@/lib/orders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.legal.terms.meta.title, description: t.legal.terms.meta.description };
}

const tags = {
  b: (s: string) => <strong>{s}</strong>,
  privacy: (s: string) => <Link href="/privacy">{s}</Link>,
  tel: (s: string) => <a href="tel:1915">{s}</a>,
  helpline: (s: string) => (
    <a href="https://consumerhelpline.gov.in" target="_blank" rel="noopener noreferrer">
      {s}
    </a>
  ),
  edaakhil: (s: string) => (
    <a href="https://edaakhil.nic.in" target="_blank" rel="noopener noreferrer">
      {s}
    </a>
  ),
};
const list = (items: string[]) => (
  <ul>
    {items.map((x) => (
      <li key={x}>{rich(x, tags)}</li>
    ))}
  </ul>
);

export default async function TermsPage() {
  const [shop, lang, t] = await Promise.all([shopDetails(), getLang(), getT()]);
  const l = t.legal;
  const s = l.terms;
  const phone = process.env.SHOP_PHONE;
  const call = phone && <a href={`tel:+91${phone}`}>+91 {phone}</a>;
  const mail = shop.email && <a href={`mailto:${shop.email}`}>{shop.email}</a>;
  const date = new Intl.DateTimeFormat(locale(lang), { dateStyle: "long", timeZone: "UTC" }).format(new Date(TERMS_VERSION));
  return (
    <article className="legal">
      <h1>{s.title}</h1>
      {l.note && <p className="muted">{l.note}</p>}
      <p className="muted">{fill(l.updated, { date, version: TERMS_VERSION })}</p>
      <nav aria-label={l.toc} className="legal-toc">
        <ol>
          {Object.entries(s.h).map(([id, title]) => (
            <li key={id}>
              <a href={`#${id}`}>{title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="who">
        <h2>{s.h.who}</h2>
        <p>{s.who}</p>
        <Rows
          rows={[
            [l.rows.legalName, shop.legalName],
            [l.rows.address, shop.address],
            [l.rows.gstin, shop.gstin],
            [l.rows.licence, shop.licence],
            [l.rows.phone, call],
            [l.rows.email, mail],
          ]}
        />
      </section>

      <section id="booking">
        <h2>{s.h.booking}</h2>
        <p>{rich(s.booking.text, tags)}</p>
        {list(s.booking.list)}
      </section>

      <section id="who-can-book">
        <h2>{s.h["who-can-book"]}</h2>
        {list(s.whoCanBook)}
      </section>

      <section id="crackers">
        <h2>{s.h.crackers}</h2>
        <p>{s.crackers}</p>
      </section>

      <section id="prices">
        <h2>{s.h.prices}</h2>
        {list(s.prices)}
      </section>

      <section id="delivery">
        <h2>{s.h.delivery}</h2>
        {list(s.delivery.map((x) => fill(x, { days: DELIVERY_DAYS })))}
      </section>

      <section id="cancel">
        <h2>{s.h.cancel}</h2>
        {list(s.cancel)}
      </section>

      <section id="refunds">
        <h2>{s.h.refunds}</h2>
        {list(s.refunds)}
      </section>

      <section id="safety">
        <h2>{s.h.safety}</h2>
        {list(s.safety.list)}
        <p>{s.safety.text}</p>
      </section>

      <section id="account">
        <h2>{s.h.account}</h2>
        <p>{rich(s.account, tags)}</p>
      </section>

      <section id="contact">
        <h2>{s.h.contact}</h2>
        <p>{s.contact.intro}</p>
        <Rows
          rows={[
            [l.rows.grievanceOfficer, shop.grievanceOfficer],
            [l.rows.phone, call],
            [l.rows.email, mail],
            [l.rows.address, `${shop.legalName}, ${shop.address}`],
          ]}
        />
        <p>{s.contact.promise}</p>
        <p>{rich(s.contact.helpline, tags)}</p>
      </section>

      <section id="law">
        <h2>{s.h.law}</h2>
        <p>{fill(s.law.courts, { courts: shop.courts })}</p>
        <p>{s.law.changes}</p>
      </section>
    </article>
  );
}
