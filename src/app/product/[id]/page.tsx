import { IndianRupee, PhoneCall, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Stepper } from "@/components/cart";
import { ProductCard } from "@/components/catalog";
import { CategoryIcon, ProductArt } from "@/components/category";
import { shopItems } from "@/lib/db";
import { inr } from "@/lib/format";
import { DELIVERY_DAYS } from "@/lib/orders";

/** The product and the rest of its shelf; once per request (the title asks too). */
const load = cache(async (id: string) => {
  const items = await shopItems();
  const item = items.find((i) => i.id === id);
  return item && { item, more: items.filter((i) => i.category === item.category && i.id !== id) };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const found = await load((await params).id);
  return { title: `${found?.item.name ?? "Not Found"} · Agarwal Stores` };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const found = await load((await params).id);
  if (!found) notFound();
  const { item, more } = found;
  const off = Math.round((1 - item.price / item.mrp) * 100);
  const shelf = `/?c=${encodeURIComponent(item.category)}`;

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Shop</Link>
        <span aria-hidden="true">/</span>
        <Link href={shelf}>{item.category}</Link>
      </nav>

      <article className={item.stock > 0 ? "product panel" : "product panel sold-out"}>
        <div className="card-art">
          <ProductArt category={item.category} image={item.image} />
          {off > 0 && <span className="off">{off}% Off</span>}
        </div>
        <div className="product-info">
          <Link href={shelf} className="product-cat">
            <CategoryIcon category={item.category} /> {item.category}
          </Link>
          <h1>{item.name}</h1>
          <p className="muted">{item.unit}</p>
          <p className="price">
            <strong>{inr(item.price)}</strong>
            {off > 0 && (
              <>
                <s>
                  <span className="sr-only">MRP </span>
                  {inr(item.mrp)}
                </s>
                <span className="save">You save {inr(item.mrp - item.price)}</span>
              </>
            )}
          </p>
          {item.stock > 0 ? (
            <>
              <p className={item.stock > 10 ? "stock" : "stock low"}>{item.stock > 10 ? "In stock" : `Only ${item.stock} left`}</p>
              <Stepper id={item.id} name={item.name} max={item.stock} />
            </>
          ) : (
            <p className="oos">Out of Stock</p>
          )}
          <ul className="assurances">
            <li>
              <Truck size={18} aria-hidden="true" /> At your door in 3–{DELIVERY_DAYS} days
            </li>
            <li>
              <IndianRupee size={18} aria-hidden="true" /> Pay cash or UPI when it arrives
            </li>
            <li>
              <PhoneCall size={18} aria-hidden="true" /> We call before we come
            </li>
          </ul>
        </div>
      </article>

      <section className="panel safety" aria-labelledby="safety">
        <h2 id="safety">
          <ShieldCheck size={20} aria-hidden="true" /> Burn It Safely
        </h2>
        <ul>
          <li>Light it at arm’s length on open ground, away from vehicles, wires and dry leaves.</li>
          <li>Children only with an adult watching.</li>
          <li>Keep a bucket of water or sand close by.</li>
          <li>Never relight a dud. Wait 15 minutes, then soak it in water.</li>
          <li>Wear cotton clothes, not synthetic.</li>
        </ul>
      </section>

      {more.length > 0 && (
        <section className="shelf" aria-labelledby="more">
          <div className="shelf-head">
            <h2 id="more">
              <span className="shelf-icon">
                <CategoryIcon category={item.category} size={20} />
              </span>
              More {item.category}
            </h2>
            <Link href={shelf} className="link">
              See all
            </Link>
          </div>
          <ul className="grid">
            {more.map((m, n) => (
              <ProductCard key={m.id} item={m} n={n} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
