"use client";

import { Minus, Plus } from "lucide-react";
import { useSyncExternalStore } from "react";

/** product id → quantity, kept in this browser until the order is placed. */
type Cart = Record<string, number>;

const KEY = "fatake-cart";
const listeners = new Set<() => void>();
let snapshot: Cart | null = null;

function read(): Cart {
  if (!snapshot) {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      snapshot = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch {
      snapshot = {};
    }
  }
  return snapshot!;
}

function write(cart: Cart) {
  snapshot = cart;
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // another tab changed the cart
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** null during the server render, before this browser's cart is known. */
export const useCart = () => useSyncExternalStore(subscribe, read, () => null);

export function setQty(id: string, qty: number) {
  const next = { ...read() };
  if (qty > 0) next[id] = qty;
  else delete next[id];
  write(next);
}

export const clearCart = () => write({});

export function Stepper({ id, name, max }: { id: string; name: string; max: number }) {
  const cart = useCart();
  const qty = cart?.[id] ?? 0;
  if (!qty)
    return (
      <button type="button" className="btn add" onClick={() => setQty(id, 1)} aria-label={`Add ${name}`}>
        <Plus size={16} strokeWidth={2.25} aria-hidden="true" /> Add
      </button>
    );
  return (
    <div className="stepper">
      <button type="button" onClick={() => setQty(id, qty - 1)} aria-label={`One less ${name}`}>
        <Minus size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => setQty(id, qty + 1)} disabled={qty >= max} aria-label={`One more ${name}`}>
        <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </div>
  );
}
