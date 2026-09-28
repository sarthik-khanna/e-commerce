import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const PAGE_SIZE = 12;

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  category: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  "price-asc": { price: "asc" },
  "price-desc": { price: "desc" },
  name: { name: "asc" },
};

export async function getCatalog(opts: { q?: string; category?: string; sort?: string; page?: number }) {
  const page = Math.max(1, Number.isFinite(opts.page) ? Math.floor(opts.page!) : 1);
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(opts.category ? { category: { slug: opts.category } } : {}),
    ...(opts.q
      ? {
          OR: [
            { name: { contains: opts.q, mode: "insensitive" } },
            { description: { contains: opts.q, mode: "insensitive" } },
            { sku: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      select: cardSelect,
      orderBy: SORTS[opts.sort ?? ""] ?? SORTS.newest,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);

  return { products, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getFeaturedProducts(limit = 8) {
  return db.product.findMany({
    where: { isActive: true, isFeatured: true },
    select: cardSelect,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

// React cache() dedupes the query between generateMetadata and the page render.
export const getProductBySlug = cache(async (slug: string) => {
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
    },
  });
});

export async function getRelatedProducts(categoryId: string, excludeId: string, limit = 4) {
  return db.product.findMany({
    where: { isActive: true, categoryId, id: { not: excludeId } },
    select: cardSelect,
    take: limit,
  });
}

export const getCategories = cache(async () => {
  return db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { products: { where: { isActive: true } } } } },
  });
});
