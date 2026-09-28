import type { Metadata } from "next";
import Link from "next/link";
import { PackageIcon } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">My orders</h1>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-12 text-center">
          <PackageIcon className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className={buttonVariants()}>
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-primary"
              >
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(o.createdAt)} · {o._count.items} item{o._count.items === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={o.status} />
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <span className="ml-2 font-semibold">{formatPrice(o.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
