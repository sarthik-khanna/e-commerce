import Link from "next/link";
import { LockIcon, TruckIcon, UndoIcon } from "lucide-react";
import { Logo } from "@/components/shop/site-header";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="container mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Enterprise-grade commerce with secure payments, real-time analytics and fast delivery.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Shop</p>
          <Link href="/products" className="block text-muted-foreground hover:text-foreground">All products</Link>
          <Link href="/cart" className="block text-muted-foreground hover:text-foreground">Cart</Link>
          <Link href="/orders" className="block text-muted-foreground hover:text-foreground">Order history</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Account</p>
          <Link href="/login" className="block text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link href="/register" className="block text-muted-foreground hover:text-foreground">Create account</Link>
          <Link href="/forgot-password" className="block text-muted-foreground hover:text-foreground">Reset password</Link>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Why shop with us</p>
          <p className="flex items-center gap-2"><LockIcon className="size-4" /> Secure Razorpay checkout</p>
          <p className="flex items-center gap-2"><TruckIcon className="size-4" /> Free shipping over ₹999</p>
          <p className="flex items-center gap-2"><UndoIcon className="size-4" /> Easy cancellations</p>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nexus Commerce. All rights reserved.
      </div>
    </footer>
  );
}
