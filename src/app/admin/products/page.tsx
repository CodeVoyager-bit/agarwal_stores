import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { MorePhotos, PhotoInput } from "@/components/photo-input";
import { StockImport } from "@/components/stock-import";
import { saveProductAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { CATEGORIES, connectDB, Product } from "@/lib/db";
import { catName, fill } from "@/lib/i18n";
import { shopDetails } from "@/lib/legal";
import type { Dict } from "@/lib/i18n/dict";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const tabs = (await getT()).common.adminTabs;
  return { title: `${tabs.inventory} · ${tabs.label}` };
}

type Words = Dict["catalog"]["products"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
type Editable = { _id?: unknown; name?: string; category?: string; unit?: string | null; mrp?: number; price?: number; stock?: number; image?: string | null; photos?: string[] | null; description?: string | null; maker?: string | null; active?: boolean | null };

/** One product's inputs; the same fields add a new product and edit a listed one. */
function Fields({ p, w }: { p: Editable; w: Words }) {
  const whole = { inputMode: "numeric" as const, pattern: "\\d+", required: true, autoComplete: "off" };
  return (
    <>
      {p._id ? <input type="hidden" name="id" value={String(p._id)} /> : null}
      <label className="f-name">
        <span>{w.name}</span>
        <input name="name" required maxLength={120} autoComplete="off" defaultValue={p.name} />
      </label>
      <label>
        <span>{w.category}</span>
        <input name="category" list="categories" required autoComplete="off" defaultValue={p.category} />
      </label>
      <label>
        <span>{w.pack}</span>
        <input name="unit" maxLength={40} placeholder="10 pcs…" autoComplete="off" defaultValue={p.unit ?? ""} />
      </label>
      <label>
        <span>{w.mrp}</span>
        <input name="mrp" {...whole} defaultValue={p.mrp} />
      </label>
      <label>
        <span>{w.price}</span>
        <input name="price" {...whole} defaultValue={p.price} />
      </label>
      <label>
        <span>{w.stock}</span>
        <input name="stock" {...whole} defaultValue={p.stock} />
      </label>
      {/* the stock when the page was drawn: the server applies only the difference typed */}
      {p._id ? <input type="hidden" name="stockWas" value={p.stock} /> : null}
      <div className="f-image">
        <PhotoInput current={p.image} />
      </div>
      <label className="f-check">
        <input name="active" type="checkbox" defaultChecked={p.active ?? true} />
        <span>{w.onSale}</span>
      </label>
    </>
  );
}

/** The maker and the product page's write-up, folded away so the list stays one line per product. */
function Description({ p, w }: { p: Editable; w: Words }) {
  const summary = [
    p.maker && fill(w.maker, { text: p.maker }),
    p.photos?.length && fill(w.photos, { n: p.photos.length }),
    p.description && fill(w.description, { text: p.description }),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <details className="f-desc">
      <summary>{summary || w.addDetails}</summary>
      <label>
        <span>{w.makerLabel}</span>
        <input name="maker" maxLength={200} autoComplete="off" defaultValue={p.maker ?? ""} placeholder="Standard Fireworks, Sivakasi, Tamil Nadu" />
      </label>
      <label>
        <span>{w.descLabel}</span>
        <textarea name="description" rows={4} maxLength={1000} defaultValue={p.description ?? ""} placeholder={w.descHint} />
      </label>
      <MorePhotos current={p.photos ?? []} />
    </details>
  );
}

/** The lists an owner works through: what's on sale, hidden, waiting for a price, running low or out. */
const SHOWS = ["all", "sale", "hidden", "unpriced", "low", "out"] as const;
type Show = (typeof SHOWS)[number];
const only = (show: Show, lowAt: number) =>
  ({
    all: {},
    sale: { active: true, price: { $gt: 0 } },
    hidden: { active: false },
    unpriced: { price: { $lte: 0 } },
    // as the Orders page counts it: on sale and priced
    low: { active: true, price: { $gt: 0 }, stock: { $lte: lowAt } },
    out: { active: true, stock: { $lte: 0 } },
  })[show];

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; show?: string; low?: string }> }) {
  await requireStaff("catalog", "/admin/products");
  const params = await searchParams;
  // ?q=a&q=b arrives as a list: only a single search is read
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60);
  // ?low=1 is the old link for Low stock
  const show: Show = params.low === "1" ? "low" : SHOWS.find((s) => s === params.show) ?? "all";
  const { lowStock: lowAt } = await shopDetails();
  const t = await getT();
  const w = t.catalog.products;
  await connectDB();
  const search = q ? { $or: [{ name: new RegExp(escape(q), "i") }, { category: new RegExp(escape(q), "i") }] } : {};
  const [products, counts] = await Promise.all([
    Product.find({ ...search, ...only(show, lowAt) }).sort({ category: 1, price: 1 }).lean(),
    Promise.all(SHOWS.map((s) => Product.countDocuments({ ...search, ...only(s, lowAt) }))),
  ]);
  // one heading per shelf, so a long list is easy to scan
  const shelves = new Map<string, typeof products>();
  for (const p of products) shelves.set(p.category, [...(shelves.get(p.category) ?? []), p]);
  const link = (s: Show) => `/admin/products?${new URLSearchParams({ ...(s !== "all" && { show: s }), ...(q && { q }) })}`;

  return (
    <>
      <h1>{t.common.adminTabs.inventory}</h1>
      <datalist id="categories">
        {CATEGORIES.map((c) => (
          <option key={c} value={c} label={catName(t, c) === c ? undefined : catName(t, c)} />
        ))}
      </datalist>

      <StockImport />

      <details className="panel add-product">
        <summary>{w.add}</summary>
        <ActionForm action={saveProductAction} submit={w.addButton} primary className="inv-row" after={<Description p={{}} w={w} />}>
          <Fields p={{}} w={w} />
        </ActionForm>
      </details>

      <nav className="chips" aria-label={w.showLabel}>
        {SHOWS.map((s, n) => (
          <Link key={s} href={link(s)} aria-current={s === show ? "page" : undefined}>
            {w.show[s]} <small>{counts[n]}</small>
          </Link>
        ))}
      </nav>
      <form className="filter" role="search">
        {show !== "all" && <input type="hidden" name="show" value={show} />}
        <input type="search" name="q" defaultValue={q} placeholder={w.searchHint} autoComplete="off" aria-label={w.searchLabel} />
        <button className="btn">{t.common.words.search}</button>
      </form>
      <p className="muted">
        {fill(products.length === 1 ? w.countOne : w.countMany, { n: products.length, low: lowAt })}
      </p>

      {[...shelves].map(([shelf, list]) => (
        <section key={shelf} className="inv-shelf">
          <h2>
            {catName(t, shelf)} <small>{list.length}</small>
          </h2>
          <div className="inventory">
            {list.map((p) => (
              <ActionForm key={String(p._id)} action={saveProductAction} submit={t.common.words.save} small className={`inv-row${p.price > 0 && p.stock <= lowAt ? " low" : ""}${p.active ? "" : " unlisted"}`} after={<Description p={p} w={w} />}>
                <Fields p={p} w={w} />
              </ActionForm>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
