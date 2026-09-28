"use client";

import { useRouter } from "next/navigation";
import { ShoppingCartIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { toast } from "sonner";
import { type CartItem, useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  product,
  quantity = 1,
  ...props
}: { product: Omit<CartItem, "quantity">; quantity?: number } & Omit<ComponentProps<typeof Button>, "onClick">) {
  const router = useRouter();
  const { add, items } = useCart();
  const inCart = items.find((i) => i.productId === product.productId)?.quantity ?? 0;
  const soldOut = product.stock === 0;
  const maxed = inCart >= product.stock;

  return (
    <Button
      {...props}
      disabled={soldOut || maxed || props.disabled}
      onClick={() => {
        add(product, quantity);
        toast.success(`${product.name} added to cart`, {
          action: { label: "View cart", onClick: () => router.push("/cart") },
        });
      }}
    >
      <ShoppingCartIcon />
      {soldOut ? "Out of stock" : maxed ? "Max in cart" : "Add to cart"}
    </Button>
  );
}
