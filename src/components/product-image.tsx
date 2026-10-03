import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Hosts configured in next.config.ts images.remotePatterns get optimized by
// next/image (resized, WebP/AVIF, lazy-loaded). Anything else is served as-is.
const OPTIMIZED_HOSTS = ["res.cloudinary.com", "placehold.co", "images.unsplash.com", "images.pexels.com"];

function isOptimizable(src: string) {
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

export function ProductImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={!isOptimizable(src)}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="size-8" />
        </div>
      )}
    </div>
  );
}
