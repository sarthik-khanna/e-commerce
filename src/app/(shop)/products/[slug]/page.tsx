import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ShieldCheckIcon, TruckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { ProductCard } from "@/components/shop/product-card";
import { ProductGallery } from "@/components/shop/product-gallery";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: { images: product.images[0] ? [product.images[0].url] : [] },
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">Shop</Link>
        {" / "}
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        {" / "}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold">{formatPrice(product.price)}</span>
              {discount > 0 && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.compareAtPrice!)}
                  </span>
                  <Badge className="bg-rose-600 text-white">Save {discount}%</Badge>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Inclusive of all taxes calculated at checkout</p>
          </div>

          <div>
            {product.stock > 10 ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckIcon className="size-4" /> In stock
              </p>
            ) : product.stock > 0 ? (
              <p className="text-sm text-amber-600">Only {product.stock} left — order soon</p>
            ) : (
              <p className="text-sm text-destructive">Out of stock</p>
            )}
          </div>

          <AddToCartButton
            size="lg"
            className="w-full sm:w-auto"
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.images[0]?.url ?? null,
              stock: product.stock,
            }}
          />

          <Separator />

          <div className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {product.description}
          </div>

          <div className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
            <p className="flex items-center gap-2"><TruckIcon className="size-4 text-primary" /> Free shipping over ₹999</p>
            <p className="flex items-center gap-2"><ShieldCheckIcon className="size-4 text-primary" /> Secure Razorpay checkout</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
