import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { PhotoInput } from "@/components/photo-input";
import { StockImport } from "@/components/stock-import";
import { saveProductAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { CATEGORIES, connectDB, Product } from "@/lib/db";
import { catName, fill } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/dict";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const tabs = (await getT()).common.adminTabs;
  return { title: `${tabs.inventory} · ${tabs.label}` };
}

type Words = Dict["catalog"]["products"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
type Editable = { _id?: unknown; name?: string; category?: string; unit?: string | null; mrp?: number; price?: number; stock?: number; image?: string | null; description?: string | null; maker?: string | null; active?: boolean | null };

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
  const summary = [p.maker && fill(w.maker, { text: p.maker }), p.description && fill(w.description, { text: p.description })].filter(Boolean).join(" · ");
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
    </details>
  );
}

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  await requireStaff("catalog", "/admin/products");
  const params = await searchParams;
  // ?q=a&q=b arrives as a list: only a single search is read
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60);
  const low = params.low === "1";
  const t = await getT();
  const w = t.catalog.products;
  await connectDB();
  const products = await Product.find({
    ...(q && { $or: [{ name: new RegExp(escape(q), "i") }, { category: new RegExp(escape(q), "i") }] }),
    ...(low && { active: true, stock: { $lte: 5 } }),
  })
    .sort({ category: 1, price: 1 })
    .lean();

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

      <form className="filter" role="search">
        <input type="search" name="q" defaultValue={q} placeholder={w.searchHint} autoComplete="off" aria-label={w.searchLabel} />
        <label className="f-check">
          <input type="checkbox" name="low" value="1" defaultChecked={low} /> {w.lowOnly}
        </label>
        <button className="btn">{t.common.words.search}</button>
      </form>
      <p className="muted">
        {fill(products.length === 1 ? w.countOne : w.countMany, { n: products.length })}
      </p>

      <div className="inventory">
        {products.map((p) => (
          <ActionForm key={String(p._id)} action={saveProductAction} submit={t.common.words.save} small className={`inv-row${p.stock <= 5 ? " low" : ""}${p.active ? "" : " off"}`} after={<Description p={p} w={w} />}>
            <Fields p={p} w={w} />
          </ActionForm>
        ))}
      </div>
    </>
  );
}
