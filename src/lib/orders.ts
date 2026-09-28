import "server-only";
import crypto from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { calculateTotals } from "@/lib/pricing";
import type { checkoutSchema } from "@/lib/validations";
import { OrderConfirmationEmail } from "@/emails/templates";

export class CheckoutError extends Error {}

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${date}-${suffix}`;
}

/**
 * Creates a PENDING order from cart items. Prices and stock are read from the
 * database — the client only sends product IDs and quantities.
 */
export async function createPendingOrder(userId: string, input: z.infer<typeof checkoutSchema>) {
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const products = await db.product.findMany({
    where: { id: { in: [...quantities.keys()] }, isActive: true },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });

  if (products.length !== quantities.size) {
    throw new CheckoutError("Some items in your cart are no longer available. Please review your cart.");
  }

  for (const product of products) {
    const qty = quantities.get(product.id)!;
    if (product.stock < qty) {
      throw new CheckoutError(
        product.stock === 0
          ? `${product.name} is out of stock.`
          : `Only ${product.stock} of ${product.name} left in stock.`,
      );
    }
  }

  const subtotal = products.reduce((sum, p) => sum + p.price * quantities.get(p.id)!, 0);
  const totals = calculateTotals(subtotal);

  return db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      ...totals,
      shippingName: input.shippingName,
      shippingPhone: input.shippingPhone,
      shippingLine1: input.shippingLine1,
      shippingLine2: input.shippingLine2 || null,
      shippingCity: input.shippingCity,
      shippingState: input.shippingState,
      shippingPostalCode: input.shippingPostalCode,
      notes: input.notes || null,
      items: {
        create: products.map((p) => ({
          productId: p.id,
          productName: p.name,
          productSku: p.sku,
          imageUrl: p.images[0]?.url ?? null,
          unitPrice: p.price,
          quantity: quantities.get(p.id)!,
        })),
      },
    },
  });
}

/**
 * Marks an order as paid and decrements stock. Idempotent: the browser callback
 * and the Razorpay webhook may both call this for the same payment, but only the
 * first call changes anything.
 */
export async function markOrderPaid(orderId: string, razorpayPaymentId: string | null) {
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { in: ["PENDING", "FAILED"] } },
      data: {
        paymentStatus: "PAID",
        status: "PROCESSING",
        paidAt: new Date(),
        razorpayPaymentId,
      },
    });
    if (result.count === 0) return null; // already processed

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, user: { select: { email: true, name: true } } },
    });

    const oversold: string[] = [];
    for (const item of order.items) {
      if (!item.productId) continue;
      // Conditional decrement prevents stock from going negative under concurrency.
      const dec = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (dec.count === 0) oversold.push(item.productSku);
    }
    return { order, oversold };
  });

  if (!updated) return { alreadyProcessed: true as const };

  const { order, oversold } = updated;

  await audit({
    userId: order.userId,
    action: "order.paid",
    entity: "Order",
    entityId: order.id,
    metadata: { razorpayPaymentId, total: order.total, oversold },
  });

  // Send the confirmation after the response so checkout feels instant.
  after(() =>
    sendEmail({
      to: order.user.email,
      subject: `Order ${order.orderNumber} confirmed`,
      react: OrderConfirmationEmail({
        name: order.user.name ?? "there",
        order,
        orderUrl: `${env.appUrl}/orders/${order.id}`,
      }),
    }),
  );

  return { alreadyProcessed: false as const, order };
}

export async function markPaymentFailed(orderId: string) {
  await db.order.updateMany({
    where: { id: orderId, paymentStatus: "PENDING" },
    data: { paymentStatus: "FAILED" },
  });
}

/** Returns stock for a paid order that is cancelled or refunded. */
export async function restoreStock(orderId: string) {
  const items = await db.orderItem.findMany({ where: { orderId, productId: { not: null } } });
  await db.$transaction(
    items.map((item) =>
      db.product.update({
        where: { id: item.productId! },
        data: { stock: { increment: item.quantity } },
      }),
    ),
  );
}
