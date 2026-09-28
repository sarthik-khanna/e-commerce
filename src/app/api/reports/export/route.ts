import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { AuthorizationError, assertPermission } from "@/lib/auth-guard";
import { getTopProducts } from "@/lib/analytics";
import { parseDateRange } from "@/lib/date-range";

function csvCell(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  // Quote values and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

const rupees = (paise: number) => (paise / 100).toFixed(2);

/**
 * GET /api/reports/export?type=orders|products&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Streams a CSV report. Requires the reports:view permission.
 */
export async function GET(request: NextRequest) {
  try {
    await assertPermission("reports:view");
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }

  const params = request.nextUrl.searchParams;
  const { from, to, fromLabel, toLabel } = parseDateRange(params.get("from"), params.get("to"));
  const type = params.get("type") === "products" ? "products" : "orders";

  let csv: string;
  if (type === "orders") {
    const orders = await db.order.findMany({
      where: { createdAt: { gte: from, lt: to } },
      orderBy: { createdAt: "desc" },
      take: 10_000,
      include: { user: { select: { email: true, name: true } }, _count: { select: { items: true } } },
    });
    csv = toCsv(
      ["Order #", "Date", "Customer", "Email", "Items", "Status", "Payment", "Subtotal", "GST", "Shipping", "Total", "City", "State"],
      orders.map((o) => [
        o.orderNumber,
        o.createdAt.toISOString(),
        o.user.name,
        o.user.email,
        o._count.items,
        o.status,
        o.paymentStatus,
        rupees(o.subtotal),
        rupees(o.tax),
        rupees(o.shippingFee),
        rupees(o.total),
        o.shippingCity,
        o.shippingState,
      ]),
    );
  } else {
    const products = await getTopProducts(from, to, 1000);
    csv = toCsv(
      ["Product", "Units sold", "Revenue (INR)"],
      products.map((p) => [p.name, p.quantity, rupees(p.revenue)]),
    );
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-report-${fromLabel}-to-${toLabel}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
