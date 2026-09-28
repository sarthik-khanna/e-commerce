import Link from "next/link";
import { ArrowRightIcon, BarChart3Icon, ShieldCheckIcon, TruckIcon, ZapIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/product-card";
import { getCategories, getFeaturedProducts } from "@/lib/catalog";

export default async function HomePage() {
  const [featured, categories] = await Promise.all([getFeaturedProducts(8), getCategories()]);

  return (
    <>
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <ZapIcon className="size-3 text-primary" /> New season collection is live
            </span>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Everything you need, <span className="text-primary">delivered fast.</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Shop electronics, fashion and home essentials with secure UPI, card and netbanking payments.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className={buttonVariants({ size: "lg" })}>
                Shop now <ArrowRightIcon />
              </Link>
              <Link href="/register" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Create account
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: ShieldCheckIcon, title: "Secure payments", text: "Razorpay with signature verification" },
              { icon: TruckIcon, title: "Free shipping", text: "On every order above ₹999" },
              { icon: BarChart3Icon, title: "Live tracking", text: "Email updates at every step" },
              { icon: ZapIcon, title: "Fast checkout", text: "UPI, cards and netbanking" },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
                <Icon className="mb-3 size-6 text-primary" />
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-sm"
              >
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c._count.products} products</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto max-w-7xl px-4 py-4">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Featured products</h2>
          <Link href="/products" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No featured products yet. Run <code>npm run db:seed</code> or mark products as featured in the admin panel.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
