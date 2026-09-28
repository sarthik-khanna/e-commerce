"use client";

import Link from "next/link";
import { ShoppingCartIcon } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { buttonVariants } from "@/components/ui/button";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })}
      aria-label={`Cart, ${count} items`}
    >
      <ShoppingCartIcon />
      {ready && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
