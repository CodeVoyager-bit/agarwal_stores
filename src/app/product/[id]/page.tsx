import { IndianRupee, PhoneCall, ShieldCheck, Truck } from "lucide-react";
import { isValidObjectId } from "mongoose";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Stepper } from "@/components/cart";
import { ProductCard } from "@/components/catalog";
import { CategoryIcon, ProductArt } from "@/components/category";
import { Rows } from "@/components/legal-rows";
import { bestSellers, Product, shopItems } from "@/lib/db";
import { inr } from "@/lib/format";
import { catName, fill } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { shopDetails } from "@/lib/legal";
import { DELIVERY_DAYS } from "@/lib/orders";
import { goesWith } from "@/lib/pairs";

/** The product, its write-up, what goes with it and the rest of its shelf; once per request (the title asks too). */
const load = cache(async (id: string) => {
  // all three at once rather than the write-up after the rest
  const [items, popular, doc] = await Promise.all([shopItems(), bestSellers(), isValidObjectId(id) ? Product.findById(id, "description maker").lean() : null]);
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  return {
    item,
    description: doc?.description ?? "",
    maker: doc?.maker ?? "",
    pairs: goesWith(items, [item.category], new Set([id]), popular),
    more: items.filter((i) => i.category === item.category && i.id !== id),
  };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [found, t] = await Promise.all([load((await params).id), getT()]);
  return { title: `${found?.item.name ?? t.shop.product.notFound} · Agarwal Stores`, description: found?.description.slice(0, 160) || undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const found = await load((await params).id);
  if (!found) notFound();
  const { item, description, maker, pairs, more } = found;
  const [shop, t] = await Promise.all([shopDetails(), getT()]);
  const w = t.shop.product;
  const cat = catName(t, item.category);
  const phone = process.env.SHOP_PHONE;
  const off = Math.round((1 - item.price / item.mrp) * 100);
  const shelf = `/?c=${encodeURIComponent(item.category)}`;

  return (
    <>
      <nav className="crumbs" aria-label={w.crumbs}>
        <Link href="/">{t.common.nav.shop}</Link>
        <span aria-hidden="true">/</span>
        <Link href={shelf}>{cat}</Link>
      </nav>

      <article className={item.stock > 0 ? "product panel" : "product panel sold-out"}>
        <div className="card-art">
          <ProductArt category={item.category} image={item.image} large />
          {off > 0 && <span className="off">{fill(t.shop.off, { n: off })}</span>}
        </div>
        <div className="product-info">
          <Link href={shelf} className="product-cat">
            <CategoryIcon category={item.category} /> {cat}
          </Link>
          <h1>{item.name}</h1>
          <p className="muted">{item.unit}</p>
          <p className="price">
            <strong>{inr(item.price)}</strong>
            {item.mrp > item.price && (
              <>
                <s>
                  <span className="sr-only">MRP </span>
                  {inr(item.mrp)}
                </s>
                <span className="save">{fill(w.youSave, { amount: inr(item.mrp - item.price) })}</span>
              </>
            )}
          </p>
          {item.stock > 0 ? (
            <>
              <p className={item.stock > 10 ? "stock" : "stock low"}>{item.stock > 10 ? w.inStock : fill(w.onlyLeft, { n: item.stock })}</p>
              <Stepper id={item.id} name={item.name} max={item.stock} />
            </>
          ) : (
            <p className="oos">{t.shop.outOfStock}</p>
          )}
          {description && <p className="about">{description}</p>}
          {/* what Legal Metrology asks an online seller to show before purchase; owners fill the shop's part on /admin/shop */}
          <section aria-labelledby="details">
            <h2 id="details" className="details-title">
              {w.details}
            </h2>
            <Rows
              rows={[
                [w.netQty, item.unit],
                ["MRP", fill(w.taxes, { mrp: inr(item.mrp) })],
                [w.maker, maker],
                // Indian-made crackers only; change this if the shop ever stocks imported ones
                [w.origin, w.india],
                [w.soldBy, [shop.legalName, shop.address].filter(Boolean).join(", ")],
                [
                  w.care,
                  <>
                    {phone && (
                      <>
                        <a href={`tel:+91${phone}`}>+91 {phone}</a> ·{" "}
                      </>
                    )}
                    <Link href="/terms#contact">{w.complaints}</Link>
                  </>,
                ],
              ]}
            />
          </section>
          <ul className="assurances">
            <li>
              <Truck size={18} aria-hidden="true" /> {fill(t.shop.assure.door, { days: DELIVERY_DAYS })}
            </li>
            <li>
              <IndianRupee size={18} aria-hidden="true" /> {t.shop.assure.pay}
            </li>
            <li>
              <PhoneCall size={18} aria-hidden="true" /> {t.common.home.call}
            </li>
          </ul>
        </div>
      </article>

      {pairs.length > 0 && (
        <section className="shelf" aria-labelledby="pairs">
          <div className="shelf-head">
            <h2 id="pairs">{fill(w.pairs, { category: cat })}</h2>
          </div>
          <ul className="grid">
            {pairs.map((m, n) => (
              <ProductCard key={m.id} item={m} n={n} />
            ))}
          </ul>
        </section>
      )}

      <section className="panel safety" aria-labelledby="safety">
        <h2 id="safety">
          <ShieldCheck size={20} aria-hidden="true" /> {w.safety}
        </h2>
        <ul>
          {w.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      {more.length > 0 && (
        <section className="shelf" aria-labelledby="more">
          <div className="shelf-head">
            <h2 id="more">
              <span className="shelf-icon">
                <CategoryIcon category={item.category} size={20} />
              </span>
              {fill(w.more, { category: cat })}
            </h2>
            <Link href={shelf} className="link">
              {w.seeAll}
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
