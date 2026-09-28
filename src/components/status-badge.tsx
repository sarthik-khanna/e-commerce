import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ORDER_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PROCESSING: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  SHIPPED: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  DELIVERED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400",
};

const PAYMENT_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PAID: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  FAILED: "bg-red-500/15 text-red-700 dark:text-red-400",
  REFUNDED: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400",
};

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-primary/15 text-primary",
  MANAGER: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  CUSTOMER: "bg-muted text-muted-foreground",
};

function label(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge className={cn("border-0", ORDER_STYLES[status])}>{label(status)}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return <Badge className={cn("border-0", PAYMENT_STYLES[status])}>{label(status)}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  return <Badge className={cn("border-0", ROLE_STYLES[role])}>{label(role)}</Badge>;
}
