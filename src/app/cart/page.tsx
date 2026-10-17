import type { Metadata } from "next";
import { CartView } from "@/components/checkout";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { bestSellers, shopItems } from "@/lib/db";
import { DELIVERY_DAYS } from "@/lib/orders";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT()).common.nav.cart} · Agarwal Stores` };
}

export default async function CartPage() {
  const [items, user, popular, t] = await Promise.all([shopItems(), currentUser(), bestSellers(), getT()]);
  return (
    <>
      <h1>{t.shop.cart.title}</h1>
      <CartView items={items} customer={user && { phone: user.phone, name: user.name, addresses: user.addresses }} deliveryDays={DELIVERY_DAYS} popular={popular} />
    </>
  );
}
