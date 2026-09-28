"use client";

import Link from "next/link";
import { MinusIcon, PlusIcon, ShoppingBagIcon, Trash2Icon } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { OrderSummary } from "@/components/cart/order-summary";
import { ProductImage } from "@/components/product-image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, ready, setQuantity, remove } = useCart();

  if (!ready) {
    return (
      <div className="container mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <ShoppingBagIcon className="size-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="text-muted-foreground">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/products" className={buttonVariants()}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Shopping cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y rounded-xl border">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-4 p-4">
              <Link href={`/products/${item.slug}`} className="shrink-0">
                <ProductImage src={item.image} alt={item.name} sizes="96px" className="size-24 rounded-lg" />
              </Link>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex justify-between gap-4">
                  <Link href={`/products/${item.slug}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                  <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{formatPrice(item.price)} each</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-lg border">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    >
                      <MinusIcon />
                    </Button>
                    <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Increase quantity"
                      disabled={item.quantity >= Math.min(item.stock, 20)}
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(item.productId)}>
                    <Trash2Icon /> Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OrderSummary subtotal={subtotal} />
            <Link href="/checkout" className={buttonVariants({ size: "lg", className: "w-full" })}>
              Proceed to checkout
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              Prices and stock are confirmed at checkout.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
