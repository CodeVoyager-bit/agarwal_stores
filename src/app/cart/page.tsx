import type { Metadata } from "next";
import { CartView } from "@/components/checkout";
import { currentUser } from "@/lib/auth";
import { bestSellers, shopItems } from "@/lib/db";
import { DELIVERY_DAYS } from "@/lib/orders";

export const metadata: Metadata = { title: "Cart · Agarwal Stores" };

export default async function CartPage() {
  const [items, user, popular] = await Promise.all([shopItems(), currentUser(), bestSellers()]);
  return (
    <>
      <h1>Your Cart</h1>
      <CartView items={items} customer={user && { phone: user.phone, name: user.name, addresses: user.addresses }} deliveryDays={DELIVERY_DAYS} popular={popular} />
    </>
  );
}
