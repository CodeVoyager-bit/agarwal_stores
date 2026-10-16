"use client";

import { IndianRupee, ShoppingBag, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { placeOrderAction } from "@/lib/actions";
import { inr, type ShopItem } from "@/lib/format";
import { clearCart, setQty, Stepper, useCart } from "./cart";
import { ProductArt } from "./category";

type Customer = { phone: string; name: string; address: { line: string; landmark: string; pincode: string } | null };

export function CartView({ items, customer, deliveryDays }: { items: ShopItem[]; customer: Customer | null; deliveryDays: number }) {
  const cart = useCart();
  const router = useRouter();
  const [state, action, pending] = useActionState(placeOrderAction, null);

  useEffect(() => {
    if (state?.number) {
      clearCart();
      router.replace(`/orders?placed=${state.number}`);
    }
  }, [state, router]);

  if (!cart) return null;
  const lines = items.filter((i) => cart[i.id]).map((i) => ({ ...i, qty: cart[i.id] }));
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const saved = lines.reduce((sum, l) => sum + Math.max(0, l.mrp - l.price) * l.qty, 0);
  const pieces = lines.reduce((sum, l) => sum + l.qty, 0);
  const short = lines.filter((l) => l.qty > l.stock);

  if (!lines.length)
    return (
      <div className="empty panel">
        <ShoppingBag size={36} strokeWidth={1.5} aria-hidden="true" />
        <h2>Your Cart Is Empty</h2>
        <p className="muted">Sparklers, chakri, rockets and gift boxes are waiting.</p>
        <Link href="/" className="btn primary">
          Browse Crackers
        </Link>
      </div>
    );

  return (
    <div className="checkout">
      <ul className="lines panel">
        {lines.map((l) => (
          <li key={l.id}>
            <ProductArt category={l.category} image={l.image} small />
            <div className="line-name">
              <strong>{l.name}</strong>
              <small>
                {l.unit} · {inr(l.price)} each
              </small>
              {l.qty > l.stock && (
                <small className="error" role="alert">
                  {l.stock ? `Only ${l.stock} left. Lower the quantity.` : "Out of stock. Please remove it."}
                </small>
              )}
            </div>
            <div className="line-qty">
              <Stepper id={l.id} name={l.name} max={l.stock} />
              <button type="button" className="icon-btn" onClick={() => setQty(l.id, 0)} aria-label={`Remove ${l.name}`}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
            <strong className="line-total">{inr(l.price * l.qty)}</strong>
          </li>
        ))}
      </ul>

      <div className="summary panel">
        <h2>Order Summary</h2>
        <dl className="rows">
          <div>
            <dt>{pieces === 1 ? "1 item" : `${pieces} items`}</dt>
            <dd>{inr(total + saved)}</dd>
          </div>
          {saved > 0 && (
            <div className="saved">
              <dt>You save</dt>
              <dd>−{inr(saved)}</dd>
            </div>
          )}
          <div className="grand">
            <dt>Total</dt>
            <dd>{inr(total)}</dd>
          </div>
        </dl>
        <ul className="assurances">
          <li>
            <Truck size={18} aria-hidden="true" /> At your door in 3–{deliveryDays} days
          </li>
          <li>
            <IndianRupee size={18} aria-hidden="true" /> Pay cash or UPI when it arrives
          </li>
        </ul>

        {customer ? (
          <form action={action} className="fields">
            <h3>Delivery Details</h3>
            <input type="hidden" name="cart" value={JSON.stringify(lines.map((l) => ({ id: l.id, qty: l.qty })))} />
            <label>
              Name
              <input name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={customer.name} />
            </label>
            <label>
              Mobile
              <input value={`+91 ${customer.phone}`} readOnly aria-readonly="true" className="readonly" />
            </label>
            <label>
              Full Address
              <textarea name="line" required minLength={10} maxLength={300} rows={3} autoComplete="street-address" placeholder="House no., street, area…" defaultValue={customer.address?.line} />
            </label>
            <div className="two">
              <label>
                <span>
                  Landmark <small>(optional)</small>
                </span>
                <input name="landmark" maxLength={120} autoComplete="off" placeholder="Near temple, school…" defaultValue={customer.address?.landmark} />
              </label>
              <label>
                Pincode
                <input name="pincode" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="postal-code" placeholder="226001" defaultValue={customer.address?.pincode} />
              </label>
            </div>
            {state?.error && (
              <p role="alert" className="error">
                {state.error}
              </p>
            )}
            <button className="btn primary big" disabled={pending || short.length > 0 || !!state?.number}>
              {pending ? "Placing Order…" : `Place Order · ${inr(total)}`}
            </button>
          </form>
        ) : (
          <div className="fields">
            <p className="muted">Log in with your mobile number so we can call you about delivery.</p>
            <Link href="/login?next=/cart" className="btn primary big">
              Log In to Place Order
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
