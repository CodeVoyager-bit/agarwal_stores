"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { inr, type ShopItem } from "@/lib/format";
import { Stepper, useCart } from "./cart";
import { CategoryIcon, ProductArt } from "./category";

export function Catalog({ items, categories, initialQuery, initialCategory }: { items: ShopItem[]; categories: string[]; initialQuery: string; initialCategory: string }) {
  const cart = useCart();
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(categories.includes(initialCategory) ? initialCategory : "");
  const query = q.trim().toLowerCase();
  const shown = items.filter((i) => (!category || i.category === category) && i.name.toLowerCase().includes(query));
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
            placeholder="Search crackers, e.g. anar…"
            aria-label="Search crackers"
            autoComplete="off"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              sync(e.target.value, category);
            }}
          />
        </label>
        <div className="chips" role="group" aria-label="Category">
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
              {c || "All"}
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
                {c}
              </h2>
              <span className="muted">{list.length === 1 ? "1 item" : `${list.length} items`}</span>
            </div>
            <ul className="grid">
              {list.map((i) => (
                <li key={i.id} className={i.stock > 0 ? "card" : "card sold-out"}>
                  <div className="card-art">
                    <ProductArt category={i.category} image={i.image} />
                    {i.mrp > i.price && <span className="off">{Math.round((1 - i.price / i.mrp) * 100)}% Off</span>}
                  </div>
                  <div className="card-body">
                    <h3>{i.name}</h3>
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
                    {i.stock > 0 ? <Stepper id={i.id} name={i.name} max={i.stock} /> : <p className="oos">Out of Stock</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {!shown.length && (
        <div className="empty">
          <p>{items.length ? "Nothing matches your search. Try another name or pick All." : "The catalog is being stocked. Please check back soon."}</p>
        </div>
      )}

      {count > 0 && (
        <Link href="/cart" className="cartbar">
          <span>
            <small>{count === 1 ? "1 item" : `${count} items`}</small>
            <strong>{inr(total)}</strong>
          </span>
          <span className="cartbar-cta">
            View Cart <ArrowRight size={18} aria-hidden="true" />
          </span>
        </Link>
      )}
    </>
  );
}
