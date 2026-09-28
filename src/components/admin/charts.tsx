"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// All dashboard charts are single-series, single-hue (--chart-1, validated for
// both themes), so no legend is needed — the card title names the series.
// One y-axis per chart; revenue and order counts are never mixed on one plot.

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatBucket(date: string, unit: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return unit === "month"
    ? d.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

const revenueConfig = { revenue: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig;

export function RevenueChart({ data, unit }: { data: { date: string; revenue: number }[]; unit: string }) {
  return (
    <ChartContainer config={revenueConfig} className="aspect-auto h-72 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v) => formatBucket(v, unit)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => inrCompact.format(v)}
        />
        <ChartTooltip
          cursor={{ strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatBucket(String(v), unit)}
              formatter={(value) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium tabular-nums">{inr.format(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          fill="url(#fillRevenue)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

const countConfig = { count: { label: "Orders", color: "var(--chart-1)" } } satisfies ChartConfig;

const STATUS_ORDER = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export function OrdersByStatusChart({ data }: { data: { status: string; count: number }[] }) {
  // Fixed lifecycle order; horizontal bars so every status label fits.
  const rows = STATUS_ORDER.map((status) => ({
    label: status.charAt(0) + status.slice(1).toLowerCase(),
    count: data.find((d) => d.status === status)?.count ?? 0,
  }));
  return (
    <ChartContainer config={countConfig} className="aspect-auto h-64 w-full">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={80} />
        <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}

const categoryConfig = { revenue: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig;

export function CategorySalesChart({ data }: { data: { category: string; revenue: number }[] }) {
  const rows = data.map((d) => ({ category: d.category, revenue: d.revenue / 100 }));
  return (
    <ChartContainer config={categoryConfig} className="aspect-auto w-full" style={{ height: Math.max(160, rows.length * 44) }}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => inrCompact.format(v)} />
        <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} width={96} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.4 }}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(value) => <span className="font-medium tabular-nums">{inr.format(Number(value))}</span>}
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}
