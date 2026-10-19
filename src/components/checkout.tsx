"use client";

import { IndianRupee, ShoppingBag, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { placeOrderAction } from "@/lib/actions";
import { inr, type ShopItem } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { rich } from "@/lib/i18n/rich";
import { goesWith } from "@/lib/pairs";
import { offlineSafe } from "./action-form";
import { bookingKey, clearCart, pruneCart, setQty, Stepper, useCart } from "./cart";
import { ProductCard } from "./catalog";
import { PhoneField } from "./login-form";
import { ProductArt } from "./category";
import { useMsg, useT } from "./i18n";

type Address = { id: string; label: string; line: string; landmark: string; pincode: string; phone: string };
type Customer = { phone: string; name: string; addresses: Address[] };

/** React empties a form after each submit; after a refused order the address must still be there. */
const keepTyped = (e: React.FormEvent) => e.preventDefault();

/** A short, stable code for the cart's items and quantities. */
const fingerprint = (lines: { id: string; qty: number }[]) =>
  [...lines.map((l) => `${l.id}:${l.qty}`).join(",")].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381).toString(36);

export function CartView({ items, customer, deliveryDays, popular }: { items: ShopItem[]; customer: Customer | null; deliveryDays: number; popular: string[] }) {
  const cart = useCart();
  const router = useRouter();
  const t = useT();
  const tr = useMsg();
  const w = t.shop.cart;
  // products taken off sale since they were added leave the cart, and its count
  useEffect(() => {
    // unpriced ones too: placeOrder refuses them, and refreshing wouldn't drop the line
    if (cart) pruneCart(new Set(items.filter((i) => i.price > 0).map((i) => i.id)));
  }, [cart, items]);
  const [state, action, pending] = useActionState(offlineSafe(placeOrderAction), null);
  // the default (first saved) address, or a new one when there are none
  const [deliverTo, setDeliverTo] = useState(customer?.addresses[0]?.id ?? "new");
  // read in the browser only: the server has no saved booking id
  const [key, setKey] = useState("");
  useEffect(() => setKey(bookingKey()), []);

  // prices changed since the cart opened: fresh prices from the server, the typed address stays in the form
  useEffect(() => {
    if (state?.error?.startsWith("Prices have changed")) router.refresh();
  }, [state, router]);
  useEffect(() => {
    if (state?.number) {
      clearCart();
      router.replace(`/orders?placed=${state.number}`);
    }
  }, [state, router]);

  if (!cart) return null;
  const chosen = customer?.addresses.find((a) => a.id === deliverTo);
  const lines = items.filter((i) => cart[i.id]).map((i) => ({ ...i, qty: cart[i.id] }));
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const saved = lines.reduce((sum, l) => sum + Math.max(0, l.mrp - l.price) * l.qty, 0);
  const pieces = lines.reduce((sum, l) => sum + l.qty, 0);
  const short = lines.filter((l) => l.qty > l.stock);
  // what goes with what's in the cart, from the shelves not in it yet
  const extras = goesWith(items, [...new Set(lines.map((l) => l.category))], new Set(lines.map((l) => l.id)), popular);

  if (!lines.length)
    return (
      <div className="empty panel">
        <ShoppingBag size={36} strokeWidth={1.5} aria-hidden="true" />
        <h2>{w.empty}</h2>
        <p className="muted">{w.emptyText}</p>
        <Link href="/" className="btn primary">
          {w.browse}
        </Link>
      </div>
    );

  return (
    <div className="checkout">
      <div className="checkout-main">
        <ul className="lines panel">
          {lines.map((l) => (
            <li key={l.id}>
              <ProductArt category={l.category} image={l.image} small />
              <div className="line-name">
                <strong>{l.name}</strong>
                <small>
                  {l.unit} · {fill(w.each, { price: inr(l.price) })}
                </small>
                {l.qty > l.stock && (
                  <small className="error" role="alert">
                    {l.stock ? (
                      <>
                        {fill(w.onlyLeft, { n: l.stock })}{" "}
                        <button type="button" className="link" onClick={() => setQty(l.id, l.stock)}>
                          {fill(w.changeTo, { n: l.stock })}
                        </button>
                      </>
                    ) : (
                      w.gone
                    )}
                  </small>
                )}
              </div>
              <div className="line-qty">
                <Stepper id={l.id} name={l.name} max={l.stock} />
                <button type="button" className="icon-btn" onClick={() => setQty(l.id, 0)} aria-label={fill(w.remove, { name: l.name })}>
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
              <strong className="line-total">{inr(l.price * l.qty)}</strong>
            </li>
          ))}
        </ul>
        {extras.length > 0 && (
          <section aria-labelledby="extras">
            <div className="shelf-head">
              <h2 id="extras">{w.extras}</h2>
            </div>
            <ul className="grid compact">
              {extras.map((m, n) => (
                <ProductCard key={m.id} item={m} n={n} />
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="summary panel">
        <h2>{w.summary}</h2>
        <dl className="rows">
          <div>
            <dt>{pieces === 1 ? t.shop.item : fill(t.shop.items, { n: pieces })}</dt>
            <dd>{inr(total + saved)}</dd>
          </div>
          {saved > 0 && (
            <div className="saved">
              <dt>{t.shop.youSave}</dt>
              <dd>−{inr(saved)}</dd>
            </div>
          )}
          <div className="grand">
            <dt>{w.total}</dt>
            <dd>{inr(total)}</dd>
          </div>
        </dl>
        <ul className="assurances">
          <li>
            <Truck size={18} aria-hidden="true" /> {fill(t.shop.assure.door, { days: deliveryDays })}
          </li>
          <li>
            <IndianRupee size={18} aria-hidden="true" /> {t.shop.assure.pay}
          </li>
        </ul>

        {customer ? (
          <form action={action} className="fields" onReset={keepTyped}>
            <h3>{w.details}</h3>
            <input type="hidden" name="cart" value={JSON.stringify(lines.map((l) => ({ id: l.id, qty: l.qty })))} />
            {/* a changed cart is a new booking: the id carries what's in it, so a retry finds only the same cart */}
            <input type="hidden" name="key" value={key && `${key}-${fingerprint(lines)}`} />
            {/* what the customer sees; the server refuses the booking if prices moved since (lib/orders.ts) */}
            <input type="hidden" name="total" value={total} />
            <label>
              {w.name}
              <input name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={customer.name} />
            </label>
            {customer.addresses.length > 0 && (
              <fieldset className="deliver-to">
                <legend>{w.deliverTo}</legend>
                {[...customer.addresses, { id: "new" } as const].map((a) => (
                  <label key={a.id} className="address-option">
                    <input type="radio" name="addressId" value={a.id} checked={deliverTo === a.id} onChange={() => setDeliverTo(a.id)} />
                    {!("line" in a) ? (
                      <span>
                        <strong>{w.newAddress}</strong>
                        <small>{w.newAddressNote}</small>
                      </span>
                    ) : (
                      <span>
                        <strong>{w.labels[a.label] ?? a.label}</strong>
                        <small>
                          {a.line}
                          {a.landmark && fill(w.near, { landmark: a.landmark })} – {a.pincode}
                        </small>
                        {a.phone && <small>{fill(w.phone, { phone: a.phone })}</small>}
                      </span>
                    )}
                  </label>
                ))}
              </fieldset>
            )}
            {deliverTo === "new" && (
              <>
                <input type="hidden" name="addressId" value="new" />
                <label>
                  {w.fullAddress}
                  <textarea name="line" required minLength={10} maxLength={300} rows={3} autoComplete="street-address" placeholder={w.addressHint} />
                </label>
                <div className="two">
                  <label>
                    <span>
                      {w.landmark} <small>{t.common.words.optional}</small>
                    </span>
                    <input name="landmark" maxLength={120} autoComplete="off" placeholder={w.landmarkHint} />
                  </label>
                  <label>
                    {w.pincode}
                    <input name="pincode" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="postal-code" placeholder="226001" />
                  </label>
                </div>
                <PhoneField label={w.mobile} initial={customer.phone} />
                <p className="note">{w.mobileNote}</p>
                <label>
                  {w.saveAs}
                  {/* stored in English; shown in the reader's language */}
                  <select name="label" defaultValue={customer.addresses.length ? "Other" : "Home"}>
                    {["Home", "Work", "Other"].map((l) => (
                      <option key={l} value={l}>
                        {w.labels[l]}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {/* a saved address from before numbers were kept */}
            {chosen && !chosen.phone && <PhoneField key={chosen.id} label={w.mobile} />}
            <label className="f-check agree">
              <input type="checkbox" name="agree" value="yes" required />
              <span>
                {rich(w.agree, {
                  terms: (s) => (
                    <Link href="/terms" target="_blank">
                      {s}
                    </Link>
                  ),
                  privacy: (s) => (
                    <Link href="/privacy" target="_blank">
                      {s}
                    </Link>
                  ),
                })}
              </span>
            </label>
            <p className="note">{w.bookingNote}</p>
            {state?.error && (
              <p role="alert" className="error">
                {tr(state.error)}
              </p>
            )}
            <button className="btn primary big" disabled={pending || short.length > 0 || !!state?.number}>
              {pending ? w.booking : fill(w.book, { total: inr(total) })}
            </button>
          </form>
        ) : (
          <div className="fields">
            <p className="muted">{w.loginNote}</p>
            <Link href="/login?next=/cart" className="btn primary big">
              {w.logIn}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
