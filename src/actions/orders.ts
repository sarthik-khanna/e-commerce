"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { audit } from "@/lib/audit";
import { AuthorizationError, assertPermission } from "@/lib/auth-guard";
import { sendEmail } from "@/lib/email";
import { restoreStock } from "@/lib/orders";
import { getRazorpay } from "@/lib/razorpay";
import { type ActionState, orderStatusSchema } from "@/lib/validations";
import { OrderStatusEmail } from "@/emails/templates";

// Allowed forward transitions. Cancelling a paid order goes through refundOrderAction.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function updateOrderStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("orders:manage");
    const parsed = orderStatusSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: "Invalid request" };
    const { orderId, status } = parsed.data;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!order) return { message: "Order not found" };
    if (order.status === status) return { ok: true, message: "No change" };
    if (!TRANSITIONS[order.status].includes(status)) {
      return { message: `Cannot move an order from ${order.status} to ${status}` };
    }
    if (status !== "CANCELLED" && order.paymentStatus !== "PAID") {
      return { message: "Only paid orders can be fulfilled" };
    }
    if (status === "CANCELLED" && order.paymentStatus === "PAID") {
      return { message: "This order is paid — use “Refund & cancel” instead" };
    }

    await db.order.update({ where: { id: orderId }, data: { status } });
    await audit({
      userId: user.id,
      action: "order.status.update",
      entity: "Order",
      entityId: orderId,
      metadata: { from: order.status, to: status },
    });

    after(() =>
      sendEmail({
        to: order.user.email,
        subject: `Order ${order.orderNumber}: ${status.toLowerCase()}`,
        react: OrderStatusEmail({
          name: order.user.name ?? "there",
          orderNumber: order.orderNumber,
          status,
          orderUrl: `${env.appUrl}/orders/${order.id}`,
        }),
      }),
    );

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true, message: `Order marked as ${status.toLowerCase()}` };
  } catch (error) {
    if (error instanceof AuthorizationError) return { message: error.message };
    throw error;
  }
}

export async function refundOrderAction(orderId: string): Promise<ActionState> {
  try {
    const user = await assertPermission("orders:refund");
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!order) return { message: "Order not found" };
    if (order.paymentStatus !== "PAID") return { message: "Only paid orders can be refunded" };
    if (order.status === "DELIVERED") return { message: "Delivered orders need a return flow before refund" };

    let refundId: string | null = null;
    if (order.razorpayPaymentId && features.razorpay) {
      const refund = await getRazorpay().payments.refund(order.razorpayPaymentId, {
        amount: order.total,
        notes: { orderNumber: order.orderNumber },
      });
      refundId = refund.id;
    }

    await db.order.update({
      where: { id: orderId },
      data: { paymentStatus: "REFUNDED", status: "CANCELLED" },
    });
    await restoreStock(orderId);
    await audit({
      userId: user.id,
      action: "order.refund",
      entity: "Order",
      entityId: orderId,
      metadata: { amount: order.total, refundId, simulated: !refundId },
    });

    after(() =>
      sendEmail({
        to: order.user.email,
        subject: `Order ${order.orderNumber} cancelled and refunded`,
        react: OrderStatusEmail({
          name: order.user.name ?? "there",
          orderNumber: order.orderNumber,
          status: "CANCELLED",
          orderUrl: `${env.appUrl}/orders/${order.id}`,
        }),
      }),
    );

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true, message: refundId ? `Refund ${refundId} initiated` : "Order refunded (simulated)" };
  } catch (error) {
    if (error instanceof AuthorizationError) return { message: error.message };
    console.error("[refund] failed", error);
    return { message: "Refund failed. Check the Razorpay dashboard and try again." };
  }
}
