"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlaskConicalIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";
import { createCheckoutAction, simulatePaymentAction } from "@/actions/checkout";
import { useCart } from "@/components/cart/cart-provider";
import { OrderSummary } from "@/components/cart/order-summary";
import { Field } from "@/components/field";
import { ProductImage } from "@/components/product-image";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void; on: (event: string, cb: (res: unknown) => void) => void };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutForm({ defaultName, simulated }: { defaultName: string; simulated: boolean }) {
  const router = useRouter();
  const { items, subtotal, ready, clear } = useCart();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  function finish(orderId: string) {
    clear();
    router.push(`/orders/${orderId}?success=1`);
  }

  function handleSubmit(formData: FormData) {
    setErrors({});
    startTransition(async () => {
      const result = await createCheckoutAction({
        ...Object.fromEntries(formData),
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }

      if (result.mode === "simulated") {
        const sim = await simulatePaymentAction(result.orderId);
        if (sim.ok) {
          toast.success("Payment simulated — order confirmed");
          finish(result.orderId);
        } else toast.error(sim.message);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        toast.error("Could not load Razorpay. Check your connection and try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: result.razorpay.keyId,
        amount: result.razorpay.amount,
        currency: result.razorpay.currency,
        order_id: result.razorpay.orderId,
        name: "Nexus Commerce",
        description: "Order payment",
        prefill: result.prefill,
        theme: { color: "#4f46e5" },
        handler: async (response: RazorpayResponse) => {
          const res = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: result.orderId, ...response }),
          });
          if (res.ok) {
            toast.success("Payment successful!");
            finish(result.orderId);
          } else {
            toast.error("We couldn't verify your payment. If money was deducted, it will be reconciled automatically.");
            router.push(`/orders/${result.orderId}`);
          }
        },
        modal: {
          ondismiss: () => toast.info("Payment cancelled. Your order is saved — you can retry from checkout."),
        },
      });
      rzp.on("payment.failed", () => toast.error("Payment failed. Please try another method."));
      rzp.open();
    });
  }

  if (ready && items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="mb-4 text-muted-foreground">Your cart is empty.</p>
        <Link href="/products" className={buttonVariants()}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle>Shipping address</CardTitle>
          <CardDescription>We deliver across India.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="shippingName" error={errors.shippingName}>
            <Input id="shippingName" name="shippingName" defaultValue={defaultName} autoComplete="name" required />
          </Field>
          <Field label="Mobile number" htmlFor="shippingPhone" error={errors.shippingPhone}>
            <Input id="shippingPhone" name="shippingPhone" inputMode="numeric" maxLength={10} placeholder="9876543210" autoComplete="tel-national" required />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address line 1" htmlFor="shippingLine1" error={errors.shippingLine1}>
              <Input id="shippingLine1" name="shippingLine1" autoComplete="address-line1" required />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address line 2 (optional)" htmlFor="shippingLine2" error={errors.shippingLine2}>
              <Input id="shippingLine2" name="shippingLine2" autoComplete="address-line2" />
            </Field>
          </div>
          <Field label="City" htmlFor="shippingCity" error={errors.shippingCity}>
            <Input id="shippingCity" name="shippingCity" autoComplete="address-level2" required />
          </Field>
          <Field label="State" htmlFor="shippingState" error={errors.shippingState}>
            <Input id="shippingState" name="shippingState" autoComplete="address-level1" required />
          </Field>
          <Field label="PIN code" htmlFor="shippingPostalCode" error={errors.shippingPostalCode}>
            <Input id="shippingPostalCode" name="shippingPostalCode" inputMode="numeric" maxLength={6} autoComplete="postal-code" required />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Delivery notes (optional)" htmlFor="notes" error={errors.notes}>
              <Textarea id="notes" name="notes" rows={2} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>Your order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="max-h-64 space-y-3 overflow-auto">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center gap-3 text-sm">
                <ProductImage src={item.image} alt={item.name} sizes="48px" className="size-12 shrink-0 rounded-md" />
                <span className="flex-1 truncate">
                  {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <OrderSummary subtotal={subtotal} />
          {simulated && (
            <p className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <FlaskConicalIcon className="size-4 shrink-0" />
              Development mode: Razorpay keys aren&apos;t set, so payment will be simulated.
            </p>
          )}
          <SubmitButton size="lg" className="w-full" pending={pending} disabled={!ready}>
            <LockIcon /> {simulated ? "Place order (simulated)" : "Pay securely with Razorpay"}
          </SubmitButton>
        </CardContent>
      </Card>
    </form>
  );
}
