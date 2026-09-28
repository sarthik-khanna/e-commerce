import Link from "next/link";
import { AlertTriangleIcon, IndianRupeeIcon, ReceiptIcon, ShoppingBagIcon, UserPlusIcon } from "lucide-react";
import { CategorySalesChart, OrdersByStatusChart, RevenueChart } from "@/components/admin/charts";
import { KpiCard } from "@/components/admin/kpi-card";
import { PageHeader } from "@/components/admin/page-header";
import { RangeTabs } from "@/components/admin/range-tabs";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  RANGES,
  getKpis,
  getLowStockProducts,
  getOrdersByStatus,
  getRecentOrders,
  getRevenueSeries,
  getSalesByCategory,
  getTopProducts,
  parseRange,
  rangeBounds,
} from "@/lib/analytics";
import { requirePermission } from "@/lib/auth-guard";
import { formatDate, formatNumber, formatPrice, formatPriceCompact } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/admin">) {
  await requirePermission("dashboard:view");
  const range = parseRange((await props.searchParams).range);
  const { start } = rangeBounds(range);

  // Independent queries run in parallel.
  const [kpis, revenue, byStatus, byCategory, topProducts, recentOrders, lowStock] = await Promise.all([
    getKpis(range),
    getRevenueSeries(range),
    getOrdersByStatus(range),
    getSalesByCategory(start),
    getTopProducts(start),
    getRecentOrders(),
    getLowStockProducts(),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Store performance · ${RANGES[range].label}`}
        actions={<RangeTabs active={range} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Revenue" value={formatPriceCompact(kpis.revenue.value)} change={kpis.revenue.change} icon={IndianRupeeIcon} />
        <KpiCard title="Paid orders" value={formatNumber(kpis.orders.value)} change={kpis.orders.change} icon={ShoppingBagIcon} />
        <KpiCard title="Avg. order value" value={formatPrice(kpis.aov.value)} change={kpis.aov.change} icon={ReceiptIcon} />
        <KpiCard title="New customers" value={formatNumber(kpis.customers.value)} change={kpis.customers.change} icon={UserPlusIcon} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Paid orders, grouped by {revenue.unit}</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenue.series} unit={revenue.unit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
            <CardDescription>Orders created in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {byStatus.length ? (
              <OrdersByStatusChart data={byStatus} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No orders yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by category</CardTitle>
            <CardDescription>Revenue from paid orders</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length ? (
              <CategorySalesChart data={byCategory} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No sales in this period</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="max-w-56 truncate font-medium">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(p.revenue)}</TableCell>
                  </TableRow>
                ))}
                {topProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      No sales in this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardAction>
              <Link href="/admin/orders" className="text-sm text-primary hover:underline">View all</Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link>
                      <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
                    </TableCell>
                    <TableCell className="max-w-40 truncate">{o.user.name ?? o.user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <OrderStatusBadge status={o.status} />
                        <PaymentStatusBadge status={o.paymentStatus} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(o.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-amber-500" /> Low stock
            </CardTitle>
            <CardDescription>10 units or fewer</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/admin/products/${p.id}`} className="truncate hover:underline">{p.name}</Link>
                  <Badge variant={p.stock === 0 ? "destructive" : "secondary"}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </Badge>
                </li>
              ))}
              {lowStock.length === 0 && <li className="text-sm text-muted-foreground">All products are well stocked.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
