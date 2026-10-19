import type { Metadata } from "next";
import { CartView } from "@/components/checkout";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { bestSellers, shopItems } from "@/lib/db";
import { shopDetails } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT()).common.nav.cart} · Agarwal Stores` };
}

export default async function CartPage() {
  const [items, user, popular, t, shop] = await Promise.all([shopItems(), currentUser(), bestSellers(), getT(), shopDetails()]);
  // Settings > Take bookings off: customers see why instead of the Book button. Staff booking for callers
  // aren't held to it, or to the smallest booking (lib/orders.ts placeOrder)
  const customer = !user || user.role === "customer";
  const closed = !shop.bookingsOpen && customer ? shop.closedMessage || t.shop.cart.closed : null;
  return (
    <>
      <h1>{t.shop.cart.title}</h1>
      <CartView items={items} customer={user && { phone: user.phone, name: user.name, addresses: user.addresses }} rules={{ from: shop.deliveryFrom, to: shop.deliveryTo, closed, minOrder: customer ? shop.minOrder : 0 }} popular={popular} />
    </>
  );
}
