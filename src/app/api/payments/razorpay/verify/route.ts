import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { markOrderPaid, markPaymentFailed } from "@/lib/orders";
import { verifyPaymentSignature } from "@/lib/razorpay";

const bodySchema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/**
 * POST /api/payments/razorpay/verify
 * Called by the browser after Razorpay Checkout succeeds. Verifies the HMAC
 * signature before trusting the payment.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const body = parsed.data;

  const order = await db.order.findFirst({
    where: { id: body.orderId, userId: session.user.id },
    select: { id: true, razorpayOrderId: true },
  });
  if (!order || order.razorpayOrderId !== body.razorpay_order_id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const valid = verifyPaymentSignature({
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });
  if (!valid) {
    await markPaymentFailed(order.id);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  await markOrderPaid(order.id, body.razorpay_payment_id);
  return NextResponse.json({ ok: true, orderId: order.id });
}
