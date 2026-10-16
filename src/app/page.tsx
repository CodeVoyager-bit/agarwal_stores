import { IndianRupee, PhoneCall, Truck } from "lucide-react";
import { Catalog } from "@/components/catalog";
import { Rangoli } from "@/components/rangoli";
import { categoriesOf, shopItems } from "@/lib/db";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const [items, params] = await Promise.all([shopItems(), searchParams]);
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow" lang="hi">
            शुभ दीपावली
          </p>
          <h1>Diwali Crackers, Delivered to Your Door</h1>
          <p className="lead">Pick your crackers here. We bring them home in 3–4 days.</p>
          <ul className="promises">
            <li>
              <Truck size={18} aria-hidden="true" /> Delivery in 3–4 days
            </li>
            <li>
              <IndianRupee size={18} aria-hidden="true" /> Pay cash or UPI on delivery
            </li>
            <li>
              <PhoneCall size={18} aria-hidden="true" /> We call before we come
            </li>
          </ul>
        </div>
        <Rangoli className="rangoli" />
      </section>
      <Catalog items={items} categories={categoriesOf(items)} initialQuery={typeof params.q === "string" ? params.q : ""} initialCategory={typeof params.c === "string" ? params.c : ""} />
    </>
  );
}
