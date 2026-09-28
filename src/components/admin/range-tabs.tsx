import Link from "next/link";
import { RANGES, type RangeKey } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function RangeTabs({ active, basePath = "/admin" }: { active: RangeKey; basePath?: string }) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-[3px]">
      {(Object.keys(RANGES) as RangeKey[]).map((key) => (
        <Link
          key={key}
          href={`${basePath}?range=${key}`}
          scroll={false}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground",
            active === key && "bg-background text-foreground shadow-sm",
          )}
        >
          {key.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
