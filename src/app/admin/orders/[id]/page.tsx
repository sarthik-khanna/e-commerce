import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusForm, RefundButton } from "@/components/admin/order-actions";
import { PageHeader } from "@/components/admin/page-header";
import { OrderDetails } from "@/components/order-details";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";

export const metadata = { title: "Order" };

export default async function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  const user = await requirePermission("orders:manage");
  const { id } = await props.params;

  const [order, history] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: { items: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    }),
    db.auditLog.findMany({
      where: { entity: "Order", entityId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  if (!order) notFound();

  const canRefund =
    hasPermission(user.role, "orders:refund") && order.paymentStatus === "PAID" && order.status !== "DELIVERED";

  return (
    <>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${formatDate(order.createdAt, true)}`}
        actions={
          <>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Link href={`/admin/customers/${order.user.id}`} className="font-medium hover:underline">
              {order.user.name ?? "—"}
            </Link>
            <p className="text-muted-foreground">{order.user.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{formatPrice(order.total)}</p>
            <p className="text-muted-foreground">Razorpay order: {order.razorpayOrderId ?? "—"}</p>
            <p className="text-muted-foreground">Payment ID: {order.razorpayPaymentId ?? "—"}</p>
            {order.paidAt && <p className="text-muted-foreground">Paid {formatDate(order.paidAt, true)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Fulfilment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <OrderStatusForm key={`${order.status}-${order.paymentStatus}`} orderId={order.id} status={order.status} paid={order.paymentStatus === "PAID"} />
            {canRefund && <RefundButton orderId={order.id} amount={formatPrice(order.total)} />}
          </CardContent>
        </Card>
      </div>

      <OrderDetails order={order} />

      <Card className="mt-6">
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3 border-l pl-4">
            {history.map((h) => (
              <li key={h.id} className="relative text-sm">
                <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
                <p className="font-medium">{h.action}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(h.createdAt, true)} · {h.user?.name ?? h.user?.email ?? "System"}
                  {h.metadata ? ` · ${JSON.stringify(h.metadata)}` : ""}
                </p>
              </li>
            ))}
            <li className="relative text-sm">
              <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-muted-foreground" />
              <p className="font-medium">order.created</p>
              <p className="text-xs text-muted-foreground">{formatDate(order.createdAt, true)}</p>
            </li>
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
