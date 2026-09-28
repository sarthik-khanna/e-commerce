import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2Icon } from "lucide-react";
import { OrderDetails } from "@/components/order-details";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details" };

const STEPS = ["PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function OrderPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireUser(`/orders/${id}`);

  // Customers can only see their own orders.
  const order = await db.order.findFirst({ where: { id, userId: user.id }, include: { items: true } });
  if (!order) notFound();

  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
      {searchParams.success && order.paymentStatus === "PAID" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <CheckCircle2Icon className="mt-0.5 size-5 text-emerald-600" />
          <div>
            <p className="font-medium">Thank you! Your order is confirmed.</p>
            <p className="text-sm text-muted-foreground">A confirmation email is on its way.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">
            ← All orders
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Order {order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDate(order.createdAt, true)}</p>
        </div>
        <div className="flex gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {order.status !== "CANCELLED" && order.paymentStatus === "PAID" && (
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((step, i) => (
            <li key={step} className="space-y-2">
              <div className={cn("h-1.5 rounded-full", i <= stepIndex ? "bg-primary" : "bg-muted")} />
              <p className={cn("text-xs", i <= stepIndex ? "font-medium" : "text-muted-foreground")}>
                {step.charAt(0) + step.slice(1).toLowerCase()}
              </p>
            </li>
          ))}
        </ol>
      )}

      {order.paymentStatus === "PENDING" && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          Payment for this order hasn&apos;t been completed. If you were charged, it will be confirmed automatically
          within a few minutes.
        </p>
      )}

      <OrderDetails order={order} />
    </div>
  );
}
