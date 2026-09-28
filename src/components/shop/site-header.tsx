import Link from "next/link";
import { SearchIcon, StoreIcon } from "lucide-react";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartButton } from "@/components/shop/cart-button";
import { MobileNav } from "@/components/shop/mobile-nav";
import { UserMenu } from "@/components/user-menu";

export const NAV_LINKS = [
  { href: "/products", label: "Shop all" },
  { href: "/products?sort=newest", label: "New arrivals" },
  { href: "/orders", label: "My orders" },
];

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <StoreIcon className="size-4" />
      </span>
      <span className="hidden sm:inline">Nexus Commerce</span>
    </Link>
  );
}

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <MobileNav links={NAV_LINKS} />
        <Logo />
        <nav className="ml-4 hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <form action="/products" className="relative ml-auto hidden w-full max-w-xs lg:block">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" placeholder="Search products…" className="pl-8" aria-label="Search products" />
        </form>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <ThemeToggle />
          <CartButton />
          {user ? (
            <UserMenu user={{ name: user.name, email: user.email, image: user.image, role: user.role }} />
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm", className: "ml-1" })}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
