"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart/cart-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <CartProvider>
          {children}
          <Toaster richColors position="top-right" />
        </CartProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
