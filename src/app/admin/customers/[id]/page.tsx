import Link from "next/link";
import { notFound } from "next/navigation";
import { KpiCard } from "@/components/admin/kpi-card";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge, PaymentStatusBadge, RoleBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupeeIcon, ReceiptIcon, ShoppingBagIcon } from "lucide-react";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata = { title: "Customer" };

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  await requirePermission("customers:view");
  const { id } = await props.params;

  const [customer, orders, paid] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: { name: true, email: true, role: true, isActive: true, createdAt: true, passwordHash: true, accounts: { select: { provider: true } } },
    }),
    db.order.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.order.aggregate({ where: { userId: id, paymentStatus: "PAID" }, _sum: { total: true }, _count: true }),
  ]);
  if (!customer) notFound();

  const ltv = paid._sum.total ?? 0;

  return (
    <>
      <PageHeader title={customer.name ?? customer.email} description={customer.email} actions={<RoleBadge role={customer.role} />} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard title="Lifetime value" value={formatPrice(ltv)} icon={IndianRupeeIcon} />
        <KpiCard title="Paid orders" value={String(paid._count)} icon={ShoppingBagIcon} />
        <KpiCard title="Avg. order value" value={formatPrice(paid._count ? Math.round(ltv / paid._count) : 0)} icon={ReceiptIcon} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Order</TableHead>
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
                    <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
                  </TableCell>
                  <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                  <TableCell><PaymentStatusBadge status={o.paymentStatus} /></TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{formatPrice(o.total)}</TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No orders yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Joined:</span> {formatDate(customer.createdAt)}</p>
            <p><span className="text-muted-foreground">Status:</span> {customer.isActive ? "Active" : "Disabled"}</p>
            <p>
              <span className="text-muted-foreground">Sign-in:</span>{" "}
              {[...(customer.passwordHash ? ["Email & password"] : []), ...customer.accounts.map((a) => a.provider)].join(", ") || "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
