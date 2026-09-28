import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type SearchParams = Record<string, string | string[] | undefined>;

function hrefFor(basePath: string, params: SearchParams, page: number) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    qs.set(key, Array.isArray(value) ? value[0] : value);
  }
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

/** Link-based pagination that works without JavaScript and keeps other query params. */
export function PaginationLinks({
  basePath,
  searchParams,
  page,
  totalPages,
}: {
  basePath: string;
  searchParams: SearchParams;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <Pagination className="mt-6">
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious href={hrefFor(basePath, searchParams, page - 1)} />
          </PaginationItem>
        )}
        {pageWindow(page, totalPages).map((p, i) => (
          <PaginationItem key={i}>
            {p === "…" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink href={hrefFor(basePath, searchParams, p)} isActive={p === page}>
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        {page < totalPages && (
          <PaginationItem>
            <PaginationNext href={hrefFor(basePath, searchParams, page + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
