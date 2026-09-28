import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product-image";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import type { ProductCardData } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const image = product.images[0]?.url ?? null;
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="relative block">
        <ProductImage
          src={image}
          alt={product.images[0]?.alt ?? product.name}
          priority={priority}
          className="aspect-square transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute top-2 left-2 flex gap-1">
          {discount > 0 && <Badge className="bg-rose-600 text-white">-{discount}%</Badge>}
          {product.stock === 0 && <Badge variant="secondary">Sold out</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs text-muted-foreground">{product.category.name}</p>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 font-medium hover:underline">
          {product.name}
        </Link>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-semibold">{formatPrice(product.price)}</span>
          {discount > 0 && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(product.compareAtPrice!)}</span>
          )}
        </div>
        <AddToCartButton
          size="sm"
          variant="outline"
          product={{
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image,
            stock: product.stock,
          }}
        />
      </div>
    </div>
  );
}
