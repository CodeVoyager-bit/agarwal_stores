"use client";

import { Minus, Plus } from "lucide-react";
import { useSyncExternalStore } from "react";
import { MAX_QTY } from "@/lib/format";

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

/** Drops products no longer sold (taken off sale or deleted), so the cart count stays true. */
export function pruneCart(known: Set<string>) {
  const cart = read();
  if (Object.keys(cart).some((id) => !known.has(id))) write(Object.fromEntries(Object.entries(cart).filter(([id]) => known.has(id))));
}

/**
 * Adding from a product card or page: a copy of its picture arcs into the cart icon, which catches it with a
 * bounce and a few sparks. Skipped with reduced motion, and where there's no card (the cart page).
 */
function flyToCart(from: HTMLElement) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const art = from.closest(".card, .product")?.querySelector<HTMLElement>(".art");
  const icon = document.querySelector<HTMLElement>('.site-nav a[href="/cart"] .tab-icon');
  if (!art || !icon) return;
  const a = art.getBoundingClientRect();
  const b = icon.getBoundingClientRect();
  const ghost = art.cloneNode(true) as HTMLElement;
  ghost.classList.add("flying");
  Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.append(ghost);

  // a curve through a point above both ends (kept on screen), sampled into keyframes
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const cx = dx / 2;
  const cy = Math.max(Math.min(0, dy) - 100, 24 - (a.top + a.height / 2));
  const end = 28 / a.width;
  const frames: Keyframe[] = Array.from({ length: 21 }, (_, n) => {
    const t = n / 20;
    const x = 2 * t * (1 - t) * cx + t * t * dx;
    const y = 2 * t * (1 - t) * cy + t * t * dy;
    return { transform: `translate(${x}px, ${y}px) scale(${1 + (end - 1) * t}) rotate(${t * 200}deg)`, opacity: t < 0.8 ? 1 : 1 - (t - 0.8) * 3 };
  });
  frames[0].borderRadius = "14px";
  frames[20].borderRadius = "50%";
  ghost.animate(frames, { duration: 720, easing: "cubic-bezier(0.45, 0, 0.7, 1)" }).finished.then(() => {
    ghost.remove();
    icon.animate([{ transform: "scale(1)" }, { transform: "scale(1.35) rotate(-10deg)", offset: 0.3 }, { transform: "scale(0.9)", offset: 0.65 }, { transform: "scale(1)" }], { duration: 480, easing: "ease-out" });
    const sparks = document.createElement("span");
    sparks.className = "burst";
    Object.assign(sparks.style, { position: "fixed", left: `${b.left + b.width / 2}px`, top: `${b.top + b.height / 2}px` });
    sparks.innerHTML = Array.from({ length: 8 }, (_, n) => `<i style="--a:${n * 45}deg"></i>`).join("");
    document.body.append(sparks);
    setTimeout(() => sparks.remove(), 900);
  });
}

export function Stepper({ id, name, max }: { id: string; name: string; max: number }) {
  const cart = useCart();
  const qty = cart?.[id] ?? 0;
  if (!qty)
    return (
      // measured before the button turns into a stepper
      <button
        type="button"
        className="btn add"
        onClick={(e) => {
          flyToCart(e.currentTarget);
          setQty(id, 1);
        }}
        aria-label={`Add ${name}`}
      >
        <Plus size={16} strokeWidth={2.25} aria-hidden="true" /> Add
      </button>
    );
  return (
    <div className="stepper">
      <button type="button" onClick={() => setQty(id, qty - 1)} aria-label={`One less ${name}`}>
        <Minus size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
      {/* a new <b> per number, so each change pops (globals.css) */}
      <span aria-live="polite">
        <b key={qty}>{qty}</b>
      </span>
      <button
        type="button"
        onClick={(e) => {
          flyToCart(e.currentTarget);
          setQty(id, qty + 1);
        }}
        disabled={qty >= Math.min(max, MAX_QTY)}
        aria-label={`One more ${name}`}
      >
        <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </div>
  );
}
