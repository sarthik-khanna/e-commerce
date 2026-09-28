import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterSelect = {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
};

/**
 * Search + filter controls in one row above a table. Uses a plain GET form, so
 * filters live in the URL (shareable, bookmarkable) and work without JavaScript.
 */
export function FilterBar({
  basePath,
  q,
  placeholder = "Search…",
  selects = [],
}: {
  basePath: string;
  q?: string;
  placeholder?: string;
  selects?: FilterSelect[];
}) {
  const hasFilters = !!q || selects.some((s) => s.value);
  return (
    <form action={basePath} className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder={placeholder} className="pl-8" aria-label="Search" />
      </div>
      {selects.map((s) => (
        <select
          key={s.name}
          name={s.name}
          defaultValue={s.value ?? ""}
          aria-label={s.label}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">{s.label}: All</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      <Button type="submit" variant="secondary">
        Apply
      </Button>
      {hasFilters && (
        <Link href={basePath} className="text-sm text-muted-foreground hover:text-foreground">
          Clear
        </Link>
      )}
    </form>
  );
}

export function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function pageOf(v: string | string[] | undefined) {
  const n = Number(one(v) ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
