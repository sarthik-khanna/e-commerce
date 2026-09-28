import Link from "next/link";
import { DownloadIcon } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { FilterBar, one, pageOf } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { PaginationLinks } from "@/components/pagination-links";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata = { title: "Orders" };
const PAGE_SIZE = 20;
const STATUSES: OrderStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAYMENTS: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED"];
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  await requirePermission("orders:manage");
  const sp = await props.searchParams;
  const q = one(sp.q)?.trim();
  const status = STATUSES.find((s) => s === one(sp.status));
  const payment = PAYMENTS.find((s) => s === one(sp.payment));
  const page = pageOf(sp.page);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { shippingName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } },
    }),
    db.order.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${total} orders`}
        actions={
          <a href="/api/reports/export?type=orders" className={buttonVariants({ variant: "outline" })}>
            <DownloadIcon /> Export CSV
          </a>
        }
      />
      <FilterBar
        basePath="/admin/orders"
        q={q}
        placeholder="Order #, email or name…"
        selects={[
          { name: "status", label: "Status", value: status, options: STATUSES.map((s) => ({ value: s, label: cap(s) })) },
          { name: "payment", label: "Payment", value: payment, options: PAYMENTS.map((s) => ({ value: s, label: cap(s) })) },
        ]}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="pr-4 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="pl-4">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link>
                  <p className="text-xs text-muted-foreground">{formatDate(o.createdAt, true)}</p>
                </TableCell>
                <TableCell>
                  <p className="max-w-48 truncate">{o.user.name ?? o.shippingName}</p>
                  <p className="max-w-48 truncate text-xs text-muted-foreground">{o.user.email}</p>
                </TableCell>
                <TableCell className="tabular-nums">{o._count.items}</TableCell>
                <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                <TableCell><PaymentStatusBadge status={o.paymentStatus} /></TableCell>
                <TableCell className="pr-4 text-right tabular-nums">{formatPrice(o.total)}</TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No orders match these filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <PaginationLinks basePath="/admin/orders" searchParams={sp} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </>
  );
}
