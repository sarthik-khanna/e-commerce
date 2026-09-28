"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canSimulatePayments, features } from "@/lib/env";
import { CheckoutError, createPendingOrder, markOrderPaid } from "@/lib/orders";
import { getRazorpay } from "@/lib/razorpay";
import { checkoutSchema, fieldErrorsOf } from "@/lib/validations";

export type CheckoutResult =
  | {
      ok: true;
      orderId: string;
      mode: "razorpay";
      razorpay: { keyId: string; orderId: string; amount: number; currency: string };
      prefill: { name: string; email: string; contact: string };
    }
  | { ok: true; orderId: string; mode: "simulated" }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };

export async function createCheckoutAction(input: unknown): Promise<CheckoutResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Please sign in to check out" };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please check your details", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  if (!features.razorpay && !canSimulatePayments) {
    return { ok: false, message: "Payments are not configured. Please contact support." };
  }

  try {
    const order = await createPendingOrder(session.user.id, parsed.data);

    if (!features.razorpay) return { ok: true, orderId: order.id, mode: "simulated" };

    const rzpOrder = await getRazorpay().orders.create({
      amount: order.total,
      currency: order.currency,
      receipt: order.orderNumber,
      notes: { orderId: order.id },
    });
    await db.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzpOrder.id } });

    return {
      ok: true,
      orderId: order.id,
      mode: "razorpay",
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID!,
        orderId: rzpOrder.id,
        amount: order.total,
        currency: order.currency,
      },
      prefill: {
        name: parsed.data.shippingName,
        email: session.user.email ?? "",
        contact: parsed.data.shippingPhone,
      },
    };
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false, message: error.message };
    console.error("[checkout] failed", error);
    return { ok: false, message: "Something went wrong creating your order. Please try again." };
  }
}

/** Development-only stand-in for Razorpay when no keys are configured. */
export async function simulatePaymentAction(orderId: string) {
  if (!canSimulatePayments) return { ok: false, message: "Simulation is disabled" };
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Please sign in" };

  const order = await db.order.findFirst({ where: { id: orderId, userId: session.user.id } });
  if (!order) return { ok: false, message: "Order not found" };

  await markOrderPaid(order.id, `sim_${Date.now()}`);
  return { ok: true };
}
