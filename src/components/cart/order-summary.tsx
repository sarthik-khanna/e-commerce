import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, calculateTotals } from "@/lib/pricing";
import { Separator } from "@/components/ui/separator";

export function OrderSummary({ subtotal }: { subtotal: number }) {
  const t = calculateTotals(subtotal);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatPrice(t.subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">GST (18%)</span>
        <span>{formatPrice(t.tax)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Shipping</span>
        <span>{t.shippingFee === 0 ? "Free" : formatPrice(t.shippingFee)}</span>
      </div>
      {remaining > 0 && subtotal > 0 && (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
          Add {formatPrice(remaining)} more for free shipping
        </p>
      )}
      <Separator />
      <div className="flex justify-between text-base font-semibold">
        <span>Total</span>
        <span>{formatPrice(t.total)}</span>
      </div>
    </div>
  );
}
