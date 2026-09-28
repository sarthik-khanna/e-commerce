import "server-only";
import { db } from "@/lib/db";

export const RANGES = {
  "7d": { label: "Last 7 days", days: 7, unit: "day" },
  "30d": { label: "Last 30 days", days: 30, unit: "day" },
  "90d": { label: "Last 90 days", days: 90, unit: "week" },
  "12m": { label: "Last 12 months", days: 365, unit: "month" },
} as const;

export type RangeKey = keyof typeof RANGES;

export function parseRange(value: unknown): RangeKey {
  return typeof value === "string" && value in RANGES ? (value as RangeKey) : "30d";
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function rangeBounds(range: RangeKey, now = new Date()) {
  const { days } = RANGES[range];
  const end = now;
  const start = startOfDayUTC(new Date(now.getTime() - (days - 1) * 86_400_000));
  const prevStart = new Date(start.getTime() - days * 86_400_000);
  return { start, end, prevStart, prevEnd: start };
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

async function periodStats(from: Date, to: Date) {
  const [paid, customers] = await Promise.all([
    db.order.aggregate({
      where: { paymentStatus: "PAID", paidAt: { gte: from, lt: to } },
      _sum: { total: true },
      _count: true,
    }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: from, lt: to } } }),
  ]);
  const revenue = paid._sum.total ?? 0;
  const orders = paid._count;
  return { revenue, orders, customers, aov: orders ? Math.round(revenue / orders) : 0 };
}

export async function getKpis(range: RangeKey) {
  const { start, end, prevStart, prevEnd } = rangeBounds(range);
  const [current, previous] = await Promise.all([
    periodStats(start, end),
    periodStats(prevStart, prevEnd),
  ]);
  return {
    revenue: { value: current.revenue, change: pctChange(current.revenue, previous.revenue) },
    orders: { value: current.orders, change: pctChange(current.orders, previous.orders) },
    customers: { value: current.customers, change: pctChange(current.customers, previous.customers) },
    aov: { value: current.aov, change: pctChange(current.aov, previous.aov) },
  };
}

/** Revenue and order count bucketed by day/week/month, with empty buckets filled in. */
export async function getRevenueSeries(range: RangeKey) {
  const { unit } = RANGES[range];
  const { start } = rangeBounds(range);

  const rows = await db.$queryRaw<{ bucket: Date; revenue: number; orders: number }[]>`
    SELECT date_trunc(${unit}, "paidAt") AS bucket,
           COALESCE(SUM(total), 0)::float8 AS revenue,
           COUNT(*)::int AS orders
    FROM "Order"
    WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${start}
    GROUP BY 1
    ORDER BY 1`;

  const byKey = new Map(rows.map((r) => [new Date(r.bucket).toISOString().slice(0, 10), r]));
  const series: { date: string; revenue: number; orders: number }[] = [];

  const cursor = new Date(start);
  if (unit === "week") {
    // Postgres weeks start on Monday.
    const day = (cursor.getUTCDay() + 6) % 7;
    cursor.setUTCDate(cursor.getUTCDate() - day);
  }
  if (unit === "month") cursor.setUTCDate(1);

  const now = new Date();
  while (cursor <= now) {
    const key = cursor.toISOString().slice(0, 10);
    const row = byKey.get(key);
    series.push({ date: key, revenue: (row?.revenue ?? 0) / 100, orders: row?.orders ?? 0 });
    if (unit === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (unit === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return { unit, series };
}

export async function getOrdersByStatus(range: RangeKey) {
  const { start } = rangeBounds(range);
  const groups = await db.order.groupBy({
    by: ["status"],
    where: { createdAt: { gte: start } },
    _count: { _all: true },
  });
  return groups.map((g) => ({ status: g.status, count: g._count._all }));
}

export async function getTopProducts(from: Date, to: Date = new Date(), limit = 5) {
  return db.$queryRaw<{ productId: string | null; name: string; quantity: number; revenue: number }[]>`
    SELECT oi."productId", oi."productName" AS name,
           SUM(oi.quantity)::int AS quantity,
           SUM(oi.quantity * oi."unitPrice")::float8 AS revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."paymentStatus" = 'PAID' AND o."paidAt" >= ${from} AND o."paidAt" < ${to}
    GROUP BY oi."productId", oi."productName"
    ORDER BY revenue DESC
    LIMIT ${limit}`;
}

export async function getSalesByCategory(from: Date, to: Date = new Date()) {
  return db.$queryRaw<{ category: string; revenue: number; quantity: number }[]>`
    SELECT COALESCE(c.name, 'Uncategorized') AS category,
           SUM(oi.quantity * oi."unitPrice")::float8 AS revenue,
           SUM(oi.quantity)::int AS quantity
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    LEFT JOIN "Product" p ON p.id = oi."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE o."paymentStatus" = 'PAID' AND o."paidAt" >= ${from} AND o."paidAt" < ${to}
    GROUP BY 1
    ORDER BY revenue DESC`;
}

export async function getRecentOrders(limit = 6) {
  return db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      total: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });
}

export async function getLowStockProducts(threshold = 10, limit = 6) {
  return db.product.findMany({
    where: { isActive: true, stock: { lte: threshold } },
    orderBy: { stock: "asc" },
    take: limit,
    select: { id: true, name: true, sku: true, stock: true },
  });
}

/** Summary used by the Reports page and CSV export for an arbitrary date range. */
export async function getReportSummary(from: Date, to: Date) {
  const [paid, refunded, cancelled, daily] = await Promise.all([
    db.order.aggregate({
      where: { paymentStatus: "PAID", paidAt: { gte: from, lt: to } },
      _sum: { total: true, tax: true, shippingFee: true, subtotal: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { paymentStatus: "REFUNDED", updatedAt: { gte: from, lt: to } },
      _sum: { total: true },
      _count: true,
    }),
    db.order.count({ where: { status: "CANCELLED", updatedAt: { gte: from, lt: to } } }),
    db.$queryRaw<{ day: Date; revenue: number; orders: number }[]>`
      SELECT date_trunc('day', "paidAt") AS day,
             SUM(total)::float8 AS revenue,
             COUNT(*)::int AS orders
      FROM "Order"
      WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${from} AND "paidAt" < ${to}
      GROUP BY 1 ORDER BY 1 DESC`,
  ]);

  const revenue = paid._sum.total ?? 0;
  return {
    revenue,
    subtotal: paid._sum.subtotal ?? 0,
    tax: paid._sum.tax ?? 0,
    shipping: paid._sum.shippingFee ?? 0,
    orders: paid._count,
    aov: paid._count ? Math.round(revenue / paid._count) : 0,
    refunds: refunded._sum.total ?? 0,
    refundCount: refunded._count,
    cancelled,
    daily,
  };
}
