import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markOrderPaid, markPaymentFailed } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

type PaymentEntity = { id: string; order_id: string; status: string };
type RazorpayEvent = {
  event: string;
  payload: { payment?: { entity: PaymentEntity } };
};

/**
 * POST /api/payments/razorpay/webhook
 * Server-to-server confirmation from Razorpay. This is the source of truth:
 * it still marks the order paid if the customer closes the tab before the
 * browser callback runs. Configure it in Razorpay Dashboard → Webhooks with
 * the events payment.captured and payment.failed.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as RazorpayEvent;
  const payment = event.payload.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ ok: true, ignored: true });

  const order = await db.order.findUnique({
    where: { razorpayOrderId: payment.order_id },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ ok: true, ignored: true });

  switch (event.event) {
    case "payment.captured":
      await markOrderPaid(order.id, payment.id);
      break;
    case "payment.failed":
      await markPaymentFailed(order.id);
      break;
  }

  return NextResponse.json({ ok: true });
}
