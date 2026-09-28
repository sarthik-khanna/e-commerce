import { NextResponse, type NextRequest } from "next/server";
import { getCatalog } from "@/lib/catalog";

/**
 * GET /api/v1/products?q=&category=&sort=&page=
 * Public, read-only catalog API (e.g. for a mobile app or partners).
 * Responses are cached at the CDN for 60s.
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const result = await getCatalog({
    q: p.get("q") ?? undefined,
    category: p.get("category") ?? undefined,
    sort: p.get("sort") ?? undefined,
    page: Number(p.get("page") ?? 1),
  });

  return NextResponse.json(
    {
      data: result.products.map((prod) => ({
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        price: prod.price / 100,
        compareAtPrice: prod.compareAtPrice ? prod.compareAtPrice / 100 : null,
        currency: "INR",
        inStock: prod.stock > 0,
        category: prod.category.name,
        image: prod.images[0]?.url ?? null,
      })),
      pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
