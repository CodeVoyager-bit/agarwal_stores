"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { inr, type ShopItem } from "@/lib/format";
import { catName, fill } from "@/lib/i18n";
import { pruneCart, Stepper, useCart } from "./cart";
import { CategoryIcon, ProductArt } from "./category";
import { useT } from "./i18n";

/** Words people type for each shelf that its products' names may not have ("anar" finds Flower Pots), in Latin and Devanagari. */
const ALSO_CALLED: Record<string, string> = {
  Sparklers: "phuljhadi phooljhadi fuljhadi sparkler फुलझड़ी फुलझडी फुलबाजी",
  Chakri: "chakkar chakra spinner wheel चकरी चक्री चक्कर",
  Anar: "flower pot flowerpot fountain अनार भुईनळा",
  Rockets: "rocket रॉकेट",
  Bombs: "bomb patakha pataka sutli बम बॉम्ब पटाखा फटाका सुतली",
  "Sky Shots": "aerial shot cake आसमानी आकाशी शॉट्स",
  "Kids Special": "kids children बच्चों के लिए लहान मुलांसाठी",
  "Gift Boxes": "gift box combo गिफ्ट गिफ़्ट बॉक्स",
};

export function Catalog({ items, categories, initialQuery, initialCategory }: { items: ShopItem[]; categories: string[]; initialQuery: string; initialCategory: string }) {
  const cart = useCart();
  const t = useT();
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(categories.includes(initialCategory) ? initialCategory : "");
  // NFC: a dotted letter like ड़ typed as one character or two still matches
  const query = q.trim().toLowerCase().normalize();
  // every word typed must be in the name, the shelf, or what people call that shelf
  const words = query.split(/\s+/).filter(Boolean);
  const shown = items.filter((i) => {
    const text = `${i.name} ${i.category} ${catName(t, i.category)} ${ALSO_CALLED[i.category] ?? ""}`.toLowerCase().normalize();
    return (!category || i.category === category) && words.every((w) => text.includes(w));
  });
  useEffect(() => {
    if (cart) pruneCart(new Set(items.map((i) => i.id)));
  }, [cart, items]);
  const count = Object.values(cart ?? {}).reduce((a, b) => a + b, 0);
  const total = items.reduce((sum, i) => sum + (cart?.[i.id] ?? 0) * i.price, 0);

  // search and category live in the address, so Back from the cart returns to the same view
  function sync(nextQ: string, nextCategory: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextCategory) params.set("c", nextCategory);
    window.history.replaceState(null, "", params.size ? `?${params}` : "/");
  }

  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            name="q"
            placeholder={t.common.search.placeholder}
            aria-label={t.common.search.label}
            autoComplete="off"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              sync(e.target.value, category);
            }}
          />
        </label>
        <div className="chips" role="group" aria-label={t.shop.catalog.category}>
          {["", ...categories].map((c) => (
            <button
              type="button"
              key={c || "all"}
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                sync(q, c);
              }}
            >
              {c && <CategoryIcon category={c} size={16} />}
              {c ? catName(t, c) : t.shop.catalog.all}
            </button>
          ))}
        </div>
      </div>

      {categories
        .map((c) => ({ c, list: shown.filter((i) => i.category === c) }))
        .filter(({ list }) => list.length)
        .map(({ c, list }) => (
          <section key={c} className="shelf" aria-labelledby={`cat-${c}`}>
            <div className="shelf-head">
              <h2 id={`cat-${c}`}>
                <span className="shelf-icon">
                  <CategoryIcon category={c} size={20} />
                </span>
                {catName(t, c)}
              </h2>
              <span className="muted">{list.length === 1 ? t.shop.item : fill(t.shop.items, { n: list.length })}</span>
            </div>
            <ul className="grid">
              {list.map((i, n) => (
                <ProductCard key={i.id} item={i} n={n} />
              ))}
            </ul>
          </section>
        ))}

      {!shown.length && (
        <div className="empty">
          <p>{items.length ? t.shop.catalog.noMatch : t.shop.catalog.stocking}</p>
        </div>
      )}

      {count > 0 && (
        <Link href="/cart" className="cartbar">
          <span>
            <small>{count === 1 ? t.shop.item : fill(t.shop.items, { n: count })}</small>
            <strong>{inr(total)}</strong>
          </span>
          <span className="cartbar-cta">
            {t.shop.catalog.viewCart} <ArrowRight size={18} aria-hidden="true" />
          </span>
        </Link>
      )}
    </>
  );
}

/** One product on a shelf. The whole card opens its page (the name's link covers it); Add sits above. */
export function ProductCard({ item: i, n }: { item: ShopItem; n: number }) {
  const t = useT();
  const off = Math.round((1 - i.price / i.mrp) * 100);
  return (
    <li className={i.stock > 0 ? "card" : "card sold-out"} style={{ "--i": String(Math.min(n, 6)) } as React.CSSProperties}>
      <div className="card-art">
        <ProductArt category={i.category} image={i.image} />
        {off > 0 && <span className="off">{fill(t.shop.off, { n: off })}</span>}
      </div>
      <div className="card-body">
        <h3>
          <Link href={`/product/${i.id}`} className="card-link">
            {i.name}
          </Link>
        </h3>
        <p className="unit">{i.unit}</p>
        <p className="price">
          <strong>{inr(i.price)}</strong>
          {i.mrp > i.price && (
            <s>
              <span className="sr-only">MRP </span>
              {inr(i.mrp)}
            </s>
          )}
        </p>
        {i.stock > 0 ? <Stepper id={i.id} name={i.name} max={i.stock} /> : <p className="oos">{t.shop.outOfStock}</p>}
      </div>
    </li>
  );
}
