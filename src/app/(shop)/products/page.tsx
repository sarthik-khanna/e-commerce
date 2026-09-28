import type { Metadata } from "next";
import Link from "next/link";
import { PaginationLinks } from "@/components/pagination-links";
import { ProductCard } from "@/components/shop/product-card";
import { SortSelect } from "@/components/shop/catalog-toolbar";
import { getCatalog, getCategories } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop" };

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ProductsPage(props: PageProps<"/products">) {
  const searchParams = await props.searchParams;
  const q = one(searchParams.q)?.trim() || undefined;
  const category = one(searchParams.category) || undefined;
  const sort = one(searchParams.sort) || undefined;
  const page = Number(one(searchParams.page) ?? 1);

  const [catalog, categories] = await Promise.all([
    getCatalog({ q, category, sort, page }),
    getCategories(),
  ]);
  const activeCategory = categories.find((c) => c.slug === category);

  const categoryHref = (slug?: string) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (sort) qs.set("sort", sort);
    if (slug) qs.set("category", slug);
    const s = qs.toString();
    return s ? `/products?${s}` : "/products";
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{activeCategory?.name ?? "All products"}</h1>
          <p className="text-sm text-muted-foreground">
            {catalog.total} {catalog.total === 1 ? "result" : "results"}
            {q && (
              <>
                {" "}for “<span className="text-foreground">{q}</span>”
              </>
            )}
          </p>
        </div>
        <SortSelect />
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          <Link
            href={categoryHref()}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm hover:bg-muted",
              !category && "bg-muted font-medium",
            )}
          >
            All categories
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={categoryHref(c.slug)}
              className={cn(
                "flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted",
                category === c.slug && "bg-muted font-medium",
              )}
            >
              {c.name}
              <span className="text-xs text-muted-foreground">{c._count.products}</span>
            </Link>
          ))}
        </aside>

        <div>
          {catalog.products.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <p className="font-medium">No products found</p>
              <p className="text-sm text-muted-foreground">Try a different search or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {catalog.products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          )}
          <PaginationLinks
            basePath="/products"
            searchParams={searchParams}
            page={catalog.page}
            totalPages={catalog.totalPages}
          />
        </div>
      </div>
    </div>
  );
}
