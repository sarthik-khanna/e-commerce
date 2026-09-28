import { ProductImage } from "@/components/product-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Order, OrderItem } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/format";

/** Items, totals and shipping address — shared by the customer and admin order pages. */
export function OrderDetails({ order }: { order: Order & { items: OrderItem[] } }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <ProductImage src={item.imageUrl} alt={item.productName} sizes="56px" className="size-14 shrink-0 rounded-md" />
                <div className="flex-1">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU {item.productSku} · {formatPrice(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <span className="font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">GST</dt><dd>{formatPrice(order.tax)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{order.shippingFee ? formatPrice(order.shippingFee) : "Free"}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Shipping to</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{order.shippingName}</p>
          <p>{order.shippingLine1}</p>
          {order.shippingLine2 && <p>{order.shippingLine2}</p>}
          <p>
            {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
          </p>
          <p>{order.shippingCountry}</p>
          <p className="pt-2 text-muted-foreground">Phone: {order.shippingPhone}</p>
          {order.notes && <p className="pt-2 text-muted-foreground">Notes: {order.notes}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
