import { FilterBar, one, pageOf } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { PaginationLinks } from "@/components/pagination-links";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Audit logs" };
const PAGE_SIZE = 30;
const ENTITIES = ["Product", "Category", "Order", "User"];

export default async function AuditLogsPage(props: PageProps<"/admin/audit-logs">) {
  await requirePermission("audit:view");
  const sp = await props.searchParams;
  const q = one(sp.q)?.trim();
  const entity = ENTITIES.find((e) => e === one(sp.entity));
  const page = pageOf(sp.page);

  const where: Prisma.AuditLogWhereInput = {
    ...(entity ? { entity } : {}),
    ...(q ? { action: { contains: q, mode: "insensitive" } } : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  return (
    <>
      <PageHeader title="Audit logs" description="Every sensitive change, who made it and when." />
      <FilterBar
        basePath="/admin/audit-logs"
        q={q}
        placeholder="Filter by action, e.g. order.refund"
        selects={[{ name: "entity", label: "Entity", value: entity, options: ENTITIES.map((e) => ({ value: e, label: e })) }]}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="pr-4">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="pl-4 whitespace-nowrap">{formatDate(l.createdAt, true)}</TableCell>
                <TableCell className="max-w-40 truncate">{l.user?.name ?? l.user?.email ?? "System"}</TableCell>
                <TableCell className="font-mono text-xs">{l.action}</TableCell>
                <TableCell className="text-xs">
                  {l.entity}
                  <span className="block font-mono text-muted-foreground">{l.entityId}</span>
                </TableCell>
                <TableCell className="max-w-72 truncate pr-4 font-mono text-xs text-muted-foreground">
                  {l.metadata ? JSON.stringify(l.metadata) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No audit entries.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <PaginationLinks basePath="/admin/audit-logs" searchParams={sp} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </>
  );
}
