import { DownloadIcon, IndianRupeeIcon, ReceiptIcon, RotateCcwIcon, ShoppingBagIcon } from "lucide-react";
import { CategorySalesChart } from "@/components/admin/charts";
import { KpiCard } from "@/components/admin/kpi-card";
import { PageHeader } from "@/components/admin/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReportSummary, getSalesByCategory, getTopProducts } from "@/lib/analytics";
import { requirePermission } from "@/lib/auth-guard";
import { parseDateRange } from "@/lib/date-range";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata = { title: "Reports" };

export default async function ReportsPage(props: PageProps<"/admin/reports">) {
  await requirePermission("reports:view");
  const sp = await props.searchParams;
  const { from, to, fromLabel, toLabel } = parseDateRange(
    typeof sp.from === "string" ? sp.from : null,
    typeof sp.to === "string" ? sp.to : null,
  );

  const [summary, topProducts, byCategory] = await Promise.all([
    getReportSummary(from, to),
    getTopProducts(from, to, 10),
    getSalesByCategory(from, to),
  ]);

  const exportQs = `from=${fromLabel}&to=${toLabel}`;

  return (
    <>
      <PageHeader
        title="Sales reports"
        description={`${formatDate(from)} – ${formatDate(new Date(to.getTime() - 1))}`}
        actions={
          <>
            <a href={`/api/reports/export?type=orders&${exportQs}`} className={buttonVariants({ variant: "outline" })}>
              <DownloadIcon /> Orders CSV
            </a>
            <a href={`/api/reports/export?type=products&${exportQs}`} className={buttonVariants({ variant: "outline" })}>
              <DownloadIcon /> Products CSV
            </a>
          </>
        }
      />

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={fromLabel} className="w-44" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={toLabel} className="w-44" />
        </div>
        <Button type="submit">Run report</Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Gross revenue" value={formatPrice(summary.revenue)} icon={IndianRupeeIcon} />
        <KpiCard title="Paid orders" value={String(summary.orders)} icon={ShoppingBagIcon} />
        <KpiCard title="Avg. order value" value={formatPrice(summary.aov)} icon={ReceiptIcon} />
        <KpiCard title={`Refunds (${summary.refundCount})`} value={formatPrice(summary.refunds)} icon={RotateCcwIcon} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue breakdown</CardTitle>
            <CardDescription>Paid orders in range</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Net sales (before tax)</dt><dd className="tabular-nums">{formatPrice(summary.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">GST collected</dt><dd className="tabular-nums">{formatPrice(summary.tax)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping collected</dt><dd className="tabular-nums">{formatPrice(summary.shipping)}</dd></div>
              <div className="flex justify-between border-t pt-2 font-medium"><dt>Gross revenue</dt><dd className="tabular-nums">{formatPrice(summary.revenue)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Refunded</dt><dd className="tabular-nums">−{formatPrice(summary.refunds)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Cancelled orders</dt><dd className="tabular-nums">{summary.cancelled}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales by category</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length ? (
              <CategorySalesChart data={byCategory} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No sales in this range</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top 10 products</CardTitle></CardHeader>
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
                    <TableCell className="max-w-64 truncate">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Daily sales</CardTitle></CardHeader>
          <CardContent className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.daily.map((d) => (
                  <TableRow key={String(d.day)}>
                    <TableCell>{formatDate(d.day)}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.orders}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(d.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
