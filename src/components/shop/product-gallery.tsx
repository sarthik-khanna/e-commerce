"use client";

import { useState } from "react";
import { ProductImage } from "@/components/product-image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="grid gap-3">
      <ProductImage
        src={current?.url}
        alt={current?.alt ?? name}
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="aspect-square rounded-xl border"
      />
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              className={cn(
                "overflow-hidden rounded-lg border-2 transition",
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <ProductImage src={img.url} alt="" sizes="96px" className="aspect-square" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
