import { Download, IndianRupee, PhoneCall, Truck } from "lucide-react";
import { Catalog } from "@/components/catalog";
import { AppLink } from "@/components/install-app";
import { Rangoli } from "@/components/rangoli";
import { categoriesOf, shopItems } from "@/lib/db";
import { fill } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";
import { shopDetails } from "@/lib/legal";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; c?: string; deleted?: string }> }) {
  const [items, params, t, lang, shop] = await Promise.all([shopItems(), searchParams, getT(), getLang(), shopDetails()]);
  const h = t.common.home;
  const days = { from: shop.deliveryFrom, to: shop.deliveryTo };
  return (
    <>
      {params.deleted !== undefined && (
        <p className="success" role="status">
          {h.deleted}
        </p>
      )}
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow" lang={lang === "mr" ? "mr" : "hi"}>
            {h.greeting}
          </p>
          <h1>{h.title}</h1>
          <p className="lead">{fill(h.lead, days)}</p>
          <ul className="promises">
            <li>
              <Truck size={18} aria-hidden="true" /> {fill(h.days, days)}
            </li>
            <li>
              <IndianRupee size={18} aria-hidden="true" /> {h.pay}
            </li>
            <li>
              <PhoneCall size={18} aria-hidden="true" /> {h.call}
            </li>
          </ul>
          <AppLink className="btn app-cta">
            <Download size={18} aria-hidden="true" /> {h.app}
          </AppLink>
        </div>
        <Rangoli className="rangoli" />
      </section>
      <Catalog items={items} categories={categoriesOf(items)} initialQuery={typeof params.q === "string" ? params.q : ""} initialCategory={typeof params.c === "string" ? params.c : ""} />
    </>
  );
}
