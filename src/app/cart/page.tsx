import type { Metadata } from "next";
import { CartView } from "@/components/checkout";
import { currentUser, mockOtp } from "@/lib/auth";
import { shopItems } from "@/lib/db";
import { DELIVERY_DAYS } from "@/lib/orders";

export const metadata: Metadata = { title: "Cart · Agarwal Stores" };

export default async function CartPage() {
  const [items, user] = await Promise.all([shopItems(), currentUser()]);
  return (
    <>
      <h1>Your Cart</h1>
      <CartView items={items} customer={user && { phone: user.phone, name: user.name, address: user.address }} deliveryDays={DELIVERY_DAYS} codeHint={mockOtp() ? `Test mode: the code is ${process.env.MOCK_OTP_CODE || "123456"}` : undefined} />
    </>
  );
}
