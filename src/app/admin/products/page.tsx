import type { Metadata } from "next";
import { PhotoInput } from "@/components/photo-input";
import { StockImport } from "@/components/stock-import";
import { saveProductAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { CATEGORIES, connectDB, Product } from "@/lib/db";

export const metadata: Metadata = { title: "Inventory · Admin" };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
type Editable = { _id?: unknown; name?: string; category?: string; unit?: string | null; mrp?: number; price?: number; stock?: number; image?: string | null; description?: string | null; maker?: string | null; active?: boolean | null };

/** One product's inputs; the same fields add a new product and edit a listed one. */
function Fields({ p }: { p: Editable }) {
  const whole = { inputMode: "numeric" as const, pattern: "\\d+", required: true, autoComplete: "off" };
  return (
    <>
      {p._id ? <input type="hidden" name="id" value={String(p._id)} /> : null}
      <label className="f-name">
        <span>Name</span>
        <input name="name" required maxLength={120} autoComplete="off" defaultValue={p.name} />
      </label>
      <label>
        <span>Category</span>
        <input name="category" list="categories" required autoComplete="off" defaultValue={p.category} />
      </label>
      <label>
        <span>Pack</span>
        <input name="unit" maxLength={40} placeholder="10 pcs…" autoComplete="off" defaultValue={p.unit ?? ""} />
      </label>
      <label>
        <span>MRP ₹</span>
        <input name="mrp" {...whole} defaultValue={p.mrp} />
      </label>
      <label>
        <span>Price ₹</span>
        <input name="price" {...whole} defaultValue={p.price} />
      </label>
      <label>
        <span>Stock</span>
        <input name="stock" {...whole} defaultValue={p.stock} />
      </label>
      {/* the stock when the page was drawn: the server applies only the difference typed */}
      {p._id ? <input type="hidden" name="stockWas" value={p.stock} /> : null}
      <div className="f-image">
        <PhotoInput current={p.image} />
      </div>
      <label className="f-check">
        <input name="active" type="checkbox" defaultChecked={p.active ?? true} />
        <span>On sale</span>
      </label>
    </>
  );
}

/** The maker and the product page's write-up, folded away so the list stays one line per product. */
function Description({ p }: { p: Editable }) {
  const summary = [p.maker && `Maker: ${p.maker}`, p.description && `Description: ${p.description}`].filter(Boolean).join(" · ");
  return (
    <details className="f-desc">
      <summary>{summary || "Add the maker and a description"}</summary>
      <label>
        <span>Maker’s name and address (shown on the product page, as the law asks)</span>
        <input name="maker" maxLength={200} autoComplete="off" defaultValue={p.maker ?? ""} placeholder="Standard Fireworks, Sivakasi, Tamil Nadu" />
      </label>
      <label>
        <span>Description (shown on the product page)</span>
        <textarea name="description" rows={4} maxLength={1000} defaultValue={p.description ?? ""} placeholder="What it does, colours, how long it lasts, how high it goes…" />
      </label>
    </details>
  );
}

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  await requireStaff("catalog", "/admin/products");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 60);
  const low = params.low === "1";
  await connectDB();
  const products = await Product.find({
    ...(q && { $or: [{ name: new RegExp(escape(q), "i") }, { category: new RegExp(escape(q), "i") }] }),
    ...(low && { active: true, stock: { $lte: 5 } }),
  })
    .sort({ category: 1, price: 1 })
    .lean();

  return (
    <>
      <h1>Inventory</h1>
      <datalist id="categories">
        {CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <StockImport />

      <details className="panel add-product">
        <summary>Add a Product</summary>
        <form action={saveProductAction} className="inv-row">
          <Fields p={{}} />
          <button className="btn primary">Add Product</button>
          <Description p={{}} />
        </form>
      </details>

      <form className="filter" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Search name or category…" autoComplete="off" aria-label="Search products" />
        <label className="f-check">
          <input type="checkbox" name="low" value="1" defaultChecked={low} /> Low stock only
        </label>
        <button className="btn">Search</button>
      </form>
      <p className="muted">
        {products.length} {products.length === 1 ? "product" : "products"} · edit a row and press Save. Stock 5 or less is marked.
      </p>

      <div className="inventory">
        {products.map((p) => (
          <form key={String(p._id)} action={saveProductAction} className={`inv-row${p.stock <= 5 ? " low" : ""}${p.active ? "" : " off"}`}>
            <Fields p={p} />
            <button className="btn small">Save</button>
            <Description p={p} />
          </form>
        ))}
      </div>
    </>
  );
}
