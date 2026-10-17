"use client";

import { IndianRupee, ShoppingBag, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { placeOrderAction } from "@/lib/actions";
import { inr, type ShopItem } from "@/lib/format";
import { clearCart, setQty, Stepper, useCart } from "./cart";
import { PhoneField } from "./login-form";
import { ProductArt } from "./category";

type Address = { id: string; label: string; line: string; landmark: string; pincode: string; phone: string };
type Customer = { phone: string; name: string; addresses: Address[] };

export function CartView({ items, customer, deliveryDays }: { items: ShopItem[]; customer: Customer | null; deliveryDays: number }) {
  const cart = useCart();
  const router = useRouter();
  const [state, action, pending] = useActionState(placeOrderAction, null);
  // the default (first saved) address, or a new one when there are none
  const [deliverTo, setDeliverTo] = useState(customer?.addresses[0]?.id ?? "new");

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
            {customer.addresses.length > 0 && (
              <fieldset className="deliver-to">
                <legend>Deliver to</legend>
                {[...customer.addresses, { id: "new" } as const].map((a) => (
                  <label key={a.id} className="address-option">
                    <input type="radio" name="addressId" value={a.id} checked={deliverTo === a.id} onChange={() => setDeliverTo(a.id)} />
                    {!("line" in a) ? (
                      <span>
                        <strong>A new address</strong>
                        <small>Saved to your address book with the order</small>
                      </span>
                    ) : (
                      <span>
                        <strong>{a.label}</strong>
                        <small>
                          {a.line}
                          {a.landmark && `, near ${a.landmark}`} – {a.pincode}
                        </small>
                        {a.phone && <small>Call +91 {a.phone}</small>}
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
                  Full Address
                  <textarea name="line" required minLength={10} maxLength={300} rows={3} autoComplete="street-address" placeholder="House no., street, area…" />
                </label>
                <div className="two">
                  <label>
                    <span>
                      Landmark <small>(optional)</small>
                    </span>
                    <input name="landmark" maxLength={120} autoComplete="off" placeholder="Near temple, school…" />
                  </label>
                  <label>
                    Pincode
                    <input name="pincode" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="postal-code" placeholder="226001" />
                  </label>
                </div>
                <PhoneField label="Mobile number for delivery" initial={customer.phone} />
                <p className="note">The delivery person calls this number. It can be anyone’s at this address.</p>
                <label>
                  Save as
                  <select name="label" defaultValue={customer.addresses.length ? "Other" : "Home"}>
                    <option>Home</option>
                    <option>Work</option>
                    <option>Other</option>
                  </select>
                </label>
              </>
            )}
            {/* a saved address from before numbers were kept */}
            {chosen && !chosen.phone && <PhoneField key={chosen.id} label="Mobile number for delivery" />}
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
            <p className="muted">Log in or sign up to place your order: mobile, email or Google.</p>
            <Link href="/login?next=/cart" className="btn primary big">
              Log In to Place Order
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
