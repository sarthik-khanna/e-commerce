import type { LucideIcon } from "lucide-react";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {change !== undefined && (
          <p className={cn("flex items-center gap-1 text-xs", up ? "text-emerald-600" : "text-red-600")}>
            {up ? <TrendingUpIcon className="size-3.5" /> : <TrendingDownIcon className="size-3.5" />}
            {up ? "+" : ""}
            {change.toFixed(1)}%<span className="text-muted-foreground">vs previous period</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
