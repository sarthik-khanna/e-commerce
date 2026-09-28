import type { Metadata } from "next";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { requireUser } from "@/lib/auth-guard";
import { canSimulatePayments } from "@/lib/env";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Checkout</h1>
      <CheckoutForm defaultName={user.name ?? ""} simulated={canSimulatePayments} />
    </div>
  );
}
